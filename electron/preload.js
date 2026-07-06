/**
 * Electron 预加载脚本
 * 安全地暴露 Node API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /* ========================================================== */
  /* 文件夹操作                                                  */
  /* ========================================================== */

  // 选择文件夹
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 递归读取文件夹
  readFolder: (folderPath) => ipcRenderer.invoke('read-folder', folderPath),

  // 读取单个文件
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  /* ========================================================== */
  /* (新) 一步到位和自动加载                                      */
  /* ========================================================== */

  // 打开对话框 + 读取文件
  selectAndRead: () => ipcRenderer.invoke('select-and-read'),

  // 读取指定路径（自动加载用）
  readByPath: (folderPath) => ipcRenderer.invoke('read-by-path', folderPath),

  // 监听自动加载事件
  onAutoLoaded: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auto-loaded', handler);
    return () => ipcRenderer.removeListener('auto-loaded', handler);
  },

  // macOS 菜单栏「选择本地文件夹」监听
  onMenuSelectFolder: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-select-folder', handler);
    return () => ipcRenderer.removeListener('menu-select-folder', handler);
  },

  // macOS 菜单触发的选择文件夹
  menuSelectFolderIPC: () => ipcRenderer.invoke('menu-select-folder-ipc'),

  /* ========================================================== */
  /* 媒体文件                                                   */
  /* ========================================================== */

  // 读取图片/视频为 base64 data URL
  readMedia: (filePath) => ipcRenderer.invoke('read-media', filePath),

  /* ========================================================== */
  /* 实时同步                                                   */
  /* ========================================================== */

  // 开始监听文件夹
  watchFolder: (folderPath) => ipcRenderer.invoke('watch-folder', folderPath),

  // 停止监听
  unwatchFolder: (folderPath) => ipcRenderer.invoke('unwatch-folder', folderPath),

  // 监听文件夹变化事件
  onFolderChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('folder-changed', handler);
    return () => ipcRenderer.removeListener('folder-changed', handler);
  },

  /* ========================================================== */
  /* 系统                                                       */
  /* ========================================================== */

  // 获取平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // 在文件管理器中显示文件
  showInFolder: (filePath) => ipcRenderer.invoke('show-file', filePath),

  /* ========================================================== */
  /* 环境检测                                                   */
  /* ========================================================== */

  // 是否在 Electron 环境
  isElectron: true
});

console.log('✅ preload.js 加载完成 - 鱼儿知识库浏览器 Electron 版');