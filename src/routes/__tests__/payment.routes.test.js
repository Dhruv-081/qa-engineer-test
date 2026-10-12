import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app, request, resetDatabase, merchantToken } from './helpers.js';

beforeEach(() => resetDatabase());

test('Bug A: list and detail responses return amounts as numbers', async () => {
  const token = await merchantToken();
  const list = await request(app).get('/api/payments').set('Authorization', `Bearer ${token}`);
  const detail = await request(app).get('/api/payments/1').set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  assert.equal(typeof list.body.data[0].amount, 'number');
  assert.equal(list.body.data[0].amount, 25.5);
  assert.equal(typeof detail.body.data.amount, 'number');
});

test('Bug B: rejects payment amounts above €50,000', async () => {
  const token = await merchantToken();
  const response = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ amount: 999999999, currency: 'EUR', customer_email: 'c@example.com' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /maximum/i);
});

test('accepts maximum allowed amount and numeric-string input', async () => {
  const token = await merchantToken();
  const response = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ amount: '50000', currency: 'EUR', customer_email: 'c@example.com' });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.amount, 50000);
});

test('rejects zero, negative, NaN-like, infinite and empty amounts', async () => {
  const token = await merchantToken();
  for (const amount of [0, -1, 'not-a-number', 'Infinity', '']) {
    const response = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ amount, currency: 'EUR', customer_email: 'c@example.com' });
    assert.equal(response.status, 400, String(amount));
  }
});

test('requires authentication to list payments', async () => {
  const response = await request(app).get('/api/payments');
  assert.equal(response.status, 401);
});
