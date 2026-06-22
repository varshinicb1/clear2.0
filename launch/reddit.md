# Reddit: r/javascript / r/typescript / r/webdev

## Title option 1 (r/javascript):
**I wrote a language that turns 15 lines of structured English into a running REST API + Web UI**

## Title option 2 (r/typescript):
**Clear: A TypeScript-native language runtime — one .clear file, instant REST API + Web UI, 7 codegen targets**

## Title option 3 (r/webdev):
**I got tired of boilerplate so I built a language that IS the backend (one file → running server)**

---

Post body:

```clear
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

That's it. That's the whole backend.

```
npm install -g varshinicb-clear
clear-cli run app.clear
# → REST API at localhost:8080/api/tasks
# → Web UI at localhost:8080/s/dashboard
```

Full CRUD, auto-generated IDs, filtering, sorting, pagination, CORS, JSON parsing — all free.

What's actually in the box (~12,500 LOC TypeScript, built from scratch):
- Hand-written recursive descent parser + validator
- Zero-dependency HTTP server (Node built-in http module)
- 14 server-side UI components: tables, kanban, bar/line/pie SVG charts, calendars, timelines, data grids, forms
- Auth with signup/login/logout
- File persistence that survives restarts
- ETL flow engine for data pipelines
- 7 codegen targets: TypeScript, Express, Hono, Fastify, Koa, OpenAPI 3.0, Postman v2.1
- React (Vite + TS) app generator
- MCP server for AI tools
- VS Code extension with syntax highlighting

I forked Sahin Boydaş's original Clear language spec and built the entire runtime. Published on npm as `varshinicb-clear`.

Try it: `npx -p varshinicb-clear clear-cli run app.clear` (no install needed)

Repo: https://github.com/varshinicb1/clear2.0

Would love honest feedback — what would make this something you'd actually use?
