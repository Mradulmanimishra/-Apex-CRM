const express = require('express');
const router = express.Router();
const db = require('./database');

// ==========================================
// 1. DASHBOARD ENDPOINT
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
    const dealStats = await db.all(`
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
    const keyMetricsRow = await db.get(`
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
    const activeCustomersRow = await db.get(activeCustomersQuery, activeCustomersParams);

    // Open tickets
    let openTicketsQuery = "SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('Resolved', 'Closed')";
    let openTicketsParams = [];
    if (owner && owner !== 'All' && owner !== '') {
      openTicketsQuery = "SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('Resolved', 'Closed') AND assigned_to = ?";
      openTicketsParams = [owner];
    }
    const openTicketsRow = await db.get(openTicketsQuery, openTicketsParams);

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
    const upcomingFollowups = await db.all(upcomingQuery, upcomingParams);

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
    const ticketPriorityStats = await db.all(ticketPriorityQuery, ticketPriorityParams);

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
      ticketPriorities
    });
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CONTACTS API
// ==========================================
router.get('/contacts', async (req, res) => {
  try {
    const rows = await db.all(`
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
    const contact = await db.get('SELECT c.*, comp.company_name FROM contacts c LEFT JOIN companies comp ON c.company_id = comp.id WHERE c.id = ?', [req.params.id]);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Fetch related information
    const companies = await db.all('SELECT * FROM companies WHERE primary_contact_id = ? OR id = ?', [contact.id, contact.company_id]);
    const deals = await db.all('SELECT * FROM deals WHERE contact_id = ?', [contact.id]);
    const activities = await db.all('SELECT * FROM activities WHERE contact_id = ? ORDER BY date DESC', [contact.id]);
    const tickets = await db.all('SELECT * FROM tickets WHERE contact_id = ? ORDER BY opened_date DESC', [contact.id]);

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
    const result = await db.run(`
      INSERT INTO contacts (name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email, phone, role_title, company_id || null, source, status || 'Lead', tags, last_contact_date, notes]);

    const newContact = await db.get('SELECT * FROM contacts WHERE id = ?', [result.lastID]);
    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/contacts/:id', async (req, res) => {
  const { name, email, phone, role_title, company_id, source, status, tags, last_contact_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    await db.run(`
      UPDATE contacts
      SET name = ?, email = ?, phone = ?, role_title = ?, company_id = ?, source = ?, status = ?, tags = ?, last_contact_date = ?, notes = ?
      WHERE id = ?
    `, [name, email, phone, role_title, company_id || null, source, status, tags, last_contact_date, notes, req.params.id]);

    const updatedContact = await db.get('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    res.json(updatedContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. COMPANIES API
// ==========================================
router.get('/companies', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT comp.*, cont.name as primary_contact_name 
      FROM companies comp
      LEFT JOIN contacts cont ON comp.primary_contact_id = cont.id
      ORDER BY comp.company_name ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/companies', async (req, res) => {
  const { company_name, industry, size, website, primary_contact_id, account_owner, notes } = req.body;
  if (!company_name) return res.status(400).json({ error: 'Company name is required' });

  try {
    const result = await db.run(`
      INSERT INTO companies (company_name, industry, size, website, primary_contact_id, account_owner, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [company_name, industry, size || null, website, primary_contact_id || null, account_owner, notes]);

    const newCompany = await db.get('SELECT * FROM companies WHERE id = ?', [result.lastID]);
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/companies/:id', async (req, res) => {
  const { company_name, industry, size, website, primary_contact_id, account_owner, notes } = req.body;
  if (!company_name) return res.status(400).json({ error: 'Company name is required' });

  try {
    await db.run(`
      UPDATE companies
      SET company_name = ?, industry = ?, size = ?, website = ?, primary_contact_id = ?, account_owner = ?, notes = ?
      WHERE id = ?
    `, [company_name, industry, size || null, website, primary_contact_id || null, account_owner, notes, req.params.id]);

    const updatedCompany = await db.get('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    res.json(updatedCompany);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/companies/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. DEALS API
// ==========================================
router.get('/deals', async (req, res) => {
  try {
    const rows = await db.all(`
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
    const result = await db.run(`
      INSERT INTO deals (deal_name, contact_id, company_id, stage, value, probability, expected_close_date, owner, source, lost_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [deal_name, contact_id || null, company_id || null, stage, value || 0, probability || 0, expected_close_date, owner, source, lost_reason]);

    const newDeal = await db.get('SELECT * FROM deals WHERE id = ?', [result.lastID]);
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
    await db.run(`
      UPDATE deals
      SET deal_name = ?, contact_id = ?, company_id = ?, stage = ?, value = ?, probability = ?, expected_close_date = ?, owner = ?, source = ?, lost_reason = ?
      WHERE id = ?
    `, [deal_name, contact_id || null, company_id || null, stage, value || 0, probability || 0, expected_close_date, owner, source, lost_reason, req.params.id]);

    const updatedDeal = await db.get('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    res.json(updatedDeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/deals/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. ACTIVITIES API
// ==========================================
router.get('/activities', async (req, res) => {
  try {
    const rows = await db.all(`
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
    const result = await db.run(`
      INSERT INTO activities (date, type, contact_id, deal_id, notes, next_action, next_action_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [date, type, contact_id || null, deal_id || null, notes, next_action, next_action_date]);

    // Also update the last contact date for the contact
    if (contact_id) {
      const justDate = date.split('T')[0];
      await db.run('UPDATE contacts SET last_contact_date = ? WHERE id = ?', [justDate, contact_id]);
    }

    const newActivity = await db.get('SELECT * FROM activities WHERE id = ?', [result.lastID]);
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
    await db.run(`
      UPDATE activities
      SET date = ?, type = ?, contact_id = ?, deal_id = ?, notes = ?, next_action = ?, next_action_date = ?
      WHERE id = ?
    `, [date, type, contact_id || null, deal_id || null, notes, next_action, next_action_date, req.params.id]);

    const updatedActivity = await db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/activities/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. TICKETS API
// ==========================================
router.get('/tickets', async (req, res) => {
  try {
    const rows = await db.all(`
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
    const result = await db.run(`
      INSERT INTO tickets (contact_id, issue_type, description, status, priority, assigned_to, opened_date, resolved_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [contact_id || null, issue_type, description, status, priority, assigned_to, opened_date, resolved_date || null]);

    const newTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [result.lastID]);
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
    await db.run(`
      UPDATE tickets
      SET contact_id = ?, issue_type = ?, description = ?, status = ?, priority = ?, assigned_to = ?, opened_date = ?, resolved_date = ?
      WHERE id = ?
    `, [contact_id || null, issue_type, description, status, priority, assigned_to, opened_date, resolved_date || null, req.params.id]);

    const updatedTicket = await db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tickets/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM tickets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
