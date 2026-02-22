const request = require('supertest');
const { app, setPool } = require('../app');

describe('App branch coverage tests', () => {
  // Helper: mock a pool that throws errors on query
  const createErrorPool = (errorMessage = 'DB fail') => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockRejectedValue(new Error(errorMessage)),
      release: jest.fn(),
    }),
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env.NODE_ENV = 'test'; // reset NODE_ENV
  });

  // -----------------------------
  // GET /tasks error branch
  // -----------------------------
  it('GET /tasks returns 500 on DB error', async () => {
    setPool(createErrorPool());
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Internal server error');
  });

  // -----------------------------
  // POST /tasks missing title branch
  // -----------------------------
  it('POST /tasks returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'No title provided' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // -----------------------------
  // POST /tasks DB error branch
  // -----------------------------
  it('POST /tasks returns 500 on DB error', async () => {
    setPool(createErrorPool());
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task causing DB error' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Internal server error');
  });

  // -----------------------------
  // GET /tasks shows detailed error in development
  // -----------------------------
  it('GET /tasks shows detailed error in development', async () => {
    process.env.NODE_ENV = 'development';
    setPool(createErrorPool('DB fail'));

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('DB fail');
  });

  // -----------------------------
  // POST /tasks shows detailed error in development
  // -----------------------------
  it('POST /tasks shows detailed error in development', async () => {
    process.env.NODE_ENV = 'development';
    setPool(createErrorPool('Insert failed'));

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test task', description: 'desc' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Insert failed');
  });
});