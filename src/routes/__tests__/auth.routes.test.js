import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app, request, resetDatabase } from './helpers.js';

beforeEach(() => resetDatabase());

test('accepts a valid email and registers a merchant', async () => {
  const response = await request(app).post('/api/auth/register').send({ email: 'qa@example.co.uk', password: 'SecurePass123!', business_name: 'QA Shop' });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'qa@example.co.uk');
  assert.ok(response.body.token);
});

test('Bug C: rejects email without a dotted domain', async () => {
  const response = await request(app).post('/api/auth/register').send({ email: 'user@domain', password: 'SecurePass123!', business_name: 'QA Shop' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /email/i);
});

test('rejects missing-at-sign and whitespace email formats', async () => {
  for (const email of ['user.example.com', 'user @example.com']) {
    const response = await request(app).post('/api/auth/register').send({ email, password: 'SecurePass123!', business_name: 'QA Shop' });
    assert.equal(response.status, 400, email);
  }
});

test('rejects duplicate merchant registration', async () => {
  const response = await request(app).post('/api/auth/register').send({ email: 'merchant@test.com', password: 'SecurePass123!', business_name: 'Other Shop' });
  assert.equal(response.status, 409);
});

test('logs in with documented seed credentials and rejects a wrong password', async () => {
  const ok = await request(app).post('/api/auth/login').send({ email: 'merchant@test.com', password: 'Test123!' });
  const bad = await request(app).post('/api/auth/login').send({ email: 'merchant@test.com', password: 'wrong-password' });
  assert.equal(ok.status, 200);
  assert.equal(bad.status, 401);
});
