import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const origin = 'http://localhost:3000';
async function request(path, { token, method = 'GET', body, expected = 200, extraHeaders = {} } = {}) {
 const response = await fetch(`${base}/api/etc${path}`, { method, headers: { 'Content-Type':'application/json', 'X-ETC-Intent':'workspace', Origin:origin, ...(token ? { Authorization:`Bearer ${token}` } : {}), ...extraHeaders }, ...(body ? { body:JSON.stringify(body) } : {}) });
 const value = await response.json();
 assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(value)}`);
 return { value, headers:response.headers };
}
const fixture = randomUUID();
const password = randomBytes(24).toString('base64url');
const email = `etc-fixture-${fixture}@example.invalid`;
const registered = await request('/auth/register',{method:'POST',expected:201,body:{name:'ETC · prueba automatizada',email,password,segment:'pymes',businessType:'dental'}});
assert.ok(registered.value.token?.startsWith('etc_acct_'));
assert.equal(registered.value.user.emailVerified,false);
assert.ok(!JSON.stringify(registered.value).includes(password));
const token = registered.value.token;
const session = (await request('/session',{token})).value;
assert.equal(session.mode,'live'); assert.equal(session.user.role,'owner'); assert.equal(session.workspace.segment,'pymes'); assert.equal(session.workspace.businessType,'dental');
const initial = (await request('/contacts',{token})).value;
assert.deepEqual(initial, []);
console.log('Registro normal: cuenta propia, sesión y espacio dental aislado correctos.');
await request('/auth/login',{method:'POST',body:{email,password:`wrong-${password}`},expected:401});
const login = (await request('/auth/login',{method:'POST',body:{email,password}})).value;
assert.equal((await request('/session',{token:login.token})).value.workspace.id, session.workspace.id);
await request('/session',{token:'etc_acct_'+randomBytes(32).toString('base64url'),expected:401});
await request('/auth/login',{method:'POST',extraHeaders:{Origin:'https://untrusted.example.invalid'},body:{email,password},expected:403});
console.log('Login, contraseña incorrecta, sesión inválida y origen no autorizado comprobados.');
const config = (await request('/llm/config',{token})).value;
assert.equal(config.provider,'managed'); assert.equal(config.hasKey,false); assert.equal(config.keyLast4,null); assert.ok(!('apiKey' in config));
if (!config.encryptionReady) await request('/llm/config',{token,method:'PATCH',body:{provider:'openai',model:'client-selected-model',apiKey:'TEST_ONLY_NOT_A_REAL_KEY'},expected:503});
const history = (await request('/consultations',{token})).value;
assert.deepEqual(history.messages, []); assert.equal(history.businessType,'dental');
await request('/consultations',{token,method:'POST',body:{text:'¿Cómo organizo citas?',clientId:randomUUID(),segment:'financieros',language:'es'},expected:403});
const id = randomUUID();
const body = {text:'Escribe un poema sobre fútbol',clientId:id,segment:'pymes',businessType:'dental',language:'es'};
const blocked = (await request('/consultations',{token,method:'POST',body})).value;
assert.equal(blocked.mode,'blocked'); assert.ok(blocked.reply.text);
const repeated = (await request('/consultations',{token,method:'POST',body})).value;
assert.equal(repeated.reply.id, blocked.reply.id);
await request('/consultations',{token,method:'POST',body:{...body,text:'Un texto diferente'},expected:409});
const oldScope = (await request('/consultations',{token})).value;
assert.equal(oldScope.messages.length,2);
await request('/workspace',{token,method:'PATCH',body:{businessType:'restaurante'}});
assert.deepEqual((await request('/consultations',{token})).value.messages, []);
await request('/workspace',{token,method:'PATCH',body:{segment:'financieros',businessType:'general'}});
assert.equal((await request('/session',{token})).value.workspace.segment,'financieros');
assert.equal((await request('/consultations',{token})).value.businessType,null);
const financeBlock = (await request('/consultations',{token,method:'POST',body:{text:'Recomienda una inversión para mí',clientId:randomUUID(),segment:'financieros',businessType:null,language:'es'}})).value;
assert.equal(financeBlock.mode,'blocked');
if (process.env.SMOKE_AI === '1') {
 const actual = (await request('/consultations',{token,method:'POST',body:{text:'¿Cómo organizo el seguimiento de solicitudes?',clientId:randomUUID(),segment:'financieros',businessType:null,language:'en'}})).value;
 assert.ok(['llm','fallback'].includes(actual.mode)); assert.ok(actual.reply.text);
 console.log(`Consulta real al servicio: ${actual.mode}.`);
}
const status = (await request('/auth/status')).value;
if (!status.emailEnabled) {
 const forgot = (await request('/auth/forgot-password',{method:'POST',body:{email,frontendOrigin:origin,language:'es'}})).value;
 assert.equal(forgot.emailEnabled,false); assert.ok(!('token' in forgot)); assert.ok(!('password' in forgot));
 console.log('Recuperación sin proveedor: estado deshabilitado visible; no se simuló envío.');
}
await request('/auth/reset-password',{method:'POST',expected:400,body:{token:'invalid-token',password}});
await request('/auth/logout',{token,method:'POST'});
await request('/session',{token,expected:401});
await request('/auth/logout',{token:login.token,method:'POST'});
console.log('Credenciales, cifrado fail-closed, ámbito dental/restaurante/financiero, idempotencia y logout correctos.');
console.log('Sólo se creó una cuenta ficticia marcada como fixture; no se enviaron emails ni WhatsApp.');
