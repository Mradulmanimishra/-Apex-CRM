const express = require('express');
const router = express.Router();
const db = require('./database');
const { requireRole } = require('./auth');

// Create a new company
router.post('/', requireRole(['Admin']), async (req, res) => {
  const { company_name, industry, size, website, primary_contact_id, account_owner, notes } = req.body;
  if (!company_name) {
    return res.status(400).json({ error: 'company_name is required' });
  }
  try {
    const result = await db.run(`INSERT INTO companies (company_name, industry, size, website, primary_contact_id, account_owner, notes) VALUES (?,?,?,?,?,?,?)`,
      [company_name, industry, size, website, primary_contact_id || null, account_owner, notes]);
    res.status(201).json({ id: result.lastID, message: 'Company created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get all companies
router.get('/', async (req, res) => {
  try {
    const companies = await db.all(`
      SELECT c.*, con.name AS primary_contact_name
      FROM companies c
      LEFT JOIN contacts con ON c.primary_contact_id = con.id
    `);
    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get a single company by id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const company = await db.get(`
      SELECT c.*, con.name AS primary_contact_name
      FROM companies c
      LEFT JOIN contacts con ON c.primary_contact_id = con.id
      WHERE c.id = ?
    `, [id]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Update a company
router.put('/:id', requireRole(['Admin']), async (req, res) => {
  const { id } = req.params;
  const { company_name, industry, size, website, primary_contact_id, account_owner, notes } = req.body;
  try {
    await db.run(`UPDATE companies SET company_name = ?, industry = ?, size = ?, website = ?, primary_contact_id = ?, account_owner = ?, notes = ? WHERE id = ?`,
      [company_name, industry, size, website, primary_contact_id || null, account_owner, notes, id]);
    res.json({ message: 'Company updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete a company
router.delete('/:id', requireRole(['Admin']), async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM companies WHERE id = ?', [id]);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

module.exports = router;
