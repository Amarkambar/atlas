const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = process.env.DB_PATH || './database/fra_atlas.db';

async function initializeDatabase() {
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create tables
        db.serialize(() => {
          // Users table
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              full_name TEXT NOT NULL,
              phone TEXT,
              role TEXT DEFAULT 'citizen',
              state TEXT,
              district TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Claims table
          db.run(`
            CREATE TABLE IF NOT EXISTS claims (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              claim_number TEXT UNIQUE NOT NULL,
              claim_type TEXT NOT NULL,
              status TEXT DEFAULT 'submitted',
              priority TEXT DEFAULT 'medium',
              land_area REAL,
              land_location TEXT,
              gps_coordinates TEXT,
              state TEXT NOT NULL,
              district TEXT NOT NULL,
              village TEXT,
              submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              approved_at DATETIME,
              rejected_at DATETIME,
              rejection_reason TEXT,
              assigned_officer TEXT,
              estimated_completion DATE,
              FOREIGN KEY (user_id) REFERENCES users (id)
            )
          `);

          // Documents table
          db.run(`
            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              claim_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              document_type TEXT NOT NULL,
              file_name TEXT NOT NULL,
              file_path TEXT NOT NULL,
              file_size INTEGER,
              mime_type TEXT,
              uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              verified BOOLEAN DEFAULT FALSE,
              verified_by TEXT,
              verified_at DATETIME,
              FOREIGN KEY (claim_id) REFERENCES claims (id),
              FOREIGN KEY (user_id) REFERENCES users (id)
            )
          `);

          // Feedback table
          db.run(`
            CREATE TABLE IF NOT EXISTS feedback (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              claim_id TEXT,
              feedback_type TEXT NOT NULL,
              subject TEXT NOT NULL,
              message TEXT NOT NULL,
              priority TEXT DEFAULT 'low',
              status TEXT DEFAULT 'open',
              contact_method TEXT,
              submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              resolved_at DATETIME,
              resolved_by TEXT,
              FOREIGN KEY (user_id) REFERENCES users (id),
              FOREIGN KEY (claim_id) REFERENCES claims (id)
            )
          `);

          // Analytics events table
          db.run(`
            CREATE TABLE IF NOT EXISTS analytics_events (
              id TEXT PRIMARY KEY,
              event_type TEXT NOT NULL,
              event_data TEXT,
              user_id TEXT,
              claim_id TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              ip_address TEXT,
              user_agent TEXT
            )
          `);

          // System alerts table
          db.run(`
            CREATE TABLE IF NOT EXISTS system_alerts (
              id TEXT PRIMARY KEY,
              alert_type TEXT NOT NULL,
              severity TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              affected_area TEXT,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              resolved_at DATETIME,
              resolved_by TEXT
            )
          `);

          // Insert sample data
          insertSampleData(db);
        });

        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  } catch (error) {
    throw error;
  }
}

function insertSampleData(db) {
  // Sample users
  const sampleUsers = [
    {
      id: 'user-001',
      email: 'ramesh.kumar@email.com',
      password_hash: '$2a$10$example.hash.for.demo.purposes',
      full_name: 'Ramesh Kumar',
      phone: '+91 98765-43210',
      role: 'citizen',
      state: 'Madhya Pradesh',
      district: 'Bhopal'
    },
    {
      id: 'officer-001',
      email: 'suresh.patel@gov.in',
      password_hash: '$2a$10$example.hash.for.demo.purposes',
      full_name: 'Suresh Patel',
      phone: '+91 98765-12345',
      role: 'officer',
      state: 'Madhya Pradesh',
      district: 'Bhopal'
    }
  ];

  sampleUsers.forEach(user => {
    db.run(`
      INSERT OR IGNORE INTO users (id, email, password_hash, full_name, phone, role, state, district)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [user.id, user.email, user.password_hash, user.full_name, user.phone, user.role, user.state, user.district]);
  });

  // Sample claims
  const sampleClaims = [
    {
      id: 'claim-001',
      user_id: 'user-001',
      claim_number: 'FRA/MP/2025/001247',
      claim_type: 'Individual Forest Rights',
      status: 'under_review',
      priority: 'medium',
      land_area: 2.5,
      land_location: 'Village Khajuraho, Bhopal District',
      gps_coordinates: '23.8315,77.4126',
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      village: 'Khajuraho',
      assigned_officer: 'officer-001',
      estimated_completion: '2025-10-15'
    }
  ];

  sampleClaims.forEach(claim => {
    db.run(`
      INSERT OR IGNORE INTO claims (id, user_id, claim_number, claim_type, status, priority, land_area, land_location, gps_coordinates, state, district, village, assigned_officer, estimated_completion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [claim.id, claim.user_id, claim.claim_number, claim.claim_type, claim.status, claim.priority, claim.land_area, claim.land_location, claim.gps_coordinates, claim.state, claim.district, claim.village, claim.assigned_officer, claim.estimated_completion]);
  });

  // Sample system alerts
  const sampleAlerts = [
    {
      id: 'alert-001',
      alert_type: 'anomaly',
      severity: 'medium',
      title: 'Unusual Claim Spike - Bhopal District',
      description: '300% increase in claims submitted in last 48 hours. Potential data entry error or coordinated submission.',
      affected_area: 'Bhopal District, Madhya Pradesh'
    },
    {
      id: 'alert-002',
      alert_type: 'fraud',
      severity: 'high',
      title: 'Potential Fraud Pattern - Tripura',
      description: 'Multiple claims with identical GPS coordinates and similar documentation patterns detected.',
      affected_area: 'Tripura State'
    }
  ];

  sampleAlerts.forEach(alert => {
    db.run(`
      INSERT OR IGNORE INTO system_alerts (id, alert_type, severity, title, description, affected_area)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [alert.id, alert.alert_type, alert.severity, alert.title, alert.description, alert.affected_area]);
  });
}

module.exports = { initializeDatabase };