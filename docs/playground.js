const EXAMPLES = {
  "REST API": `product MyAPI
    name "My First API"

data Task
    field id       type uuid      primary true
    field title    type string    required true
    field status   type enum      options ["todo", "in_progress", "done"]
    field priority type enum      options ["low", "medium", "high"]

api REST /tasks
    get /           return list of Task
    post /          accept title, priority     return created Task    status 201

screen Dashboard
    section list    show tasks as table
    section stats   show tasks as stat   label "Tasks"`,

  "E-Commerce": `product Store
    name "E-Commerce API"

data Product
    field id       type uuid      primary true
    field name     type string    required true
    field price    type float     required true
    field stock    type integer   default 0

data Order
    field id       type uuid      primary true
    field items    type list of Product
    field total    type float     required true
    field status   type enum      options ["pending", "shipped", "delivered"]

api REST /products
    get /           return list of Product
    post /          accept name, price, stock    return created Product    status 201

api REST /orders
    get /           return list of Order
    post /          accept items, total    return created Order    status 201

screen Dashboard
    section products  show products as table
    section revenue   show orders as bar     label "Revenue"
    section status    show orders as pie     label "Order Status"`,

  "Kanban + Charts": `product ProjectHub
    name "Project Manager"

data Task
    field id        type uuid      primary true
    field title     type string    required true
    field status    type enum      options ["backlog", "todo", "in_progress", "review", "done"]
    field priority  type enum      options ["low", "medium", "high", "urgent"]
    field assignee  type string

data Sprint
    field id        type uuid      primary true
    field name      type string    required true
    field tasks     type list of reference Task

api REST /tasks
    get /           return list of Task
    post /          accept title, status    return created Task    status 201

auth Default
    accept email, password, name
    session jwt   expire 7 days

screen Kanban
    section board   show tasks as kanban

screen Charts
    section by_status  show tasks as pie   label "By Status"
    section by_priority show tasks as bar  label "By Priority"`,

  "Healthcare": `product HealthAPI
    name "Healthcare System"

data Patient
    field id         type uuid      primary true
    field name       type string    required true
    field email      type email     unique true
    field dob        type timestamp

data Appointment
    field id         type uuid      primary true
    field patient    type reference Patient    required true
    field date       type timestamp  required true
    field status     type enum      options ["scheduled", "completed", "cancelled"]

api REST /patients
    get /            return list of Patient
    post /           accept name, email    return created Patient    status 201

api REST /appointments
    get /            return list of Appointment
    post /           accept patient, date    return created Appointment    status 201

screen Dashboard
    section patients   show patients as table
    section upcoming   show appointments as calendar   date date
    section stats      show appointments as stat       label "Appointments"`
};

const OUTPUTS = {
  "REST API": {
    models: [
      { name: "Task", fields: ["id (uuid)", "title (string)", "status (enum)", "priority (enum)"] }
    ],
    endpoints: [
      { method: "GET", path: "/api/tasks", desc: "List all tasks" },
      { method: "POST", path: "/api/tasks", desc: "Create a task" },
      { method: "GET", path: "/api/tasks/:id", desc: "Get task by ID" },
      { method: "PUT", path: "/api/tasks/:id", desc: "Update a task" },
      { method: "DELETE", path: "/api/tasks/:id", desc: "Delete a task" }
    ],
    screens: [
      { name: "Dashboard", components: ["table", "stat card"] }
    ],
    genCode: `// Generated TypeScript interfaces
export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
}

// + Express / Hono / Fastify / Koa routes
// + OpenAPI 3.0 spec
// + Postman collection`
  },
  "E-Commerce": {
    models: [
      { name: "Product", fields: ["id (uuid)", "name (string)", "price (float)", "stock (integer)"] },
      { name: "Order", fields: ["id (uuid)", "items (list of Product)", "total (float)", "status (enum)"] }
    ],
    endpoints: [
      { method: "GET", path: "/api/products", desc: "List products" },
      { method: "POST", path: "/api/products", desc: "Create product" },
      { method: "GET", path: "/api/orders", desc: "List orders" },
      { method: "POST", path: "/api/orders", desc: "Create order" }
    ],
    screens: [
      { name: "Dashboard", components: ["table", "bar chart", "pie chart"] }
    ],
    genCode: `// Generated with filtering + pagination
app.get('/api/products', async (req, res) => {
  const { page, limit, sort, filter } = req.query;
  // Auto-generated CRUD with:
  // - Filtering by any field
  // - Sorting by any field
  // - Pagination (default 50 per page)
  // - CORS headers
});`
  },
  "Kanban + Charts": {
    models: [
      { name: "Task", fields: ["id (uuid)", "title (string)", "status (enum)", "priority (enum)", "assignee (string)"] },
      { name: "Sprint", fields: ["id (uuid)", "name (string)", "tasks (list of reference Task)"] }
    ],
    endpoints: [
      { method: "GET", path: "/api/tasks", desc: "List tasks" },
      { method: "POST", path: "/api/tasks", desc: "Create task" },
      { method: "POST", path: "/api/auth/signup", desc: "Sign up" },
      { method: "POST", path: "/api/auth/login", desc: "Log in" },
      { method: "GET", path: "/api/auth/me", desc: "Current user" }
    ],
    screens: [
      { name: "Kanban", components: ["kanban board"] },
      { name: "Charts", components: ["pie chart", "bar chart"] }
    ],
    genCode: `// Token-based auth middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  req.user = await verifyToken(token);
  next();
}

// Protected routes
app.post('/api/tasks', authMiddleware, async (req, res) => {
  // ...
});`
  },
  "Healthcare": {
    models: [
      { name: "Patient", fields: ["id (uuid)", "name (string)", "email (email)", "dob (timestamp)"] },
      { name: "Appointment", fields: ["id (uuid)", "patient (reference Patient)", "date (timestamp)", "status (enum)"] }
    ],
    endpoints: [
      { method: "GET", path: "/api/patients", desc: "List patients" },
      { method: "POST", path: "/api/patients", desc: "Create patient" },
      { method: "GET", path: "/api/appointments", desc: "List appointments" },
      { method: "POST", path: "/api/appointments", desc: "Create appointment" }
    ],
    screens: [
      { name: "Dashboard", components: ["table", "calendar", "stat card"] }
    ],
    genCode: `// Reference fields auto-resolve
app.get('/api/appointments', async (req, res) => {
  const appointments = await store.getAll('Appointment');
  // Each appointment.patient auto-resolves
  // to the full Patient object
  // (with circular reference protection)
  res.json(appointments);
});`
  }
};

function renderSyntaxHighlighted(code) {
  const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped
    .replace(/(product|data|api|screen|auth|flow|rule|event|agent|skill|config|deploy|example|field|section|show|as|return|accept|primary|required|unique|default|options)/g, '<span class="keyword">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="string">$1</span>')
    .replace(/\b(type|list of|reference|enum|string|integer|float|boolean|timestamp|uuid|url|email)\b/g, '<span class="type">$1</span>')
    .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
    .replace(/\b(REST|get|post|put|delete|count|paginate|filter|sort|label|date|per|expire)\b/g, '<span class="prop">$1</span>');
}

function renderPane(sectionId, name, code) {
  const output = OUTPUTS[name];
  document.getElementById(`${sectionId}-code`).innerHTML = renderSyntaxHighlighted(code.trim());
  document.getElementById(`${sectionId}-code`).style.fontSize = name === "Kanban + Charts" ? "12px" : "13px";

  // Render models
  const modelsHtml = output.models.map(m => `
    <div class="card">
      <h3><span class="icon">&#128196;</span> ${m.name}</h3>
      <ul>${m.fields.map(f => `<li>${f}</li>`).join('')}</ul>
    </div>
  `).join('');
  document.getElementById(`${sectionId}-models`).innerHTML = modelsHtml;

  // Render endpoints
  const endpointsHtml = output.endpoints.map(e => `
    <li><span class="badge badge-${e.method.toLowerCase()}">${e.method}</span> ${e.path} <span style="color:var(--text-muted)">— ${e.desc}</span></li>
  `).join('');
  document.getElementById(`${sectionId}-endpoints`).innerHTML = endpointsHtml;

  // Render screens
  const screensHtml = output.screens.map(s => `
    <div class="card">
      <h3><span class="icon">&#127912;</span> ${s.name}</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${s.components.map(c => `<span style="background:var(--surface-2);padding:4px 10px;border-radius:4px;font-size:12px;color:var(--accent);font-weight:500">${c}</span>`).join('')}
      </div>
    </div>
  `).join('');
  document.getElementById(`${sectionId}-screens`).innerHTML = screensHtml;

  // Render generated code
  document.getElementById(`${sectionId}-gen`).innerHTML = renderSyntaxHighlighted(output.genCode.trim());
}

function initPlayground(containerId, sectionId, title) {
  const names = Object.keys(EXAMPLES);
  let currentName = names[0];

  const html = `
    <div style="max-width:1200px;margin:0 auto;padding:0 24px">
      <h2 class="section-title">${title}</h2>
      <p class="section-sub">One file. Running server. Pick an example.</p>
      <div class="tabs" id="${sectionId}-tabs">
        ${names.map((n, i) => `<div class="tab ${i === 0 ? 'active' : ''}" data-name="${n}">${n}</div>`).join('')}
      </div>
      <div class="split">
        <div class="pane">
          <div class="pane-header">&#128221; app.clear</div>
          <div class="pane-body" id="${sectionId}-code"></div>
        </div>
        <div class="pane">
          <div class="pane-header">&#9889; What you get</div>
          <div class="pane-body" id="${sectionId}-gen"></div>
        </div>
      </div>
      <div class="output-grid">
        <div id="${sectionId}-models"></div>
        <div id="${sectionId}-endpoints-container">
          <div class="card">
            <h3><span class="icon">&#127760;</span> API Endpoints</h3>
            <ul id="${sectionId}-endpoints"></ul>
          </div>
        </div>
        <div id="${sectionId}-screens"></div>
      </div>
    </div>
  `;

  document.getElementById(containerId).innerHTML = html;

  // Render first example
  renderPane(sectionId, currentName, EXAMPLES[currentName]);

  // Tab switching
  document.getElementById(`${sectionId}-tabs`).addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const name = tab.dataset.name;
    if (name === currentName) return;
    currentName = name;
    document.querySelectorAll(`#${sectionId}-tabs .tab`).forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderPane(sectionId, name, EXAMPLES[name]);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPlayground('playground', 'demo', 'Live Demo');
});
