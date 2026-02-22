/* eslint-env jest */
const request = require('supertest');

let app, setPool;
const mockPool = { query: jest.fn(), connect: jest.fn() };

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
      {
        id: 1,
        title: 'Test',
        description: 'Desc',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockPool.query.mockResolvedValueOnce({ rows: mockTasks });
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');

    // normalize date strings back to Date for comparison
    const actual = res.body.tasks.map((t) => ({
      ...t,
      created_at: new Date(t.created_at),
      updated_at: new Date(t.updated_at),
    }));
    expect(actual).toEqual(mockTasks);
  });

  // Other tests remain unchanged
});