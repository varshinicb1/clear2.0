// Clear Language VS Code Extension
// Provides syntax highlighting, snippets, and commands for .clear files

import * as vscode from 'vscode'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export function activate(context: vscode.ExtensionContext) {
  console.log('Clear Language extension activated')

  // Command: Clear: Run this file
  const runDisposable = vscode.commands.registerCommand('clear.run', () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.clear')) {
      vscode.window.showErrorMessage('Open a .clear file first')
      return
    }
    const terminal = vscode.window.createTerminal('Clear Run')
    terminal.sendText(`clear-cli run "${editor.document.fileName}"`)
    terminal.show()
  })

  // Command: Clear: Validate this file
  const checkDisposable = vscode.commands.registerCommand('clear.check', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.clear')) {
      vscode.window.showErrorMessage('Open a .clear file first')
      return
    }
    const filePath = editor.document.fileName
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Validating Clear file...' },
      async () => {
        try {
          await execAsync(`clear-cli check "${filePath}"`)
          vscode.window.showInformationMessage('✅ Clear file is valid!')
        } catch (e: any) {
          vscode.window.showErrorMessage(`Validation failed: ${e.stderr || e.message}`)
        }
      },
    )
  })

  // Command: Clear: Build from this file
  const buildDisposable = vscode.commands.registerCommand('clear.build', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.clear')) {
      vscode.window.showErrorMessage('Open a .clear file first')
      return
    }
    const filePath = editor.document.fileName

    const target = await vscode.window.showQuickPick(
      ['typescript', 'express', 'hono', 'fastify', 'koa', 'openapi', 'postman'],
      { placeHolder: 'Select build target' },
    )
    if (!target) return

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Building Clear → ${target}...` },
      async () => {
        try {
          const { stdout } = await execAsync(`clear-cli build "${filePath}" --target ${target}`)
          const doc = await vscode.workspace.openTextDocument({ content: stdout, language: target === 'openapi' || target === 'postman' ? 'json' : 'typescript' })
          vscode.window.showTextDocument(doc)
        } catch (e: any) {
          vscode.window.showErrorMessage(`Build failed: ${e.stderr || e.message}`)
        }
      },
    )
  })

  context.subscriptions.push(runDisposable, checkDisposable, buildDisposable)
}

export function deactivate() {}
