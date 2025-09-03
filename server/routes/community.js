const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Submit feedback
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const {
      claimId,
      feedbackType,
      subject,
      message,
      priority,
      contactMethod
    } = req.body;

    if (!feedbackType || !subject || !message) {
      return res.status(400).json({ error: 'Feedback type, subject, and message are required' });
    }

    const feedbackId = uuidv4();

    await db.run(`
      INSERT INTO feedback (
        id, user_id, claim_id, feedback_type, subject, message,
        priority, contact_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      feedbackId,
      req.user.id,
      claimId || null,
      feedbackType,
      subject,
      message,
      priority || 'low',
      contactMethod
    ]);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's feedback
router.get('/feedback', authenticateToken, async (req, res) => {
  try {
    const feedback = await db.query(`
      SELECT 
        f.*,
        c.claim_number
      FROM feedback f
      LEFT JOIN claims c ON f.claim_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.submitted_at DESC
    `, [req.user.id]);

    res.json({ feedback });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get all feedback (officers only)
router.get('/feedback/all', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND f.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND f.priority = ?';
      params.push(priority);
    }

    const feedback = await db.query(`
      SELECT 
        f.*,
        u.full_name as user_name,
        u.email as user_email,
        c.claim_number
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN claims c ON f.claim_id = c.id
      ${whereClause}
      ORDER BY 
        CASE f.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        f.submitted_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ feedback });
  } catch (error) {
    console.error('All feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status (officers only)
router.put('/feedback/:id/status', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const { status } = req.body;

    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (status === 'resolved') {
      updateFields.push('resolved_at = CURRENT_TIMESTAMP', 'resolved_by = ?');
      params.push(req.user.id);
    }

    params.push(req.params.id);

    await db.run(`
      UPDATE feedback 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ message: 'Feedback status updated successfully' });
  } catch (error) {
    console.error('Feedback status update error:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    // Get claim updates
    const claimUpdates = await db.query(`
      SELECT 
        'claim_update' as type,
        'Claim status updated to: ' || status as message,
        updated_at as timestamp,
        claim_number
      FROM claims
      WHERE user_id = ?
      AND updated_at >= date('now', '-7 days')
      ORDER BY updated_at DESC
      LIMIT 5
    `, [req.user.id]);

    // Get feedback responses
    const feedbackResponses = await db.query(`
      SELECT 
        'feedback_response' as type,
        'Response received for: ' || subject as message,
        resolved_at as timestamp,
        id as feedback_id
      FROM feedback
      WHERE user_id = ?
      AND resolved_at IS NOT NULL
      AND resolved_at >= date('now', '-7 days')
      ORDER BY resolved_at DESC
      LIMIT 5
    `, [req.user.id]);

    const notifications = [...claimUpdates, ...feedbackResponses]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;