<p align="center">
  <img src="docs/assets/clear-logo.png" alt="Clear" width="120" />
</p>

<h1 align="center">Clear</h1>

<p align="center">
  <strong>Structured English for REST APIs. Write the spec, run the server.</strong>
</p>

<p align="center">
  <a href="#-quickstart"><img src="https://img.shields.io/badge/Quickstart-30s-blue?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@varshinicb1/clear"><img src="https://img.shields.io/npm/v/@varshinicb1/clear?style=flat-square" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" /></a>
  <a href="https://github.com/varshinicb1/clear2.0"><img src="https://img.shields.io/github/stars/varshinicb1/clear2.0?style=flat-square" /></a>
</p>

---

## 🚀 Quickstart

```bash
# Install
npm install -g @varshinicb1/clear

# Create your first API
mkdir my-api && cd my-api

# Write your spec
echo 'product MyAPI
    name "My First API"

data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["todo", "done"]   default "todo"

api REST /tasks
    get /       return list of Task
    post /      accept title     return created Task    status 201' > app.clear

# Run it — instant server with REST API + Web UI
clear run app.clear
# → http://localhost:8080/api/tasks   (REST API)
# → http://localhost:8080/s/dashboard  (Web UI)
```

## ✨ Features

| Feature | What you write | What you get |
|---------|---------------|--------------|
| **Data Models** | `data Task` + fields + types | Type-safe schemas, auto-generated IDs |
| **REST APIs** | `api REST /tasks` + routes | Full CRUD with filtering, sorting, pagination |
| **Web UI** | `screen Dashboard` + components | Live HTML pages — tables, kanban, charts, forms |
| **Auth** | `auth Default` + login/signup | Token-based sessions, protected routes & screens |
| **Charts** | `show X as bar / line / pie` | SVG charts — zero dependencies |
| **Kanban** | `show tasks as kanban` | Drag-ready kanban board |
| **Calendar** | `show tasks as calendar` | Month calendar with events |
| **Timeline** | `show X as timeline` | Vertical timeline / Gantt |
| **Data Grid** | `show X as datagrid` | Editable inline table |
| **Validation** | `rule TaskValidation` | Runtime validation on create/update |
| **Persistence** | Auto-enabled | Data saves to `.clear-data/`, survives restarts |
| **Export** | `--target express / openapi / postman` | Production code, OpenAPI spec, Postman collections |

## 📋 Example: Task Manager (140 lines)

```clear
product TaskManager
    name "Full-Stack Task Manager"
    version "1.0"

data User
    field id       type uuid      primary true
    field name     type string    required true
    field email    type email     required true   unique true

data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["backlog", "todo", "in_progress", "review", "done"]
    field priority type enum      options ["low", "medium", "high", "urgent"]
    field assignee type reference User

api REST /api/tasks
    get /            return list of Task     paginate 50 per page
                     filter by status, priority    sort by created_at desc
    get /:id         return Task by id       include assignee details    error 404 if not found
    post /           accept title, priority, assignee   return created Task   status 201
    put /:id         accept title, status, priority     return updated Task   error 404 if not found
    delete /:id      status 204              error 404 if not found

screen Dashboard
    title "Dashboard"
    section stats    show tasks as stat      label "Total Tasks"
    section overview show tasks as table     sort by created_at desc

screen KanbanBoard
    title "Kanban"
    section board    show tasks as kanban

screen Analytics
    section charts   show tasks as bar       label title     value priority
    section pie      show tasks as pie       label title     value priority

auth Default
    accept email, password, name
    session jwt      expire 7 days

config development
    port 8080

deploy cloudflare-workers
    routes /api/*
    routes /s/*

# Run it:
clear run task-manager.clear
# → Web UI at http://localhost:3000
# → API at http://localhost:3000/api/tasks
# → Login at http://localhost:3000/s/login
```

## 🏢 Sector Examples

Clear works for every industry. Run any of these:

```bash
# 🛒 E-Commerce — products, cart, orders, inventory
clear run examples/ecommerce.clear

# 💬 Chat App — rooms, messages, users, status
clear run examples/chat-app.clear

# 🏥 Healthcare — patients, appointments, records, prescriptions
clear run examples/healthcare.clear

# 💰 Fintech — accounts, transactions, invoices, payouts
clear run examples/fintech.clear

# ✅ Task Manager — tasks, kanban, users, projects
clear run examples/task-manager.clear
```

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `clear run app.clear` | Start a live server (REST API + Web UI) |
| `clear check app.clear` | Parse + validate a .clear file |
| `clear build app.clear --target express` | Generate Express.js server |
| `clear build app.clear --target openapi` | Export OpenAPI 3.0 spec |
| `clear build app.clear --target postman` | Export Postman collection |
| `clear build app.clear --target hono` | Generate Hono server |
| `clear build app.clear --target fastify` | Generate Fastify server |
| `clear build app.clear --target koa` | Generate Koa server |
| `clear init my-app` | Scaffold a new project |

### Run Options

| Flag | Description |
|------|-------------|
| `--port 3000` | Port to run on (default: 8080) |
| `--verbose` | Log all HTTP requests |
| `--silent` | Suppress startup output |
| `--watch` | Hot-reload on file changes |
| `--resolve-depth 5` | Nested reference depth |
| `--max-response-size 100000` | Response size limit |

## 🎨 Screen Components

| Component | Clear Syntax | Description |
|-----------|-------------|-------------|
| Table | `show X as table` | Sortable data table with badges |
| List / Card | `show X as list` | Card grid layout |
| Kanban | `show X as kanban` | Columns grouped by status |
| Bar Chart | `show X as bar` | SVG bar chart |
| Line Chart | `show X as line` | SVG line chart |
| Pie Chart | `show X as pie` | SVG pie chart |
| Calendar | `show X as calendar` | Month view calendar |
| Timeline | `show X as timeline` | Date-ordered timeline |
| Data Grid | `show X as datagrid` | Editable inline table |
| Stat Card | `show X as stat` | KPI / metric display |
| Search | `search` | Auto-filter search bar |
| Form | `field ...` | Auto-generated from model |
| Button | `button "X"` | Styled action button |
| Tabs | `tabs / tab "X"` | Tabbed containers |

## 📖 Language Spec

- **12 keywords**: `product`, `data`, `screen`, `flow`, `rule`, `example`, `agent`, `skill`, `api`, `event`, `config`, `deploy`, `auth`
- **8 primitive types**: string, integer, float, boolean, timestamp, uuid, url, email
- **4 compound types**: list, map, enum, reference
- **Indentation-based**: 4-space hierarchy, no braces
- **Full spec**: See [spec/](spec/) directory

## 🔧 VS Code Extension

Install the [Clear Language](vscode-extension/) extension for:
- Syntax highlighting for `.clear` files
- Code snippets (product, data, api, screen, auth, etc.)
- Commands: Run, Validate, Build from the command palette

## 📦 What's Built

```
clear-repo/
  src/
    index.ts            # CLI entry point
    ast.ts              # AST type definitions
    parser.ts           # Recursive descent parser
    validator.ts        # Semantic validator
    codegen/            # Code generators (TypeScript, Express, Hono, Fastify, Koa)
      openapi.ts        # OpenAPI 3.0 export
      postman.ts        # Postman collection export
      react.ts          # React app generator
    interpreter/
      index.ts          # Interpreter orchestrator
      server.ts         # HTTP server
      store.ts          # In-memory data store
      renderer.ts       # Screen renderer (14 components)
      auth.ts           # Authentication system
      persistence.ts    # File-based persistence
      flow.ts           # Flow/ETL executor
      renderer/
        templates.ts    # Custom template engine
  examples/             # 10+ working examples
  spec/                 # Language specification
  vscode-extension/     # VS Code extension
```

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT — see [LICENSE](LICENSE).
