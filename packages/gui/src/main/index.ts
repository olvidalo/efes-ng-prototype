import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { PipelineManager } from './pipeline-manager'

let manager: PipelineManager | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: 'EFES-NG',
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
