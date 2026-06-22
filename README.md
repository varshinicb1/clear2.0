<p align="center">
  <img src="docs/assets/clear-logo.png" alt="Clear" width="120" />
</p>

<h1 align="center">Clear</h1>

<p align="center">
  <strong>One .clear file → Instant REST API + Web UI. No boilerplate. No build step. Just run.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/varshinicb-clear"><img src="https://img.shields.io/npm/v/varshinicb-clear?style=for-the-badge&logo=npm&color=cb3837" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=node.js" /></a>
  <a href="#"><img src="https://img.shields.io/github/stars/varshinicb1/clear2.0?style=for-the-badge&logo=github&color=22272e" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3da639?style=for-the-badge" /></a>
<br/>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript_7-3178C6?style=for-the-badge&logo=typescript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/LOC~12,500-ff69b4?style=for-the-badge" /></a>
  <a href="#"><img src="https://img.shields.io/badge/7_Codegen_Targets-blueviolet?style=for-the-badge" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Frameworks-Express_|_Hono_|_Fastify_|_Koa-6db33f?style=for-the-badge" /></a>
</p>

---

https://github.com/user-attachments/assets/3d8a34e7-9f27-42d6-b104-92a5e726e73a

---

## 🚀 This is Clear

```bash
npm install -g varshinicb-clear
```

Create `app.clear`:

```clear
product MyAPI
    name "My API"

data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["todo", "in_progress", "done"]

api REST /tasks
    get /    return list of Task
    post /   accept title     return created Task    status 201

screen Dashboard
    section list   show tasks as table
    section stats  show tasks as stat   label "Tasks"
```

Run it:

```bash
clear-cli run app.clear
```

| | |
|---|---|
| 🌐 **REST API** | `http://localhost:8080/api/tasks` |
| 🎨 **Web UI** | `http://localhost:8080/s/dashboard` |
| 🔄 **Auto CRUD** | GET, POST, PUT, DELETE — all generated |
| 🔍 **Filter + Sort** | `?status=todo&_sort=created_at` |
| 💾 **Persistence** | Auto-saves to `.clear-data/` |

**No database. No ORM. No frontend framework. No Docker. No config files.**

---

## ✨ The "Wait, That's It?" Moment

That 15-line file above gave you:

| You wrote | What you got for free |
|-----------|----------------------|
| `data Task` | Type-safe CRUD store with auto UUIDs |
| 4 lines of routes | Full REST API — GET, POST, PUT, DELETE |
| 2 `show` lines | Two live dashboard pages — table + stats |
| Nothing | Auto-generated OpenAPI docs |
| Nothing | Auto-generated Postman collection |
| Nothing | File persistence that survives restarts |
| Nothing | Filtering, sorting, and pagination |
| Nothing | CORS, JSON parsing, error handling |

---

## 📦 What's Under the Hood

A complete language runtime, built from scratch:

**🧠 Language** — 13 keywords, 12 types, indentation-based grammar, hand-written recursive descent parser + validator

**⚡ Live Interpreter** — Zero-dependency HTTP server, in-memory CRUD store, hot reload, 14 HTML/SVG UI components (tables, kanban, bar/line/pie charts, calendars, timelines, forms, carousels, data grids)

**🔐 Auth System** — Token-based signup/login/logout with session management

**🔄 Flow Engine** — Scheduled ETL pipelines with conditional branching and data transforms

**🎯 7 Code Generators** — TypeScript, Express.js, Hono, Fastify, Koa, OpenAPI 3.0, Postman v2.1

**⚛️ React Generator** — Full Vite + React + TypeScript apps from `.clear` files

**🤖 MCP Server** — 6 tools for AI agents (validate, build, explain, list models/APIs/screens)

**🖥️ VS Code Extension** — Syntax highlighting, 12 snippets, Run/Check/Build commands

---

## 📋 Real World Example: 250 Lines → Complete Team Platform

```bash
clear-cli run examples/team-collab/team-collab.clear
```

| What's inside | Count |
|---------------|-------|
| Data Models | User, Project, Task, Document, Comment, Notification |
| API Endpoints | 18 REST endpoints across 5 resources |
| Screens | Dashboard, Kanban Board, Calendar, Documents, Team, Activity |
| Auth | Email/password signup + login + protected routes |
| Flow | Daily digest notification scheduler |

```clear
product TeamCollab
    name "Team Collaboration Hub"

data User
    field id       type uuid      primary true
    field name     type string    required true
    field email    type email     required true    unique true

data Task
    field id        type uuid           primary true
    field title     type string         required true
    field project   type reference Project       required true
    field assignee  type reference User
    field status    type enum           options ["backlog", "todo", "in_progress", "review", "done"]
    field priority  type enum           options ["low", "medium", "high", "urgent"]

auth Default
    accept email, password, name
    session jwt   expire 7 days

screen Kanban
    section board    show tasks as kanban

screen Calendar
    section timeline show tasks as calendar   date due_date
```

---

## 🎯 CLI Commands

```bash
clear-cli run app.clear              # Start live server
clear-cli check app.clear            # Validate syntax
clear-cli build app.clear            # Generate TypeScript
clear-cli build app.clear --target express   # Generate Express server
clear-cli build app.clear --target hono      # Generate Hono server
clear-cli build app.clear --target fastify   # Generate Fastify server
clear-cli build app.clear --target koa       # Generate Koa server
clear-cli build app.clear --target openapi   # Export OpenAPI 3.0 spec
clear-cli build app.clear --target postman   # Export Postman collection
clear-cli init my-app                # Scaffold a new project
clear-cli mcp                        # Start MCP server for AI agents
```

### Run Options
`--port 3000` · `--verbose` · `--silent` · `--watch` · `--resolve-depth 5` · `--max-response-size 100000`

---

## 🖌️ Screen Components

| Component | Syntax | What you get |
|-----------|--------|--------------|
| Table | `show tasks as table` | Sortable data table |
| Kanban | `show tasks as kanban` | Columns grouped by status |
| Bar Chart | `show sales as bar` | SVG bar chart |
| Line Chart | `show revenue as line` | SVG line chart |
| Pie Chart | `show distribution as pie` | SVG pie chart |
| Calendar | `show events as calendar` | Month view calendar |
| Timeline | `show milestones as timeline` | Date-ordered Gantt view |
| Data Grid | `show items as datagrid` | Editable inline table |
| Stat Card | `show tasks as stat` | KPI metric display |
| Cards | `show users as list` | Card grid layout |
| Search | `search` | Auto-filter search bar |
| Forms | `field ...` | Auto-generated from model |
| Tabs | `tabs / tab "X"` | Tabbed containers |

---

## 🏢 Sector Examples

```bash
# 🛒 E-Commerce — products, cart, orders, inventory
clear-cli run examples/ecommerce.clear

# 💬 Chat App — rooms, messages, users, status
clear-cli run examples/chat-app.clear

# 🏥 Healthcare — patients, appointments, records, prescriptions
clear-cli run examples/healthcare.clear

# 💰 Fintech — accounts, transactions, invoices, payouts
clear-cli run examples/fintech.clear

# ✅ Task Manager — tasks, kanban, users, projects
clear-cli run examples/task-manager.clear
```

---

## 📦 Try It Now

```bash
# One-liner — no install required:
npx -p varshinicb-clear clear-cli run app.clear

# Or install globally:
npm install -g varshinicb-clear
```

**GitHub:** [github.com/varshinicb1/clear2.0](https://github.com/varshinicb1/clear2.0)
**npm:** [`varshinicb-clear`](https://www.npmjs.com/package/varshinicb-clear)

---

## 🤖 AI Agent Integration

Clear ships with an MCP server so AI agents can work with `.clear` files:

```bash
clear-cli mcp
```

Or add to your AI agent's `.mcp.json`:
```json
{
  "mcpServers": {
    "clear": {
      "command": "npx",
      "args": ["-y", "varshinicb-clear@latest", "clear-mcp"]
    }
  }
}
```

**Tools:** `validate`, `build`, `explain`, `list_models`, `list_apis`, `list_screens`

See [AGENTS.md](AGENTS.md) for the full agent guide.

---

## 🎓 Built From Scratch

Parsed. Validated. Interpreted. Rendered. Generated.

~12,500 lines of TypeScript.
7 code generation targets.
Zero external runtime dependencies.
One `.clear` file.

---

## License

MIT — see [LICENSE](LICENSE).
