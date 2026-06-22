# Twitter/X Launch Thread

---

**Tweet 1:**
I built a language that turns 15 lines of structured English into a running REST API + Web UI.

No database setup. No Docker. No frontend framework. One file, running server.

It's called Clear. Here's how it works 🧵

**Tweet 2:**
Write this:
```
data Task
    field id     type uuid      primary true
    field title  type string    required true

api REST /tasks
    get /    return list of Task
    post /   accept title

screen Dashboard
    section list show tasks as table
```

That's your entire backend.

**Tweet 3:**
Run it:
```
npm install -g varshinicb-clear
clear-cli run app.clear
```

→ REST API at localhost:8080/api/tasks
→ Web UI at localhost:8080/s/dashboard
→ Auto CRUD, filtering, sorting, pagination
→ Auth, persistence, all included

**Tweet 4:**
What's under the hood (~12,500 LOC TypeScript):

• Hand-written parser + validator
• Zero-dependency HTTP server
• 14 HTML/SVG UI components (kanban, charts, calendars, forms)
• 7 codegen targets: Express, Hono, Fastify, Koa, OpenAPI, Postman, React
• Auth, persistence, ETL flow engine
• VS Code extension + MCP server

Built completely from scratch.

**Tweet 5:**
Try it without installing:
```
npx -p varshinicb-clear clear-cli run app.clear
```

GitHub → github.com/varshinicb1/clear2.0
npm → varshinicb-clear

I built this solo. Would love your feedback, issues, and ideas ❤️

#ClearLanguage #TypeScript #BuildInPublic #OpenSource
