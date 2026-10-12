import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { app, request, resetDatabase } from './helpers.js';
import { getPaymentById } from '../../db/database.js';

const secret = 'test-webhook-secret-key';
function signature(body) { return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex'); }
function send(body, sig = signature(body)) { return request(app).post('/api/webhooks/payment-status').set('x-webhook-signature', sig).send(body); }
beforeEach(() => resetDatabase());

test('Bug D: accepts valid HMAC and updates payment status', async () => {
  const body = { payment_id: '2', status: 'completed', event_id: 'evt_valid' };
  const response = await send(body);
  assert.equal(response.status, 200);
  assert.equal(getPaymentById('2').status, 'completed');
});

test('Bug D: rejects invalid signature without changing payment state', async () => {
  const response = await send({ payment_id: '2', status: 'completed', event_id: 'evt_fake' }, 'fake-signature');
  assert.equal(response.status, 401);
  assert.equal(getPaymentById('2').status, 'pending');
});

test('Bug E: repeated event_id is acknowledged without reapplying the event', async () => {
  const first = { payment_id: '2', status: 'completed', event_id: 'evt_once' };
  assert.equal((await send(first)).status, 200);
  const repeated = { payment_id: '2', status: 'failed', event_id: 'evt_once' };
  const response = await send(repeated);
  assert.equal(response.status, 200);
  assert.equal(response.body.duplicate, true);
  assert.equal(getPaymentById('2').status, 'completed');
});

test('requires event id and signature and returns 404 for a missing payment', async () => {
  assert.equal((await send({ payment_id: '2', status: 'completed' })).status, 400);
  assert.equal((await send({ payment_id: '999', status: 'completed', event_id: 'evt_missing' })).status, 404);
});

test('concurrent duplicate delivery processes an event once', async () => {
  const body = { payment_id: '2', status: 'completed', event_id: 'evt_race' };
  const [a, b] = await Promise.all([send(body), send(body)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal((await request(app).get('/api/payments/2').set('Authorization', 'Bearer invalid')).status, 401);
  assert.equal(getPaymentById('2').status, 'completed');
});
