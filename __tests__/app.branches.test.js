const request = require('supertest');
const { app, setPool } = require('../app');

describe('App branch coverage tests', () => {
  // Mock DB pool to simulate errors
  const mockErrorPool = {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockRejectedValue(new Error('DB fail')),
      release: jest.fn(),
    }),
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -----------------------------
  // GET /tasks error branch
  // -----------------------------
  it('GET /tasks returns 500 on DB error', async () => {
    setPool(mockErrorPool); // Inject failing pool
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
    setPool(mockErrorPool); // Inject failing pool
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task causing DB error' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  // -----------------------------
  // Optional: test development error message
  // -----------------------------
  it('GET /tasks shows detailed error in development', async () => {
    process.env.NODE_ENV = 'development';
    setPool(mockErrorPool);
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('DB fail');
  });
});