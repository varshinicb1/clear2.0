// React component generator for Clear
// Generates functional React components with TypeScript from ScreenBlock AST

import { ClearFile, ScreenBlock, ScreenSection, Property, DataBlock, FieldDef } from '../ast.js'

export function generateReactApp(ast: ClearFile): Record<string, string> {
  const files: Record<string, string> = {}

  // package.json
  files['package.json'] = JSON.stringify({
    name: (ast.product.properties.find(p => p.key === 'name')?.value?.value || ast.product.name).toLowerCase().replace(/\s+/g, '-'),
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: { '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0', 'typescript': '^5.7.0', 'vite': '^6.0.0', '@vitejs/plugin-react': '^4.3.0' },
  }, null, 2)

  // vite config
  files['vite.config.ts'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })`

  // tsconfig
  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, esModuleInterop: true, skipLibCheck: true },
    include: ['src'],
  }, null, 2)

  // index.html
  files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${ast.product.properties.find(p => p.key === 'name')?.value?.value || ast.product.name}</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>`

  // src/main.tsx
  files['src/main.tsx'] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)`

  // src/App.tsx
  const screenBlocks = ast.blocks.filter(b => b.type === 'screen') as unknown as ScreenBlock[]
  const imports = screenBlocks.map(s => {
    const name = s.name.replace(/[^a-zA-Z0-9]/g, '')
    return `import ${name} from './screens/${name}'`
  }).join('\n')

  const routes = screenBlocks.map(s => {
    const name = s.name.replace(/[^a-zA-Z0-9]/g, '')
    const slug = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
    return `      <Route path="/${slug}" element={<${name} />} />`
  }).join('\n')

  files['src/App.tsx'] = `import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
${imports}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <span className="nav-brand">${ast.product.properties.find(p => p.key === 'name')?.value?.value || ast.product.name}</span>
          <div className="nav-links">
${screenBlocks.map(s => {
  const name = s.name.replace(/[^a-zA-Z0-9]/g, '')
  const slug = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
  return `            <a href="/${slug}">${s.name}</a>`
}).join('\n')}
          </div>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/${screenBlocks[0]?.name?.replace(/[^a-zA-Z0-9]/g, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') || ''}" />} />
${routes}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}`

  // Generate screen components
  for (const screen of screenBlocks) {
    const name = screen.name.replace(/[^a-zA-Z0-9]/g, '')
    const title = screen.properties.find(p => p.key === 'title')?.args.join(' ') || screen.name

    const sectionsHtml = screen.sections.map(section => {
      const sectionTitle = section.name.charAt(0).toUpperCase() + section.name.slice(1)
      const elements = section.properties.map(prop => renderReactElement(prop)).join('\n')
      return `      <section className="screen-section">
        <div className="section-header"><h2>${sectionTitle}</h2></div>
        <div className="section-body">
${elements}
        </div>
      </section>`
    }).join('\n')

    files[`src/screens/${name}.tsx`] = `import React, { useState, useEffect } from 'react'

interface ${name}Props {}

export default function ${name}(_props: ${name}Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <h1>${title}</h1>
${sectionsHtml}
    </div>
  )
}`

    // Generate CSS
    files['src/styles.css'] = `/* Clear Generated React App */
:root {
  --primary: #3b82f6; --bg: #f8fafc; --surface: #fff; --surface-2: #f1f5f9;
  --border: #e2e8f0; --text: #1e293b; --text-muted: #64748b;
  --radius: 8px; --shadow: 0 1px 3px rgba(0,0,0,.08);
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--bg); color: var(--text); }
.nav { display: flex; align-items: center; padding: 0 24px; height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); gap: 24px; }
.nav-brand { font-weight: 700; font-size: 18px; color: var(--primary); }
.nav-links { display: flex; gap: 12px; }
.nav-links a { color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500; }
.main { padding: 24px 32px; max-width: 1200px; }
.page h1 { margin-bottom: 20px; }
.screen-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 20px; box-shadow: var(--shadow); }
.section-header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
.section-header h2 { font-size: 16px; font-weight: 600; }
.section-body { padding: 16px 20px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted); font-size: 12px; text-transform: uppercase; border-bottom: 2px solid var(--border); }
td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
.loading { padding: 40px; text-align: center; color: var(--text-muted); }`
  }

  // package.json with react-router-dom
  const pkg = JSON.parse(files['package.json'])
  pkg.dependencies['react-router-dom'] = '^7.0.0'
  files['package.json'] = JSON.stringify(pkg, null, 2)

  return files
}

function renderReactElement(prop: Property): string {
  const text = prop.args.join(' ')
  switch (prop.key) {
    case 'show': {
      const match = text.match(/^(\S+)\s+as\s+(\S+)/)
      if (match) {
        const [, ref, component] = match
        if (component === 'table') {
          return `          <div className="table-wrap"><table><thead><tr><th>${ref}</th></tr></thead><tbody>{loading ? <tr><td>Loading...</td></tr> : data.map((item: any, i: number) => <tr key={i}><td>{item.name || item.title || item.id}</td></tr>)}</tbody></table></div>`
        }
        if (component === 'heading') return `          <h2>{${ref}}</h2>`
        if (component === 'text') return `          <p>{${ref}}</p>`
        return `          <div className="component">${component}: {loading ? 'Loading...' : JSON.stringify(data)}</div>`
      }
      return `          <p>${text}</p>`
    }
    case 'button': {
      const label = prop.value?.type === 'string' ? prop.value.value : text
      return `          <button className="btn">${label}</button>`
    }
    case 'field': {
      const fieldName = text.split(/\s+/)[0]
      return `          <div className="field"><label>${fieldName}</label><input name="${fieldName}" /></div>`
    }
    default: return ''
  }
}
