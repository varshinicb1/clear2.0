# Changelog

All notable changes to the Clear language specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-06-21

### Added

- Direct execution interpreter — `clear run` starts a live HTTP server from `.clear` files
- Flow executor with full lifecycles: extract, transform, load, and conditional upsert logic
- `--verbose` flag for HTTP request logging with status codes and timing
- `--silent` flag to suppress all startup output (banner, routes, port message)
- `--watch` flag for hot-reload on file changes
- `--resolve-depth` option for nested reference resolution in API responses
- `--max-response-size` option to limit response body size
- `clear init` template system with `todo-api` template (Task CRUD, filtering, pagination, validation)
- Integration tests for interpreter, flow executor, and REST API
- Generated code targets: Express, Hono, Fastify, Koa

### Changed

- Published to npm as `@varshinicb1/clear`
- Auto-publish CI/CD workflow on version tags

## [0.2.0] — 2026-06-21

### Added

- Formal recursive descent parser — parses all 12 keywords with indentation awareness
- AST type definitions for the entire Clear language
- Validator — reference resolution, type checking, duplicate detection, naming convention warnings
- TypeScript code generator — outputs interfaces, factory functions, flows, rules, screens, agents, skills, API routes, configs, events, examples
- CLI tool: `clear check <file>` — parse + validate
- CLI tool: `clear build <file> [--target ts] [--out <file>]` — code generation
- CLI tool: `clear run <file>` — parse, validate, generate, show structure
- CLI tool: `clear init <name>` — scaffold new Clear projects
- GitHub Actions CI — type checks, validates all examples, runs codegen
- Code generation targets: TypeScript (generic), with Hono/Express routing support
- Enum type to TypeScript union type mapping
- Zod import generation for flow validation
- UUID import generation for timestamp/data blocks

## [0.1.0] — 2025-06-16

### Added

- Initial language specification draft
- 12 core keywords: `product`, `data`, `screen`, `flow`, `rule`, `example`, `agent`, `skill`, `api`, `event`, `config`, `deploy`
- Syntax rules: indentation-based, PascalCase blocks, snake_case fields
- Type system: 8 primitives, 4 compound types, modifiers
- Execution model (conceptual)
- 6 example files: support agent, REST API, MCP server, product page, data pipeline, lead qualification
- Design decisions document
- Roadmap through v1.0
- Website at sahin.io/clear
- Website at github.com/varshinicb1/clear2.0
