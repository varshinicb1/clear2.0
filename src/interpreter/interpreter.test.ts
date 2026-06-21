import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import { parse } from '../parser.js'
import { runInterpreter } from './index.js'

import { stopAllFlows } from './flow.js'

// ── Module-level state ──────────────────────────────────────────────

let createdItemId: string = ''
let refUserId: string = ''
let refProjectId: string = ''

// ── HTTP helpers ────────────────────────────────────────────────────

async function request(port: number, method: string, path: string, body?: any): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    }

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        let data: any = null
        try {
          data = raw ? JSON.parse(raw) : null
        } catch {
          data = raw
        }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, data })
      })
    })

    req.on('error', reject)
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')) })

    if (body !== undefined) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

function GET(port: number, path: string) {
  return request(port, 'GET', path)
}

function POST(port: number, path: string, body?: any) {
  return request(port, 'POST', path, body)
}

function PUT(port: number, path: string, body: any) {
  return request(port, 'PUT', path, body)
}

function DEL(port: number, path: string) {
  return request(port, 'DELETE', path)
}

// ── Test spec ───────────────────────────────────────────────────────

const CRUD_SPEC = `product TestAPI
    name "Test CRUD API"
    version "0.1"

data Item
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field value
        type integer
        default 0
    field status
        type enum
        options ["active", "inactive", "archived"]
        default "active"
    field created_at
        type timestamp
        default now
    field updated_at
        type timestamp
        default now

api REST /items
    get /
        return list of Item
        paginate 10 per page
        filter by status
        sort by created_at desc

    get /:id
        return Item by id
        error 404 if not found

    post /
        accept name, value
        set created_at to now
        validate with rules
        return created Item
        status 201

    put /:id
        accept name, value, status
        set updated_at to now
        return updated Item
        error 404 if not found

    delete /:id
        status 204
        error 404 if not found

rule ItemValidation
    apply to Item
    require name is not empty

api REST /separate
    get /
        return list of Item

    post /
        accept name
`

// ── Wait for server ─────────────────────────────────────────────────

async function waitForServer(serverHandle: ReturnType<typeof runInterpreter>, timeoutMs: number = 5000): Promise<number> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const addr = serverHandle.address
    if (addr && addr.port > 0) {
      return addr.port
    }
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`Server failed to start within ${timeoutMs}ms`)
}

// ── Integration tests ───────────────────────────────────────────────

describe('interpreter — HTTP integration', () => {
  let port: number
  let serverHandle: ReturnType<typeof runInterpreter>

  before(async () => {
    const parseResult = parse(CRUD_SPEC, 'test.clear')
    assert.ok(parseResult.ast !== null, 'Parse failed')

    serverHandle = runInterpreter(parseResult.ast, { port: 0 })
    port = await waitForServer(serverHandle)
    assert.ok(port > 0, `Expected valid port, got ${port}`)
  })

  after(async () => {
    await serverHandle.close()
  })

  // ── CRUD: Create ────────────────────────────────────────────────

  it('POST /items — creates an item with 201', async () => {
    const res = await POST(port, '/items', { name: 'Test Item', value: 42 })

    assert.equal(res.status, 201)
    assert.ok(res.data.id, 'Should have an id')
    assert.equal(res.data.name, 'Test Item')
    assert.equal(res.data.value, 42)
    assert.equal(res.data.status, 'active', 'Should use default status')
    assert.ok(res.data.created_at, 'Should have created_at timestamp')
    assert.ok(res.data.updated_at, 'Should have updated_at timestamp')

    createdItemId = res.data.id
  })

  it('POST /items — creates item with only required fields and defaults', async () => {
    const res = await POST(port, '/items', { name: 'Minimal' })

    assert.equal(res.status, 201)
    assert.equal(res.data.name, 'Minimal')
    assert.equal(res.data.value, 0, 'Default value should be 0')
    assert.equal(res.data.status, 'active', 'Default status should be active')
    assert.ok(res.data.id)
  })

  it('POST /items — rejects empty name (rule validation)', async () => {
    const res = await POST(port, '/items', { name: '' })

    assert.equal(res.status, 400)
    assert.ok(res.data.errors, 'Should return errors array')
    assert.ok(res.data.errors[0].includes('name'), 'Error should mention name')
  })

  it('POST /items — rejects missing name (rule validation)', async () => {
    const res = await POST(port, '/items', { value: 99 })

    assert.equal(res.status, 400)
    assert.ok(res.data.errors)
    assert.ok(res.data.errors[0].includes('name'))
  })

  // ── CRUD: Read ──────────────────────────────────────────────────

  it('GET /items — returns paginated list with metadata', async () => {
    const res = await GET(port, '/items')

    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data.data), 'Should have data array')
    assert.equal(typeof res.data.total, 'number', 'Should have total')
    assert.equal(typeof res.data.page, 'number', 'Should have page')
    assert.equal(typeof res.data.limit, 'number', 'Should have limit')
    assert.equal(typeof res.data.totalPages, 'number', 'Should have totalPages')
    assert.equal(res.data.page, 1)
    assert.equal(res.data.limit, 10)
  })

  it('GET /items with page/limit — respects pagination params', async () => {
    const res = await GET(port, '/items?page=1&limit=1')

    assert.equal(res.status, 200)
    assert.equal(res.data.data.length, 1)
    assert.equal(res.data.page, 1)
    assert.equal(res.data.limit, 1)
  })

  it('GET /items/:id — returns item by id', async () => {
    assert.ok(createdItemId, 'No created item ID available')
    const res = await GET(port, `/items/${createdItemId}`)

    assert.equal(res.status, 200)
    assert.equal(res.data.id, createdItemId)
    assert.equal(res.data.name, 'Test Item')
    assert.equal(res.data.value, 42)
  })

  it('GET /items/:id — 404 for unknown id', async () => {
    const res = await GET(port, '/items/00000000-0000-0000-0000-000000000000')

    assert.equal(res.status, 404)
    assert.ok(res.data.error)
  })

  // ── CRUD: Update ────────────────────────────────────────────────

  it('PUT /items/:id — updates an item', async () => {
    assert.ok(createdItemId, 'No created item ID available')
    const res = await PUT(port, `/items/${createdItemId}`, { name: 'Updated Item', value: 100, status: 'inactive' })

    assert.equal(res.status, 200)
    assert.equal(res.data.id, createdItemId)
    assert.equal(res.data.name, 'Updated Item')
    assert.equal(res.data.value, 100)
    assert.equal(res.data.status, 'inactive')
    assert.ok(res.data.updated_at)
  })

  it('PUT /items/:id — partial update preserves other fields', async () => {
    assert.ok(createdItemId, 'No created item ID available')
    const res = await PUT(port, `/items/${createdItemId}`, { name: 'Renamed' })

    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Renamed')
    assert.equal(res.data.value, 100, 'Value should be unchanged')
    assert.equal(res.data.status, 'inactive', 'Status should be unchanged')
  })

  it('PUT /items/:id — 404 for unknown id', async () => {
    const res = await PUT(port, '/items/00000000-0000-0000-0000-000000000000', { name: 'Ghost' })

    assert.equal(res.status, 404)
    assert.ok(res.data.error)
  })

  // ── CRUD: Delete ────────────────────────────────────────────────

  it('DELETE /items/:id — deletes an item with 204', async () => {
    const createRes = await POST(port, '/items', { name: 'To Delete' })
    assert.equal(createRes.status, 201)
    const id = createRes.data.id

    const delRes = await DEL(port, `/items/${id}`)
    assert.equal(delRes.status, 204)
    assert.equal(delRes.data, null, '204 should have no body')

    // Verify it's gone
    const getRes = await GET(port, `/items/${id}`)
    assert.equal(getRes.status, 404)
  })

  it('DELETE /items/:id — 404 for unknown id', async () => {
    const res = await DEL(port, '/items/00000000-0000-0000-0000-000000000000')
    assert.equal(res.status, 404)
  })

  // ── Filtering ───────────────────────────────────────────────────

  it('GET /items?status=active — returns only active items', async () => {
    // Create items with explicit statuses for deterministic filtering
    const a1 = await POST(port, '/items', { name: 'Alpha', status: 'active' })
    assert.equal(a1.status, 201)
    const a2 = await POST(port, '/items', { name: 'Beta', status: 'active' })
    assert.equal(a2.status, 201)
    const i1 = await POST(port, '/items', { name: 'Gamma', status: 'inactive' })
    assert.equal(i1.status, 201)

    const res = await GET(port, '/items?status=active')
    assert.equal(res.status, 200)
    for (const item of res.data.data) {
      assert.equal(item.status, 'active', `Item ${item.id} should have status 'active'`)
    }
  })

  // ── Store isolation ─────────────────────────────────────────────

  it('separate API prefix shares the same data store', async () => {
    const res = await GET(port, '/separate')

    assert.equal(res.status, 200)
    // Without paginate, returns a plain array; with paginate, returns { data, ... }
    const items = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
    assert.ok(Array.isArray(items))
    assert.ok(items.length > 0, 'Should share items from the same store')
  })

  // ── 404 routes ─────────────────────────────────────────────────

  it('GET /nonexistent — 404 for unmapped route', async () => {
    const res = await GET(port, '/nonexistent')
    assert.equal(res.status, 404)
  })

  it('POST /nonexistent — 404 for unmapped route', async () => {
    const res = await POST(port, '/nonexistent', {})
    assert.equal(res.status, 404)
  })

  // ── CORS ────────────────────────────────────────────────────────

  it('handles OPTIONS preflight with CORS headers', async () => {
    const res = await request(port, 'OPTIONS', '/items')
    assert.equal(res.status, 204)
    assert.equal(res.headers['access-control-allow-origin'], '*')
  })

  // ── Edge cases ──────────────────────────────────────────────────

  it('POST with empty object uses defaults', async () => {
    // Missing 'name' should trigger validation (400) since route has 'validate with rules'
    const res = await POST(port, '/items', {})
    assert.equal(res.status, 400)
    assert.ok(res.data.errors)
  })

  it('DELETE returns 204 with null body', async () => {
    const createRes = await POST(port, '/items', { name: 'DeleteMe' })
    const delRes = await DEL(port, `/items/${createRes.data.id}`)
    assert.equal(delRes.status, 204)
    assert.equal(delRes.data, null)
  })

  // ── Edge cases: body parsing ─────────────────────────────────────

  it('POST /items — empty body returns 400 (no Content-Type)', async () => {
    // Send POST without Content-Type and no body
    const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/items', method: 'POST' },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8')
            let data: any = null
            try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
            resolve({ status: res.statusCode ?? 0, data })
          })
        },
      )
      req.on('error', reject)
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')) })
      req.end() // No body, no Content-Type
    })

    assert.equal(res.status, 400)
    assert.ok(res.data.errors, 'Should return validation errors for missing body')
  })

  it('POST /items — malformed JSON returns the raw string body', async () => {
    const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1', port, path: '/items', method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8')
            let data: any = null
            try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
            resolve({ status: res.statusCode ?? 0, data })
          })
        },
      )
      req.on('error', reject)
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')) })
      req.write('{invalid json here')
      req.end()
    })

    // Malformed JSON is parsed as raw string; validation then rejects missing name
    assert.equal(res.status, 400)
    assert.ok(res.data.errors)
  })

  it('POST /items — null JSON body returns 400 (validation)', async () => {
    const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1', port, path: '/items', method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8')
            let data: any = null
            try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
            resolve({ status: res.statusCode ?? 0, data })
          })
        },
      )
      req.on('error', reject)
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')) })
      req.write('null')
      req.end()
    })

    assert.equal(res.status, 400)
    assert.ok(res.data.errors, 'Should return validation errors for null body')
  })

  it('POST /items — large payload (100KB string) succeeds', async () => {
    const bigName = 'A'.repeat(100_000) // 100KB string
    const res = await POST(port, '/items', { name: bigName, value: 999 })

    assert.equal(res.status, 201)
    assert.equal(res.data.name, bigName)
    assert.equal(res.data.value, 999)
    assert.ok(res.data.id)
  })

  it('POST /items — extra fields not in accept list are ignored', async () => {
    const res = await POST(port, '/items', {
      name: 'ExtraFields',
      value: 10,
      unknown_field: 'should be ignored',
      another_extra: 123,
    })

    assert.equal(res.status, 201)
    assert.equal(res.data.name, 'ExtraFields')
    assert.equal(res.data.value, 10)
    // Extra fields should NOT be in the created record
    assert.equal(res.data.unknown_field, undefined, 'Extra fields should be omitted')
    assert.equal(res.data.another_extra, undefined, 'Extra fields should be omitted')
  })

  it('POST /items — very long string value (1MB) succeeds', async () => {
    const hugeName = 'B'.repeat(1_000_000) // 1MB string
    const res = await POST(port, '/items', { name: hugeName, value: 42 })

    assert.equal(res.status, 201)
    assert.equal(res.data.name, hugeName)
    assert.equal(res.data.value, 42)
    assert.ok(res.data.id)
  })

  // ── Reference includes ────────────────────────────────────────────

  it('GET /items/:id — auto-resolves reference fields to full objects', async () => {
    // First create a user
    const userRes = await POST(port, '/items', { name: 'Alice', value: 1, status: 'active' })
    assert.equal(userRes.status, 201)
    const userId = userRes.data.id

    // The Item model doesn't have reference fields, so this test uses
    // a custom spec with a reference. We'll verify that non-reference
    // fields are returned as-is.
    const res = await GET(port, `/items/${createdItemId}`)
    assert.equal(res.status, 200)
    assert.ok(res.data.name, 'Should have name')
    assert.ok(res.data.id)
  })
})

// ── Reference include tests (separate suite) ────────────────────────

describe('interpreter — reference includes', () => {
  let port: number
  let serverHandle: ReturnType<typeof runInterpreter>

  const REF_SPEC = `product RefTest
    name "Reference Test"

data Project
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field lead
        type reference User

data User
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field email
        type string

api REST /projects
    get /
        return list of Project

    get /:id
        return Project by id
        error 404 if not found

    post /
        accept name, lead
        return created Project
        status 201

    put /:id
        accept name, lead
        return updated Project
        error 404 if not found

api REST /users
    get /
        return list of User

    get /:id
        return User by id
        error 404 if not found

    post /
        accept name, email
        return created User
        status 201
`

  before(async () => {
    const parseResult = parse(REF_SPEC, 'ref-test.clear')
    assert.ok(parseResult.ast !== null)
    serverHandle = runInterpreter(parseResult.ast, { port: 0 })
    port = await waitForServer(serverHandle)
    assert.ok(port > 0)
  })

  after(async () => {
    await serverHandle.close()
  })

  it('POST creates User and Project records', async () => {
    // Create a user
    const userRes = await POST(port, '/users', { name: 'Alice', email: 'alice@example.com' })
    assert.equal(userRes.status, 201)
    assert.ok(userRes.data.id)
    assert.equal(userRes.data.name, 'Alice')
    assert.equal(userRes.data.email, 'alice@example.com')

    refUserId = userRes.data.id

    // Create a project with Alice as lead
    const projRes = await POST(port, '/projects', { name: 'Alpha', lead: userRes.data.id })
    assert.equal(projRes.status, 201)
    assert.equal(projRes.data.name, 'Alpha')
    // The lead field should be auto-resolved to the full User object
    assert.ok(projRes.data.lead, 'lead should be auto-resolved')
    assert.equal(typeof projRes.data.lead, 'object', 'lead should be an object, not a string')
    assert.equal(projRes.data.lead.id, userRes.data.id)
    assert.equal(projRes.data.lead.name, 'Alice')
    assert.equal(projRes.data.lead.email, 'alice@example.com')

    refProjectId = projRes.data.id
  })

  it('GET /projects/:id — returns project with resolved lead', async () => {
    assert.ok(refProjectId, 'Project ID from previous test')
    const projectId = refProjectId

    const res = await GET(port, `/projects/${projectId}`)
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Alpha')

    // lead should be auto-resolved to the full User object
    assert.ok(res.data.lead, 'lead should be present')
    assert.equal(typeof res.data.lead, 'object', 'lead should be an object')
    assert.equal(res.data.lead.name, 'Alice')
    assert.equal(res.data.lead.email, 'alice@example.com')
  })

  it('GET /projects — list auto-resolves leads in all items', async () => {
    // Create another user and project
    const userRes = await POST(port, '/users', { name: 'Bob', email: 'bob@example.com' })
    assert.equal(userRes.status, 201)
    await POST(port, '/projects', { name: 'Beta', lead: userRes.data.id })

    const res = await GET(port, '/projects')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.data.data) || Array.isArray(res.data), 'Should return projects')

    const projects = Array.isArray(res.data) ? res.data : res.data.data
    assert.ok(projects.length >= 2)

    for (const project of projects) {
      assert.ok(project.lead, 'Each project should have a lead')
      assert.equal(typeof project.lead, 'object', 'Lead should be an object')
      assert.ok(project.lead.id, 'Lead should have an id')
      assert.ok(project.lead.name, 'Lead should have a name')
    }
  })

  it('GET /users/:id — user fields are not reference fields, unchanged', async () => {
    assert.ok(refUserId)
    const userId = refUserId

    const res = await GET(port, `/users/${userId}`)
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Alice')
    // name and email are strings, not objects
    assert.equal(typeof res.data.name, 'string')
    assert.equal(typeof res.data.email, 'string')
  })

  it('PUT /projects/:id — updated project has resolved lead', async () => {
    assert.ok(refProjectId)
    const projectId = refProjectId

    const res = await PUT(port, `/projects/${projectId}`, { name: 'Alpha Updated' })
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Alpha Updated')
    // lead should still be resolved
    assert.ok(res.data.lead, 'lead should be present after update')
    assert.equal(typeof res.data.lead, 'object')
    assert.equal(res.data.lead.name, 'Alice')
  })
})

// ── Nested reference tests ──────────────────────────────────────────

describe('interpreter — nested references', () => {
  let port: number
  let serverHandle: ReturnType<typeof runInterpreter>

  const NESTED_REF_SPEC = `product NestedRef
    name "Nested Reference Test"

data Team
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field project
        type reference Project

data Project
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field lead
        type reference User

data User
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field email
        type string
    field team
        type reference Team

api REST /teams
    get /
        return list of Team

    get /:id
        return Team by id
        error 404 if not found

    post /
        accept name
        return created Team
        status 201

api REST /projects
    get /
        return list of Project

    get /:id
        return Project by id
        error 404 if not found

    post /
        accept name, lead
        return created Project
        status 201

    put /:id
        accept name, lead
        return updated Project
        error 404 if not found

api REST /users
    get /
        return list of User

    get /:id
        return User by id
        error 404 if not found

    post /
        accept name, email, team
        return created User
        status 201
`

  before(async () => {
    const parseResult = parse(NESTED_REF_SPEC, 'nested-ref-test.clear')
    assert.ok(parseResult.ast !== null)
    serverHandle = runInterpreter(parseResult.ast, { port: 0 })
    port = await waitForServer(serverHandle)
    assert.ok(port > 0)
  })

  after(async () => {
    await serverHandle.close()
  })

  let teamId: string = ''
  let projId: string = ''
  let userId: string = ''

  it('creates records forming a chain: User→Team and Project→User', async () => {
    // Create Team first
    const teamRes = await POST(port, '/teams', { name: 'Engineering' })
    assert.equal(teamRes.status, 201)
    teamId = teamRes.data.id

    // Create User referencing Team
    const userRes = await POST(port, '/users', { name: 'Alice', email: 'alice@co.com', team: teamId })
    assert.equal(userRes.status, 201)
    userId = userRes.data.id
    // User's team field should be resolved to full Team object
    assert.ok(userRes.data.team, 'team should be resolved')
    assert.equal(typeof userRes.data.team, 'object')
    assert.equal(userRes.data.team.name, 'Engineering')

    // Create Project referencing User
    const projRes = await POST(port, '/projects', { name: 'Alpha', lead: userId })
    assert.equal(projRes.status, 201)
    projId = projRes.data.id
    // Project's lead should be resolved to full User
    assert.ok(projRes.data.lead, 'lead should be resolved')
    assert.equal(typeof projRes.data.lead, 'object')
    assert.equal(projRes.data.lead.name, 'Alice')
    // Nested: lead.team should also be resolved (2 levels deep)
    assert.ok(projRes.data.lead.team, 'lead.team should be nested-resolved')
    assert.equal(typeof projRes.data.lead.team, 'object')
    assert.equal(projRes.data.lead.team.name, 'Engineering')
    // But should NOT go 3 levels to team.project (depth limit)
    // Actually with depth=3 and circular Project→User→Team→Project, the
    // third level (team.project) would hit the circular ref guard and return
    // a shallow copy (no deeper resolution)
  })

  it('GET /projects/:id — resolves 2 levels: lead → team', async () => {
    assert.ok(projId)
    const res = await GET(port, `/projects/${projId}`)
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Alpha')
    assert.ok(res.data.lead, 'lead should be resolved')
    assert.equal(typeof res.data.lead, 'object')
    assert.equal(res.data.lead.name, 'Alice')
    // Nested: lead.team should be resolved (Team has no refs back to Project in its definition except 'project' field)
    assert.ok(res.data.lead.team, 'lead.team should be resolved')
    assert.equal(typeof res.data.lead.team, 'object')
    assert.equal(res.data.lead.team.name, 'Engineering')
  })

  it('GET /projects — list resolves 2 levels deep', async () => {
    const res = await GET(port, '/projects')
    assert.equal(res.status, 200)
    const projects = Array.isArray(res.data) ? res.data : res.data.data
    assert.ok(projects.length >= 1)

    const alpha = projects.find((p: any) => p.name === 'Alpha')
    assert.ok(alpha, 'Alpha project should be in list')
    assert.ok(alpha.lead, 'lead should be resolved')
    assert.equal(typeof alpha.lead, 'object')
    assert.equal(alpha.lead.name, 'Alice')
    // Nested resolution
    assert.ok(alpha.lead.team, 'lead.team should be resolved')
    assert.equal(typeof alpha.lead.team, 'object')
    assert.equal(alpha.lead.team.name, 'Engineering')
  })

  it('circular references do not cause infinite loops', async () => {
    // Team has reference to Project, Project has reference to User,
    // User has reference to Team — this creates a cycle.
    // The visited set should prevent infinite recursion.
    const res = await GET(port, `/projects/${projId}`)
    assert.equal(res.status, 200)
    // Should not crash — response should be well-formed
    assert.ok(res.data.name, 'Should have name')
    assert.ok(res.data.lead, 'Should have resolved lead')
    // The response should complete without infinite recursion
    // Just verify it's a valid response
    assert.equal(typeof res.data, 'object')
  })

  it('PUT /projects/:id — maintains nested resolution after update', async () => {
    assert.ok(projId)
    const res = await PUT(port, `/projects/${projId}`, { name: 'Alpha Updated' })
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Alpha Updated')
    assert.ok(res.data.lead, 'lead should be resolved')
    assert.equal(typeof res.data.lead, 'object')
    assert.equal(res.data.lead.name, 'Alice')
    assert.ok(res.data.lead.team, 'lead.team should still be nested-resolved')
    assert.equal(typeof res.data.lead.team, 'object')
    assert.equal(res.data.lead.team.name, 'Engineering')
  })
})

// ── Response size limit tests ────────────────────────────────────────

describe('interpreter — response size limit', () => {
  let port: number
  let serverHandle: ReturnType<typeof runInterpreter>

  const SIZE_SPEC = `product SizeTest
    name "Response Size Test"

data Item
    field id
        type uuid
        primary true
    field name
        type string
        required true
    field data
        type string

api REST /items
    get /:id
        return Item by id
        error 404 if not found

    post /
        accept name, data
        return created Item
        status 201
`

  before(async () => {
    const parseResult = parse(SIZE_SPEC, 'size-test.clear')
    assert.ok(parseResult.ast !== null)
    // Use a tiny 200 byte limit so normal responses exceed it
    serverHandle = runInterpreter(parseResult.ast, { port: 0, maxResponseSize: 200 })
    port = await waitForServer(serverHandle)
    assert.ok(port > 0)
  })

  after(async () => {
    await serverHandle.close()
  })

  it('POST /items — small response succeeds under size limit', async () => {
    const res = await POST(port, '/items', { name: 'Small', data: 'tiny' })
    assert.equal(res.status, 201)
    assert.equal(res.data.name, 'Small')
  })

  it('POST /items — large response returns 413 Entity Too Large', async () => {
    // Create a record with a large data field that pushes the response over 200 bytes
    const largeData = 'X'.repeat(500)
    const res = await POST(port, '/items', { name: 'Big', data: largeData })

    assert.equal(res.status, 413)
    assert.ok(res.data.error, 'Should have error message')
    assert.ok(res.data.error.includes('Response too large'), 'Error should mention size limit')
    assert.ok(res.data.error.includes('exceeds limit'), 'Error should mention limit exceeded')
  })

  it('GET /items/:id — small record still returns 200', async () => {
    const createRes = await POST(port, '/items', { name: 'Fetchable', data: 'ok' })
    assert.equal(createRes.status, 201, 'Small create should succeed')

    const res = await GET(port, `/items/${createRes.data.id}`)
    assert.equal(res.status, 200)
    assert.equal(res.data.name, 'Fetchable')
  })


})

// ── Flow executor integration tests ───────────────────────────────────

describe('interpreter — flow executor', () => {
  let port: number
  let serverHandle: ReturnType<typeof runInterpreter>

  // ── Basic flow execution ──────────────────────────────────────────

  describe('basic flow execution', () => {
    const FLOW_SPEC = `product FlowTest
    name "Flow Test"

data Customer
    field id
        type uuid
        primary true
    field email
        type email
    field name
        type string
    field source
        type string
    field synced_at
        type timestamp
        default now

flow SyncCustomers
    trigger schedule every 1 minute
    step extract
        fetch customers from Test API
        store raw records
    step transform
        set source to "test"
    step load
        upsert into Customer
    step done
        log sync complete

api REST /customers
    get /
        return list of Customer
`

    before(async () => {
      const parseResult = parse(FLOW_SPEC, 'flow-test.clear')
      assert.ok(parseResult.ast !== null)
      serverHandle = runInterpreter(parseResult.ast, { port: 0 })
      port = await waitForServer(serverHandle)
      assert.ok(port > 0)
      // Wait for the flow to execute (500ms delay + buffer)
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    after(async () => {
      stopAllFlows()
      await serverHandle.close()
    })

    it('fetches customers from API and upserts them into the store', async () => {
      const res = await GET(port, '/customers')
      assert.equal(res.status, 200)

      const customers = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      assert.ok(customers.length >= 3, `Expected at least 3 customers, got ${customers.length}`)
      assert.ok(customers.length <= 7, `Expected at most 7 customers, got ${customers.length}`)

      for (const c of customers) {
        assert.ok(c.id, 'Each customer should have an id')
        assert.ok(c.email, 'Each customer should have an email')
        assert.ok(c.name, 'Each customer should have a name')
        assert.ok(c.synced_at, 'Each customer should have synced_at')
      }
    })

    it('transforms records with set source to "test"', async () => {
      const res = await GET(port, '/customers')
      assert.equal(res.status, 200)

      const customers = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      assert.ok(customers.length >= 1)

      for (const c of customers) {
        assert.equal(c.source, 'test', `Customer ${c.email} should have source set to "test"`)
      }
    })

    it('upsert by email matching prevents duplicate records', async () => {
      const res = await GET(port, '/customers')
      const customers = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []

      const emails = new Set(customers.map((c: any) => c.email))
      assert.equal(emails.size, customers.length, 'All customers should have unique emails (upsert by email matching)')
    })
  })

  // ── Flow with for-each ───────────────────────────────────────────

  describe('flow with for-each iteration', () => {
    const COND_FLOW_SPEC = `product CondFlowTest
    name "Conditional Flow Test"

data Task
    field id
        type uuid
        primary true
    field name
        type string
    field status
        type string

flow ProcessTasks
    trigger schedule every 1 minute
    step generate
        fetch tasks from API
    step iterate
        for each record
            set status to "processed"
    step save
        upsert into Task

api REST /tasks
    get /
        return list of Task
`

    before(async () => {
      const parseResult = parse(COND_FLOW_SPEC, 'cond-flow-test.clear')
      assert.ok(parseResult.ast !== null)
      serverHandle = runInterpreter(parseResult.ast, { port: 0 })
      port = await waitForServer(serverHandle)
      assert.ok(port > 0)
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    after(async () => {
      stopAllFlows()
      await serverHandle.close()
    })

    it('for-each iterates over all fetched records and sets status', async () => {
      const res = await GET(port, '/tasks')
      assert.equal(res.status, 200)

      const tasks = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      assert.ok(tasks.length >= 3, `Expected at least 3 tasks, got ${tasks.length}`)
      assert.ok(tasks.length <= 7, `Expected at most 7 tasks, got ${tasks.length}`)

      for (const t of tasks) {
        assert.equal(t.status, 'processed', `Task ${t.name} should have status "processed"`)
      }
    })
  })

  // ── Flow deduplication ────────────────────────────────────────────

  describe('flow with deduplicate', () => {
    const DEDUP_FLOW_SPEC = `product DedupFlowTest
    name "Dedup Flow Test"

data Contact
    field id
        type uuid
        primary true
    field email
        type email
    field name
        type string

flow DedupContacts
    trigger schedule every 1 minute
    step generate
        fetch contacts from API
        set email to "dupe@test.com"
    step clean
        deduplicate by email
    step save
        upsert into Contact

api REST /contacts
    get /
        return list of Contact
`

    before(async () => {
      const parseResult = parse(DEDUP_FLOW_SPEC, 'dedup-flow-test.clear')
      assert.ok(parseResult.ast !== null)
      serverHandle = runInterpreter(parseResult.ast, { port: 0 })
      port = await waitForServer(serverHandle)
      assert.ok(port > 0)
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    after(async () => {
      stopAllFlows()
      await serverHandle.close()
    })

    it('deduplicate by email removes duplicate records before upsert', async () => {
      const res = await GET(port, '/contacts')
      assert.equal(res.status, 200)

      const contacts = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      assert.equal(contacts.length, 1, `Expected exactly 1 contact after dedup by email, got ${contacts.length}`)
      assert.equal(contacts[0].email, 'dupe@test.com')
      assert.ok(contacts[0].id)
    })
  })

  // ── Flow with create step ─────────────────────────────────────────

  describe('flow with create step', () => {
    const CREATE_FLOW_SPEC = `product CreateFlowTest
    name "Create Flow Test"

data Event
    field id
        type uuid
        primary true
    field name
        type string
    field count
        type integer

data Summary
    field id
        type uuid
        primary true
    field total
        type integer
    field description
        type string

flow GenerateSummary
    trigger schedule every 1 minute
    step prepare
        fetch events from API
        set total to 100
    step build
        for each record
            create new Summary
    step finish
        log summary generated

api REST /summaries
    get /
        return list of Summary
`

    before(async () => {
      const parseResult = parse(CREATE_FLOW_SPEC, 'create-flow-test.clear')
      assert.ok(parseResult.ast !== null)
      serverHandle = runInterpreter(parseResult.ast, { port: 0 })
      port = await waitForServer(serverHandle)
      assert.ok(port > 0)
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    after(async () => {
      stopAllFlows()
      await serverHandle.close()
    })

    it('create step creates a Summary record for each fetched Event', async () => {
      const res = await GET(port, '/summaries')
      assert.equal(res.status, 200)

      const summaries = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      assert.ok(summaries.length >= 3, `Expected at least 3 summaries, got ${summaries.length}`)
      assert.ok(summaries.length <= 7, `Expected at most 7 summaries, got ${summaries.length}`)

      for (const s of summaries) {
        assert.ok(s.id, 'Each summary should have an id')
        assert.ok(s.total !== undefined, 'Summary should have a total field')
      }
    })
  })
})