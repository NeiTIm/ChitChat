import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

const base = process.env.WEBCHAT_SMOKE_URL || 'http://localhost:5080'
const mailDirectory = join(import.meta.dirname, '../../backend/WebChat.Api/private-uploads/dev-mail')
const password = `Synthetic-${randomUUID()}!Aa1`

async function request(path, method = 'GET', body, accessToken) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null }
}

function expect(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`)
}

async function register() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const email = `realtime-${suffix}@example.invalid`
  expect((await request('/api/auth/register', 'POST', { email, username: `rt${suffix}`, password })).status, 201, 'register')
  const files = await readdir(mailDirectory)
  let token
  for (const file of files) {
    const mail = JSON.parse(await readFile(join(mailDirectory, file), 'utf8'))
    if (mail.email === email && mail.purpose === 'verify-email') { token = mail.token; break }
  }
  if (!token) throw new Error('Development verification token was not found')
  expect((await request('/api/auth/verify-email', 'POST', { token })).status, 204, 'verify')
  const login = await request('/api/auth/login', 'POST', { identifier: email, password, deviceName: 'Realtime smoke' })
  expect(login.status, 200, 'login')
  return { id: login.data.userId, access: login.data.accessToken }
}

let senderHub
let receiverHub
try {
  const sender = await register()
  const receiver = await register()
  const outsider = await register()
  expect((await request('/api/friends/requests', 'POST', { targetUserId: receiver.id }, sender.access)).status, 201, 'friend request')
  expect((await request('/api/friends/requests', 'POST', { targetUserId: sender.id }, receiver.access)).status, 200, 'cross accept')
  const opened = await request('/api/conversations/private', 'POST', { targetUserId: receiver.id }, sender.access)
  expect(opened.status, 200, 'open chat')
  const conversationId = opened.data.id

  senderHub = new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => sender.access }).configureLogging(LogLevel.Error).build()
  receiverHub = new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => receiver.access }).configureLogging(LogLevel.Error).build()
  let received = 0
  let resolveEvent
  const event = new Promise(resolve => { resolveEvent = resolve })
  receiverHub.on('MessageCreated', payload => { received++; resolveEvent(payload) })
  await Promise.all([senderHub.start(), receiverHub.start()])
  await Promise.all([senderHub.invoke('JoinConversation', conversationId), receiverHub.invoke('JoinConversation', conversationId)])
  const clientMessageId = randomUUID()
  const sent = await request(`/api/conversations/${conversationId}/messages`, 'POST', { clientMessageId, content: 'Realtime smoke message' }, sender.access)
  expect(sent.status, 200, 'send')
  const deliveredEvent = await Promise.race([event, new Promise((_, reject) => setTimeout(() => reject(new Error('SignalR event timeout')), 5000))])
  expect(deliveredEvent.messageId, sent.data.id, 'SignalR message ID')
  const history = await request(`/api/conversations/${conversationId}/messages`, 'GET', undefined, receiver.access)
  expect(history.status, 200, 'recipient history')
  expect(history.data.items.length, 1, 'durable message count')
  const retry = await request(`/api/conversations/${conversationId}/messages`, 'POST', { clientMessageId, content: 'changed retry body' }, sender.access)
  expect(retry.data.id, sent.data.id, 'idempotent retry')
  await new Promise(resolve => setTimeout(resolve, 300))
  expect(received, 1, 'SignalR event dedupe')
  expect((await request(`/api/conversations/${conversationId}/messages`, 'GET', undefined, outsider.access)).status, 404, 'outsider IDOR')
  expect((await request('/api/blocks', 'POST', { targetUserId: sender.id }, receiver.access)).status, 204, 'block')
  expect((await request(`/api/conversations/${conversationId}/messages`, 'POST', { clientMessageId: randomUUID(), content: 'blocked' }, sender.access)).status, 404, 'blocked send')
  const sessions = await request('/api/auth/sessions', 'GET', undefined, receiver.access)
  const current = sessions.data.find(session => session.isCurrent)
  expect((await request(`/api/auth/sessions/${current.id}`, 'DELETE', undefined, receiver.access)).status, 204, 'session revoke')
  try { await receiverHub.invoke('JoinConversation', conversationId); throw new Error('Revoked hub invocation unexpectedly succeeded') }
  catch (error) { if (error.message === 'Revoked hub invocation unexpectedly succeeded') throw error }
  console.log('PASS: two-account SignalR event, REST recovery source, idempotency, outsider IDOR, block, and revoked Hub invocation')
} finally {
  if (senderHub) await senderHub.stop().catch(() => {})
  if (receiverHub) await receiverHub.stop().catch(() => {})
}
