# Clear Language — AI Agent Guide

Clear is a declarative spec language for building REST APIs and web UIs. Write `.clear` files in structured English, then run them directly or generate production code.

## Quick Reference

```bash
# Install
npm install -g varshinicb-clear

# Commands
clear run app.clear          # Start live server (REST API + Web UI)
clear check app.clear        # Validate syntax
clear build app.clear        # Generate TypeScript
clear build app.clear --target express   # Generate Express server
clear build app.clear --target openapi   # Export OpenAPI spec
clear build app.clear --target postman   # Export Postman collection
clear init my-app            # Scaffold a new project
```

## File Structure

A `.clear` file starts with `product` and contains blocks:

```
product MyApp
    name "My App"
    version "1.0"

data Task
    field id        type uuid       primary true
    field title     type string     required true
    field status    type enum       options ["todo", "in_progress", "done"]

api REST /tasks
    get /           return list of Task
    post /          accept title    return created Task    status 201

screen Dashboard
    section list    show tasks as table
```

## 13 Keywords

`product` · `data` · `screen` · `flow` · `rule` · `example` · `agent` · `skill` · `api` · `event` · `config` · `deploy` · `auth`

## Key Syntax Rules

- **Indentation**: 4 spaces per level (no tabs)
- **Naming**: PascalCase for blocks (`TaskManager`), snake_case for fields (`created_at`)
- **Strings**: double-quoted (`"hello"`)
- **Comments**: `//` to end of line
- **Types**: string, integer, float, boolean, timestamp, uuid, url, email, enum, reference, list of, map

## Built-in Screen Components

```
show X as table      show X as kanban      show X as bar/line/pie
show X as list/card  show X as calendar    show X as timeline
show X as datagrid   show X as stat        show X as carousel
search               tabs / tab "X"        field X
button "X"                                  template "path"
```

## Auth Block

```clear
auth Default
    accept email, password, name
    session jwt   expire 7 days
```

## Export Generators

```bash
clear build app.clear --target openapi     # OpenAPI 3.0
clear build app.clear --target postman     # Postman v2.1
clear build app.clear --target express     # Express.js
clear build app.clear --target hono        # Hono
clear build app.clear --target fastify     # Fastify
clear build app.clear --target koa         # Koa
```

## MCP Server

This project includes an MCP server at `src/mcp-server.ts` that exposes Clear tools to AI agents:
- `validate` — parse and validate .clear files
- `build` — generate code from .clear files
- `explain` — summarize what a .clear file does
- `list_models` — list data models with fields
- `list_apis` — list API endpoints
- `list_screens` — list screen definitions

## Project Structure

```
src/
  parser.ts           # Recursive descent parser
  validator.ts        # Semantic validator
  ast.ts             # AST type definitions
  index.ts           # CLI entry point
  codegen/           # Code generators (TS, Express, Hono, Fastify, Koa, OpenAPI, Postman)
    openapi.ts       # OpenAPI 3.0 export
    postman.ts       # Postman collection export
    react.ts         # React app generator
  interpreter/
    index.ts         # Interpreter orchestrator
    server.ts        # HTTP server
    store.ts         # In-memory data store
    renderer.ts      # Screen renderer (14 components)
    auth.ts          # Authentication system
    persistence.ts   # File-based persistence
    flow.ts         # Flow/ETL executor
  mcp-server.ts     # MCP server for AI agents
```

## Best Practices for AI Agents

1. **Always validate** `.clear` files with `clear check` before running
2. **Start with `product`** block — every valid file needs it
3. **Use `clear build --target openapi`** to generate API docs
4. **Prefer the MCP server** for structured queries about Clear files
5. **Screens auto-register** at `/s/<screen-slug>` when the interpreter runs
6. **Auth endpoints** auto-register at `/api/auth/signup | login | logout | me`
