# Clear Language — AI Agent Guide

> For AI coding agents (Claude, Copilot, etc.) who want to work with Clear language files.

## Overview

Clear is a declarative spec language for building REST APIs and web UIs. This document helps AI agents understand, validate, and generate Clear projects efficiently.

## MCP Server (Recommended for Agents)

The fastest way for an AI agent to work with Clear files is via the MCP server.

### Setup

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "clear": {
      "command": "npx",
      "args": ["-y", "varshinicb-clear@latest", "clear-mcp"],
      "description": "Clear language MCP server"
    }
  }
}
```

### Available Tools

| Tool | Description | When to use |
|------|-------------|-------------|
| `validate` | Parse + validate a .clear file | Always run this before using a .clear file |
| `build` | Generate code (express, hono, openapi, postman, etc.) | When user wants to deploy or export |
| `explain` | Summarize what a .clear file does | When first encountering a .clear file |
| `list_models` | List all data models with fields and types | When you need to understand the schema |
| `list_apis` | List all API endpoints | When you need to know what endpoints exist |
| `list_screens` | List all screen/UI definitions | When you need to understand the UI structure |

### Agent Workflow

```
1. User says "build an API" 
2. Agent creates a .clear file
3. Agent calls validate → fix any errors → repeat until valid
4. Agent calls explain → verify the structure matches intent
5. Agent calls build --target express → generate deployable code
   OR
   Agent runs `clear-cli run app.clear` → start live server
```

## CLI Reference (for agents)

```bash
# Installation
npm install -g varshinicb-clear
# OR run without installing:
npx -p varshinicb-clear clear-cli <command>

# Commands
clear-cli check app.clear          # Validate syntax
clear-cli run app.clear            # Start live server
clear-cli build app.clear          # Generate TypeScript
clear-cli build --target express   # Generate Express server
clear-cli build --target openapi   # Export OpenAPI spec
clear-cli build --target postman   # Export Postman collection
clear-cli init my-app              # Scaffold new project
clear-cli mcp                      # Start MCP server
```

## Clear Language Syntax (Quick Reference)

### Structure
```
product ProjectName     # Every file starts with product
    name "..."          # Properties are indented 4 spaces
    version "1.0"
```

### 13 Keywords
```
product  data     screen   flow     rule     example
agent    skill    api      event    config   deploy   auth
```

### Data Models
```clear
data User
    field id        type uuid       primary true
    field email     type email      required true    unique true
    field name      type string     required true
    field status    type enum       options ["active", "inactive"]
    field score     type float      default 0
    field tags      type list of string
    field manager   type reference User
```

### API Endpoints
```clear
api REST /users
    get /               return list of User     paginate 20 per page
                        filter by status        sort by name
    get /:id            return User by id       error 404 if not found
    post /              accept name, email      return created User    status 201
    put /:id            accept name, email      return updated User    error 404 if not found
    delete /:id         status 204              error 404 if not found
```

### Screen Components
```clear
screen Dashboard
    title "Dashboard"
    section stats   show tasks as stat            label "Total"
    section table   show tasks as table           sort by date
    section board   show tasks as kanban
    section chart   show tasks as bar             label name   value count
    section cal     show tasks as calendar        date due_date
    section tl      show tasks as timeline        date created_at
    section grid    show tasks as datagrid
    section search  search                        placeholder "Find..."
    section form    field title   field status
    tabs
        tab "Active"    show active as table
        tab "Archived"  show archived as list
    button "Save"   action submit    style primary large
```

### Authentication
```clear
auth Default
    accept email, password, name
    session jwt     expire 7 days
```

### Validation Rules
```clear
rule NameValidation
    apply to User
    require name is not empty
```

### Configuration
```clear
config production
    port 8080
    database postgres from env DATABASE_URL
```

### Deployment
```clear
deploy cloudflare-workers
    routes /api/*
```

## Best Practices for AI Agents

1. **Always validate** — run `validate` after creating/modifying any `.clear` file
2. **Use `explain` first** — when encountering an existing file, understand it before modifying
3. **Start simple** — define data models first, then APIs, then screens
4. **Export early** — use `build --target openapi` to generate API docs the user can review
5. **Auth is optional** — only add `auth` if the user needs login/signup
6. **Screens auto-register** — at `/s/<screen-name>` when the server runs
7. **Indentation matters** — always 4 spaces, never tabs
8. **Run locally** — `clear-cli run app.clear --port 3000` for testing

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `clear-cli` command not found | Install globally: `npm install -g varshinicb-clear` |
| Parse error "unknown keyword" | Check for typos in block names (must be one of 13 keywords) |
| "Field missing type" | Ensure fields have `type` on a new indented line |
| Port in use | Use `--port 3001` or kill the existing process |
| Server won't start | Run `clear-cli check` first to fix validation errors |
