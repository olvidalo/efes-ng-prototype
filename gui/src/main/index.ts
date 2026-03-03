import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { PipelineManager } from './pipeline-manager'

let manager: PipelineManager | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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

ipcMain.handle('pipeline:build', async () => {
  return manager!.build()
})

ipcMain.handle('pipeline:watch', async () => {
  return manager!.startWatch()
})

ipcMain.handle('pipeline:stop-watch', async () => {
  return manager!.stopWatch()
})

ipcMain.handle('pipeline:clean', async () => {
  return manager!.clean()
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await manager?.dispose()
})
