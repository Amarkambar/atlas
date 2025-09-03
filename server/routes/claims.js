const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all claims (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, state, district, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    // Build WHERE clause based on user role
    if (req.user.role === 'citizen') {
      whereClause = 'WHERE c.user_id = ?';
      params.push(req.user.id);
    } else {
      whereClause = 'WHERE 1=1';
    }

    // Add filters
    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }
    if (state) {
      whereClause += ' AND c.state = ?';
      params.push(state);
    }
    if (district) {
      whereClause += ' AND c.district = ?';
      params.push(district);
    }

    const claims = await db.query(`
      SELECT 
        c.*,
        u.full_name as user_name,
        u.email as user_email,
        o.full_name as officer_name
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users o ON c.assigned_officer = o.id
      ${whereClause}
      ORDER BY c.submitted_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await db.get(`
      SELECT COUNT(*) as total
      FROM claims c
      ${whereClause}
    `, params);

    res.json({
      claims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Claims fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Get single claim by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await db.get(`
      SELECT 
        c.*,
        u.full_name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        o.full_name as officer_name,
        o.email as officer_email
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users o ON c.assigned_officer = o.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Check permissions
    if (req.user.role === 'citizen' && claim.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get associated documents
    const documents = await db.query(`
      SELECT id, document_type, file_name, file_size, uploaded_at, verified
      FROM documents
      WHERE claim_id = ?
      ORDER BY uploaded_at DESC
    `, [req.params.id]);

    res.json({ claim, documents });
  } catch (error) {
    console.error('Claim fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

// Create new claim
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      claimType,
      landArea,
      landLocation,
      gpsCoordinates,
      state,
      district,
      village
    } = req.body;

    // Validate required fields
    if (!claimType || !landLocation || !state || !district) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate claim number
    const year = new Date().getFullYear();
    const stateCode = state.substring(0, 2).toUpperCase();
    const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const claimNumber = `FRA/${stateCode}/${year}/${randomNum}`;

    const claimId = uuidv4();

    await db.run(`
      INSERT INTO claims (
        id, user_id, claim_number, claim_type, land_area, land_location,
        gps_coordinates, state, district, village
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      claimId, req.user.id, claimNumber, claimType, landArea, landLocation,
      gpsCoordinates, state, district, village
    ]);

    res.status(201).json({
      message: 'Claim submitted successfully',
      claimId,
      claimNumber
    });
  } catch (error) {
    console.error('Claim creation error:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

// Update claim status (officers only)
router.put('/:id/status', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const { status, rejectionReason, assignedOfficer, estimatedCompletion } = req.body;

    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (rejectionReason) {
      updateFields.push('rejection_reason = ?');
      params.push(rejectionReason);
    }

    if (assignedOfficer) {
      updateFields.push('assigned_officer = ?');
      params.push(assignedOfficer);
    }

    if (estimatedCompletion) {
      updateFields.push('estimated_completion = ?');
      params.push(estimatedCompletion);
    }

    if (status === 'approved') {
      updateFields.push('approved_at = CURRENT_TIMESTAMP');
    } else if (status === 'rejected') {
      updateFields.push('rejected_at = CURRENT_TIMESTAMP');
    }

    params.push(req.params.id);

    await db.run(`
      UPDATE claims 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ message: 'Claim status updated successfully' });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

// Get claims statistics
router.get('/stats/overview', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        AVG(CASE 
          WHEN approved_at IS NOT NULL 
          THEN julianday(approved_at) - julianday(submitted_at)
          WHEN rejected_at IS NOT NULL
          THEN julianday(rejected_at) - julianday(submitted_at)
          ELSE NULL
        END) as avg_processing_days
      FROM claims
      WHERE submitted_at >= date('now', '-30 days')
    `);

    const monthlyTrends = await db.query(`
      SELECT 
        strftime('%Y-%m', submitted_at) as month,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
      FROM claims
      WHERE submitted_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', submitted_at)
      ORDER BY month
    `);

    res.json({
      overview: stats[0],
      monthlyTrends
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;