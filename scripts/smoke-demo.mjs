import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Only isolated synthetic demo workspaces are written. Never uses a private user,
// Meta credentials or a real phone. Optional AI check consumes project credits.
const origin = process.env.ETC_TEST_ORIGIN || 'http://127.0.0.1:3000';
async function call(path, { token, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json', 'X-ETC-Intent': 'workspace' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${origin}/api/etc${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await response.text();
  let json; try { json = JSON.parse(raw); } catch { json = raw; }
  return { status: response.status, json };
}
const a = await call('/demo', { method: 'POST', body: { segment: 'inmobiliaria' } });
const b = await call('/demo', { method: 'POST', body: { segment: 'retail' } });
assert.equal(a.status, 201); assert.equal(b.status, 201);
const token = a.json.token; const other = b.json.token;
assert.ok(token && other && token !== other);
const session = await call('/session', { token });
assert.equal(session.json.mode, 'demo'); assert.equal(session.json.connection.enabled, false);
assert.equal((await call('/session')).status, 401);
const contacts = (await call('/contacts', { token })).json;
assert.ok(contacts.length >= 8);
const contact = contacts[0];
assert.equal((await call(`/contacts/${contact.id}`, { token: other, method: 'PATCH', body: { stage: 'ganado' } })).status, 404);
assert.equal((await call(`/contacts/${contact.id}`, { token, method: 'PATCH', body: { stage: 'calificado' } })).status, 200);
assert.equal((await call('/contacts', { token })).json.find(c => c.id === contact.id).stage, 'calificado');
assert.equal((await call(`/contacts/${contact.id}`, { token, method: 'PATCH', body: { consent: 'false' } })).status, 400);
const conversations = (await call('/conversations', { token })).json;
assert.ok(conversations.length >= 6);
const id = conversations[0].id;
assert.equal((await call(`/conversations/${id}`, { token: other })).status, 404);
await call(`/conversations/${id}`, { token, method: 'PATCH', body: { aiPaused: true } });
const before = (await call(`/conversations/${id}`, { token })).json;
const paused = await call(`/conversations/${id}/simulate`, { token, method: 'POST', body: { text: 'Mensaje de prueba mientras atiende una persona.', clientId: randomUUID() } });
assert.equal(paused.status, 200); assert.equal(paused.json.suggestion, null);
assert.equal(paused.json.messages.length, before.messages.length + 1);
assert.equal(paused.json.messages.at(-1).role, 'customer');
const logicalId = randomUUID();
const humanBody = { text: 'Respuesta humana de demostración.', source: 'human', clientId: logicalId };
const first = await call(`/conversations/${id}/messages`, { token, method: 'POST', body: humanBody });
const replay = await call(`/conversations/${id}/messages`, { token, method: 'POST', body: humanBody });
assert.ok(first.status >= 200 && first.status < 300); assert.ok(replay.status >= 200 && replay.status < 300);
assert.equal(first.json.id, replay.json.id);
assert.equal((await call(`/conversations/${id}`, { token })).json.conversation.aiPaused, true);
const knowledge = await call('/knowledge', { token, method: 'POST', body: { title: 'Entrada ficticia de validación', content: 'Este contenido aún no está aprobado.', approved: false } });
assert.equal(knowledge.status, 201); assert.equal(knowledge.json.approved, false);
const task = await call('/tasks', { token, method: 'POST', body: { title: 'Seguimiento ficticio de validación', dueAt: new Date(Date.now() + 86400000).toISOString(), contactId: contact.id } });
assert.equal(task.status, 201);
assert.equal((await call(`/tasks/${task.json.id}`, { token, method: 'PATCH', body: { completed: true } })).json.completed, true);
assert.equal((await call(`/tasks/${task.json.id}`, { token: other, method: 'PATCH', body: { completed: false } })).status, 404);
const csv = await call('/contacts/export', { token });
assert.equal(csv.status, 200); assert.ok(typeof csv.json === 'string' && csv.json.includes('phone'));
assert.equal((await call('/whatsapp/webhook')).status, 503);
console.log('OK: aislamiento, etapas persistentes, consentimiento booleano, pausa humana, idempotencia, conocimiento, tareas, CSV y WhatsApp desactivado.');
if (process.env.ETC_SMOKE_AI === '1') {
  const ai = await call(`/conversations/${id}/suggest`, { token, method: 'POST' });
  assert.equal(ai.status, 200); assert.ok(ai.json.text); assert.ok(['llm', 'fallback'].includes(ai.json.mode));
  console.log(`Copiloto: ${ai.json.mode === 'llm' ? 'respuesta del proveedor real' : 'fallback explícito'}.`);
}
