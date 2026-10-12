import request from 'supertest';
import app from '../../server.js';
import { resetDatabase } from '../../db/database.js';

export { app, request, resetDatabase };

export async function merchantToken() {
  const response = await request(app).post('/api/auth/login').send({
    email: 'merchant@test.com', password: 'Test123!',
  });
  if (response.status !== 200) throw new Error(`Seed login failed: ${response.status}`);
  return response.body.token;
}
