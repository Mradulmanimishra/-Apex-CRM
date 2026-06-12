const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend development server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Wire api routes
app.use('/api', routes);

// Serve static assets if in production (future support)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('CRM backend is running. API endpoints at /api/...');
  });
}

// Start database then start listener
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`- Dashboard API: http://localhost:${PORT}/api/dashboard`);
    console.log(`- Contacts API: http://localhost:${PORT}/api/contacts`);
  });
}).catch(err => {
  console.error('Failed to initialize database, server not started:', err);
});
