// Clear Persistence — File-based data persistence for the interpreter
// Saves in-memory store data to .clear-data/ as JSON files
// Zero external dependencies — uses Node.js built-in fs

import fs from 'fs'
import path from 'path'

const DATA_DIR = '.clear-data'

function getFilePath(storeName: string): string {
  const dir = path.resolve(process.cwd(), DATA_DIR)
  return path.join(dir, `${storeName}.json`)
}

export function ensureDataDir(): void {
  const dir = path.resolve(process.cwd(), DATA_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function saveStore(storeName: string, records: any[]): void {
  try {
    const filePath = getFilePath(storeName)
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8')
  } catch (err: any) {
    console.error(`  ⚠️  Failed to save ${storeName}: ${err.message}`)
  }
}

export function loadStore(storeName: string): any[] {
  try {
    const filePath = getFilePath(storeName)
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function clearStore(storeName: string): void {
  try {
    const filePath = getFilePath(storeName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}
