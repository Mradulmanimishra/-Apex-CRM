const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { verifyPassword, run, all, get } = require('./database');
const { verifyToken } = require('./auth');

// ==========================================
// 1. PUBLIC AUTHENTICATION ENDPOINTS
// ==========================================

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }
  try {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (user && verifyPassword(password, user.password_hash)) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ success: false, error: 'Server configuration error: JWT_SECRET not set.' });
      }
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        secret,
        { expiresIn: '24h' }
      );
      res.json({
        success: true,
        token,
        username: user.username,
        role: user.role
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. REGISTRATION OF AUTHENTICATION MIDDLEWARE
// ==========================================
// All endpoints declared below this point will require a valid Authorization JWT token
router.use(verifyToken);

// ==========================================
// 3. DASHBOARD ENDPOINT
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const { owner } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Build SQL condition for owner
    let dealFilter = '';
    let dealParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      dealFilter = 'WHERE owner = ?';
      dealParams = [owner];
    }

    // Pipeline by stage
    const stages = ['New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
    const dealStats = await all(`
      SELECT stage, COUNT(*) as count, SUM(value) as total_value, SUM(value * probability) as weighted_value
      FROM deals
      ${dealFilter}
      GROUP BY stage
    `, dealParams);

    // Map database output to match all standard stages
    const funnel = stages.map(stage => {
      const match = dealStats.find(d => d.stage.toLowerCase() === stage.toLowerCase());
      return {
        stage,
        count: match ? match.count : 0,
        value: match ? match.total_value : 0,
        weightedValue: match ? match.weighted_value : 0
      };
    });

    // Key metrics calculations
    const keyMetricsRow = await get(`
      SELECT 
        SUM(CASE WHEN stage NOT IN ('Won', 'Lost') THEN value ELSE 0 END) as open_pipeline_value,
        SUM(CASE WHEN stage NOT IN ('Won', 'Lost') THEN (value * probability) ELSE 0 END) as weighted_open_pipeline,
        SUM(CASE WHEN stage = 'Won' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN stage = 'Lost' THEN 1 ELSE 0 END) as lost_count,
        SUM(CASE WHEN stage = 'Won' THEN value ELSE 0 END) as won_value
      FROM deals
      ${dealFilter}
    `, dealParams);

    const wonCount = keyMetricsRow.won_count || 0;
    const lostCount = keyMetricsRow.lost_count || 0;
    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) : "0.0";

    // Active customers
    let activeCustomersQuery = "SELECT COUNT(*) as count FROM contacts WHERE status = 'Active Customer'";
    let activeCustomersParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      activeCustomersQuery = `
        SELECT COUNT(DISTINCT c.id) as count 
        FROM contacts c
        LEFT JOIN companies comp ON c.company_id = comp.id
        WHERE c.status = 'Active Customer' AND comp.account_owner = ?
      `;
      activeCustomersParams = [owner];
    }
    const activeCustomersRow = await get(activeCustomersQuery, activeCustomersParams);

    // Open tickets
    let openTicketsQuery = "SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('Resolved', 'Closed')";
    let openTicketsParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      openTicketsQuery = "SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('Resolved', 'Closed') AND assigned_to = ?";
      openTicketsParams = [owner];
    }
    const openTicketsRow = await get(openTicketsQuery, openTicketsParams);

    // Upcoming followups
    let upcomingQuery = `
      SELECT a.*, c.name as contact_name, comp.company_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE a.next_action_date IS NOT NULL AND a.next_action_date != ''
    `;
    let upcomingParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      upcomingQuery += ` AND comp.account_owner = ?`;
      upcomingParams = [owner];
    }
    upcomingQuery += ` ORDER BY a.next_action_date ASC`;
    const upcomingFollowups = await all(upcomingQuery, upcomingParams);

    // Open tickets count by priority
    let ticketPriorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('Resolved', 'Closed')
    `;
    let ticketPriorityParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      ticketPriorityQuery += ` AND assigned_to = ?`;
      ticketPriorityParams = [owner];
    }
    ticketPriorityQuery += ` GROUP BY priority`;
    const ticketPriorityStats = await all(ticketPriorityQuery, ticketPriorityParams);

    const ticketPriorities = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
    ticketPriorityStats.forEach(item => {
      if (ticketPriorities[item.priority] !== undefined) {
        ticketPriorities[item.priority] = item.count;
      }
    });

    // Monthly historical trend
    const revenueTrend = [
      { month: "Jan", won: 640000, pipeline: 1820000 },
      { month: "Feb", won: 710000, pipeline: 1960000 },
      { month: "Mar", won: 590000, pipeline: 2110000 },
      { month: "Apr", won: 880000, pipeline: 2240000 },
      { month: "May", won: 940000, pipeline: 2360000 },
      { month: "Jun", won: keyMetricsRow.won_value || 0, pipeline: keyMetricsRow.open_pipeline_value || 0 },
    ];

    // Advanced analytics stats queries
    let lostReasonFilter = "WHERE stage = 'Lost' AND lost_reason IS NOT NULL AND lost_reason != ''";
    let lostReasonParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      lostReasonFilter += " AND owner = ?";
      lostReasonParams = [owner];
    }
    const lostReasonStats = await all(`
      SELECT lost_reason, COUNT(*) as count 
      FROM deals 
      ${lostReasonFilter}
      GROUP BY lost_reason
    `, lostReasonParams);

    let ticketStatusFilter = '';
    let ticketStatusParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      ticketStatusFilter = 'WHERE assigned_to = ?';
      ticketStatusParams = [owner];
    }
    const ticketStatusStats = await all(`
      SELECT status, COUNT(*) as count
      FROM tickets
      ${ticketStatusFilter}
      GROUP BY status
    `, ticketStatusParams);

    let leadSourceFilter = '';
    let leadSourceParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      leadSourceFilter = `
        WHERE company_id IN (
          SELECT id FROM companies WHERE account_owner = ?
        )
      `;
      leadSourceParams = [owner];
    }
    const leadSourceStats = await all(`
      SELECT source, COUNT(*) as count
      FROM contacts
      ${leadSourceFilter}
      GROUP BY source
    `, leadSourceParams);

    res.json({
      metrics: {
        openPipelineValue: keyMetricsRow.open_pipeline_value || 0,
        weightedOpenPipeline: keyMetricsRow.weighted_open_pipeline || 0,
        winRate: winRate + "%",
        activeCustomers: activeCustomersRow.count || 0,
        openTickets: openTicketsRow.count || 0,
        wonCount,
        lostCount,
        totalWonValue: keyMetricsRow.won_value || 0
      },
      funnel,
      revenueTrend,
      upcomingFollowups,
      ticketPriorities,
      lostReasonStats,
      ticketStatusStats,
      leadSourceStats
    });
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. CONTACTS API
// ==========================================
router.get('/contacts', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.*, comp.company_name 
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      ORDER BY c.name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await get('SELECT c.*, comp.company_name FROM contacts c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.id = ?', [req.params.id]);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Fetch related information
    const companies = await all('SELECT * FROM companies WHERE primary_contact_id = ? OR id = ?', [contact.id, contact.company_id]);
    const deals = await all('SELECT * FROM deals WHERE contact_id = ?', [contact.id]);
    const activities = await all('SELECT * FROM activities WHERE contact_id = ? ORDER BY date DESC', [contact.id]);
    const tickets = await all('SELECT * FROM tickets WHERE contact_id = ? ORDER BY opened_date DESC', [contact.id]);

    res.json({
      contact,
      companies,
      deals,
      activities,
      tickets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contacts', async (req, res) => {
  const { name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await run(`
      INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email, phone, role_title, company_id || null, source, status || 'Lead', tags, last_contact_date, notes]);
    const newContact = await get('SELECT * FROM contacts WHERE id = ?', [result.lastID]);
    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/contacts/:id', async (req, res) => {
  const { name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    await run(`
      UPDATE contacts
      SET name = ?, email = ?, phone = ?, role_title = ?, company_id = ?, source = ?, status = ?, tags = ?, last_contact_date = ?, notes = ?
      WHERE id = ?
    `, [name, email, phone, role_title, company_id || null, source, status, tags, last_contact_date, notes, req.params.id]);
    const updatedContact = await get('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    res.json(updatedContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    await run('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Bulk Contacts Import
router.post('/contacts/import', async (req, res) => {
  const contacts = req.body;
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Expected an array of contacts' });
  }

  try {
    await run('BEGIN TRANSACTION');

    const imported = [];
    for (const record of contacts) {
      const name = record.name || record.Name || '';
      if (!name) continue; // Skip invalid records without name

      const email = record.email || record.Email || null;
      const phone = record.phone || record.Phone || null;
      const role_title = record.role_title || record.Role || record['Role Title'] || null;
      const companyName = record.company || record.Company || '';
      const source = record.source || record.Source || 'CSV Import';
      const status = record.status || record.Status || 'Lead';
      const tags = record.tags || record.Tags || '';
      const notes = record.notes || record.Notes || '';
      
      let company_id = null;
      if (companyName && companyName.trim() !== '') {
        const trimmedCompanyName = companyName.trim();
        let company = await get('SELECT id FROM companies WHERE company_name = ?', [trimmedCompanyName]);
        if (company) {
          company_id = company.id;
        } else {
          // Auto create company
          const companyResult = await run(
            'INSERT INTO companies (company_name, industry, size, website, account_owner, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [trimmedCompanyName, 'Unknown', null, '', 'Unassigned', 'Auto-created via contact import.']
          );
          company_id = companyResult.lastID;
        }
      }

      const insertResult = await run(`
        INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name,
        email,
        phone,
        role_title,
        company_id,
        source,
        status,
        tags,
        new Date().toISOString().split('T')[0],
        notes
      ]);

      imported.push({ id: insertResult.lastID, name });
    }

    await run('COMMIT');
    res.json({ success: true, count: imported.length, imported });
  } catch (error) {
    try {
      await run('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. COMPANIES API
// ==========================================// Integrated Company routes (modular)
const companyRoutes = require('./companyRoutes');
router.use('/companies', companyRoutes);

// ==========================================
// 6. DEALS API
// ==========================================
router.get('/deals', async (req, res) => {
  try {
    const rows = await all(`
      SELECT d.*, c.name as contact_name, comp.company_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      ORDER BY d.value DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deals', async (req, res) => {
  const { deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason } = req.body;
  if (!deal_name) return res.status(400).json({ error: 'Deal name is required' });
  if (!stage) return res.status(400).json({ error: 'Deal stage is required' });

  try {
    const result = await run(`
      INSERT INTO deals (deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [deal_name, contact_id || null, company_id || null, stage, value || 0, probability || 0, expected_close_date, owner, source, lost_reason]);
    const newDeal = await get('SELECT * FROM deals WHERE id = ?', [result.lastID]);
    res.status(201).json(newDeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/deals/:id', async (req, res) => {
  const { deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason } = req.body;
  if (!deal_name) return res.status(400).json({ error: 'Deal name is required' });
  if (!stage) return res.status(400).json({ error: 'Deal stage is required' });

  try {
    await run(`
      UPDATE deals
      SET deal_name = ?, contact_id = ?, company_id = ?, stage = ?, value = ?, probability = ?, expected_close_date = ?, owner = ?, source = ?, lost_reason = ?
      WHERE id = ?
    `, [deal_name, contact_id || null, company_id || null, stage, value || 0, probability || 0, expected_close_date, owner, source, lost_reason, req.params.id]);
    const updatedDeal = await get('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    res.json(updatedDeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/deals/:id', async (req, res) => {
  try {
    await run('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. ACTIVITIES API
// ==========================================
router.get('/activities', async (req, res) => {
  try {
    const rows = await all(`
      SELECT a.*, c.name as contact_name, d.deal_name, comp.company_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      ORDER BY a.date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activities', async (req, res) => {
  const { date, type, contact_id, deal_id, notes, next_action, next_action_date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!type) return res.status(400).json({ error: 'Type is required' });

  try {
    const result = await run(`
      INSERT INTO activities (date, type, contact_id, deal_id, notes, next_action, next_action_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [date, type, contact_id || null, deal_id || null, notes, next_action, next_action_date]);

    // Also update the last contact date for the contact
    if (contact_id) {
      const justDate = date.split('T')[0];
      await run('UPDATE contacts SET last_contact_date = ? WHERE id = ?', [justDate, contact_id]);
    }

    const newActivity = await get('SELECT * FROM activities WHERE id = ?', [result.lastID]);
    res.status(201).json(newActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/activities/:id', async (req, res) => {
  const { date, type, contact_id, deal_id, notes, next_action, next_action_date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!type) return res.status(400).json({ error: 'Type is required' });

  try {
    await run(`
      UPDATE activities
      SET date = ?, type = ?, contact_id = ?, deal_id = ?, notes = ?, next_action = ?, next_action_date = ?
      WHERE id = ?
    `, [date, type, contact_id || null, deal_id || null, notes, next_action, next_action_date, req.params.id]);

    const updatedActivity = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/activities/:id', async (req, res) => {
  try {
    await run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. TICKETS API
// ==========================================
router.get('/tickets', async (req, res) => {
  try {
    const rows = await all(`
      SELECT t.*, c.name as contact_name, comp.company_name
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      ORDER BY t.status ASC, t.opened_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets', async (req, res) => {
  const { contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date } = req.body;
  if (!issue_type) return res.status(400).json({ error: 'Issue type is required' });
  if (!status) return res.status(400).json({ error: 'Status is required' });
  if (!priority) return res.status(400).json({ error: 'Priority is required' });
  if (!opened_date) return res.status(400).json({ error: 'Opened date is required' });

  try {
    const result = await run(`
      INSERT INTO tickets (contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [contact_id || null, issue_type, description, status, priority, assigned_to, opened_date, resolved_date || null]);

    const newTicket = await get('SELECT * FROM tickets WHERE id = ?', [result.lastID]);
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/tickets/:id', async (req, res) => {
  const { contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date } = req.body;
  if (!issue_type) return res.status(400).json({ error: 'Issue type is required' });
  if (!status) return res.status(400).json({ error: 'Status is required' });
  if (!priority) return res.status(400).json({ error: 'Priority is required' });

  try {
    await run(`
      UPDATE tickets
      SET contact_id = ?, issue_type = ?, description = ?, status = ?, priority = ?, assigned_to = ?, opened_date = ?, resolved_date = ?
      WHERE id = ?
    `, [contact_id || null, issue_type, description, status, priority, assigned_to, opened_date, resolved_date || null, req.params.id]);

    const updatedTicket = await get('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tickets/:id', async (req, res) => {
  try {
    await run('DELETE FROM tickets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. SIMULATOR Webhook Endpoint
// ==========================================
router.post('/simulator/whatsapp', async (req, res) => {
  try {
    const mockLeads = [
      { name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', phone: '+91 91234 56789', role_title: 'Product Manager', company: 'Sharma Retail Group', notes: 'Inquired about supply chain tracking.' },
      { name: 'Sarah Connor', email: 'sconnor@atlasmfg.co', phone: '+1 555-9876', role_title: 'Systems Lead', company: 'Atlas Manufacturing', notes: 'Wants integration info.' },
      { name: 'Kunal Sen', email: 'kunal.sen@coral.in', phone: '+91 98989 89898', role_title: 'CTO', company: 'Coral Logistics Co.', notes: 'Asked about volume licensing.' },
      { name: 'Elena Petrova', email: 'epetrova@nimbustraders.com', phone: '+7 901 234-5678', role_title: 'Sourcing Manager', company: 'Nimbus Traders Pvt Ltd', notes: 'Sent whatsapp requesting pricing details.' }
    ];

    // Pick one randomly
    const lead = mockLeads[Math.floor(Math.random() * mockLeads.length)];
    
    // Check if company exists
    let companyId = null;
    const company = await get("SELECT id FROM companies WHERE company_name = ?", [lead.company]);
    if (company) {
      companyId = company.id;
    }

    // Check if contact exists by name
    let contact = await get("SELECT * FROM contacts WHERE name = ?", [lead.name]);
    if (!contact) {
      const contactResult = await run(`
        INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
        VALUES (?, ?, ?, ?, ?, 'WhatsApp', 'Lead', 'Simulated, Tech', ?, ?)
      `, [lead.name, lead.email, lead.phone, lead.role_title, companyId, new Date().toISOString().split('T')[0], lead.notes]);
      
      contact = await get("SELECT * FROM contacts WHERE id = ?", [contactResult.lastID]);
    }

    // Insert WhatsApp message activity
    await run(`
      INSERT INTO activities (date, type, contact_id, deal_id, notes, next_action, next_action_date)
      VALUES (?, 'WhatsApp Message', ?, NULL, ?, 'Reply to simulated WhatsApp lead', ?)
    `, [
      new Date().toISOString(), 
      contact.id, 
      `[SIMULATOR Incoming WhatsApp Message]: "${lead.notes}"`, 
      new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // 2 days from now
    ]);

    // Update contact's last contact date
    await run("UPDATE contacts SET last_contact_date = ? WHERE id = ?", [new Date().toISOString().split('T')[0], contact.id]);

    res.json({
      success: true,
      message: `Simulated incoming message from ${contact.name}`,
      contact
    });

  } catch (error) {
    console.error('WhatsApp simulator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. GLOBAL SEARCH & NOTIFICATIONS API
// ==========================================
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ contacts: [], companies: [], deals: [], tickets: [] });
  }

  try {
    const searchVal = `%${q}%`;

    const contacts = await all(`
      SELECT c.id, c.name, c.role_title, c.email, comp.company_name
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.tags LIKE ? OR c.role_title LIKE ?
      LIMIT 10
    `, [searchVal, searchVal, searchVal, searchVal, searchVal]);

    const companies = await all(`
      SELECT id, company_name, industry, account_owner
      FROM companies
      WHERE company_name LIKE ? OR industry LIKE ? OR account_owner LIKE ?
      LIMIT 10
    `, [searchVal, searchVal, searchVal]);

    const deals = await all(`
      SELECT d.id, d.deal_name, d.owner, d.stage, d.value, comp.company_name
      FROM deals d
      LEFT JOIN companies comp ON d.company_id = comp.id
      WHERE d.deal_name LIKE ? OR d.owner LIKE ? OR d.stage LIKE ?
      LIMIT 10
    `, [searchVal, searchVal, searchVal]);

    const tickets = await all(`
      SELECT t.id, t.issue_type, t.priority, t.status, t.description, c.name as contact_name
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      WHERE t.issue_type LIKE ? OR t.description LIKE ? OR t.assigned_to LIKE ?
      LIMIT 10
    `, [searchVal, searchVal, searchVal]);

    res.json({ contacts, companies, deals, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Overdue tasks
    const overdueActivities = await all(`
      SELECT a.id, a.type, a.notes, a.next_action, a.next_action_date, a.contact_id, c.name as contact_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.next_action_date IS NOT NULL AND a.next_action_date != '' AND a.next_action_date < ?
      ORDER BY a.next_action_date ASC
      LIMIT 5
    `, [today]);

    // Today's tasks
    const todaysActivities = await all(`
      SELECT a.id, a.type, a.notes, a.next_action, a.next_action_date, a.contact_id, c.name as contact_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.next_action_date = ?
      ORDER BY a.next_action_date ASC
      LIMIT 5
    `, [today]);

    // High/Urgent open tickets
    const urgentTickets = await all(`
      SELECT t.id, t.issue_type, t.priority, t.status, t.description, c.name as contact_name
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      WHERE t.status NOT IN ('Resolved', 'Closed') AND t.priority IN ('Urgent', 'High')
      ORDER BY t.opened_date DESC
      LIMIT 5
    `);

    res.json({
      overdueActivities,
      todaysActivities,
      urgentTickets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 11. DEMO DATA MANAGEMENT
// ==========================================

// Helper: Get a date relative to today (daysOffset can be negative for past dates)
function relativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function relativeDateTime(daysOffset, hours = 10, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// POST /api/demo/status - Check if demo data is loaded
router.get('/demo/status', async (req, res) => {
  try {
    const companyCount = await get('SELECT COUNT(*) AS count FROM companies');
    const contactCount = await get('SELECT COUNT(*) AS count FROM contacts');
    const dealCount = await get('SELECT COUNT(*) AS count FROM deals');
    const activityCount = await get('SELECT COUNT(*) AS count FROM activities');
    const ticketCount = await get('SELECT COUNT(*) AS count FROM tickets');
    res.json({
      hasData: companyCount.count > 0,
      counts: {
        companies: companyCount.count,
        contacts: contactCount.count,
        deals: dealCount.count,
        activities: activityCount.count,
        tickets: ticketCount.count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/demo/clear - Clear all business data (keeps users)
router.post('/demo/clear', async (req, res) => {
  try {
    await run('DELETE FROM activities');
    await run('DELETE FROM tickets');
    await run('DELETE FROM deals');
    await run('DELETE FROM contacts');
    await run('DELETE FROM companies');
    res.json({ success: true, message: 'All demo data cleared. The CRM is now empty and ready for your real data.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/demo/load - Load rich, realistic demo data
router.post('/demo/load', async (req, res) => {
  try {
    // First clear existing business data
    await run('DELETE FROM activities');
    await run('DELETE FROM tickets');
    await run('DELETE FROM deals');
    await run('DELETE FROM contacts');
    await run('DELETE FROM companies');

    // ── 1. COMPANIES (8 diverse companies) ──────────────────────
    await run(`
      INSERT INTO companies (company_name, industry, size, website, account_owner, notes)
      VALUES 
      ('TechVista Solutions Pvt Ltd', 'Technology', 320, 'https://techvista.io', 'Priya Nair', 'Enterprise SaaS client. Primary contact for API integration project. Annual contract value ~₹65L.'),
      ('Sharma Retail Group', 'Retail', 1800, 'https://sharmaretail.in', 'Vikram Singh', 'Tier-1 account. 1800+ employees across 42 stores nationwide. Expanding to D2C e-commerce. Budget approved for CRM integration.'),
      ('Atlas Aerospace Manufacturing', 'Manufacturing', 85, 'https://atlasaero.co', 'Aarav Mehta', 'Niche precision parts supplier for Indian Space Research. ISO 9001:2015 certified. Long sales cycle.'),
      ('Coral Logistics International', 'Logistics & Supply Chain', 650, 'https://corallogistics.com', 'Priya Nair', 'Cold-chain logistics specialist. Operating in 12 countries. Interested in real-time shipment tracking dashboards.'),
      ('Northwind Financial Services', 'Finance & Banking', 420, 'https://northwindfs.com', 'Aarav Mehta', 'Regulated financial services firm. Requires SOC 2 compliance for all vendor tools. Existing annual renewal.'),
      ('GreenLeaf Organics', 'Agriculture & Food', 95, 'https://greenleaforganics.in', 'Vikram Singh', 'Organic farm-to-table startup. Growing rapidly — 3x revenue YoY. Price-sensitive but high lifetime value potential.'),
      ('Pinnacle Healthcare Systems', 'Healthcare', 1200, 'https://pinnaclehc.com', 'Priya Nair', 'Hospital chain with 6 locations. Needs HIPAA-compliant communication tools. Long procurement process.'),
      ('Nova Digital Media', 'Media & Entertainment', 180, 'https://novadigital.agency', 'Aarav Mehta', 'Creative agency specializing in B2B marketing. Potential reseller/partner for our platform.')
    `);

    const companies = await all("SELECT id, company_name FROM companies ORDER BY id");
    const companyMap = {};
    companies.forEach(c => { companyMap[c.company_name] = c.id; });

    // ── 2. CONTACTS (15 realistic contacts) ──────────────────────
    await run(`
      INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
      VALUES
      ('Aarav Mehta', 'aarav.mehta@techvista.io', '+91 98765 43210', 'CTO', ?, 'Website', 'Qualified', 'VIP, Decision Maker, Tech', ?, 'Highly technical. Prefers detailed API documentation. Responsive on WhatsApp.'),
      ('Riya Sharma', 'riya.sharma@sharmaretail.in', '+91 87654 32109', 'VP Procurement', ?, 'Referral', 'Qualified', 'High Value, Retail, Enterprise', ?, 'Met at the Delhi Retail Expo 2026. Champions our solution internally. Reports to CEO directly.'),
      ('John Carter', 'jcarter@atlasaero.co', '+1 555-0199', 'Operations Director', ?, 'Cold Outreach', 'Active Customer', 'International, Manufacturing', ?, 'US-based. Prefers phone communication. Timezone: EST. Renewed contract in Q1 2026.'),
      ('Priya Nair', 'priya.nair@corallogistics.com', '+91 99988 77766', 'Director of Sales', ?, 'Event/Trade Show', 'Lead', 'Cold Lead, Logistics', ?, 'Requested demo for cold-chain tracking module. Follow up scheduled for next quarter.'),
      ('Vikram Singh', 'v.singh@northwindfs.com', '+91 88877 66655', 'General Manager', ?, 'Social Media', 'Active Customer', 'Partner, Finance', ?, 'Renewed annual services agreement for 2026. Upsell opportunity for compliance module.'),
      ('Ananya Desai', 'ananya.d@greenleaforganics.in', '+91 77766 55544', 'Founder & CEO', ?, 'LinkedIn', 'Lead', 'Startup, Organic, SMB', ?, 'Young entrepreneur. Active on LinkedIn. Responded to our inbound campaign. Budget constrained.'),
      ('Dr. Rajesh Kumar', 'dr.kumar@pinnaclehc.com', '+91 96655 44332', 'Chief Medical Officer', ?, 'Referral', 'Qualified', 'Healthcare, Enterprise, HIPAA', ?, 'Key stakeholder. Needs patient communication platform. Compliance-first mindset.'),
      ('Meera Joshi', 'meera.j@novadigital.agency', '+91 85544 33221', 'Creative Director', ?, 'Website', 'Active Customer', 'Agency, Partner, Creative', ?, 'Exploring partnership model. Could resell our CRM to their client base.'),
      ('Sameer Patel', 's.patel@techvista.io', '+91 93456 78901', 'VP Engineering', ?, 'Website', 'Active Customer', 'Tech, Engineering', ?, 'Secondary contact at TechVista. Works closely with Aarav on integration decisions.'),
      ('Nisha Agarwal', 'nisha.a@sharmaretail.in', '+91 82345 67890', 'Head of Digital', ?, 'Referral', 'Qualified', 'Digital, E-commerce', ?, 'Leading the D2C initiative. Needs CRM + marketing automation bundle.'),
      ('David Chen', 'd.chen@atlasaero.co', '+1 555-0234', 'Finance Controller', ?, 'Cold Outreach', 'Lead', 'Finance, International', ?, 'Handles all vendor billing. Will be involved in contract renewal discussions.'),
      ('Kavitha Rao', 'kavitha.r@corallogistics.com', '+91 98765 12345', 'IT Head', ?, 'Event/Trade Show', 'Qualified', 'IT, Infrastructure', ?, 'Technical evaluator for the tracking dashboard. Needs API specs.'),
      ('Arjun Reddy', 'arjun.r@pinnaclehc.com', '+91 87654 98765', 'Hospital Administrator', ?, 'Cold Outreach', 'Lead', 'Admin, Healthcare', ?, 'Operations person. Will coordinate pilot at Hyderabad facility.'),
      ('Fatima Khan', 'fatima.k@novadigital.agency', '+91 76543 21098', 'Account Manager', ?, 'Website', 'Active Customer', 'Account Mgmt, Agency', ?, 'Day-to-day liaison for partnership activities. Very organized.'),
      ('Rohit Gupta', 'rohit.g@greenleaforganics.in', '+91 65432 10987', 'Operations Lead', ?, 'LinkedIn', 'Lead', 'Operations, SMB', ?, 'Handles supply chain. Interested in order tracking features.')
    `, [
      companyMap['TechVista Solutions Pvt Ltd'], relativeDate(-2),
      companyMap['Sharma Retail Group'], relativeDate(-1),
      companyMap['Atlas Aerospace Manufacturing'], relativeDate(-4),
      companyMap['Coral Logistics International'], relativeDate(-25),
      companyMap['Northwind Financial Services'], relativeDate(-3),
      companyMap['GreenLeaf Organics'], relativeDate(-7),
      companyMap['Pinnacle Healthcare Systems'], relativeDate(-5),
      companyMap['Nova Digital Media'], relativeDate(-1),
      companyMap['TechVista Solutions Pvt Ltd'], relativeDate(-6),
      companyMap['Sharma Retail Group'], relativeDate(-3),
      companyMap['Atlas Aerospace Manufacturing'], relativeDate(-14),
      companyMap['Coral Logistics International'], relativeDate(-8),
      companyMap['Pinnacle Healthcare Systems'], relativeDate(-10),
      companyMap['Nova Digital Media'], relativeDate(-2),
      companyMap['GreenLeaf Organics'], relativeDate(-12)
    ]);

    const contacts = await all("SELECT id, name FROM contacts ORDER BY id");
    const contactMap = {};
    contacts.forEach(c => { contactMap[c.name] = c.id; });

    // Update primary contacts for companies
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Aarav Mehta'], companyMap['TechVista Solutions Pvt Ltd']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Riya Sharma'], companyMap['Sharma Retail Group']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['John Carter'], companyMap['Atlas Aerospace Manufacturing']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Priya Nair'], companyMap['Coral Logistics International']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Vikram Singh'], companyMap['Northwind Financial Services']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Ananya Desai'], companyMap['GreenLeaf Organics']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Dr. Rajesh Kumar'], companyMap['Pinnacle Healthcare Systems']]);
    await run('UPDATE companies SET primary_contact_id = ? WHERE id = ?', [contactMap['Meera Joshi'], companyMap['Nova Digital Media']]);

    // ── 3. DEALS (10 deals across all pipeline stages) ──────────
    await run(`
      INSERT INTO deals (deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason)
      VALUES
      ('TechVista Enterprise API Integration', ?, ?, 'Negotiation', 850000, 0.75, ?, 'Priya Nair', 'Website', NULL),
      ('Sharma Retail Cloud Migration Suite', ?, ?, 'Proposal Sent', 1250000, 0.50, ?, 'Vikram Singh', 'Referral', NULL),
      ('Atlas Custom Precision Fittings Q3', ?, ?, 'New Lead', 175000, 0.15, ?, 'Aarav Mehta', 'Cold Outreach', NULL),
      ('Coral Cold-Chain Tracking Dashboard', ?, ?, 'Qualified', 620000, 0.35, ?, 'Priya Nair', 'Event/Trade Show', NULL),
      ('Northwind Annual License Renewal 2026', ?, ?, 'Won', 290000, 1.00, ?, 'Aarav Mehta', 'Social Media', NULL),
      ('GreenLeaf CRM Starter Package', ?, ?, 'Proposal Sent', 85000, 0.40, ?, 'Vikram Singh', 'LinkedIn', NULL),
      ('Pinnacle Patient Communication Platform', ?, ?, 'Qualified', 980000, 0.30, ?, 'Priya Nair', 'Referral', NULL),
      ('Nova Digital Reseller Partnership', ?, ?, 'Negotiation', 340000, 0.65, ?, 'Aarav Mehta', 'Website', NULL),
      ('Sharma D2C E-Commerce Integration', ?, ?, 'New Lead', 420000, 0.10, ?, 'Vikram Singh', 'Referral', NULL),
      ('Atlas Legacy POS System Upgrade', ?, ?, 'Lost', 195000, 0.00, ?, 'Aarav Mehta', 'Cold Outreach', 'Competitor offered lower pricing with bundled support. Client went with TCS solution.')
    `, [
      contactMap['Aarav Mehta'], companyMap['TechVista Solutions Pvt Ltd'], relativeDate(30),
      contactMap['Riya Sharma'], companyMap['Sharma Retail Group'], relativeDate(75),
      contactMap['John Carter'], companyMap['Atlas Aerospace Manufacturing'], relativeDate(110),
      contactMap['Priya Nair'], companyMap['Coral Logistics International'], relativeDate(90),
      contactMap['Vikram Singh'], companyMap['Northwind Financial Services'], relativeDate(-20),
      contactMap['Ananya Desai'], companyMap['GreenLeaf Organics'], relativeDate(45),
      contactMap['Dr. Rajesh Kumar'], companyMap['Pinnacle Healthcare Systems'], relativeDate(120),
      contactMap['Meera Joshi'], companyMap['Nova Digital Media'], relativeDate(35),
      contactMap['Nisha Agarwal'], companyMap['Sharma Retail Group'], relativeDate(60),
      contactMap['David Chen'], companyMap['Atlas Aerospace Manufacturing'], relativeDate(-60)
    ]);

    const deals = await all("SELECT id, deal_name FROM deals ORDER BY id");
    const dealMap = {};
    deals.forEach(d => { dealMap[d.deal_name] = d.id; });

    // ── 4. ACTIVITIES (18 activities with realistic timelines) ──
    await run(`
      INSERT INTO activities (date, type, contact_id, deal_id, notes, next_action, next_action_date)
      VALUES
      (?, 'Call', ?, ?, 'Discussed Q3 contract renewal terms. Aarav wants custom webhook support added to the API tier. Agreed to send updated pricing by EOW.', 'Send revised pricing with webhook tier', ?),
      (?, 'Email', ?, ?, 'Sent comprehensive proposal deck (42 slides) with ROI projections, implementation timeline, and volume discount matrix. CC''d Nisha from digital team.', 'Follow up on proposal feedback', ?),
      (?, 'WhatsApp Message', ?, NULL, 'John confirmed sample shipment received. Quality check passed. Shared updated tracking link for batch #07.', 'Schedule quality review call', ?),
      (?, 'Meeting', ?, ?, 'Annual business review — 90-min session. Client rated satisfaction 9/10. Discussed expanding to their Mumbai office. Vikram will champion internally.', 'Prepare expansion proposal', ?),
      (?, 'Demo', ?, ?, 'Product demo: cold-chain monitoring dashboard walkthrough. Kavitha (IT Head) joined. They need SSO integration with their Azure AD.', 'Send SSO integration documentation', ?),
      (?, 'Note', ?, NULL, 'Initial discovery call notes: Ananya bootstrapping with limited budget. Recommended starter plan. She''ll discuss with co-founder next week.', 'Follow up after co-founder discussion', ?),
      (?, 'Call', ?, ?, 'Dr. Kumar reviewed compliance checklist. 3 out of 14 items need additional documentation from our side. Legal team engaged.', 'Submit HIPAA compliance addendum', ?),
      (?, 'Email', ?, ?, 'Sent partnership MOU draft to Meera. Revenue share model: 15% on referred deals. She flagged one clause for legal review.', 'Schedule call to finalize MOU terms', ?),
      (?, 'Meeting', ?, ?, 'Technical deep-dive with Sameer and their DevOps team. Reviewed API rate limits, authentication flows, and webhook retry policies.', 'Share API sandbox credentials', ?),
      (?, 'WhatsApp Message', ?, NULL, 'Riya asked about implementation timeline. Confirmed 6-8 weeks from contract signature. She wants to launch before Diwali season.', 'Send implementation timeline document', ?),
      (?, 'Call', ?, ?, 'Pricing negotiation round 2. Meera wants annual billing with 90-day exit clause. We countered with 60-day notice period.', 'Draft final partnership agreement', ?),
      (?, 'Email', ?, NULL, 'Fatima shared their client list — 23 potential accounts for resale. Categorized by industry and company size for our analysis.', 'Analyze resale pipeline and respond', ?),
      (?, 'Demo', ?, ?, 'Walked Nisha through the D2C module features. She was impressed by the customer journey mapping. Wants to see inventory integration next.', 'Prepare inventory integration demo', ?),
      (?, 'Note', ?, NULL, 'Kavitha mentioned their current vendor contract expires in September. Window of opportunity to position our solution before renewal.', 'Schedule pre-renewal competitive pitch', ?),
      (?, 'Call', ?, NULL, 'Rohit interested in supply chain tracking. Explained how our logistics module works. He needs CSV import for 200+ SKUs.', 'Send CSV template for SKU import', ?),
      (?, 'Meeting', ?, ?, 'Arjun coordinated a site visit at Pinnacle Hyderabad. Toured the facility, identified 3 departments for pilot deployment.', 'Create pilot deployment plan', ?),
      (?, 'WhatsApp Message', ?, NULL, 'David asked about invoice format for US entity billing. Shared our W-8BEN form and wire transfer details.', 'Confirm payment terms with finance', ?),
      (?, 'Email', ?, ?, 'Sent Ananya a customized ROI calculator showing 2.3x return in Year 1. Included case studies from similar-sized organic brands.', 'Follow up on ROI analysis feedback', ?)
    `, [
      relativeDateTime(-1, 17, 30), contactMap['Aarav Mehta'], dealMap['TechVista Enterprise API Integration'], relativeDate(2),
      relativeDateTime(-1, 14, 0), contactMap['Riya Sharma'], dealMap['Sharma Retail Cloud Migration Suite'], relativeDate(5),
      relativeDateTime(-2, 11, 15), contactMap['John Carter'], relativeDate(3),
      relativeDateTime(-3, 10, 0), contactMap['Vikram Singh'], dealMap['Northwind Annual License Renewal 2026'], relativeDate(14),
      relativeDateTime(-4, 15, 0), contactMap['Priya Nair'], dealMap['Coral Cold-Chain Tracking Dashboard'], relativeDate(-1),
      relativeDateTime(-5, 9, 30), contactMap['Ananya Desai'], relativeDate(-2),
      relativeDateTime(-5, 14, 0), contactMap['Dr. Rajesh Kumar'], dealMap['Pinnacle Patient Communication Platform'], relativeDate(7),
      relativeDateTime(-2, 16, 0), contactMap['Meera Joshi'], dealMap['Nova Digital Reseller Partnership'], relativeDate(4),
      relativeDateTime(-6, 10, 30), contactMap['Sameer Patel'], dealMap['TechVista Enterprise API Integration'], relativeDate(0),
      relativeDateTime(-1, 18, 45), contactMap['Riya Sharma'], relativeDate(1),
      relativeDateTime(-3, 11, 0), contactMap['Meera Joshi'], dealMap['Nova Digital Reseller Partnership'], relativeDate(3),
      relativeDateTime(-7, 13, 30), contactMap['Fatima Khan'], relativeDate(-4),
      relativeDateTime(-4, 14, 30), contactMap['Nisha Agarwal'], dealMap['Sharma D2C E-Commerce Integration'], relativeDate(7),
      relativeDateTime(-8, 9, 0), contactMap['Kavitha Rao'], relativeDate(-3),
      relativeDateTime(-10, 16, 0), contactMap['Rohit Gupta'], relativeDate(-5),
      relativeDateTime(-6, 11, 0), contactMap['Arjun Reddy'], dealMap['Pinnacle Patient Communication Platform'], relativeDate(10),
      relativeDateTime(-14, 10, 0), contactMap['David Chen'], relativeDate(-7),
      relativeDateTime(-3, 15, 30), contactMap['Ananya Desai'], dealMap['GreenLeaf CRM Starter Package'], relativeDate(0)
    ]);

    // ── 5. TICKETS (8 support tickets) ──────────────────────────
    await run(`
      INSERT INTO tickets (contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date)
      VALUES
      (?, 'Service Issue', 'API endpoint /v2/webhooks returning 500 error intermittently during peak hours (2-4 PM IST). Aarav reports 3 incidents this week. Affecting their production integration.', 'Open', 'High', 'Priya Nair', ?, NULL),
      (?, 'Billing', 'Invoice #INV-2026-0847 shows incorrect GST calculation (18% applied instead of negotiated 12% composite rate). Discrepancy of ₹42,000. Finance team flagged.', 'In Progress', 'Medium', 'Vikram Singh', ?, NULL),
      (?, 'Delivery Delay', 'Precision aerospace component batch #04-AE stuck at Mumbai customs for 8 days. Import duty classification dispute. John needs expedited clearance for SpaceX deadline.', 'Waiting on Customer', 'Urgent', 'Aarav Mehta', ?, NULL),
      (?, 'General Inquiry', 'Vikram requested detailed documentation on our ISO-27001 compliance certification and SOC 2 Type II audit report for their vendor review committee.', 'Resolved', 'Low', 'Priya Nair', ?, ?),
      (?, 'Product Defect', 'Mobile app (Android) crashes when viewing deals pipeline with more than 50 deals. Memory overflow suspected. Meera reported on 3 different devices.', 'Open', 'High', 'Aarav Mehta', ?, NULL),
      (?, 'Service Issue', 'SSO login failing for Pinnacle users after Azure AD tenant migration. Dr. Kumar''s team of 12 doctors unable to access patient communication module.', 'In Progress', 'Urgent', 'Priya Nair', ?, NULL),
      (?, 'General Inquiry', 'Ananya wants to know if we offer a startup discount or incubator pricing. Forwarded to partnerships team for approval.', 'Open', 'Low', 'Vikram Singh', ?, NULL),
      (?, 'Billing', 'Wire transfer from Atlas US entity received but not reflected in account. David shared SWIFT confirmation #MT103-2026-0612. Bank reconciliation needed.', 'Waiting on Customer', 'Medium', 'Aarav Mehta', ?, NULL)
    `, [
      contactMap['Aarav Mehta'], relativeDate(-4),
      contactMap['Riya Sharma'], relativeDate(-3),
      contactMap['John Carter'], relativeDate(-5),
      contactMap['Vikram Singh'], relativeDate(-9), relativeDate(-7),
      contactMap['Meera Joshi'], relativeDate(-2),
      contactMap['Dr. Rajesh Kumar'], relativeDate(-1),
      contactMap['Ananya Desai'], relativeDate(-6),
      contactMap['David Chen'], relativeDate(-3)
    ]);

    // Get final counts
    const finalCounts = {
      companies: (await get('SELECT COUNT(*) AS count FROM companies')).count,
      contacts: (await get('SELECT COUNT(*) AS count FROM contacts')).count,
      deals: (await get('SELECT COUNT(*) AS count FROM deals')).count,
      activities: (await get('SELECT COUNT(*) AS count FROM activities')).count,
      tickets: (await get('SELECT COUNT(*) AS count FROM tickets')).count,
    };

    res.json({
      success: true,
      message: 'Demo data loaded successfully! Your CRM is now populated with realistic sample data.',
      counts: finalCounts
    });

  } catch (error) {
    console.error('Demo data load failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

