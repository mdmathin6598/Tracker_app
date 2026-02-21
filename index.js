require('dotenv').config();
const { Pool } = require('pg');

const { app, setPool } = require('./app');
const { loadSchema, buildCreateTableStatements } = require('./schema-utils');

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

async function runSchemaSetup(pool) {
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
// Start server after DB connection and schema setup
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    validateDbConfig();
    const pool = new Pool({
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
        break;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        console.log(`Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setPool(pool);
    await runSchemaSetup(pool);

    app.listen(PORT, () => {
      console.log(`Task Tracker listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start application:', err.message);
    if (err.code) console.error('Error code:', err.code);
    process.exit(1);
  }
}

start();
