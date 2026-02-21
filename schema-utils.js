const fs = require('fs');
const path = require('path');

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

module.exports = { loadSchema, buildCreateTableStatements };
