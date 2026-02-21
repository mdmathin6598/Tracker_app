const { loadSchema, buildCreateTableStatements } = require('../index');

describe('loadSchema', () => {
  it('loads and parses schema.json', () => {
    const schema = loadSchema();
    expect(schema).toHaveProperty('tables');
    expect(Array.isArray(schema.tables)).toBe(true);
    expect(schema.tables.length).toBeGreaterThan(0);
    expect(schema.tables[0]).toHaveProperty('name', 'tasks');
    expect(schema.tables[0]).toHaveProperty('columns');
    expect(schema).toHaveProperty('seed');
  });
});

describe('buildCreateTableStatements', () => {
  it('builds CREATE TABLE statements from schema', () => {
    const schema = loadSchema();
    const statements = buildCreateTableStatements(schema);
    expect(statements.length).toBe(1);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS');
    expect(statements[0]).toContain('"tasks"');
    expect(statements[0]).toContain('"id"');
    expect(statements[0]).toContain('"title"');
  });
});