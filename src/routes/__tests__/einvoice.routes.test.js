import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app, request, resetDatabase, merchantToken } from './helpers.js';

beforeEach(() => resetDatabase());

test('Bug G: blocks a second submission for the same invoice', async () => {
  const token = await merchantToken();
  const payload = { invoice_id: 'invoice-a', customer_siret: '12345678901234' };
  const first = await request(app).post('/api/einvoice/submit').set('Authorization', `Bearer ${token}`).send(payload);
  const second = await request(app).post('/api/einvoice/submit').set('Authorization', `Bearer ${token}`).send(payload);
  assert.equal(first.status, 200);
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'Invoice already submitted to tax authority');
});

test('rejects a SIRET containing non-digits or wrong length', async () => {
  const token = await merchantToken();
  for (const customer_siret of ['1234', '1234567890123A']) {
    const response = await request(app).post('/api/einvoice/submit').set('Authorization', `Bearer ${token}`).send({ invoice_id: 'invoice-invalid', customer_siret });
    assert.equal(response.status, 400);
  }
});

test('reports submitted invoice status to its owner', async () => {
  const token = await merchantToken();
  await request(app).post('/api/einvoice/submit').set('Authorization', `Bearer ${token}`).send({ invoice_id: 'invoice-status', customer_siret: '12345678901234' });
  const response = await request(app).get('/api/einvoice/status/invoice-status').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.einvoice_status, 'submitted');
});
