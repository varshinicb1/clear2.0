#!/usr/bin/env node
// Clear MCP Server — exposes Clear language tools to AI agents via Model Context Protocol
// Run: npx tsx src/mcp-server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { parse } from './parser.js'
import { validate } from './validator.js'
import { generateCode } from './codegen/index.js'
import { generateOpenApi } from './codegen/openapi.js'
import { generatePostmanCollection } from './codegen/postman.js'

const SERVER_INFO = { name: 'clear-mcp', version: '0.4.1' }
const CAPABILITIES = { capabilities: { tools: {} } }
const server = new Server(SERVER_INFO, CAPABILITIES)

function loadClearFile(filePath: string) {
  const resolved = resolve(filePath)
  if (!existsSync(resolved)) throw new Error(`File not found: ${filePath}`)
  const source = readFileSync(resolved, 'utf-8')
  const result = parse(source, filePath)
  if (!result.ast) throw new Error(`Parse failed: ${result.errors.map(e => e.message).join('; ')}`)
  const validation = validate(result.ast)
  return { source, ast: result.ast, parseErrors: result.errors, validation }
}

function summarize(filePath: string): string {
  try {
    const { ast, parseErrors, validation } = loadClearFile(filePath)
    const lines: string[] = []
    lines.push(`Product: ${ast.product.name}`)
    lines.push(`Blocks: ${ast.blocks.length}`)
    for (const b of ast.blocks) {
      const block = b as any
      if (block.type === 'data') lines.push(`  Data: ${block.name} (${block.fields?.length || 0} fields)`)
      else if (block.type === 'api') lines.push(`  API: ${block.protocol} ${block.path} (${block.routes?.length || 0} routes)`)
      else if (block.type === 'screen') lines.push(`  Screen: ${block.name}`)
      else if (block.type === 'flow') lines.push(`  Flow: ${block.name} (${block.steps?.length || 0} steps)`)
      else if (block.type === 'auth') lines.push(`  Auth: ${block.name}`)
      else if (block.type === 'rule') lines.push(`  Rule: ${block.name}`)
      else if (block.type === 'event') lines.push(`  Event: ${block.name}`)
      else if (block.type === 'agent') lines.push(`  Agent: ${block.name}`)
      else if (block.type === 'skill') lines.push(`  Skill: ${block.name}`)
      else if (block.type === 'config') lines.push(`  Config: ${block.name}`)
      else if (block.type === 'deploy') lines.push(`  Deploy: ${block.target}`)
      else if (block.type === 'example') lines.push(`  Example: ${block.name}`)
    }
    if (parseErrors.length) lines.push(`Parse errors: ${parseErrors.length}`)
    if (validation.errors.length) lines.push(`Validation errors: ${validation.errors.length}`)
    if (validation.warnings.length) lines.push(`Warnings: ${validation.warnings.length}`)
    if (!parseErrors.length && validation.valid) lines.push('Status: VALID')
    return lines.join('\n')
  } catch (err: any) {
    return `Error: ${err.message}`
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'validate',
      description: 'Parse and validate a .clear file. Returns errors, warnings, and a summary.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string', description: 'Path to .clear file' } }, required: ['filePath'] },
    },
    {
      name: 'build',
      description: 'Generate code from a .clear file. Targets: typescript, express, hono, fastify, koa, openapi, postman.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, target: { type: 'string', enum: ['typescript','express','hono','fastify','koa','openapi','postman'] } }, required: ['filePath','target'] },
    },
    {
      name: 'explain',
      description: 'Explain what a .clear file does — lists all blocks, models, APIs, screens, flows.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
    },
    {
      name: 'list_models',
      description: 'List all data models defined in a .clear file with their fields and types.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
    },
    {
      name: 'list_apis',
      description: 'List all API endpoints defined in a .clear file with methods and paths.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
    },
    {
      name: 'list_screens',
      description: 'List all screen definitions in a .clear file with their sections.',
      inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'validate': {
      const fp = args?.filePath as string
      try {
        const { parseErrors, validation, ast } = loadClearFile(fp)
        const summary = summarize(fp)
        return {
          content: [{
            type: 'text',
            text: `Valid: ${validation.valid && parseErrors.length === 0}\nErrors: ${validation.errors.length + parseErrors.length}\nWarnings: ${validation.warnings.length}\n\n${summary}`,
          }],
        }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    case 'build': {
      const fp = args?.filePath as string
      const target = args?.target as string
      try {
        const { ast } = loadClearFile(fp)
        let code: string
        if (target === 'openapi') code = generateOpenApi(ast)
        else if (target === 'postman') code = generatePostmanCollection(ast)
        else code = generateCode(ast, { target: target as any })
        const preview = code.slice(0, 2000)
        const lines = code.split('\n').length
        return { content: [{ type: 'text', text: `Generated ${lines} lines for target "${target}".\n\nPreview:\n${preview}` }] }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    case 'explain': {
      const fp = args?.filePath as string
      try {
        const { ast } = loadClearFile(fp)
        const dataBlocks = ast.blocks.filter(b => b.type === 'data') as any[]
        const apiBlocks = ast.blocks.filter(b => b.type === 'api') as any[]
        const screenBlocks = ast.blocks.filter(b => b.type === 'screen') as any[]
        const flowBlocks = ast.blocks.filter(b => b.type === 'flow') as any[]
        const authBlocks = ast.blocks.filter(b => b.type === 'auth') as any[]

        const lines: string[] = [`# ${ast.product.name}`, '']
        if (dataBlocks.length) {
          lines.push('## Data Models')
          for (const d of dataBlocks) lines.push(`- **${d.name}**: ${d.fields?.map((f: any) => f.name).join(', ') || 'no fields'}`)
          lines.push('')
        }
        if (apiBlocks.length) {
          lines.push('## API Endpoints')
          for (const api of apiBlocks) {
            for (const route of api.routes || []) lines.push(`- ${route.method.toUpperCase()} ${api.path}${route.path}`)
          }
          lines.push('')
        }
        if (screenBlocks.length) {
          lines.push('## Screens')
          for (const s of screenBlocks) lines.push(`- **${s.name}**: ${s.sections?.map((sec: any) => sec.name).join(', ') || 'no sections'}`)
          lines.push('')
        }
        if (flowBlocks.length) {
          lines.push('## Flows')
          for (const f of flowBlocks) lines.push(`- **${f.name}**: ${f.steps?.map((s: any) => s.name).join(' → ') || 'no steps'}`)
          lines.push('')
        }
        if (authBlocks.length) lines.push('## Auth: Enabled\n')
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    case 'list_models': {
      const fp = args?.filePath as string
      try {
        const { ast } = loadClearFile(fp)
        const dataBlocks = ast.blocks.filter(b => b.type === 'data') as any[]
        const lines = dataBlocks.map(d => {
          const fields = (d.fields || []).map((f: any) => {
            const typeProp = f.properties.find((p: any) => p.key === 'type')
            return `  - ${f.name}: ${typeProp ? typeProp.args.join(' ') : 'unknown'}`
          }).join('\n')
          return `### ${d.name}\n${fields}`
        })
        return { content: [{ type: 'text', text: lines.join('\n\n') || 'No data models found' }] }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    case 'list_apis': {
      const fp = args?.filePath as string
      try {
        const { ast } = loadClearFile(fp)
        const apiBlocks = ast.blocks.filter(b => b.type === 'api') as any[]
        const lines = apiBlocks.flatMap(api => (api.routes || []).map((r: any) => `${r.method.toUpperCase()} ${api.path}${r.path}`))
        return { content: [{ type: 'text', text: lines.join('\n') || 'No APIs found' }] }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    case 'list_screens': {
      const fp = args?.filePath as string
      try {
        const { ast } = loadClearFile(fp)
        const screenBlocks = ast.blocks.filter(b => b.type === 'screen') as any[]
        const lines = screenBlocks.map(s => `### ${s.name}\nSections: ${(s.sections || []).map((sec: any) => sec.name).join(', ') || 'none'}`)
        return { content: [{ type: 'text', text: lines.join('\n\n') || 'No screens found' }] }
      } catch (err: any) { return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } }
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
})

export async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Clear MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
