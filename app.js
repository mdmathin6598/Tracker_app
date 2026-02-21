const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

let pool;

function setPool(p) {
  pool = p;
}

// Serve web UI (must be before API routes that might shadow static paths)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// POST /tasks - Create a new task
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, status } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'title is required and must be a non-empty string',
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status)
       VALUES ($1, $2, COALESCE($3, 'pending'))
       RETURNING id, title, description, status, created_at, updated_at`,
      [title.trim(), description || null, status || 'pending']
    );

    const task = result.rows[0];
    res.status(201).json(task);
  } catch (err) {
    console.error('POST /tasks error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// GET /tasks - List all tasks
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, status, created_at, updated_at
       FROM tasks
       ORDER BY created_at DESC`
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('GET /tasks error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Health check (optional, useful for Docker/load balancers)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

module.exports = { app, setPool };
