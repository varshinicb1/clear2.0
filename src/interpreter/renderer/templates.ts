// Custom template system for Clear screen renderer
// Supports: template "path/to/template.html" on sections
// Templates use {{variable}} syntax for simple data binding

import fs from 'fs'
import path from 'path'

export interface TemplateEngine {
  /** Render a template file with data, returns null if not found */
  render(templatePath: string, data: any, sectionName: string): string | null
  /** Check if a template exists */
  exists(templatePath: string): boolean
  /** Resolve a template path relative to the project */
  resolve(relativePath: string): string
}

export function createTemplateEngine(projectDir: string): TemplateEngine {
  return {
    resolve(relativePath: string): string {
      // Check multiple locations
      const locations = [
        path.join(projectDir, relativePath),
        path.join(projectDir, 'templates', relativePath),
        path.join(projectDir, '.clear', relativePath),
      ]
      for (const loc of locations) {
        if (fs.existsSync(loc)) return loc
      }
      // Return the first location as default (will be checked at render time)
      return locations[0]
    },

    exists(templatePath: string): boolean {
      return fs.existsSync(templatePath)
    },

    render(templatePath: string, data: any, _sectionName: string): string | null {
      const resolvedPath = this.resolve(templatePath)
      if (!fs.existsSync(resolvedPath)) return null

      try {
        let content = fs.readFileSync(resolvedPath, 'utf-8')
        // Simple {{variable}} replacement
        content = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          const val = data?.[key]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return JSON.stringify(val)
          return String(val)
        })
        // {{#each items}}...{{/each}} blocks
        content = content.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, listName, template) => {
          const items = data?.[listName]
          if (!Array.isArray(items)) return ''
          return items.map((item: any, idx: number) => {
            return template.replace(/\{\{this\.(\w+)\}\}/g, (_match: string, key: string) => String(item[key] ?? ''))
              .replace(/\{\{index\}\}/g, String(idx))
          }).join('')
        })
        return content
      } catch {
        return null
      }
    },
  }
}
