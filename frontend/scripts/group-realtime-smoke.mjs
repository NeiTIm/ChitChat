import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

const base = process.env.WEBCHAT_SMOKE_URL || 'http://localhost:5080'
const mailDirectory = join(import.meta.dirname, '../../backend/WebChat.Api/private-uploads/dev-mail')
const password = `Synthetic-${randomUUID()}!Aa1`
const expect = (actual, wanted, label) => { if (actual !== wanted) throw new Error(`${label}: expected ${wanted}, received ${actual}`) }

async function request(path, method = 'GET', body, access) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(access ? { Authorization: `Bearer ${access}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null }
}

async function register() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const email = `group-smoke-${suffix}@example.invalid`
  expect((await request('/api/auth/register', 'POST', { email, username: `gs${suffix}`, password })).status, 201, 'register')
  let token
  for (const file of await readdir(mailDirectory)) {
    const mail = JSON.parse(await readFile(join(mailDirectory, file), 'utf8'))
    if (mail.email === email && mail.purpose === 'verify-email') { token = mail.token; break }
  }
  if (!token) throw new Error('Verification token not found in local development mail')
  expect((await request('/api/auth/verify-email', 'POST', { token })).status, 204, 'verify')
  const login = await request('/api/auth/login', 'POST', { identifier: email, password })
  expect(login.status, 200, 'login')
  return { id: login.data.userId, access: login.data.accessToken }
}

const hubs = []
try {
  const owner = await register()
  const member = await register()
  const outsider = await register()
  const group = await request('/api/groups', 'POST', { name: 'Realtime group smoke', inviteeUserIds: [member.id] }, owner.access)
  expect(group.status, 200, 'create group')
  const id = group.data.id
  expect((await request(`/api/groups/${id}/messages`, 'GET', undefined, outsider.access)).status, 404, 'outsider history')
  const invitation = (await request('/api/group-invitations', 'GET', undefined, member.access)).data[0]
  expect((await request(`/api/group-invitations/${invitation.id}/accept`, 'POST', undefined, member.access)).status, 204, 'accept invitation')
  const ownerHub = new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => owner.access }).configureLogging(LogLevel.Error).build()
  const memberHub = new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => member.access }).configureLogging(LogLevel.Error).build()
  const outsiderHub = new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => outsider.access }).configureLogging(LogLevel.Error).build()
  hubs.push(ownerHub, memberHub, outsiderHub)
  let received = 0
  let resolveEvent
  const event = new Promise(resolve => { resolveEvent = resolve })
  memberHub.on('MessageCreated', payload => { if (payload.conversationId === id) { received++; resolveEvent(payload) } })
  await Promise.all(hubs.map(hub => hub.start()))
  await Promise.all([ownerHub.invoke('JoinConversation', id), memberHub.invoke('JoinConversation', id)])
  try { await outsiderHub.invoke('JoinConversation', id); throw new Error('Outsider joined group') }
  catch (error) { if (error.message === 'Outsider joined group') throw error }
  const sent = await request(`/api/groups/${id}/messages`, 'POST', { clientMessageId: randomUUID(), content: 'group realtime smoke' }, owner.access)
  expect(sent.status, 200, 'send group message')
  const delivered = await Promise.race([event, new Promise((_, reject) => setTimeout(() => reject(new Error('Group event timeout')), 5000))])
  expect(delivered.messageId, sent.data.id, 'event message id')
  expect((await request(`/api/groups/${id}/messages`, 'GET', undefined, member.access)).data.items.length, 1, 'durable group history')
  expect((await request(`/api/groups/${id}/leave`, 'POST', undefined, member.access)).status, 204, 'leave')
  try { await memberHub.invoke('JoinConversation', id); throw new Error('Former member joined active group') }
  catch (error) { if (error.message === 'Former member joined active group') throw error }
  expect((await request(`/api/groups/${id}/messages`, 'POST', { clientMessageId: randomUUID(), content: 'after leave' }, member.access)).status, 404, 'former member send')
  console.log('PASS: group invitation, owner/member SignalR event, outsider IDOR/Hub denial, durable history, leave revocation')
} finally { await Promise.all(hubs.map(hub => hub.stop().catch(() => {}))) }
