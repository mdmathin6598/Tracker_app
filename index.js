require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Serve web UI (must be before API routes that might shadow static paths)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// ---------------------------------------------------------------------------
// Database configuration from environment variables (AWS RDS / PostgreSQL)
// ---------------------------------------------------------------------------
const dbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  user: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  database: process.env.PGDATABASE || process.env.DB_NAME,
};

/* istanbul ignore next */
function validateDbConfig() {
  const required = ['user', 'password', 'database'];
  const missing = required.filter((key) => !dbConfig[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}. ` +
        'Set PGUSER/DB_USER, PGPASSWORD/DB_PASSWORD, PGDATABASE/DB_NAME (and optionally PGHOST/DB_HOST, PGPORT/DB_PORT).'
    );
  }
}

let pool;

/* istanbul ignore next */
async function connectDatabase() {
  validateDbConfig();
  pool = new Pool({
    ...dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const maxAttempts = 30;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.log(`Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// ---------------------------------------------------------------------------
// Schema setup: read schema.json and execute DDL + optional seed
// ---------------------------------------------------------------------------
function loadSchema() {
  const schemaPath = path.join(__dirname, 'schema.json');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  const raw = fs.readFileSync(schemaPath, 'utf8');
  return JSON.parse(raw);
}

function buildCreateTableStatements(schema) {
  const statements = [];
  for (const table of schema.tables || []) {
    const ifNotExists = table.ifNotExists ? ' IF NOT EXISTS' : '';
    const cols = (table.columns || [])
      .map((c) => `"${c.name}" ${c.definition}`)
      .join(', ');
    statements.push(
      `CREATE TABLE${ifNotExists} "${table.name}" (${cols});`
    );
  }
  return statements;
}

/* istanbul ignore next */
async function runSchemaSetup() {
  const schema = loadSchema();
  const client = await pool.connect();

  try {
    for (const sql of buildCreateTableStatements(schema)) {
      await client.query(sql);
    }

    if (schema.seed && typeof schema.seed === 'object') {
      for (const [tableName, rows] of Object.entries(schema.seed)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const countResult = await client.query(
          `SELECT COUNT(*) FROM "${tableName}"`
        );
        if (parseInt(countResult.rows[0].count, 10) > 0) continue;
        const keys = Object.keys(rows[0]);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const insertSql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders});`;
        for (const row of rows) {
          const values = keys.map((k) => row[k]);
          await client.query(insertSql, values);
        }
      }
    }
  } finally {
    client.release();
  }
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

// ---------------------------------------------------------------------------
// Start server after DB connection and schema setup
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10);

/* istanbul ignore next */
async function start() {
  try {
    await connectDatabase();
    await runSchemaSetup();
    app.listen(PORT, () => {
      console.log(`Task Tracker listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start application:', err.message);
    if (err.code) console.error('Error code:', err.code);
    process.exit(1);
  }
}

// Export for tests; only start server when run directly
module.exports = { app, setPool: (p) => { pool = p; }, loadSchema, buildCreateTableStatements };
/* istanbul ignore if */
if (require.main === module) start();

//start();