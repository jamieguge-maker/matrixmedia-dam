/* eslint-disable no-case-declarations */
import { dialog } from 'electron'
import path from 'path'

function safeSend(mainWindow, channel, ...args) {
  try {
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.webContents &&
      !mainWindow.webContents.isDestroyed()
    ) {
      mainWindow.webContents.send(channel, ...args)
    }
  } catch (_) {
    // 窗口已关闭或正在退出时忽略
  }
}

export default {
  download(mainWindow, downloadUrL, options = {}) {
    if (
      !mainWindow ||
      mainWindow.isDestroyed() ||
      !mainWindow.webContents ||
      mainWindow.webContents.isDestroyed()
    ) {
      return
    }
    mainWindow.webContents.session.once('will-download', (event, item) => {
      const filePath = path.join(require('electron').app.getPath('downloads'), item.getFilename())
      item.setSavePath(filePath)
      let resumeAttempts = 0
      let resumePending = false
      let finished = false
      const updateStatus = (state, details = {}) => {
        if (options.damUpdate) {
          safeSend(mainWindow, 'dam-update-download-status', { state, ...details })
        }
      }
      const failDownload = () => {
        if (finished) return
        finished = true
        if (options.damUpdate) {
          updateStatus('interrupted')
        } else {
          safeSend(mainWindow, 'download-paused', true)
          dialog.showErrorBox('下载出错', '由于网络或其他未知原因导致下载出错.')
        }
      }
      const retryOrFail = () => {
        if (finished || resumePending) return
        if (item.canResume() && resumeAttempts < 3) {
          resumeAttempts += 1
          resumePending = true
          updateStatus('retrying', { attempt: resumeAttempts, maxAttempts: 3 })
          setTimeout(() => {
            resumePending = false
            if (finished) return
            try {
              item.resume()
            } catch (_) {
              retryOrFail()
            }
          }, resumeAttempts * 1000)
          return
        }
        failDownload()
      }
      item.on('updated', (event, state) => {
        switch (state) {
          case 'progressing': {
            const total = item.getTotalBytes()
            const pct =
              total > 0
                ? ((item.getReceivedBytes() / total) * 100).toFixed(0)
                : '0'
            safeSend(mainWindow, 'download-progress', pct)
            updateStatus('progress', { percentage: Number(pct) })
            break
          }
          case 'interrupted':
            retryOrFail()
            break
          case 'cancelled':
            failDownload()
            break
          default:
            break
        }
      })
      item.on('done', (event, state) => {
        switch (state) {
          case 'completed':
            if (finished) return
            finished = true
            safeSend(mainWindow, 'download-done', { filePath })
            updateStatus('completed')
            break
          case 'interrupted':
            retryOrFail()
            break
          default:
            break
        }
      })
    })
    mainWindow.webContents.downloadURL(downloadUrL)
  }
}
