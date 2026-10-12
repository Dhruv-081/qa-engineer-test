import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app, request, resetDatabase } from './helpers.js';
import { db } from '../../db/database.js';

beforeEach(() => resetDatabase());
const order = (table_number = 4) => ({ merchant_id: '1', table_number, items: [{ name: 'Tea', price: 3, quantity: 2 }] });

test('Bug F: rejects a second pending order for the same merchant and table', async () => {
  assert.equal((await request(app).post('/api/table-orders').send(order())).status, 201);
  const duplicate = await request(app).post('/api/table-orders').send(order('4'));
  assert.equal(duplicate.status, 409);
  assert.equal(db.table_orders.length, 1);
});

test('allows orders for another table and after the previous order is no longer pending', async () => {
  await request(app).post('/api/table-orders').send(order());
  assert.equal((await request(app).post('/api/table-orders').send(order(5))).status, 201);
  db.table_orders[0].status = 'served';
  assert.equal((await request(app).post('/api/table-orders').send(order())).status, 201);
});
