const express = require('express');
const db = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    // Total claims processed
    const totalClaims = await db.get(`
      SELECT COUNT(*) as count
      FROM claims
      WHERE submitted_at >= date('now', '-30 days')
    `);

    // Approval rate
    const approvalStats = await db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
      FROM claims
      WHERE submitted_at >= date('now', '-30 days')
    `);

    // Average processing time
    const processingTime = await db.get(`
      SELECT 
        AVG(CASE 
          WHEN approved_at IS NOT NULL 
          THEN julianday(approved_at) - julianday(submitted_at)
          WHEN rejected_at IS NOT NULL
          THEN julianday(rejected_at) - julianday(submitted_at)
          ELSE NULL
        END) as avg_days
      FROM claims
      WHERE (approved_at IS NOT NULL OR rejected_at IS NOT NULL)
      AND submitted_at >= date('now', '-90 days')
    `);

    // Risk score calculation (simplified)
    const riskFactors = await db.query(`
      SELECT 
        state,
        COUNT(*) as claim_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejection_count
      FROM claims
      WHERE submitted_at >= date('now', '-30 days')
      GROUP BY state
    `);

    const riskScore = calculateRiskScore(riskFactors);

    // Monthly trends
    const monthlyTrends = await db.query(`
      SELECT 
        strftime('%Y-%m', submitted_at) as month,
        COUNT(*) as submitted,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM claims
      WHERE submitted_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', submitted_at)
      ORDER BY month
    `);

    // Predictive analytics (mock data for demo)
    const predictions = generatePredictions(monthlyTrends);

    res.json({
      kpis: {
        totalClaims: totalClaims.count,
        approvalRate: approvalStats.total > 0 ? 
          ((approvalStats.approved / approvalStats.total) * 100).toFixed(1) : 0,
        avgProcessingTime: processingTime.avg_days ? 
          Math.round(processingTime.avg_days) : 0,
        riskScore: riskScore.toFixed(1)
      },
      trends: monthlyTrends,
      predictions,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get system alerts
router.get('/alerts', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    const alerts = await db.query(`
      SELECT *
      FROM system_alerts
      WHERE status = 'active'
      ORDER BY 
        CASE severity 
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at DESC
      LIMIT 10
    `);

    res.json({ alerts });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create system alert
router.post('/alerts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { alertType, severity, title, description, affectedArea } = req.body;

    const alertId = uuidv4();
    await db.run(`
      INSERT INTO system_alerts (id, alert_type, severity, title, description, affected_area)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [alertId, alertType, severity, title, description, affectedArea]);

    res.status(201).json({ message: 'Alert created successfully', alertId });
  } catch (error) {
    console.error('Alert creation error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Resolve alert
router.put('/alerts/:id/resolve', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  try {
    await db.run(`
      UPDATE system_alerts 
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
      WHERE id = ?
    `, [req.user.id, req.params.id]);

    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Alert resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Helper functions
function calculateRiskScore(riskFactors) {
  if (!riskFactors.length) return 0;
  
  let totalScore = 0;
  let totalWeight = 0;

  riskFactors.forEach(factor => {
    const rejectionRate = factor.rejection_count / factor.claim_count;
    const claimVolume = factor.claim_count;
    
    // Risk increases with rejection rate and high claim volumes
    const riskContribution = (rejectionRate * 5) + (claimVolume > 100 ? 2 : 0);
    const weight = factor.claim_count;
    
    totalScore += riskContribution * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.min(totalScore / totalWeight, 10) : 0;
}

function generatePredictions(trends) {
  if (!trends.length) return [];

  const lastTrend = trends[trends.length - 1];
  const avgGrowth = trends.length > 1 ? 
    (lastTrend.submitted - trends[0].submitted) / trends.length : 0;

  const predictions = [];
  for (let i = 1; i <= 6; i++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);
    
    predictions.push({
      period: `Q${Math.ceil((futureDate.getMonth() + 1) / 3)} ${futureDate.getFullYear()}`,
      predicted: Math.max(0, Math.round(lastTrend.submitted + (avgGrowth * i))),
      confidence: Math.max(60, 95 - (i * 5)) // Decreasing confidence over time
    });
  }

  return predictions;
}

module.exports = router;