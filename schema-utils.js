const fs = require('fs');
const path = require('path');

function loadSchema() {
  const filePath = path.join(__dirname, 'schema.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function buildCreateTableStatements(schema) {
  return schema.tables.map((table) => {
    const columns = table.columns
      .map((col) => `"${col.name}" ${col.definition}`)
      .join(', ');

    const ifNotExists = table.ifNotExists ? 'IF NOT EXISTS ' : '';
    return `CREATE TABLE ${ifNotExists}"${table.name}" (${columns});`;
  });
}

module.exports = {
  loadSchema,
  buildCreateTableStatements,
};