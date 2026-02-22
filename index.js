require('dotenv').config();
const { Pool } = require('pg');
const { app, setPool } = require('./app');
const { loadSchema, buildCreateTableStatements } = require('./schema-utils');

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
      `Missing required database environment variables: ${missing.join(', ')}`
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
  } finally {
    client.release();
  }
}

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  validateDbConfig();

  const pool = new Pool({ ...dbConfig, max: 20 });

  // Test DB connection once
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();

  setPool(pool);
  await runSchemaSetup(pool);

  return app.listen(PORT, () => {
    console.log(`Task Tracker listening on http://localhost:${PORT}`);
  });
}

/*
  IMPORTANT:
  Only auto-start the server if this file is run directly.
  When Jest imports it, this will NOT execute.
*/
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start application:', err.message);
    if (err.code) console.error('Error code:', err.code);
    process.exit(1);
  });
}

module.exports = { start };