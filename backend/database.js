const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'crm.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === checkHash;
  } catch (err) {
    return false;
  }
}
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database opening error:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Failed to enable foreign keys:', pragmaErr);
      } else {
        console.log('Foreign key support enabled.');
      }
    });
  }
});

// Helper to run query with Promise
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper to get all records
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get single record
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize schema
async function initDatabase() {
  try {
    // 1. Create Companies table
    await run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        industry TEXT,
        size INTEGER,
        website TEXT,
        primary_contact_id INTEGER,
        account_owner TEXT,
        notes TEXT
      )
    `);

    // 2. Create Contacts table
    await run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role_title TEXT,
        company_id INTEGER,
        source TEXT,
        status TEXT,
        tags TEXT,
        last_contact_date TEXT,
        notes TEXT,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
      )
    `);

    // Add Primary Contact FK to Companies table after creating contacts (SQLite doesn't easily support ALTER TABLE ADD CONSTRAINT,
    // but we can set the field and reference it programmatically or validate via code, since SQLite tables are flexible)

    // 3. Create Deals table
    await run(`
      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_name TEXT NOT NULL,
        contact_id INTEGER,
        company_id INTEGER,
        stage TEXT NOT NULL,
        value REAL NOT NULL DEFAULT 0.0,
        probability REAL NOT NULL DEFAULT 0.0,
        expected_close_date TEXT,
        owner TEXT,
        source TEXT,
        lost_reason TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
      )
    `);

    // 4. Create Activities table
    await run(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        contact_id INTEGER,
        deal_id INTEGER,
        notes TEXT,
        next_action TEXT,
        next_action_date TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE SET NULL
      )
    `);

    // 5. Create Tickets table
    await run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        issue_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        assigned_to TEXT,
        opened_date TEXT NOT NULL,
        resolved_date TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL
      )
    `);

    // 6. Create Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);

    console.log('Database tables verified/created successfully.');

    // Seed database if empty
    await seedDatabase();

  } catch (error) {
    console.error('Database schema initialization failed:', error);
  }
}

async function seedDatabase() {
  // Seed default user accounts if empty
  const userCount = await get('SELECT COUNT(*) AS count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding default user accounts...');
    const adminHash = hashPassword('admin');
    const agentHash = hashPassword('agent');
    const supportHash = hashPassword('support');
    
    await run(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
    `, [
      'admin', adminHash, 'Admin',
      'agent', agentHash, 'Agent',
      'support', supportHash, 'Support'
    ]);
  }

  // Check if we should seed mock data (skip if in production or disabled via config)
  if (process.env.NODE_ENV === 'production' || process.env.SEED_MOCK_DATA === 'false') {
    console.log('Production mode or SEED_MOCK_DATA=false. Skipping mock data seeding.');
    return;
  }

  const companyCount = await get('SELECT COUNT(*) AS count FROM companies');
  if (companyCount.count > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding initial records...');

  // 1. Seed Companies
  await run(`
    INSERT INTO companies (company_name, industry, size, website, account_owner, notes)
    VALUES 
    ('Nimbus Traders Pvt Ltd', 'Technology', 250, 'https://nimbustraders.com', 'Priya Nair', 'Key enterprise account in logistics space.'),
    ('Sharma Retail Group', 'Retail', 1200, 'https://sharmaretail.in', 'Vikram Singh', 'Nationwide physical stores expanding to e-commerce.'),
    ('Atlas Manufacturing', 'Manufacturing', 50, 'https://atlasmfg.co', 'Vikram Singh', 'Niche supplier for aerospace components.'),
    ('Coral Logistics Co.', 'Logistics', 410, 'https://corallogistics.com', 'Priya Nair', 'Interested in cold-chain tracking solutions.'),
    ('Northwind Supplies', 'Wholesale', 190, 'https://northwindsupplies.com', 'Aarav Mehta', 'Existing account with recurring annual contracts.')
  `);

  const nimbus = await get("SELECT id FROM companies WHERE company_name = 'Nimbus Traders Pvt Ltd'");
  const sharma = await get("SELECT id FROM companies WHERE company_name = 'Sharma Retail Group'");
  const atlas = await get("SELECT id FROM companies WHERE company_name = 'Atlas Manufacturing'");
  const coral = await get("SELECT id FROM companies WHERE company_name = 'Coral Logistics Co.'");
  const northwind = await get("SELECT id FROM companies WHERE company_name = 'Northwind Supplies'");

  // 2. Seed Contacts
  await run(`
    INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
    VALUES
    ('Aarav Mehta', 'aarav.mehta@nimbustraders.com', '+91 98765 43210', 'Tech Lead', ?, 'Website', 'Lead', 'VIP, Tech', '2026-06-12', 'Very responsive, wants custom API integration.'),
    ('Riya Sharma', 'riya.sharma@sharmaretail.in', '+91 87654 32109', 'VP Procurement', ?, 'Referral', 'Qualified', 'High Value, Retail', '2026-06-12', 'Met at the Delhi Retail Expo. Ready for pilot proposal.'),
    ('John Carter', 'jcarter@atlasmfg.co', '+1 555-0199', 'Operations Manager', ?, 'Cold Outreach', 'Active Customer', 'Local, Tier-2', '2026-06-10', 'Prefers phone communication over email.'),
    ('Priya Nair', 'priya.nair@corallogistics.com', '+91 99988 77766', 'Director of Sales', ?, 'Event/Trade Show', 'Lead', 'Cold Lead', '2026-05-20', 'Requested demo next quarter.'),
    ('Vikram Singh', 'v.singh@northwindsupplies.com', '+91 88877 66655', 'General Manager', ?, 'Social Media', 'Active Customer', 'Partner', '2026-06-11', 'Renewed main services agreement for 2026.')
  `, [nimbus.id, sharma.id, atlas.id, coral.id, northwind.id]);

  const contactAarav = await get("SELECT id FROM contacts WHERE name = 'Aarav Mehta'");
  const contactRiya = await get("SELECT id FROM contacts WHERE name = 'Riya Sharma'");
  const contactJohn = await get("SELECT id FROM contacts WHERE name = 'John Carter'");
  const contactPriya = await get("SELECT id FROM contacts WHERE name = 'Priya Nair'");
  const contactVikram = await get("SELECT id FROM contacts WHERE name = 'Vikram Singh'");

  // Update primary contacts for companies
  await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactAarav.id, nimbus.id]);
  await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactRiya.id, sharma.id]);
  await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactJohn.id, atlas.id]);
  await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactPriya.id, coral.id]);
  await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactVikram.id, northwind.id]);

  // 3. Seed Deals
  // Stages: New Lead, Qualified, Proposal Sent, Negotiation, Won, Lost
  await run(`
    INSERT INTO deals (deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason)
    VALUES
    ('Nimbus Enterprise API Integration', ?, ?, 'Negotiation', 850000, 0.70, '2026-07-15', 'Priya Nair', 'Website', NULL),
    ('Sharma Retail Cloud Migration Pilot', ?, ?, 'Proposal Sent', 320000, 0.50, '2026-08-30', 'Vikram Singh', 'Referral', NULL),
    ('Atlas Custom Small Batch Fittings', ?, ?, 'New Lead', 75000, 0.10, '2026-10-01', 'Vikram Singh', 'Cold Outreach', NULL),
    ('Coral Logistics Global Contract', ?, ?, 'Qualified', 410000, 0.30, '2026-09-15', 'Priya Nair', 'Event/Trade Show', NULL),
    ('Northwind Supplies Annual Renewal', ?, ?, 'Won', 190000, 1.00, '2026-05-10', 'Aarav Mehta', 'Social Media', NULL),
    ('Legacy Retail POS Upgrade', ?, ?, 'Lost', 150000, 0.00, '2026-03-01', 'Vikram Singh', 'Cold Outreach', 'Competitor offered lower pricing')
  `, [
    contactAarav.id, nimbus.id,
    contactRiya.id, sharma.id,
    contactJohn.id, atlas.id,
    contactPriya.id, coral.id,
    contactVikram.id, northwind.id,
    contactRiya.id, sharma.id
  ]);

  const dealNimbus = await get("SELECT id FROM deals WHERE deal_name = 'Nimbus Enterprise API Integration'");
  const dealSharma = await get("SELECT id FROM deals WHERE deal_name = 'Sharma Retail Cloud Migration Pilot'");

  // 4. Seed Activities
  // Types: Call, Email, Meeting, Site Visit, Demo, Note, WhatsApp Message
  // Let's create some dates. Today is 2026-06-12.
  await run(`
    INSERT INTO activities (date, type, contact_id, deal_id, notes, next_action, next_action_date)
    VALUES
    ('2026-06-12T17:31:00Z', 'Call', ?, ?, 'Discussed Q3 contract renewal terms and customized API features.', 'Send updated contract draft', '2026-06-15'),
    ('2026-06-12T16:43:00Z', 'Email', ?, ?, 'Sent revised pricing proposal with volume discounts included.', 'Follow up on proposal feedback', '2026-06-19'),
    ('2026-06-12T14:15:00Z', 'WhatsApp Message', ?, NULL, 'Confirmed sample shipment details and shared tracking link.', 'Wait for delivery confirmation', '2026-06-16'),
    ('2026-06-11T10:00:00Z', 'Meeting', ?, ?, 'Annual review meeting - client highly satisfied, renewal extremely likely.', 'Prepare renewal invoice', '2026-06-25'),
    ('2026-06-11T14:00:00Z', 'Demo', ?, ?, 'Walked through bulk-order workflow and dashboard features.', 'Schedule follow-up call', '2026-06-08'), -- Overdue item!
    ('2026-05-18T09:00:00Z', 'Note', ?, NULL, 'Initial sync-up note: client interested in exploring cold chain logistics.', 'Send product brochure', '2026-05-22') -- Overdue item!
  `, [
    contactAarav.id, dealNimbus.id,
    contactRiya.id, dealSharma.id,
    contactJohn.id,
    contactVikram.id, dealNimbus.id,
    contactRiya.id, dealSharma.id,
    contactPriya.id
  ]);

  // 5. Seed Tickets
  // Issue Types: Billing, Delivery Delay, Product Defect, Service Issue, General Inquiry, Other
  // Statuses: Open, In Progress, Waiting on Customer, Resolved, Closed
  // Priorities: Low, Medium, High, Urgent
  await run(`
    INSERT INTO tickets (contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date)
    VALUES
    (?, 'Service Issue', 'Aarav reports 500 error when querying the beta API endpoint.', 'Open', 'High', 'Priya Nair', '2026-06-10', NULL),
    (?, 'Billing', 'Invoice discrepancy regarding tax calculation on May service fee.', 'In Progress', 'Medium', 'Vikram Singh', '2026-06-11', NULL),
    (?, 'Delivery Delay', 'Aerospace components batch #04 stuck at customs import checking.', 'Waiting on Customer', 'Urgent', 'Vikram Singh', '2026-06-09', NULL),
    (?, 'General Inquiry', 'Requested information regarding ISO-27001 compliance certification.', 'Resolved', 'Low', 'Priya Nair', '2026-06-05', '2026-06-07')
  `, [
    contactAarav.id,
    contactRiya.id,
    contactJohn.id,
    contactVikram.id
  ]);

  console.log('Seeding completed successfully!');
}

module.exports = {
  db,
  initDatabase,
  run,
  all,
  get,
  verifyPassword
};
