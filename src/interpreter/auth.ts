// Clear Auth — Simple built-in authentication for the interpreter
// Token-based sessions with in-memory storage
// Zero external dependencies — uses Node.js built-in crypto

import crypto from 'crypto'
import { HttpServer, RequestContext } from './server.js'
import { Store } from './store.js'
import type { Property } from '../ast.js'

// ── Types ──────────────────────────────────────────────────────────────

export interface AuthConfig {
  enabled: boolean
  signupFields: string[]
  sessionExpiryHours: number
  tokenHeader: string
}

export interface Session {
  token: string
  userId: string
  email: string
  createdAt: Date
  expiresAt: Date
}

// ── Session store ──────────────────────────────────────────────────────

const sessions = new Map<string, Session>()
const DEFAULT_EXPIRY = 72 // 3 days

// ── Config parsing ─────────────────────────────────────────────────────

export function parseAuthConfig(properties: Property[]): AuthConfig {
  const config: AuthConfig = {
    enabled: true,
    signupFields: ['email', 'password', 'name'],
    sessionExpiryHours: DEFAULT_EXPIRY,
    tokenHeader: 'x-auth-token',
  }
  for (const prop of properties) {
    const text = prop.args.join(' ')
    if (prop.key === 'signup') {
      config.signupFields = text.replace(/^accept\s+/i, '').split(',').map(s => s.trim()).filter(Boolean)
    } else if (prop.key === 'session') {
      if (text.includes('jwt') || text.includes('token')) config.tokenHeader = 'x-auth-token'
      if (prop.children) {
        const expiryChild = prop.children.find(c => c.key === 'expire')
        if (expiryChild) {
          const match = expiryChild.args.join(' ').match(/(\d+)\s+(hour|hours|day|days)/i)
          if (match) {
            const num = parseInt(match[1], 10)
            config.sessionExpiryHours = match[2].toLowerCase().startsWith('day') ? num * 24 : num
          }
        }
      }
    }
  }
  return config
}

// ── Session management ─────────────────────────────────────────────────

export function createSession(userId: string, email: string): Session {
  const token = crypto.randomUUID()
  const now = new Date()
  const session: Session = {
    token,
    userId,
    email,
    createdAt: now,
    expiresAt: new Date(now.getTime() + DEFAULT_EXPIRY * 60 * 60 * 1000),
  }
  sessions.set(token, session)
  // Clean expired sessions
  for (const [t, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(t)
  }
  return session
}

export function getSession(token: string): Session | null {
  const session = sessions.get(token)
  if (!session || session.expiresAt < new Date()) {
    if (session) sessions.delete(token)
    return null
  }
  return session
}

export function destroySession(token: string): void {
  sessions.delete(token)
}

// ── Route protection middleware ────────────────────────────────────────

export function requireAuth(ctx: RequestContext): Session | null {
  const token = ctx.headers?.['x-auth-token'] || ctx.headers?.['authorization']?.replace('Bearer ', '') || ctx.query?.token as string
  if (!token) return null
  return getSession(token)
}

export function getAuthToken(ctx: RequestContext): string | null {
  return ctx.headers?.['x-auth-token'] || ctx.headers?.['authorization']?.replace('Bearer ', '') || ctx.query?.token as string || null
}

// ── Register auth routes ────────────────────────────────────────────────

export function registerAuth(
  config: AuthConfig,
  userStore: Store<any>,
  server: HttpServer,
  options?: { verbose?: boolean },
): void {
  if (!config.enabled) return

  const verbose = options?.verbose ?? false

  // POST /api/auth/signup
  server.on('POST', '/api/auth/signup', async (ctx) => {
    const { email, password, name } = ctx.body || {}
    if (!email || !password) {
      ctx.status = 400
      ctx.responseBody = { error: 'Email and password are required' }
      return
    }
    // Check if user exists
    const existing = (userStore.getAll() as any[]).find(u => u.email === email)
    if (existing) {
      ctx.status = 409
      ctx.responseBody = { error: 'User already exists' }
      return
    }
    // Create user with hashed password (simple hash — use bcrypt in production)
    const hashed = simpleHash(password)
    const user = userStore.create({ email, name: name || email.split('@')[0], password: hashed })
    const session = createSession(user.id, email)
    if (verbose) console.log(`  🔐 Signup: ${email} → ${user.id}`)
    ctx.status = 201
    ctx.responseBody = { user: { id: user.id, email: user.email, name: user.name }, token: session.token }
  })

  // POST /api/auth/login
  server.on('POST', '/api/auth/login', async (ctx) => {
    const { email, password } = ctx.body || {}
    if (!email || !password) {
      ctx.status = 400
      ctx.responseBody = { error: 'Email and password are required' }
      return
    }
    const user = (userStore.getAll() as any[]).find(u => u.email === email && u.password === simpleHash(password))
    if (!user) {
      ctx.status = 401
      ctx.responseBody = { error: 'Invalid email or password' }
      return
    }
    const session = createSession(user.id, email)
    if (verbose) console.log(`  🔐 Login: ${email}`)
    ctx.status = 200
    ctx.responseBody = { user: { id: user.id, email: user.email, name: user.name }, token: session.token }
  })

  // POST /api/auth/logout
  server.on('POST', '/api/auth/logout', async (ctx) => {
    const token = getAuthToken(ctx)
    if (token) destroySession(token)
    ctx.status = 200
    ctx.responseBody = { message: 'Logged out' }
  })

  // GET /api/auth/me
  server.on('GET', '/api/auth/me', async (ctx) => {
    const session = requireAuth(ctx)
    if (!session) {
      ctx.status = 401
      ctx.responseBody = { error: 'Not authenticated' }
      return
    }
    const user = userStore.findById(session.userId)
    if (!user) {
      ctx.status = 401
      ctx.responseBody = { error: 'User not found' }
      return
    }
    ctx.status = 200
    ctx.responseBody = { user: { id: user.id, email: user.email, name: user.name }, token: session.token }
  })

  // Add auth required flag check helper
  ;(server as any)._authConfig = config
}

// ── Simple hash (NOT for production — use bcrypt/argon2) ───────────────
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return 'hash_' + Math.abs(hash).toString(36)
}
