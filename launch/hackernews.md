# Show HN: Clear – One .clear file → Instant REST API + Web UI (12.5k LOC TypeScript)

Title: **Show HN: Clear – I built a language that turns structured English into a running REST API + Web UI**

Post:

I got tired of writing the same boilerplate for every backend project. Models, routes, controllers, serializers, docs — most of it is just wiring.

So I built Clear — a declarative language where one `.clear` file IS your backend. Parse it, validate it, run it. No database setup, no ORM config, no Docker, no frontend framework.

```
data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["todo", "done"]

api REST /tasks
    get /    return list of Task
    post /   accept title     return created Task    status 201

screen Dashboard
    section list   show tasks as table
```

Run `clear-cli run app.clear` → `http://localhost:8080/api/tasks` + `http://localhost:8080/s/dashboard`

What's under the hood (~12,500 lines of TypeScript, built from scratch):
- Hand-written recursive descent parser + semantic validator
- Zero-dependency HTTP server with CRUD, filtering, sorting, pagination
- Server-side HTML/SVG renderer — 14 components (tables, kanban, charts, calendars, timelines, forms)
- Token-based auth (signup/login/logout)
- File persistence (data survives restarts)
- ETL flow engine with scheduled pipelines
- 7 code generation targets: TypeScript, Express, Hono, Fastify, Koa, OpenAPI 3.0, Postman v2.1
- React (Vite) app generator
- MCP server for AI agent integration
- VS Code extension

Why I built it: Most developer time is spent wiring. The spec should BE the implementation, not a precursor to it. This is v0.4.3, very early, but already running real HTTP servers from a single file.

npm: https://npmjs.com/package/varshinicb-clear
Repo: https://github.com/varshinicb1/clear2.0

Would love feedback from the HN crowd — what's missing, what's over-engineered, what would make this genuinely useful?

(Very early work, built by one person over the last few weeks. Credit to Sahin Boydaş for the original language vision.)
