# Clear CLI Reference

## Commands

### clear-cli run
Start a live server from a `.clear` file.

```bash
clear-cli run app.clear
clear-cli run app.clear --port 3000
clear-cli run app.clear --watch
clear-cli run app.clear --verbose
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8080` | Port to listen on |
| `--watch` | `false` | Hot-reload on file changes |
| `--verbose` | `false` | Log all HTTP requests |
| `--silent` | `false` | Suppress startup banner |
| `--resolve-depth` | `3` | Max nested reference resolution depth |
| `--max-response-size` | `100000` | Max response body size (bytes) |

### clear-cli check
Parse and validate a `.clear` file without running it.

```bash
clear-cli check app.clear
```

### clear-cli build
Generate production code from a `.clear` file.

```bash
# TypeScript interfaces + Zod schemas
clear-cli build app.clear

# Express.js server
clear-cli build app.clear --target express

# Hono server
clear-cli build app.clear --target hono

# Fastify server
clear-cli build app.clear --target fastify

# Koa server
clear-cli build app.clear --target koa

# OpenAPI 3.0 spec
clear-cli build app.clear --target openapi

# Postman Collection v2.1
clear-cli build app.clear --target postman
```

**Output:** Writes generated code to `clear-output/` directory.

### clear-cli init
Scaffold a new Clear project.

```bash
clear-cli init my-api
clear-cli init my-api --template todo-api
```

**Built-in templates:**
- `default` — Basic CRUD API with one data model, REST routes, and a dashboard screen
- `todo-api` — Full-featured Todo API with tasks, projects, users, kanban, and auth

### clear-cli mcp
Start the MCP (Model Context Protocol) server for AI agent integration.

```bash
clear-cli mcp
```

**Exposed tools:**

| Tool | Description |
|------|-------------|
| `validate` | Parse and validate a .clear file |
| `build` | Generate code from a .clear file |
| `explain` | Summarize what a .clear file does |
| `list_models` | List all data models with their fields |
| `list_apis` | List all API endpoints |
| `list_screens` | List all screen definitions |

## Global Flags

| Flag | Description |
|------|-------------|
| `--version` | Print version number |
| `--help` | Show help for any command |
