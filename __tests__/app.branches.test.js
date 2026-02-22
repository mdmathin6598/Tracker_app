const request = require('supertest');
const { app, setPool } = require('../app');

describe('App branch coverage tests', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };
    setPool(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  it('GET /tasks returns empty array when no tasks', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  it('GET /tasks returns tasks array', async () => {
    const mockTasks = [{ id: 1, title: 'Task 1', description: 'Desc', status: 'pending' }];
    mockPool.query.mockResolvedValue({ rows: mockTasks });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual(mockTasks);
  });

  it('GET /tasks shows detailed error in development', async () => {
    process.env.NODE_ENV = 'development';
    mockPool.query.mockRejectedValue(new Error('DB fail'));

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.message).toBe('DB fail');
  });

  it('GET /tasks hides error message in production', async () => {
    process.env.NODE_ENV = 'production';
    mockPool.query.mockRejectedValue(new Error('DB fail'));

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.message).toBeUndefined();
  });

  // -----------------------------
  it('POST /tasks creates a task successfully', async () => {
    const newTask = { id: 1, title: 'Task 1', description: 'Desc', status: 'pending' };
    mockPool.query.mockResolvedValue({ rows: [newTask] });

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task 1', description: 'Desc' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(newTask.title);
  });

  it('POST /tasks returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'Desc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  it('POST /tasks shows detailed error in development', async () => {
    process.env.NODE_ENV = 'development';
    mockPool.query.mockRejectedValue(new Error('Insert failed'));

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', description: 'desc' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.message).toBe('Insert failed');
  });

  it('POST /tasks hides error message in production', async () => {
    process.env.NODE_ENV = 'production';
    mockPool.query.mockRejectedValue(new Error('Insert failed'));

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', description: 'desc' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.message).toBeUndefined();
  });
});