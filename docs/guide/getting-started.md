# Getting Started with Clear

Clear is a declarative specification language that turns one `.clear` file into a running REST API + Web UI.

## Installation

```bash
npm install -g varshinicb-clear
```

Or run without installing:

```bash
npx -p varshinicb-clear clear-cli run app.clear
```

## Your First API

Create a file called `app.clear`:

```clear
product MyAPI
    name "My First API"

data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["todo", "in_progress", "done"]

api REST /tasks
    get /           return list of Task
    post /          accept title     return created Task    status 201

screen Dashboard
    section list   show tasks as table
    section stats  show tasks as stat   label "Tasks"
```

Run it:

```bash
clear-cli run app.clear
```

You'll get:

| Endpoint | URL |
|----------|-----|
| REST API | `http://localhost:8080/api/tasks` |
| Web UI | `http://localhost:8080/s/dashboard` |

## What Just Happened?

- **`data Task`** — Created an in-memory data store with auto-generated UUIDs
- **`api REST /tasks`** — Generated GET, POST, PUT, DELETE endpoints with filtering, sorting, and pagination
- **`screen Dashboard`** — Rendered a live HTML page with a sortable table and stat card
- **`auth`** (if included) — Added signup/login/logout endpoints
- **Persistence** — Data auto-saves to `.clear-data/` directory

## Next Steps

- Explore the [Language Reference](language.md)
- Read the [CLI Reference](cli.md)
- Browse [Examples](../examples/)
- Try the [Live Playground](https://varshinicb1.github.io/clear2.0/)
