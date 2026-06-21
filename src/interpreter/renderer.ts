// Clear Screen Renderer — turns ScreenBlock AST into live, interactive HTML pages
// Server-side rendering with built-in components and zero runtime dependencies

import { ScreenBlock, ScreenSection, Property } from '../ast.js'
import { Store } from './store.js'

// ── Types ──────────────────────────────────────────────────────────────

interface FieldInfo {
  name: string
  type: string
  required: boolean
  defaultValue: any
  isReference: boolean
  referenceTarget: string | null
  enumOptions: string[]
}

interface DataModel {
  name: string
  storeName: string
  store: Store<any>
  fields: FieldInfo[]
}

interface RenderContext {
  screen: ScreenBlock
  models: Map<string, DataModel>
  allScreens: ScreenBlock[]
  customTemplates: Map<string, string>
}

// ── HTML helpers (zero dependencies) ───────────────────────────────────

function esc(str: any): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function attr(name: string, value: string): string {
  return value ? ` ${name}="${esc(value)}"` : ''
}

function getLayout(screen: ScreenBlock): string {
  const layoutProp = screen.properties.find(p => p.key === 'layout')
  if (!layoutProp) return 'single-column'
  return layoutProp.args.join(' ')
}

function getTitle(screen: ScreenBlock): string {
  const titleProp = screen.properties.find(p => p.key === 'title')
  if (titleProp?.value?.type === 'string') return titleProp.value.value
  if (titleProp?.args?.length) return titleProp.args.join(' ')
  return screen.name
}

// ── Data model resolution ──────────────────────────────────────────────

function findModel(name: string, models: Map<string, DataModel>): DataModel | null {
  const pascal = name.charAt(0).toUpperCase() + name.slice(1).replace(/s$/, '')
  if (models.has(pascal)) return models.get(pascal)!
  if (models.has(name)) return models.get(name)!
  // Try removing trailing 's'
  const singular = name.replace(/s$/, '')
  const pascalSingular = singular.charAt(0).toUpperCase() + singular.slice(1)
  if (models.has(pascalSingular)) return models.get(pascalSingular)!
  return null
}

function resolveModelName(text: string, models: Map<string, DataModel>): string | null {
  // Try each model name against the text
  for (const [name] of models) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name
  }
  return null
}

// ── Component renderers ────────────────────────────────────────────────

/** Render data as an HTML table */
function renderTable(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data || data.length === 0) return '<div class="empty-state">No data</div>'
  const headers = fields.map(f => esc(f.name)).join('')
  const rows = data.map(item => {
    const cells = fields.map(f => {
      let val = item[f.name]
      if (val === undefined || val === null) return '<td></td>'
      if (f.type === 'boolean') return `<td><span class="badge badge-${val ? 'success' : 'muted'}">${val}</span></td>`
      if (f.enumOptions?.length) return `<td><span class="badge badge-${String(val).toLowerCase()}">${esc(val)}</span></td>`
      if (typeof val === 'object') return `<td>${esc(JSON.stringify(val))}</td>`
      return `<td>${esc(val)}</td>`
    }).join('')
    return `<tr data-id="${esc(item.id || '')}">${cells}</tr>`
  }).join('')
  return `<div class="clear-table-wrap"><table class="clear-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
}

/** Render data as a card list */
function renderCardList(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data || data.length === 0) return '<div class="empty-state">No data</div>'
  const titleField = fields[0]?.name || 'name'
  const descField = fields.length > 1 ? fields[1].name : null
  const metaFields = fields.slice(1, 4)
  return data.map(item => {
    const meta = metaFields.map(f => {
      const val = item[f.name]
      if (val === undefined || val === null) return ''
      const label = `<span class="card-meta-label">${esc(f.name)}</span>`
      const value = f.enumOptions?.length
        ? `<span class="badge badge-${String(val).toLowerCase()}">${esc(val)}</span>`
        : esc(val)
      return `<div class="card-meta">${label} ${value}</div>`
    }).join('')
    return `<div class="clear-card" data-id="${esc(item.id || '')}">
      <div class="card-header"><h3>${esc(item[titleField] ?? '')}</h3></div>
      <div class="card-body">${descField ? `<p>${esc(item[descField] ?? '')}</p>` : ''}${meta}</div>
    </div>`
  }).join('')
}

/** Render data as a kanban board */
function renderKanban(data: any[], fields: FieldInfo[], props: Property[]): string {
  // Find status field (first enum field or "status" field)
  const statusField = fields.find(f => f.name === 'status' || f.enumOptions.length > 0)
  const columns = statusField?.enumOptions?.length
    ? statusField.enumOptions
    : ['todo', 'in_progress', 'done']
  const titleField = fields[0]?.name || 'name'
  const tagField = fields.find(f => f.name === 'priority' || f.name === 'type')

  const grouped: Record<string, any[]> = {}
  for (const col of columns) grouped[col] = []
  for (const item of data || []) {
    const key = item[statusField?.name || 'status'] || columns[0]
    if (grouped[key]) grouped[key].push(item)
    else grouped[key] = [item]
  }

  return `<div class="clear-kanban">` + columns.map(col => {
    const items = (grouped[col] || []).map(item => {
      const tagHtml = tagField && item[tagField.name]
        ? `<span class="badge badge-${esc(String(item[tagField.name]).toLowerCase())}">${esc(item[tagField.name])}</span>`
        : ''
      return `<div class="kanban-card" draggable="true" data-id="${esc(item.id || '')}">
        <div class="kanban-card-title">${esc(item[titleField] ?? '')}</div>
        ${tagHtml}
      </div>`
    }).join('')
    const count = (grouped[col] || []).length
    return `<div class="kanban-column" data-status="${esc(col)}">
      <div class="kanban-header"><span>${esc(col.replace(/_/g, ' '))}</span><span class="kanban-count">${count}</span></div>
      <div class="kanban-cards">${items || '<div class="empty-state">No items</div>'}</div>
    </div>`
  }).join('') + `</div>`
}

/** Render a form from data model fields */
function renderForm(model: DataModel | null, fields: string[], props: Property[]): string {
  if (!model) return '<div class="empty-state">No model defined</div>'
  const targetFields = fields.length > 0
    ? model.fields.filter(f => fields.includes(f.name))
    : model.fields
  const inputs = targetFields.map(f => {
    if (f.name === 'id') return ''
    const required = f.required ? ' required' : ''
    const label = `<label for="field-${f.name}">${esc(f.name.replace(/_/g, ' '))}</label>`
    if (f.enumOptions.length) {
      const opts = f.enumOptions.map(o => `<option value="${esc(o)}">${esc(o.replace(/_/g, ' '))}</option>`).join('')
      return `<div class="form-field"><label for="field-${f.name}">${esc(f.name.replace(/_/g, ' '))}</label><select id="field-${f.name}" name="${esc(f.name)}"${required}>${opts}</select></div>`
    }
    if (f.type === 'boolean') {
      return `<div class="form-field form-field-check"><input type="checkbox" id="field-${f.name}" name="${esc(f.name)}"><label for="field-${f.name}">${esc(f.name.replace(/_/g, ' '))}</label></div>`
    }
    const type = f.type === 'number' || f.type === 'integer' || f.type === 'float' ? 'number'
      : f.type === 'email' ? 'email'
      : f.type === 'timestamp' || f.type === 'date' ? 'datetime-local'
      : f.type === 'url' ? 'url'
      : 'text'
    return `<div class="form-field">${label}<input type="${type}" id="field-${f.name}" name="${esc(f.name)}"${required}></div>`
  }).filter(Boolean).join('')

  return `<form class="clear-form" data-model="${esc(model.name)}">${inputs}
    <div class="form-actions"><button type="submit" class="clear-btn primary">Save</button></div>
  </form>`
}

/** Render tabs */
function renderTabs(children: Property[]): string {
  const tabs = children.filter(c => c.key === 'tab')
  if (!tabs.length) return ''
  const nav = tabs.map((t, i) => {
    const name = t.args.join(' ').replace(/"/g, '') || `Tab ${i + 1}`
    return `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="tab-${i}">${esc(name)}</button>`
  }).join('')
  const content = tabs.map((t, i) => {
    const inner = t.children.map(c => renderElement(c, null, [], [])).join('')
    return `<div class="tab-pane${i === 0 ? ' active' : ''}" id="tab-${i}">${inner || t.args.join(' ')}</div>`
  }).join('')
  return `<div class="clear-tabs"><div class="tab-nav">${nav}</div><div class="tab-content">${content}</div></div>`
}

/** Render a single element inside a section */
function renderElement(
  prop: Property,
  model: DataModel | null,
  allFields: FieldInfo[],
  rawData: any[],
): string {
  const text = prop.args.join(' ')
  switch (prop.key) {
    case 'show': {
      const componentMatch = text.match(/^(\S+)\s+as\s+(\S+)/)
      if (componentMatch) {
        const [, dataRef, component] = componentMatch
        // Use rawData if showing "all" or the data model's records
        const data = rawData
        switch (component) {
          case 'table': return renderTable(data, allFields, prop.children)
          case 'list': return renderCardList(data, allFields, prop.children)
          case 'card': return renderCardList(data, allFields, prop.children)
          case 'kanban': return renderKanban(data, allFields, prop.children)
          case 'heading': return `<h2>${esc(dataRef)}</h2>`
          case 'text': return `<p>${esc(dataRef)}</p>`
          case 'currency': {
            const val = text.match(/^(\S+)\s+as\s+currency/)
            return `<span class="currency">${esc(dataRef)}</span>`
          }
          case 'carousel': return renderCarousel(data, prop.children)
          case 'selector': return renderSelector(data, prop.children)
          case 'bar': case 'barchart': return renderBarChart(data, allFields, prop.children)
          case 'line': case 'linechart': return renderLineChart(data, allFields, prop.children)
          case 'pie': case 'piechart': return renderPieChart(data, allFields, prop.children)
          case 'calendar': return renderCalendar(data, allFields, prop.children)
          case 'timeline': return renderTimeline(data, allFields, prop.children)
          case 'stat': case 'metric': case 'kpi': return renderStatCard(data, allFields, prop.children)
          case 'datagrid': return renderDataGrid(data, allFields, prop.children)
          default: return `<div class="component-placeholder">[${component}: ${dataRef}]</div>`
        }
      }
      const textMatch = text.match(/^(\S+)\s+as\s+(.+)/)
      if (textMatch) {
        return `<p>${esc(textMatch[1])}</p>`
      }
      return `<p>${esc(text)}</p>`
    }
    case 'button': {
      const label = prop.value?.type === 'string' ? prop.value.value : text
      const styleProp = prop.children.find(c => c.key === 'style')
      const style = styleProp ? styleProp.args.join(' ') : ''
      const actionProp = prop.children.find(c => c.key === 'action')
      const action = actionProp ? actionProp.args.join(' ') : ''
      return `<button class="clear-btn ${style}" data-action="${esc(action)}">${esc(label)}</button>`
    }
    case 'field': {
      const fieldName = text.split(/\s+/)[0]
      if (!model) return `<div class="form-field"><label>${esc(fieldName)}</label><input name="${esc(fieldName)}"></div>`
      const field = model.fields.find(f => f.name === fieldName)
      if (!field) return `<div class="form-field"><label>${esc(fieldName)}</label><input name="${esc(fieldName)}"></div>`
      const required = field.required ? ' required' : ''
      const label = esc(field.name.replace(/_/g, ' '))
      if (field.enumOptions.length) {
        const opts = field.enumOptions.map(o => `<option value="${esc(o)}">${esc(o.replace(/_/g, ' '))}</option>`).join('')
        return `<div class="form-field"><label>${label}</label><select name="${esc(field.name)}"${required}>${opts}</select></div>`
      }
      const type = field.type === 'number' || field.type === 'integer' || field.type === 'float' ? 'number'
        : field.type === 'email' ? 'email'
        : field.type === 'timestamp' ? 'datetime-local'
        : 'text'
      return `<div class="form-field"><label>${label}</label><input type="${type}" name="${esc(field.name)}"${required}></div>`
    }
    case 'search': return renderSearch(prop.children)
    case 'tabs': return renderTabs(prop.children)
    case 'tab': return '' // handled by tabs
    default: return ''
  }
}

function renderCarousel(data: any[], props: Property[]): string {
  const images = Array.isArray(data) ? data.slice(0, 5) : []
  if (!images.length) return '<div class="carousel-placeholder">[carousel]</div>'
  const slides = images.map((item, i) => {
    const url = item.url || item.image || item.src || JSON.stringify(item)
    return `<div class="carousel-slide${i === 0 ? ' active' : ''}"><div class="carousel-img" style="background:var(--surface-2)">${esc(item.name || item.title || `Image ${i + 1}`)}</div></div>`
  }).join('')
  return `<div class="clear-carousel">${slides}<div class="carousel-dots">${images.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div></div>`
}

function renderSelector(data: any[], props: Property[]): string {
  if (!Array.isArray(data) || !data.length) return '<div class="empty-state">No options</div>'
  const styleProp = props.find(c => c.key === 'style')
  const isButtons = styleProp?.args?.includes('buttons')
  if (isButtons) {
    return `<div class="selector-buttons">${data.map(item => {
      const label = item.name || item.title || esc(JSON.stringify(item))
      const disabled = item.available === false || item.in_stock === false ? ' disabled' : ''
      return `<button class="clear-btn outline selector-btn" data-value="${esc(item.id || label)}"${disabled}>${esc(label)}</button>`
    }).join('')}</div>`
  }
  return `<select class="clear-select">${data.map(item => {
    const label = item.name || item.title || esc(JSON.stringify(item))
    return `<option value="${esc(item.id || label)}">${esc(label)}</option>`
  }).join('')}</select>`
}

// ── Charts (SVG, zero dependencies) ─────────────────────────────────────

const CHART_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

function getChartValue(field: string, data: any[]): { values: number[]; isNumeric: boolean } {
  const nums = data.map(d=>Number(d[field]))
  const isNumeric = nums.some(n=>!isNaN(n)&&n>0)
  if(isNumeric) return {values:nums, isNumeric:true}
  // Non-numeric: count occurrences of each value
  const counts:Record<string,number>={}
  for(const d of data){const k=String(d[field]||'unknown');counts[k]=(counts[k]||0)+1}
  return {values:data.map(d=>counts[String(d[field]||'unknown')]||1),isNumeric:false}
}

function renderBarChart(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data.length) return '<div class="empty-state">No data</div>'
  const labelF = props.find(p=>p.key==='label')?.args[0]||fields[0]?.name||'name'
  const valF = props.find(p=>p.key==='value')?.args[0]||fields.find(f=>f.type?.match(/^(number|integer|float)/))?.name||'id'
  const {values} = getChartValue(valF, data)
  const max = Math.max(...values,1)
  const gap=4,bw=Math.max(8,Math.min(36,(560-40)/data.length-gap))
  const bars = data.map((d,i)=>{
    const v=values[i]||0,bh=(v/max)*260,x=30+i*(bw+gap),y=280-bh
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${CHART_COLORS[i%CHART_COLORS.length]}" rx="2"><title>${esc(d[labelF]||'')}: ${v}</title></rect>`
  }).join('')
  return `<div class="clear-chart"><svg viewBox="0 0 600 300" style="width:100%;max-height:300px">${bars}</svg></div>`
}

function renderPieChart(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data.length) return '<div class="empty-state">No data</div>'
  const labelF = props.find(p=>p.key==='label')?.args[0]||fields[0]?.name||'name'
  const valF = props.find(p=>p.key==='value')?.args[0]||fields.find(f=>f.type?.match(/^(number|integer|float)/))?.name||'id'
  const {values} = getChartValue(valF, data)
  const total = values.reduce((s,v)=>s+v,0)||data.length
  const cx=200,cy=200,r=160;let acc=0
  const slices = data.map((d,i)=>{
    const v=values[i]||0,angle=v/total*360
    const a1=(acc*Math.PI)/180,a2=((acc+angle)*Math.PI)/180
    acc+=angle
    const x1=cx+r*Math.cos(a1-Math.PI/2),y1=cy+r*Math.sin(a1-Math.PI/2)
    const x2=cx+r*Math.cos(a2-Math.PI/2),y2=cy+r*Math.sin(a2-Math.PI/2)
    const large=angle>180?1:0
    return `<path d="M${cx},${cy}L${x1},${y1}A${r},${r}0${large},1${x2},${y2}Z" fill="${CHART_COLORS[i%CHART_COLORS.length]}"><title>${esc(d[labelF])}: ${v}</title></path>`
  }).join('')
  return `<div class="clear-chart"><svg viewBox="0 0 400 400" style="width:100%;max-height:300px">${slices}</svg></div>`
}

function renderLineChart(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data.length) return '<div class="empty-state">No data</div>'
  const valF = props.find(p=>p.key==='value')?.args[0]||fields.find(f=>f.type?.match(/^(number|integer|float)/))?.name||'id'
  const labelF = props.find(p=>p.key==='label')?.args[0]||fields[0]?.name||'name'
  const {values} = getChartValue(valF, data)
  const max = Math.max(...values,1)
  const pts = data.map((d,i)=>{
    const x=30+(i/(data.length-1||1))*540,y=280-(values[i]||0)/max*260
    return `${x},${y}`
  }).join(' ')
  const dots = data.map((d,i)=>{
    const x=30+(i/(data.length-1||1))*540,y=280-(values[i]||0)/max*260
    return `<circle cx="${x}" cy="${y}" r="4" fill="var(--primary)"><title>${esc(d[labelF]||'')}: ${values[i]}</title></circle>`
  }).join('')
  return `<div class="clear-chart"><svg viewBox="0 0 600 300" style="width:100%;max-height:300px"><polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2"/>${dots}</svg></div>`
}

// ── Calendar ──────────────────────────────────────────────────────────────

function renderCalendar(data: any[], fields: FieldInfo[], props: Property[]): string {
  const dateField = props.find(p=>p.key==='date')?.args[0]||fields.find(f=>f.type==='timestamp'||f.name==='date')?.name||'created_at'
  const titleField = fields[0]?.name||'name'
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()
  const first=new Date(y,m,1).getDay(),daysInM=new Date(y,m+1,0).getDate()
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const byDay:Record<number,any[]>={}
  for(const d of data||[]){
    const dt=d[dateField]?new Date(d[dateField]):null
    if(dt&&dt.getMonth()===m&&dt.getFullYear()===y){(byDay[dt.getDate()]||(byDay[dt.getDate()]=[])).push(d)}
  }
  let cells='';for(let i=0;i<first;i++)cells+='<td class="cal-empty"></td>'
  for(let d=1;d<=daysInM;d++){
    const items=byDay[d]||[],dots=items.slice(0,3).map(()=>'<span class="cal-dot"></span>').join('')
    const more=items.length>3?`<small>+${items.length-3}</small>`:''
    cells+=`<td class="cal-day${items.length?' has-items':''}"><div class="cal-num">${d}</div><div class="cal-dots">${dots}${more}</div></td>`
  }
  const hdr=days.map(d=>`<th>${d}</th>`).join('')
  return `<div class="clear-calendar"><table><tr><th colspan="7" class="cal-month">${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} ${y}</th></tr><tr>${hdr}</tr>${cells}</table></div>`
}

// ── Timeline ──────────────────────────────────────────────────────────────

function renderTimeline(data: any[], fields: FieldInfo[], props: Property[]): string {
  if(!data?.length) return '<div class="empty-state">No data</div>'
  const titleF=fields[0]?.name||'name',dateF=props.find(p=>p.key==='date')?.args[0]||fields.find(f=>f.type==='timestamp')?.name||'created_at'
  const descF=fields.length>1?fields[1].name:null
  return `<div class="clear-timeline">${data.map((d,i)=>{
    const date=d[dateF]?new Date(d[dateF]).toLocaleDateString():'',desc=descF?`<p>${esc(d[descF]||'')}</p>`:''
    return `<div class="tl-item"><div class="tl-marker${i===0?' active':''}"></div><div class="tl-content"><div class="tl-date">${esc(date)}</div><h4>${esc(d[titleF]||'')}</h4>${desc}</div></div>`
  }).join('')}</div>`
}

// ── Stat Card ─────────────────────────────────────────────────────────────

function renderStatCard(data: any[], fields: FieldInfo[], props: Property[]): string {
  if(!data?.length) return '<div class="empty-state">No data</div>'
  const label=props.find(p=>p.key==='label')?.args.join(' ')||fields[0]?.name||'Value'
  const field=props.find(p=>p.key==='field')?.args[0]||fields.find(f=>f.type?.match(/^(number|integer|float)/))?.name
  const total=field?data.reduce((s,d)=>s+(Number(d[field])||0),0):data.length
  const trend=props.find(p=>p.key==='trend')?.args[0]||''
  const trendHtml=trend?`<span class="stat-trend stat-trend-${trend.startsWith('up')?'up':'down'}">${trend}</span>`:''
  return `<div class="clear-stat"><div class="stat-body"><div class="stat-value">${typeof total==='number'?total.toLocaleString():String(total)}</div><div class="stat-label">${esc(label)}</div>${trendHtml}</div></div>`
}

// ── Search Bar ────────────────────────────────────────────────────────────

function renderSearch(props: Property[]): string {
  const placeholder=props.find(p=>p.key==='placeholder')?.args.join(' ')||'Search...'
  return `<div class="clear-search"><input type="search" class="search-input" placeholder="${esc(placeholder)}" oninput="this.closest('.section-body')?.querySelectorAll('.clear-table tbody tr, .clear-card, .kanban-card').forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none'})"></div>`
}

// ── Data Grid ─────────────────────────────────────────────────────────────

function renderDataGrid(data: any[], fields: FieldInfo[], props: Property[]): string {
  if (!data?.length) return '<div class="empty-state">No data</div>'
  const headers = fields.map(f=>`<th data-field="${esc(f.name)}">${esc(f.name)}<span class="sort-arrow"></span></th>`).join('')
  const rows = data.map(item=>`<tr data-id="${esc(item.id||'')}">${fields.map(f=>{
    let v=item[f.name];if(v===undefined||v===null)v=''
    if(f.enumOptions?.length)v=`<span class="badge badge-${String(v).toLowerCase()}">${esc(v)}</span>`
    else if(typeof v==='object')v=esc(JSON.stringify(v))
    else v=esc(v)
    return `<td contenteditable="true" data-field="${esc(f.name)}">${v}</td>`
  }).join('')}</tr>`).join('')
  return `<div class="clear-datagrid"><table class="clear-table"><thead><tr>${headers}<th class="col-actions">Actions</th></tr></thead><tbody>${rows}</tbody></table><div class="datagrid-toolbar"><span class="datagrid-count">${data.length} records</span><button class="clear-btn small outline" onclick="location.reload()">Refresh</button></div></div>`
}

// ── Section rendering ──────────────────────────────────────────────────

function renderSection(
  section: ScreenSection,
  ctx: RenderContext,
): string {
  const sectionTitle = section.name.charAt(0).toUpperCase() + section.name.slice(1)
  const content: string[] = []

  for (const prop of section.properties) {
    // Resolve data model and fetch data if this section references a model
    const text = prop.args.join(' ')
    let model: DataModel | null = null
    let data: any[] = []

    if (prop.key === 'show' || prop.key === 'field') {
      const dataRef = prop.key === 'show' ? text.split(/\s+/)[0] : text.split(/\s+/)[0]
      const modelName = resolveModelName(dataRef, ctx.models)
      if (modelName) {
        model = ctx.models.get(modelName)!
        data = model.store.findAll() as any[]
      }
    }

    if (prop.key === 'tabs') {
      content.push(renderTabs(prop.children))
    } else {
      content.push(renderElement(prop, model, model?.fields || [], data))
    }
  }

  const html = content.join('\n          ')
  return `<section class="screen-section" id="section-${esc(section.name)}">
      <div class="section-header">
        <h2>${esc(sectionTitle)}</h2>
      </div>
      <div class="section-body">
        ${html}
      </div>
    </section>`
}

// ── Navigation ─────────────────────────────────────────────────────────

function buildNav(allScreens: ScreenBlock[], current: ScreenBlock): string {
  const links = allScreens.map(s => {
    const slug = s.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
    const active = s.name === current.name ? ' class="active"' : ''
    return `<a href="/s/${slug}"${active}>${esc(s.name)}</a>`
  }).join('')
  return `<nav class="clear-nav"><div class="nav-brand">Clear</div><div class="nav-links">${links}</div></nav>`
}

function buildSidenav(allScreens: ScreenBlock[], current: ScreenBlock): string {
  const links = allScreens.map(s => {
    const slug = s.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
    const active = s.name === current.name ? ' active' : ''
    return `<a href="/s/${slug}" class="sidenav-link${active}"><span class="sidenav-icon">◈</span>${esc(s.name)}</a>`
  }).join('')
  return `<aside class="clear-sidenav"><div class="sidenav-header">Clear App</div><div class="sidenav-links">${links}</div></aside>`
}

// ── CSS Generator ──────────────────────────────────────────────────────

function generateCSS(): string {
  return `/* Clear Screen Renderer — Default Theme */
:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-muted: #64748b;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08);
  --shadow-lg: 0 4px 12px rgba(0,0,0,.1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}

/* Navigation */
.clear-nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:56px;display:flex;align-items:center;gap:24px;position:sticky;top:0;z-index:100}
.nav-brand{font-weight:700;font-size:18px;color:var(--primary)}
.nav-links{display:flex;gap:8px}
.nav-links a{padding:6px 14px;border-radius:var(--radius);text-decoration:none;color:var(--text-muted);font-size:14px;font-weight:500;transition:all .15s}
.nav-links a:hover{background:var(--surface-2);color:var(--text)}
.nav-links a.active{background:var(--primary);color:#fff}

/* Layout */
.app-layout{display:flex;min-height:calc(100vh - 56px)}
.clear-sidenav{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:16px 0;flex-shrink:0}
.sidenav-header{padding:8px 20px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted)}
.sidenav-links{display:flex;flex-direction:column;gap:2px}
.sidenav-link{padding:8px 20px;text-decoration:none;color:var(--text-muted);font-size:14px;display:flex;align-items:center;gap:8px;transition:all .15s;border-right:2px solid transparent}
.sidenav-link:hover{background:var(--surface-2);color:var(--text)}
.sidenav-link.active{color:var(--primary);background:var(--surface-2);border-right-color:var(--primary);font-weight:600}
.sidenav-icon{font-size:10px;opacity:.5}
.main-content{flex:1;padding:24px 32px;max-width:1200px}

/* Sections */
.screen-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:20px;box-shadow:var(--shadow)}
.section-header{padding:16px 20px;border-bottom:1px solid var(--border)}
.section-header h2{font-size:16px;font-weight:600}
.section-body{padding:16px 20px}

/* Table */
.clear-table-wrap{overflow-x:auto}
.clear-table{width:100%;border-collapse:collapse;font-size:14px}
.clear-table th{padding:10px 12px;text-align:left;font-weight:600;color:var(--text-muted);font-size:12px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border);cursor:pointer;user-select:none}
.clear-table td{padding:10px 12px;border-bottom:1px solid var(--border)}
.clear-table tbody tr:hover{background:var(--surface-2);cursor:pointer}

/* Cards */
.clear-card{border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:8px;transition:box-shadow .15s}
.clear-card:hover{box-shadow:var(--shadow-lg)}
.card-header h3{font-size:15px;font-weight:600;margin-bottom:4px}
.card-body p{font-size:13px;color:var(--text-muted);margin-bottom:8px}
.card-meta{font-size:12px;color:var(--text-muted);margin-top:4px;display:flex;gap:8px;align-items:center}
.card-meta-label{font-weight:500}

/* Kanban */
.clear-kanban{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;min-height:300px}
.kanban-column{background:var(--surface-2);border-radius:var(--radius);min-width:260px;max-width:300px;flex:1;display:flex;flex-direction:column}
.kanban-header{padding:12px 16px;font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)}
.kanban-count{background:var(--border);border-radius:12px;padding:1px 8px;font-size:11px;color:var(--text-muted)}
.kanban-cards{padding:8px;flex:1;display:flex;flex-direction:column;gap:6px}
.kanban-card{background:var(--surface);border-radius:6px;padding:10px 12px;font-size:13px;border:1px solid var(--border);cursor:grab;transition:box-shadow .15s,transform .1s}
.kanban-card:hover{box-shadow:var(--shadow-lg)}
.kanban-card-title{font-weight:500;margin-bottom:4px}

/* Badges */
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;text-transform:capitalize}
.badge-todo{background:#dbeafe;color:#1d4ed8}
.badge-in_progress,.badge-in-progress{background:#fef3c7;color:#b45309}
.badge-done{background:#dcfce7;color:#166534}
.badge-low{background:#f0fdf4;color:#15803d}
.badge-medium{background:#fef9c3;color:#a16207}
.badge-high{background:#fee2e2;color:#b91c1c}
.badge-urgent{background:#fecaca;color:#991b1b}
.badge-success{background:#dcfce7;color:#166534}
.badge-muted{background:var(--surface-2);color:var(--text-muted)}

/* Forms */
.clear-form{display:flex;flex-direction:column;gap:12px}
.form-field{display:flex;flex-direction:column;gap:4px}
.form-field label{font-size:13px;font-weight:600;color:var(--text)}
.form-field input,.form-field select{padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;outline:none;transition:border-color .15s;background:var(--surface);color:var(--text)}
.form-field input:focus,.form-field select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.form-field-check{flex-direction:row-reverse;justify-content:flex-end;gap:8px}
.form-field-check input{width:auto}
.form-actions{padding-top:8px}
.form-field input[type="checkbox"]{width:auto}

/* Buttons */
.clear-btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 20px;border-radius:6px;font-size:14px;font-weight:500;border:none;cursor:pointer;transition:all .15s;text-decoration:none}
.clear-btn.primary{background:var(--primary);color:#fff}
.clear-btn.primary:hover{background:var(--primary-dark)}
.clear-btn.outline{background:transparent;border:1px solid var(--border);color:var(--text)}
.clear-btn.outline:hover{background:var(--surface-2)}
.clear-btn.large{padding:12px 28px;font-size:16px}
.clear-btn.small{padding:4px 12px;font-size:12px}
.clear-btn:disabled{opacity:.5;cursor:not-allowed}
.clear-btn.danger{background:var(--danger);color:#fff}
.clear-btn.danger:hover{background:#dc2626}

/* Tabs */
.clear-tabs{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.tab-nav{display:flex;border-bottom:1px solid var(--border);background:var(--surface-2)}
.tab-btn{padding:10px 20px;font-size:13px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--text-muted);border-bottom:2px solid transparent;transition:all .15s}
.tab-btn:hover{color:var(--text);background:var(--surface)}
.tab-btn.active{color:var(--primary);border-bottom-color:var(--primary)}
.tab-pane{display:none;padding:16px}
.tab-pane.active{display:block}

/* Carousel */
.clear-carousel{position:relative;border-radius:var(--radius);overflow:hidden;background:var(--surface-2)}
.carousel-slide{display:none;padding:40px;text-align:center;min-height:120px;align-items:center;justify-content:center}
.carousel-slide.active{display:flex}
.carousel-img{font-size:14px;color:var(--text-muted)}
.carousel-dots{display:flex;justify-content:center;gap:6px;padding:8px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--border);cursor:pointer}
.dot.active{background:var(--primary)}

/* Selector */
.selector-buttons{display:flex;flex-wrap:wrap;gap:6px}
.clear-select{padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;min-width:200px;background:var(--surface)}

/* Charts */
.clear-chart{background:var(--surface);border-radius:var(--radius);padding:12px;overflow:hidden}
.chart-legend{display:flex;flex-wrap:wrap;gap:8px;padding:8px;justify-content:center}
.legend-item{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)}
.legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block}

/* Calendar */
.clear-calendar{overflow-x:auto}
.clear-calendar table{width:100%;border-collapse:collapse;font-size:13px}
.clear-calendar th{padding:6px;text-align:center;font-weight:600;color:var(--text-muted);font-size:11px;text-transform:uppercase}
.cal-month{font-size:14px!important;font-weight:700!important;color:var(--text)!important;padding:8px!important}
.cal-day{padding:8px;text-align:center;border:1px solid var(--border);vertical-align:top;width:14.28%;min-height:60px;cursor:pointer;transition:background var(--transition)}
.cal-day:hover{background:var(--surface-2)}
.cal-day.has-items{background:var(--primary-light)}
.cal-empty{border:1px solid var(--border);background:var(--surface-2)}
.cal-num{font-weight:600;font-size:13px;margin-bottom:4px}
.cal-dots{display:flex;gap:3px;justify-content:center;flex-wrap:wrap;align-items:center}
.cal-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);display:inline-block}
.cal-dots small{font-size:9px;color:var(--text-muted)}

/* Timeline */
.clear-timeline{position:relative;padding-left:24px}
.clear-timeline::before{content:'';position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:var(--border)}
.tl-item{position:relative;padding-bottom:20px;padding-left:16px}
.tl-marker{position:absolute;left:-24px;top:4px;width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:var(--surface)}
.tl-marker.active{border-color:var(--primary);background:var(--primary)}
.tl-date{font-size:12px;color:var(--text-muted);margin-bottom:2px}
.tl-content h4{font-size:14px;font-weight:600;margin-bottom:4px}
.tl-content p{font-size:13px;color:var(--text-muted)}

/* Stat Card */
.clear-stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;display:flex;align-items:center;gap:16px;box-shadow:var(--shadow)}
.stat-body{flex:1}
.stat-value{font-size:28px;font-weight:700;color:var(--text);line-height:1.2}
.stat-label{font-size:13px;color:var(--text-muted);margin-top:4px}
.stat-trend{display:inline-block;font-size:12px;font-weight:600;margin-top:4px;padding:2px 8px;border-radius:12px}
.stat-trend-up{background:#dcfce7;color:#166534}
.stat-trend-down{background:#fee2e2;color:#b91c1c}

/* Data Grid */
.clear-datagrid .clear-table td[contenteditable]{cursor:text;outline:none}
.clear-datagrid .clear-table td[contenteditable]:focus{background:var(--primary-light);box-shadow:inset 0 0 0 2px var(--primary)}
.sort-arrow{display:inline-block;margin-left:4px;opacity:.3}
.datagrid-toolbar{padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);font-size:13px;color:var(--text-muted)}

/* Search */
.clear-search{margin-bottom:12px}
.search-input{width:100%;padding:10px 16px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;outline:none;background:var(--surface);color:var(--text);transition:border-color var(--transition)}
.search-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.search-input::placeholder{color:var(--text-muted)}

/* Common */
.empty-state{padding:24px;text-align:center;color:var(--text-muted);font-size:14px}
.currency{font-weight:600;color:var(--primary);font-size:16px}
h2{font-size:20px;font-weight:700;margin-bottom:8px}
p{font-size:14px;color:var(--text);margin-bottom:8px}

/* Responsive */
@media(max-width:768px){
  .clear-sidenav{display:none}
  .main-content{padding:16px}
  .clear-kanban{flex-direction:column}
  .kanban-column{min-width:100%;max-width:100%}
  .tab-nav{flex-wrap:wrap}
}`
}

// ── Client-side JavaScript ─────────────────────────────────────────────

function generateJS(): string {
  return `// Clear Screen Renderer — Client-side interactivity
(function() {
  // Tab switching
  document.querySelectorAll('.tab-nav').forEach(nav => {
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      const container = nav.closest('.clear-tabs');
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = container.querySelector('#' + btn.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });

  // Form submission via POST to REST API
  document.querySelectorAll('.clear-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const model = form.dataset.model;
      if (!model) return;
      const data = {};
      form.querySelectorAll('[name]').forEach(el => {
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else if (el.type === 'number') data[el.name] = parseFloat(el.value) || 0;
        else data[el.name] = el.value;
      });
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const plural = model.toLowerCase() + 's';
        const res = await fetch('/' + plural, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if (res.ok) { location.reload(); }
        else { const err = await res.json(); alert('Error: ' + (err.error || JSON.stringify(err))); btn.disabled = false; btn.textContent = 'Save'; }
      } catch(e) { alert('Error: ' + e.message); btn.disabled = false; btn.textContent = 'Save'; }
    });
  });

  // Click row to view detail (GET /model/:id)
  document.querySelectorAll('.clear-table tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      if (!id) return;
      const path = location.pathname;
      const base = path.replace(/\\/s\\/.*$/, '');
      const model = document.querySelector('.clear-table')?.closest('[data-model]')?.dataset?.model;
      if (model) window.location = base + '/' + model.toLowerCase() + 's/' + id;
    });
  });

  // Kanban card drag (simple click to detail)
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (!id) return;
      const path = location.pathname;
      window.location = '/items/' + id;
    });
  });

  // Carousel dots
  document.querySelectorAll('.carousel-dots').forEach(dots => {
    dots.addEventListener('click', e => {
      const dot = e.target.closest('.dot');
      if (!dot) return;
      const carousel = dots.closest('.clear-carousel');
      const idx = Array.from(dots.children).indexOf(dot);
      carousel.querySelectorAll('.carousel-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
      dots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    });
  });
})();`
}

// ── Login screen (for auth) ────────────────────────────────────────────

function renderLoginPage(errorMsg?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Login — Clear</title><style>${generateCSS()}
.clear-login-page{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--surface-2)}
.clear-login-card{background:var(--surface);border-radius:var(--radius-lg);padding:40px;width:100%;max-width:400px;box-shadow:var(--shadow-xl)}
.clear-login-card h1{text-align:center;margin-bottom:8px}
.clear-login-card p.subtitle{text-align:center;color:var(--text-muted);margin-bottom:24px}
.tab-bar{display:flex;margin-bottom:24px;border-bottom:2px solid var(--border)}
.tab-bar button{flex:1;padding:10px;font-size:14px;font-weight:600;background:none;border:none;cursor:pointer;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;transition:all var(--transition)}
.tab-bar button.active{color:var(--primary);border-bottom-color:var(--primary)}
.auth-error{background:#fee2e2;color:#b91c1c;padding:10px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:16px;display:none}
</style></head>
<body class="clear-login-page">
<div class="clear-login-card">
<h1>Clear App</h1>
<p class="subtitle">Sign in to continue</p>
<div class="tab-bar"><button class="active" onclick="switchTab('login')">Login</button><button onclick="switchTab('signup')">Sign Up</button></div>
<div id="auth-error" class="auth-error">${errorMsg ? esc(errorMsg) : ''}</div>
<form id="login-form" onsubmit="return submitAuth(event,'login')">
<div class="form-field"><label>Email</label><input type="email" id="login-email" required placeholder="you@example.com"></div>
<div class="form-field"><label>Password</label><input type="password" id="login-password" required placeholder="••••••••"></div>
<div class="form-actions"><button type="submit" class="clear-btn primary large" style="width:100%">Sign In</button></div>
</form>
<form id="signup-form" style="display:none" onsubmit="return submitAuth(event,'signup')">
<div class="form-field"><label>Name</label><input type="text" id="signup-name" required placeholder="Your name"></div>
<div class="form-field"><label>Email</label><input type="email" id="signup-email" required placeholder="you@example.com"></div>
<div class="form-field"><label>Password</label><input type="password" id="signup-password" required minlength="6" placeholder="••••••••"></div>
<div class="form-actions"><button type="submit" class="clear-btn primary large" style="width:100%">Create Account</button></div>
</form>
</div>
<script>
function switchTab(tab){document.querySelectorAll('.tab-bar button').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase().includes(tab)));document.getElementById('login-form').style.display=tab==='login'?'':'none';document.getElementById('signup-form').style.display=tab==='signup'?'':'none'}
async function submitAuth(e,type){e.preventDefault();const email=document.getElementById(type+'-email').value;const password=document.getElementById(type+'-password').value;const name=type==='signup'?document.getElementById('signup-name').value:undefined;const err=document.getElementById('auth-error');err.style.display='none';try{const body={email,password};if(name)body.name=name;const r=await fetch('/api/auth/'+type,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(r.ok){localStorage.setItem('auth-token',d.token);window.location.href='/s/${screenSlug((window as any).__firstScreen||'Dashboard')}'}else{err.textContent=d.error||'Authentication failed';err.style.display='block'}}catch(e){err.textContent='Network error';err.style.display='block'}return false}
</script>
</body></html>`
}

// ── Main render function ───────────────────────────────────────────────

export function renderScreen(
  screen: ScreenBlock,
  models: Map<string, DataModel>,
  allScreens: ScreenBlock[],
  customTemplates?: Map<string, string>,
): string {
  const ctx: RenderContext = {
    screen,
    models,
    allScreens,
    customTemplates: customTemplates ?? new Map(),
  }

  const title = getTitle(screen)
  const layout = getLayout(screen)
  const isSingle = layout === 'single-column'
  const nav = buildNav(allScreens, screen)
  const sidenav = buildSidenav(allScreens, screen)
  const sections = screen.sections.map(s => renderSection(s, ctx)).join('\n        ')

  const pageClass = layout.startsWith('grid') ? 'layout-grid'
    : layout === 'kanban' ? 'layout-kanban'
    : 'layout-single'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Clear</title>
  <style>${generateCSS()}</style>
</head>
<body>
  ${nav}
  <div class="app-layout">
    ${sidenav}
    <main class="main-content ${pageClass}">
      ${sections}
    </main>
  </div>
  <script>${generateJS()}</script>
</body>
</html>`
}

// ── Screen slug for route mapping ──────────────────────────────────────

export function screenSlug(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/-+/g, '-')
}

// ── Register screens onto the HTTP server ──────────────────────────────

import { HttpServer, RequestContext } from './server.js'
import { requireAuth } from './auth.js'

export function registerScreens(
  ast: { blocks: any[] },
  models: Map<string, DataModel>,
  server: HttpServer,
): void {
  const screenBlocks = ast.blocks.filter((b: any) => b.type === 'screen') as ScreenBlock[]
  if (screenBlocks.length === 0) return

  const authConfig = (server as any)._authConfig as { enabled: boolean } | undefined
  const authEnabled = authConfig?.enabled ?? false

  // Index page — redirect to first screen (or login if auth required)
  const firstSlug = screenSlug(screenBlocks[0].name)
  server.on('GET', '/', async (ctx) => {
    ctx.status = 302
    ctx.responseBody = null
    ctx.responseType = 'redirect'
    ctx.responseLocation = authEnabled ? '/s/login' : `/s/${firstSlug}`
  })

  // Login screen (if auth enabled)
  if (authEnabled) {
    server.on('GET', '/s/login', async (ctx) => {
      const html = renderLoginPage()
      ctx.status = 200
      ctx.responseType = 'html'
      ctx.responseBody = html
    })
    server.on('GET', '/s/signup', async (ctx) => {
      const html = renderLoginPage()
      ctx.status = 200
      ctx.responseType = 'html'
      ctx.responseBody = html
    })
  }

  for (const screen of screenBlocks) {
    const slug = screenSlug(screen.name)
    const path = `/s/${slug}`
    const requiresAuth = authEnabled && screen.properties.some(p => p.key === 'auth' && p.args.includes('required'))

    server.on('GET', path, async (ctx) => {
      // Auth check
      if (requiresAuth && !requireAuth(ctx)) {
        ctx.status = 302
        ctx.responseType = 'redirect'
        ctx.responseLocation = '/s/login'
        return
      }
      const html = renderScreen(screen, models, screenBlocks)
      ctx.status = 200
      ctx.responseType = 'html'
      ctx.responseBody = html
    })
  }

  if (!(server as any)._screensRegistered) {
    if (!screenBlocks.some(s => s.properties.find(p => p.key === 'silent'))) {
      console.log(`  ${'_'.repeat(40)}`)
      console.log(`  🖥️  Screen Renderer`)
      for (const screen of screenBlocks) {
        const slug = screenSlug(screen.name)
        const auth = screen.properties.some(p => p.key === 'auth') ? ' 🔐' : ''
        console.log(`  ${(screen.name + auth).padEnd(22)} /s/${slug}`)
      }
      console.log(`  ${'_'.repeat(40)}`)
    }
    ;(server as any)._screensRegistered = true
  }
}
