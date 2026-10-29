import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

const base = process.env.WEBCHAT_SMOKE_URL || 'http://localhost:5080'
const mailDirectory = join(import.meta.dirname, '../../backend/WebChat.Api/private-uploads/dev-mail')
const password = `Synthetic-${randomUUID()}!Aa1`
const expect = (value, wanted, label) => { if (value !== wanted) throw new Error(`${label}: expected ${wanted}, received ${value}`) }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const eventWithin = (hub, name, predicate, ms = 5000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { hub.off(name, handler); reject(new Error(`${name} timeout`)) }, ms)
  const handler = value => { if (!predicate(value)) return; clearTimeout(timer); hub.off(name, handler); resolve(value) }
  hub.on(name, handler)
})

async function request(path, method = 'GET', body, access) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(access ? { Authorization: `Bearer ${access}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null }
}

async function login(email) {
  const result = await request('/api/auth/login', 'POST', { identifier: email, password })
  expect(result.status, 200, 'login')
  return { id: result.data.userId, access: result.data.accessToken, email }
}

async function register() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const email = `status-smoke-${suffix}@example.invalid`
  expect((await request('/api/auth/register', 'POST', { email, username: `ss${suffix}`, password })).status, 201, 'register')
  let token
  for (const file of await readdir(mailDirectory)) {
    const mail = JSON.parse(await readFile(join(mailDirectory, file), 'utf8'))
    if (mail.email === email && mail.purpose === 'verify-email') { token = mail.token; break }
  }
  if (!token) throw new Error('Verification token missing')
  expect((await request('/api/auth/verify-email', 'POST', { token })).status, 204, 'verify')
  return login(email)
}

const hubs = []
try {
  const a = await register()
  const b = await register()
  const a2 = await login(a.email)
  expect((await request('/api/friends/requests', 'POST', { targetUserId: b.id }, a.access)).status, 201, 'friend request')
  expect((await request('/api/friends/requests', 'POST', { targetUserId: a.id }, b.access)).status, 200, 'cross friend request')
  const opened = await request('/api/conversations/private', 'POST', { targetUserId: b.id }, a.access)
  expect(opened.status, 200, 'open conversation')
  const conversationId = opened.data.id
  const hubFor = account => new HubConnectionBuilder().withUrl(`${base}/hubs/chat`, { accessTokenFactory: () => account.access })
    .withAutomaticReconnect().configureLogging(LogLevel.Error).build()
  const aHub = hubFor(a), aHub2 = hubFor(a2), bHub = hubFor(b)
  hubs.push(aHub, aHub2, bHub)
  await Promise.all(hubs.map(hub => hub.start()))
  await Promise.all(hubs.map(hub => hub.invoke('JoinConversation', conversationId)))
  expect((await request(`/api/users/${b.id}/presence`, 'GET', undefined, a.access)).data.online, true, 'presence online')
  const typing = eventWithin(aHub, 'TypingChanged', event => event.conversationId === conversationId && event.actorId === b.id && event.isTyping)
  await bHub.invoke('StartTyping', conversationId)
  await typing
  const stop = eventWithin(aHub, 'TypingChanged', event => event.conversationId === conversationId && event.actorId === b.id && !event.isTyping)
  await bHub.invoke('StopTyping', conversationId)
  await stop
  const clientMessageId = randomUUID()
  const notificationEvent = eventWithin(bHub, 'NotificationCreated', event => event.referenceId && event.type === 'Message')
  const sent = await request(`/api/conversations/${conversationId}/messages`, 'POST', { clientMessageId, content: 'status smoke' }, a.access)
  expect(sent.status, 200, 'send')
  expect((await notificationEvent).referenceId, sent.data.id, 'notification references message')
  const unreadNotifications = (await request('/api/notifications/unread-count', 'GET', undefined, b.access)).data.count
  const retry = await request(`/api/conversations/${conversationId}/messages`, 'POST', { clientMessageId, content: 'different retry' }, a.access)
  expect(retry.data.id, sent.data.id, 'retry canonical message')
  expect((await request('/api/notifications/unread-count', 'GET', undefined, b.access)).data.count, unreadNotifications, 'retry does not duplicate notification')
  const deliveredA = eventWithin(aHub, 'MessageDelivered', event => event.messageId === sent.data.id && event.recipientUserId === b.id)
  const deliveredA2 = eventWithin(aHub2, 'MessageDelivered', event => event.messageId === sent.data.id && event.recipientUserId === b.id)
  expect((await request(`/api/conversations/${conversationId}/delivery-acks`, 'POST', { messageIds: [sent.data.id] }, b.access)).status, 204, 'delivery ack')
  await Promise.all([deliveredA, deliveredA2])
  const seenA = eventWithin(aHub, 'MessageSeen', event => event.conversationId === conversationId && event.userId === b.id && event.lastReadSequence === sent.data.sequence)
  const seenA2 = eventWithin(aHub2, 'MessageSeen', event => event.conversationId === conversationId && event.userId === b.id && event.lastReadSequence === sent.data.sequence)
  expect((await request(`/api/conversations/${conversationId}/read-cursor`, 'PUT', { lastReadSequence: sent.data.sequence }, b.access)).status, 204, 'seen cursor')
  await Promise.all([seenA, seenA2])
  expect((await request(`/api/conversations/${conversationId}/unread`, 'GET', undefined, b.access)).data.count, 0, 'unread')
  await aHub.stop()
  expect((await request(`/api/users/${a.id}/presence`, 'GET', undefined, b.access)).data.online, true, 'second device remains online')
  await aHub2.stop()
  await pause(150)
  expect((await request(`/api/users/${a.id}/presence`, 'GET', undefined, b.access)).data.online, false, 'last device offline')
  const group = await request('/api/groups', 'POST', { name: 'Blocked typing smoke', inviteeUserIds: [b.id] }, a.access)
  expect(group.status, 200, 'create shared group')
  const invitation = (await request('/api/group-invitations', 'GET', undefined, b.access)).data[0]
  expect((await request(`/api/group-invitations/${invitation.id}/accept`, 'POST', undefined, b.access)).status, 204, 'join shared group')
  const aGroupHub = hubFor(a)
  hubs.push(aGroupHub)
  await aGroupHub.start()
  let leakedTyping = false
  aGroupHub.on('TypingChanged', event => { if (event.conversationId === group.data.id && event.actorId === b.id) leakedTyping = true })
  expect((await request('/api/blocks', 'POST', { targetUserId: b.id }, a.access)).status, 204, 'block')
  try { await bHub.invoke('StartTyping', conversationId); throw new Error('Blocked user typed in private chat') }
  catch (error) { if (error.message === 'Blocked user typed in private chat') throw error }
  await bHub.invoke('StartTyping', group.data.id)
  await pause(700)
  expect(leakedTyping, false, 'blocked pair group typing hidden')
  expect((await request(`/api/groups/${group.data.id}/messages`, 'POST', { clientMessageId: randomUUID(), content: 'shared group still works' }, b.access)).status, 200, 'blocked pair group message')
  console.log('PASS: typing, multi-device presence, ACK/Seen fanout, notification event/idempotent retry, unread, private block revocation, group typing filtered')
} finally { await Promise.all(hubs.map(hub => hub.stop().catch(() => {}))) }
