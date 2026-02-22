const { loadSchema, buildCreateTableStatements } = require('../schema-utils');

describe('schema-utils', () => {
  it('can load schema.json', () => {
    const schema = loadSchema();
    expect(schema).toHaveProperty('tables');
  });

  it('builds SQL create statements', () => {
    const schema = {
      tables: [
        {
          name: 'foo',
          ifNotExists: true,
          columns: [{ name: 'id', definition: 'SERIAL PRIMARY KEY' }],
        },
      ],
    };
    const stmts = buildCreateTableStatements(schema);
    expect(stmts).toEqual([
      'CREATE TABLE IF NOT EXISTS "foo" ("id" SERIAL PRIMARY KEY);',
    ]);
  });
});