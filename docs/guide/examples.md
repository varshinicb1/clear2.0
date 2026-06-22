# Examples

Clear ships with 12+ real-world example files demonstrating different use cases.

## Quick Start

```bash
# Clone and run any example
git clone https://github.com/varshinicb1/clear2.0.git
cd clear2.0/examples
clear-cli run ecommerce.clear
```

## Example Gallery

### 🛒 E-Commerce (`examples/ecommerce.clear`)
Products, cart, orders, inventory management with stock tracking.

```bash
clear-cli run examples/ecommerce.clear
# → API: http://localhost:8080/api/products
# → UI:  http://localhost:8080/s/dashboard
```

### 💬 Chat App (`examples/chat-app.clear`)
Real-time messaging with rooms, messages, user presence.

```bash
clear-cli run examples/chat-app.clear
```

### 🏥 Healthcare (`examples/healthcare.clear`)
Patient records, appointments, prescriptions, doctor schedules.

```bash
clear-cli run examples/healthcare.clear
```

### 💰 Fintech (`examples/fintech.clear`)
Accounts, transactions, invoices, payouts with balance tracking.

```bash
clear-cli run examples/fintech.clear
```

### ✅ Task Manager (`examples/task-manager.clear`)
Full project management with kanban, users, and priorities.

```bash
clear-cli run examples/task-manager.clear
```

### 👥 Team Collaboration (`examples/team-collab/team-collab.clear`)
Complete workspace: users, projects, tasks, documents, comments, notifications, kanban, calendar.

```bash
clear-cli run examples/team-collab/team-collab.clear
```

**Includes:** 18 REST endpoints, 6 screens, auth, daily digest flow.

### 🔧 REST API (`examples/rest-api.clear`)
Minimal REST API template — good starting point.

```bash
clear-cli run examples/rest-api.clear
```

### 🤖 MCP Server (`examples/mcp-server.clear`)
Analytics MCP server with metrics and reporting tools.

### 🏷️ Product Page (`examples/product-page.clear`)
E-commerce product detail page with reviews and related items.

### 📊 Data Pipeline (`examples/data-pipeline.clear`)
ETL pipeline with scheduled data extraction and transformation.

### 🎯 Lead Qualification (`examples/lead-qualification.clear`)
Sales lead scoring and qualification workflow.

### 🔗 Nested References (`examples/nested-refs.clear`)
Demonstrates deep reference resolution across multiple models.

## Creating Your Own

```clear
product MyApp
    name "My App"

data Item
    field id    type uuid    primary true
    field name  type string  required true

api REST /items
    get /       return list of Item
    post /      accept name    return created Item    status 201
```

Run `clear-cli run myapp.clear` and you have a live API.
