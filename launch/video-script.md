# 60-Second Demo Video Script

**Style:** Screen recording, terminal + browser side by side
**Music:** Upbeat lo-fi / instrumental
**Tone:** Fast, no voiceover — just text overlays and keystrokes

---

## [0-5s] Hook

**Visual:** Open terminal. Fast typing.
```
npm install -g varshinicb-clear
```

**Text overlay:** "One file. Instant API. Instant UI."

---

## [5-15s] Write the file

**Visual:** Open `app.clear` in VS Code. Type quickly. Show syntax highlighting.
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
    section stats  show tasks as stat   label "Tasks"
```

**Text overlay:** "That's the whole backend."

---

## [15-25s] Run it

**Visual:** Switch to terminal. Run:
```
clear-cli run app.clear
```
Show the startup output — port, routes being registered.

**Text overlay:** "Running. Zero config."

---

## [25-35s] Show the API

**Visual:** Open browser. Hit `localhost:8080/api/tasks`. Show JSON response.
Then do a POST with curl:
```
curl -X POST localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "My first task"}'
```
Show the response with auto-generated UUID.

**Text overlay:** "Full CRUD. Auto IDs. Done."

---

## [35-45s] Show the Web UI

**Visual:** Open browser at `localhost:8080/s/dashboard`. Show the table of tasks and the stats card.

**Text overlay:** "Live dashboard. 14 components. One file."

---

## [45-55s] Generate production code

**Visual:** Run:
```
clear-cli build app.clear --target express
```
Show the generated Express.js files appearing.

**Text overlay:** "Want full control? Generate production code for 7 frameworks."

---

## [55-60s] CTA

**Visual:** Show the GitHub star counter + npm page. Slow zoom out.

**Text overlay:** "Star it. Fork it. Build with it."
```
npx -p varshinicb-clear clear-cli run app.clear
github.com/varshinicb1/clear2.0
```

---

## End Card (3 seconds)

**Logo + text:**
> Clear — One file. Running server.
> npm: varshinicb-clear

---

**Production notes:**
- Record at 1440p, 60fps
- Use a dark terminal theme (Dracula / One Dark)
- VS Code with the Clear extension installed (shows .clear syntax highlighting)
- Add subtle cursor glow effect in post
- Captions on screen at all times (accessibility + engagement)
- Final frame should be holdable as a screenshot for social sharing
