// Clear Language VS Code Extension
// Provides syntax highlighting, snippets, and commands for .clear files

import * as vscode from 'vscode'
import { exec } from 'child_process'
import { join } from 'path'

export function activate(context: vscode.ExtensionContext) {
  console.log('Clear Language extension activated')

  // Command: Clear: Run this file
  const runDisposable = vscode.commands.registerCommand('clear.run', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.clear')) {
      vscode.window.showErrorMessage('Open a .clear file first')
      return
    }
    const filePath = editor.document.fileName
    const terminal = vscode.window.createTerminal('Clear Run')
    terminal.sendText(`clear run "${filePath}"`)
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
    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Validating Clear file...' }, async () => {
      return new Promise<void>((resolve) => {
        exec(`clear check "${filePath}"`, (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(`Validation failed: ${stderr || stdout}`)
          } else {
            vscode.window.showInformationMessage('✓ Clear file is valid!')
          }
          resolve()
        })
      })
    })
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

    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Building Clear → ${target}...` }, async () => {
      return new Promise<void>((resolve) => {
        exec(`clear build "${filePath}" --target ${target}`, (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(`Build failed: ${stderr}`)
          } else {
            const doc = await vscode.workspace.openTextDocument({ content: stdout })
            vscode.window.showTextDocument(doc)
          }
          resolve()
        })
      })
    })
  })

  context.subscriptions.push(runDisposable, checkDisposable, buildDisposable)
}

export function deactivate() {}
