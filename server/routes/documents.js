const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Upload documents
router.post('/upload', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const { claimId, documentType } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: 'Claim ID is required' });
    }

    // Verify claim exists and user has access
    const claim = await db.get('SELECT * FROM claims WHERE id = ?', [claimId]);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (req.user.role === 'citizen' && claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const documentId = uuidv4();
      
      await db.run(`
        INSERT INTO documents (
          id, claim_id, user_id, document_type, file_name, file_path,
          file_size, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        documentId,
        claimId,
        req.user.id,
        documentType || 'general',
        file.originalname,
        file.path,
        file.size,
        file.mimetype
      ]);

      uploadedFiles.push({
        id: documentId,
        fileName: file.originalname,
        fileSize: file.size,
        documentType: documentType || 'general'
      });
    }

    res.status(201).json({
      message: 'Documents uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
});

// Get documents for a claim
router.get('/claim/:claimId', authenticateToken, async (req, res) => {
  try {
    const { claimId } = req.params;

    // Verify claim access
    const claim = await db.get('SELECT * FROM claims WHERE id = ?', [claimId]);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (req.user.role === 'citizen' && claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const documents = await db.query(`
      SELECT 
        id, document_type, file_name, file_size, mime_type,
        uploaded_at, verified, verified_by, verified_at
      FROM documents
      WHERE claim_id = ?
      ORDER BY uploaded_at DESC
    `, [claimId]);

    res.json({ documents });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/download/:documentId', authenticateToken, async (req, res) => {
  try {
    const document = await db.get(`
      SELECT d.*, c.user_id
      FROM documents d
      JOIN claims c ON d.claim_id = c.id
      WHERE d.id = ?
    `, [req.params.documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && document.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(document.file_path, document.file_name);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Verify document (officers only)
router.put('/:documentId/verify', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const { verified } = req.body;

    await db.run(`
      UPDATE documents 
      SET verified = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [verified, req.user.id, req.params.documentId]);

    res.json({ message: 'Document verification status updated' });
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const document = await db.get(`
      SELECT d.*, c.user_id
      FROM documents d
      JOIN claims c ON d.claim_id = c.id
      WHERE d.id = ?
    `, [req.params.documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && document.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.file_path);
    } catch (error) {
      console.warn('Failed to delete file from filesystem:', error);
    }

    // Delete from database
    await db.run('DELETE FROM documents WHERE id = ?', [req.params.documentId]);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;