import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import icon from '../../resources/icon.png?asset'
import { PipelineManager } from './pipeline-manager'

// Initialize logging: writes to ~/Library/Logs (macOS), %APPDATA%/logs (Windows), ~/.config/logs (Linux)
log.initialize()

let manager: PipelineManager | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: 'EFES-NG Prototype',
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  manager = new PipelineManager(mainWindow)
}

// --- IPC handlers ---

ipcMain.handle('pipeline:open-project', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Pipeline Project Directory'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return manager!.openProject(result.filePaths[0])
})

ipcMain.handle('pipeline:open-project-dir', async (_e, dir: string) => {
  return manager!.openProject(dir)
})

ipcMain.handle('pipeline:watch', async () => {
  return manager!.startWatch()
})

ipcMain.handle('pipeline:cancel', async () => {
  return manager!.cancelBuild()
})

ipcMain.handle('pipeline:stop-watch', async () => {
  return manager!.stopWatch()
})

ipcMain.handle('pipeline:clean', async () => {
  return manager!.clean()
})

ipcMain.handle('pipeline:open-node-output', async (_e, nodeName: string) => {
  const dir = manager!.getNodeOutputDir(nodeName)
  if (dir && fs.existsSync(dir)) {
    await shell.openPath(dir)
  }
})

ipcMain.handle('pipeline:node-output-exists', (_e, nodeName: string) => {
  const dir = manager!.getNodeOutputDir(nodeName)
  return dir ? fs.existsSync(dir) : false
})

ipcMain.handle('pipeline:get-node-info', (_e, nodeName: string) => {
  return manager!.getNodeInfo(nodeName)
})

// --- Export handler ---

ipcMain.handle('pipeline:export', async (_e, exportDir: string, pathPrefix: string) => {
  return manager!.exportSite(exportDir, pathPrefix)
})

// --- Scaffold handlers ---

ipcMain.handle('scaffold:get-questions', async () => {
  const { getScaffoldQuestions } = await import('create-efes-ng')
  const scaffoldQuestions = await getScaffoldQuestions()
  return scaffoldQuestions.map((q) => ({
    id: q.id,
    label: q.label,
    type: q.type,
    placeholder: 'placeholder' in q ? q.placeholder : undefined,
    defaultValue: typeof q.defaultValue === 'function' ? undefined : q.defaultValue,
    options: 'options' in q ? q.options : undefined,
    condition: 'condition' in q && q.condition
      ? (() => {
          // Extract condition as [field, value] for simple equality checks
          // The CLI questions use (answers) => answers.field === 'value'
          const src = q.condition!.toString()
          const match = src.match(/answers\.(\w+)\s*===?\s*['"](\w+)['"]/)
          return match ? [match[1], match[2]] : undefined
        })()
      : undefined,
    validate: 'validate' in q && !!q.validate,
  }))
})

ipcMain.handle('scaffold:compute-defaults', async (_e, answers: Record<string, string>) => {
  const { getScaffoldQuestions } = await import('create-efes-ng')
  const scaffoldQuestions = await getScaffoldQuestions()
  const defaults: Record<string, string> = {}
  for (const q of scaffoldQuestions) {
    if (typeof q.defaultValue === 'function') {
      defaults[q.id] = q.defaultValue(answers)
    }
  }
  return defaults
})

ipcMain.handle('scaffold:validate', async (_e, answers: Record<string, string>) => {
  const { getScaffoldQuestions } = await import('create-efes-ng')
  const scaffoldQuestions = await getScaffoldQuestions()
  const errors: Record<string, string> = {}
  for (const q of scaffoldQuestions) {
    if ('validate' in q && q.validate) {
      // Check condition first
      if ('condition' in q && q.condition && !q.condition(answers)) continue
      const error = q.validate(answers[q.id] ?? '')
      if (error) errors[q.id] = error
    }
  }
  return Object.keys(errors).length > 0 ? { errors } : {}
})

ipcMain.handle('scaffold:pick-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Location for New Project',
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('scaffold:create', async (_e, outputDir: string, answers: Record<string, string>) => {
  const { scaffold } = await import('create-efes-ng')
  const projectDir = await scaffold(outputDir, answers as any, {
    onStatus: (msg) => {
      BrowserWindow.getFocusedWindow()?.webContents.send('scaffold:status', msg)
    },
  })
  return projectDir
})

// --- App lifecycle ---

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', async () => {
  await manager?.dispose()
})
