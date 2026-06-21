// OpenAPI 3.0 spec generator for Clear
// Builds a complete OpenAPI spec from the AST

import { ClearFile, ApiBlock, ApiRoute, Property, DataBlock, FieldDef } from '../ast.js'

export function generateOpenApi(ast: ClearFile): string {
  const spec: any = {
    openapi: '3.0.3',
    info: {
      title: ast.product.properties.find(p => p.key === 'name')?.value?.value || ast.product.name,
      version: ast.product.properties.find(p => p.key === 'version')?.value?.value || '1.0.0',
      description: ast.product.properties.find(p => p.key === 'description')?.value?.value || '',
    },
    paths: {},
    components: {
      schemas: collectSchemas(ast),
    },
  }

  const apiBlocks = ast.blocks.filter(b => b.type === 'api') as unknown as ApiBlock[]
  for (const block of apiBlocks) {
    const basePath = block.path || '/'
    for (const route of block.routes || []) {
      const method = route.method.toLowerCase()
      const routePath = route.path || '/'
      const fullPath = basePath + (routePath.startsWith('/') ? routePath : '/' + routePath)
      const cleanPath = fullPath.replace(/\/:(\w+)/g, '/{$1}') // :id → {id}

      if (!spec.paths[cleanPath]) spec.paths[cleanPath] = {}
      spec.paths[cleanPath][method] = buildOperation(route, block)
    }
  }

  return JSON.stringify(spec, null, 2)
}

function collectSchemas(ast: ClearFile): Record<string, any> {
  const schemas: Record<string, any> = {}
  const dataBlocks = ast.blocks.filter(b => b.type === 'data') as unknown as DataBlock[]
  for (const block of dataBlocks) {
    const properties: Record<string, any> = {}
    const required: string[] = []
    for (const field of block.fields || []) {
      const typeProp = field.properties.find(p => p.key === 'type')
      const typeStr = typeProp?.args?.join(' ') || 'string'
      const requiredProp = field.properties.find(p => p.key === 'type')

      const schema = typeToSchema(typeStr)
      properties[field.name] = schema

      const reqProp = field.properties.find(p => p.key === 'required')
      if (reqProp && (reqProp.args.includes('true') || reqProp.value?.type === 'boolean' && reqProp.value.value === true)) {
        required.push(field.name)
      }
    }
    schemas[block.name] = {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    }
  }
  return schemas
}

function typeToSchema(typeStr: string): any {
  const base = typeStr.split(/\s+/)[0]
  switch (base) {
    case 'string': case 'email': case 'url': case 'uuid': return { type: 'string' }
    case 'integer': return { type: 'integer' }
    case 'float': case 'number': return { type: 'number' }
    case 'boolean': return { type: 'boolean' }
    case 'timestamp': return { type: 'string', format: 'date-time' }
    case 'enum': return { type: 'string' }
    case 'reference': return { type: 'string', description: `Reference to ${typeStr.slice(10)}` }
    default: return { type: 'string' }
  }
}

function buildOperation(route: ApiRoute, block: ApiBlock): any {
  const returnProp = route.properties.find(p => p.key === 'return')
  const acceptProp = route.properties.find(p => p.key === 'accept')
  const method = route.method.toLowerCase()
  const op: any = {
    summary: `${method.toUpperCase()} ${route.path || '/'}`,
    responses: {
      '200': { description: 'Success' },
      '400': { description: 'Bad Request' },
      '404': { description: 'Not Found' },
    },
  }

  // Parse return type
  if (returnProp) {
    const text = returnProp.args.join(' ')
    const modelMatch = text.match(/(?:list of )?(\w+)/)
    if (modelMatch) {
      const schemaName = modelMatch[1]
      if (text.startsWith('list of ')) {
        op.responses['200'].content = {
          'application/json': { schema: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } } },
        }
      } else {
        op.responses['200'].content = {
          'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } },
        }
      }
    }
  }

  // Parse accept fields (for POST/PUT)
  if (acceptProp && (method === 'post' || method === 'put')) {
    const fields = acceptProp.args.join(' ').split(',').map(s => s.trim())
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: Object.fromEntries(fields.map(f => [f, { type: 'string' }])),
          },
        },
      },
    }
  }

  // Error responses
  const errorProps = route.properties.filter(p => p.key === 'error')
  for (const err of errorProps) {
    const text = err.args.join(' ')
    const codeMatch = text.match(/(\d+)/)
    if (codeMatch) {
      op.responses[codeMatch[1]] = { description: text.replace(/^\d+\s+/, '') }
    }
  }

  return op
}
