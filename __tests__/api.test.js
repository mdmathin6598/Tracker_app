/* eslint-env jest */
const request = require('supertest');

let app;
let setPool;
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

describe('API', () => {
  beforeAll(() => {
    const appModule = require('../app');
    app = appModule.app;
    setPool = appModule.setPool;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setPool(mockPool);
  });

  it('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('GET /tasks returns tasks from database', async () => {
    const mockTasks = [
      { id: 1, title: 'Test', description: 'Desc', status: 'pending', created_at: new Date(), updated_at: new Date() },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockTasks });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(res.body.tasks).toEqual(mockTasks);
  });

  it('GET /tasks returns empty array when no tasks', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  it('GET /tasks returns 500 on database error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
  });

  it('POST /tasks creates a task successfully', async () => {
    const newTask = {
      id: 1,
      title: 'New task',
      description: 'Optional desc',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockPool.query.mockResolvedValueOnce({ rows: [newTask] });

    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', description: 'Optional desc' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTask);
  });

  it('POST /tasks returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('title is required');
  });

  it('POST /tasks returns 400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('title is required');
  });

  it('POST /tasks returns 400 when title is not a string', async () => {
    const res = await request(app).post('/tasks').send({ title: 123 });
    expect(res.status).toBe(400);
  });

  it('POST /tasks creates task with only title', async () => {
    const newTask = { id: 1, title: 'Minimal', description: null, status: 'pending', created_at: new Date(), updated_at: new Date() };
    mockPool.query.mockResolvedValueOnce({ rows: [newTask] });

    const res = await request(app).post('/tasks').send({ title: 'Minimal' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Minimal');
  });

  it('POST /tasks returns 500 on database error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Insert failed'));

    const res = await request(app).post('/tasks').send({ title: 'Test' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Internal server error');
  });
});
