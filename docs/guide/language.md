# Clear Language Reference

## File Structure

A `.clear` file starts with a `product` block and contains any number of other blocks:

```clear
product MyProduct
    name "My Product"
    version "1.0"

data ...
api ...
screen ...
auth ...
```

## 13 Keywords

### product
Defines the product metadata. Every `.clear` file must have exactly one.

```clear
product MyAPI
    name "My API"
    version "1.0"
```

### data
Defines a data model with typed fields.

```clear
data Task
    field id        type uuid      primary true
    field title     type string    required true
    field status    type enum      options ["todo", "done"]
    field priority  type enum      options ["low", "medium", "high"]
    field assignee  type reference User
```

**Field modifiers:** `primary true`, `required true`, `unique true`, `default "value"`

### api
Defines HTTP API endpoints.

```clear
api REST /tasks
    get /           return list of Task
    post /          accept title, priority     return created Task    status 201
    get /:id        return Task
    put /:id        accept title, status      return updated Task
    delete /:id     return deleted Task
```

**Query features (auto-included):**
- Filtering: `?status=todo&priority=high`
- Sorting: `?_sort=created_at&_order=desc`
- Pagination: `?_page=1&_limit=50`

### screen
Defines a Web UI page with components.

```clear
screen Dashboard
    section tasks    show tasks as table
    section stats    show tasks as stat   label "Tasks"
    section chart    show tasks as pie    label "By Status"
```

**14 Built-in Components:**

| Component | Syntax |
|-----------|--------|
| Table | `show tasks as table` |
| Kanban | `show tasks as kanban` |
| Bar Chart | `show tasks as bar` |
| Line Chart | `show tasks as line` |
| Pie Chart | `show tasks as pie` |
| Calendar | `show tasks as calendar` |
| Timeline | `show tasks as timeline` |
| Data Grid | `show tasks as datagrid` |
| Stat Card | `show tasks as stat` |
| Card List | `show tasks as list` |
| Search | `search` |
| Forms | `field name` |
| Tabs | `tabs / tab "X"` |
| Buttons | `button "Click Me"` |

### auth
Defines authentication configuration.

```clear
auth Default
    accept email, password, name
    session jwt   expire 7 days
```

Auto-generates endpoints:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### flow
Defines a scheduled ETL pipeline.

```clear
flow DailyDigest
    trigger every 24 hours
    step extract    read data from tasks
    step transform  group by status
    step load       upsert to summary
```

### rule
Defines validation rules.

```clear
rule TaskValidation
    check title       required "Title is required"
    check status      in ["todo", "done"]  "Invalid status"
```

### agent / skill
Defines AI agent behaviors and skills (MCP-compatible).

### event
Defines event-driven triggers.

### config
Defines runtime configuration values.

### deploy
Defines deployment targets.

```clear
deploy cloudflare-workers
    routes /api/*, /s/*
```

### example
Defines example data for testing.

## Type System

### Primitives

| Type | Example |
|------|---------|
| `string` | `"hello"` |
| `integer` | `42` |
| `float` | `3.14` |
| `boolean` | `true` |
| `timestamp` | `2024-01-01T00:00:00Z` |
| `uuid` | Auto-generated |
| `url` | `"https://example.com"` |
| `email` | `"user@example.com"` |

### Compound Types

| Type | Description |
|------|-------------|
| `enum` | One of defined options: `options ["a", "b"]` |
| `reference` | Links to another data block: `type reference User` |
| `list of` | Array of items: `type list of string` |
| `map` | Key-value object |

## Syntax Rules

- **Extension:** `.clear`
- **Encoding:** UTF-8
- **Indentation:** 4 spaces per level (tabs are invalid)
- **Naming:** PascalCase for blocks (`TaskManager`), snake_case for fields (`created_at`)
- **Strings:** double-quoted (`"hello"`)
- **Comments:** `//` to end of line
