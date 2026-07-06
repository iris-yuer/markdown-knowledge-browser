/**
 * Electron 主进程
 * 职责：
 * 1. 创建窗口
 * 2. 读取本地文件（md/mp4/jpeg）
 * 3. 监听文件夹变化（实时同步）
 * 4. 与前端通过 IPC 通信
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

let mainWindow = null;
const watchers = new Map(); // path -> fs.FSWatcher

/* ========================================================== */
/* 窗口管理                                                     */
/* ========================================================== */

function createWindow() {
  // macOS：使用原生标题栏样式（显示交通灯按钮）
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: '🐟 鱼儿知识库浏览器',
    backgroundColor: '#1e1e1e',
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',     // macOS 原生标题栏 + 内容区可扩展到按钮区域
      trafficLightPosition: { x: 12, y: 10 },
    } : {
      icon: path.join(__dirname, app.isPackaged ? 'icon.ico' : '../icon.ico'),
      autoHideMenuBar: true,
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  // 菜单栏：macOS 保留菜单，Windows 隐藏
  if (isMac) {
    setupMacMenu();
  } else {
    mainWindow.setMenuBarVisibility(false);
  }

  // 打包后 index.html 在 app/ 文件夹内，开发时在上一级
  const htmlPath = app.isPackaged
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, '..', 'index.html');
  mainWindow.loadFile(htmlPath);

  // 窗口关闭时清理所有 watcher
  mainWindow.on('closed', () => {
    stopAllWatchers();
    mainWindow = null;
  });
}

function stopAllWatchers() {
  watchers.forEach(watcher => {
    try { watcher.close(); } catch (e) {}
  });
  watchers.clear();
}

// macOS 菜单栏
function setupMacMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: '关于 鱼儿知识库浏览器' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ]
    },
    {
      label: '文件',
      submenu: [
        {
          label: '选择本地文件夹',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-select-folder');
            }
          }
        },
        { type: 'separator' },
        { role: 'close', label: '关闭窗口' },
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'front', label: '全部置于顶层' },
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 鱼儿知识库浏览器',
          click: async () => {
            await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 鱼儿知识库浏览器',
              message: '🐟 鱼儿知识库浏览器',
              detail: `版本: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\n平台: macOS\n\n作者：鱼儿小姐\n公众号：鱼儿AI商业谈`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  console.log('✅ 鱼儿知识库浏览器 Electron 主进程启动成功');
  console.log(`   🖥️  平台: ${process.platform} ${process.arch}`);
  console.log(`   ⚡ Electron: ${process.versions.electron}`);
  if (process.platform === 'darwin') {
    console.log('   🍎 macOS 原生菜单已启用');
  }

  app.on('activate', () => {
    // macOS: 点击 Dock 图标时恢复窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.show();
        win.focus();
      }
    }
  });
});

app.on('window-all-closed', () => {
  // macOS: 不退出（符合 macOS 惯例），其他平台退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAllWatchers();
});

/* ========================================================== */
/* IPC: 文件夹操作                                              */
/* ========================================================== */

// 1. 选择文件夹对话框
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择知识库文件夹'
  });
  return result.canceled ? null : result.filePaths[0];
});

// 2. 递归读取文件夹中的所有 md 文件
ipcMain.handle('read-folder', async (event, folderPath) => {
  try {
    const data = await readFolderRecursive(folderPath);
    return { success: true, data, path: folderPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function readFolderRecursive(folderPath, depth = 0, maxDepth = 5) {
  // 返回树形结构: { name, type, children, fullPath, ... }
  const result = { name: path.basename(folderPath), type: 'folder', path: folderPath, children: [] };

  let entries;
  try {
    entries = await fsp.readdir(folderPath, { withFileTypes: true });
  } catch (err) {
    return result;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      // 递归读取子文件夹（限制深度）
      if (depth < maxDepth) {
        const subTree = await readFolderRecursive(fullPath, depth + 1, maxDepth);
        if (subTree.children.length > 0) {
          result.children.push(subTree);
        }
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const fileType = getFileType(ext);

      const fileNode = {
        name: entry.name,
        type: 'file',
        fileType: fileType,
        fullPath: fullPath,
        ext: ext,
        size: 0
      };

      // md 文件读取内容
      if (fileType === 'md') {
        try {
          const content = await fsp.readFile(fullPath, 'utf-8');
          fileNode.content = content;
          const stats = await fsp.stat(fullPath);
          fileNode.size = stats.size;
          fileNode.mtime = stats.mtimeMs;
        } catch (e) {}
      } else if (fileType === 'image' || fileType === 'video') {
        try {
          const stats = await fsp.stat(fullPath);
          fileNode.size = stats.size;
          fileNode.mtime = stats.mtimeMs;
        } catch (e) {}
      }

      result.children.push(fileNode);
    }
  }

  // 排序：文件夹在前，文件在后，按名称
  result.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  return result;
}

function getFileType(ext) {
  const map = {
    '.md': 'md', '.markdown': 'md',
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image',
    '.gif': 'image', '.webp': 'image', '.svg': 'image', '.bmp': 'image',
    '.mp4': 'video', '.webm': 'video', '.mov': 'video', '.avi': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
    '.pdf': 'pdf',
    '.txt': 'text', '.json': 'text', '.js': 'text', '.ts': 'text',
    '.css': 'text', '.html': 'text',
    '.png.jpg': 'image', // fallback
  };
  return map[ext] || 'other';
}

// 3. 读取单个文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/* ========================================================== */
/* IPC: 媒体文件（图片/视频）                                   */
/* ========================================================== */

// 4. 读取图片为 base64（用于 markdown 中的本地图片）
ipcMain.handle('read-media', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const stats = await fsp.stat(filePath);
    const buffer = await fsp.readFile(filePath);
    const base64 = buffer.toString('base64');

    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.webm': 'video/webm',
      '.mov': 'video/quicktime', '.avi': 'video/x-msvideo'
    };

    const mime = mimeTypes[ext] || 'application/octet-stream';
    return {
      success: true,
      dataUrl: `data:${mime};base64,${base64}`,
      size: stats.size,
      ext: ext
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/* ========================================================== */
/* IPC: 实时同步（fs.watch）                                    */
/* ========================================================== */

// 5. 开始监听文件夹
ipcMain.handle('watch-folder', async (event, folderPath) => {
  try {
    // 如果已经在监听，先停止
    stopWatcher(folderPath);

    const watcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // 只关心 md 文件变化
      if (!filename.endsWith('.md') && !filename.includes('.')) return;

      // 通知渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('folder-changed', {
          path: folderPath,
          type: eventType,
          filename: filename,
          timestamp: Date.now()
        });
      }
    });

    watcher.on('error', (err) => {
      console.error(`监听错误：${folderPath}`, err);
    });

    watchers.set(folderPath, watcher);
    return { success: true, watching: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 6. 停止监听
ipcMain.handle('unwatch-folder', async (event, folderPath) => {
  stopWatcher(folderPath);
  return { success: true };
});

function stopWatcher(folderPath) {
  const watcher = watchers.get(folderPath);
  if (watcher) {
    try { watcher.close(); } catch (e) {}
    watchers.delete(folderPath);
  }
}

// 7. 获取监听列表
ipcMain.handle('watchers-list', async () => {
  return Array.from(watchers.keys());
});

/* ========================================================== */
/* IPC: 系统信息                                                */
/* ========================================================== */

ipcMain.handle('get-platform', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node
  };
});

ipcMain.handle('show-file', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

// macOS 菜单触发的选择文件夹
ipcMain.handle('menu-select-folder-ipc', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择知识库文件夹'
    });
    return result.canceled ? { canceled: true } : { path: result.filePaths[0] };
  } catch (error) {
    return { error: error.message };
  }
});

// 9. （新）一步到位：打开对话框 + 读取文件
ipcMain.handle('select-and-read', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择知识库文件夹'
    });
    if (result.canceled) return { success: false, canceled: true };

    const folderPath = result.filePaths[0];
    console.log('📂 已选择:', folderPath);

    const data = await readFolderRecursive(folderPath);
    return { success: true, data, path: folderPath };
  } catch (error) {
    console.error('❌ select-and-read 失败:', error);
    return { success: false, error: error.message };
  }
});

// 10. （新）读取指定路径（自动加载用）
ipcMain.handle('read-by-path', async (event, folderPath) => {
  try {
    const data = await readFolderRecursive(folderPath);
    return { success: true, data, path: folderPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 【已停用】启动时自动加载小红书生产文件夹（手动模式下不再调用）
/*
function autoLoadXiaohongshu() {
  setTimeout(async () => {
    const xhsPath = path.join(__dirname, '..', '..', '..', '03_创意生产层', '小红书生产');
    console.log('🔄 自动加载:', xhsPath);

    try {
      await fsp.access(xhsPath);
      const data = await readFolderRecursive(xhsPath);
      const folderCount = Object.keys(data).length;
      const fileCount = Object.values(data).reduce((s, a) => s + a.length, 0);
      console.log(`✅ 自动加载成功: ${folderCount} 文件夹, ${fileCount} 文件`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-loaded', {
          success: true, data, path: xhsPath
        });
      }
    } catch (error) {
      console.warn('⚠️ 自动加载失败:', error.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-loaded', {
          success: false, error: error.message
        });
      }
    }
  }, 500); // 窗口加载完成后 500ms 启动自动加载
}
*/

// 8. 读取固定路径测试（用来验证完整 IPC 链路）
ipcMain.handle('test-read-path', async (event, folderPath) => {
  try {
    console.log('🧪 测试读取路径:', folderPath);
    const data = await readFolderRecursive(folderPath);
    const folderCount = Object.keys(data).length;
    const fileCount = Object.values(data).reduce((s, a) => s + a.length, 0);
    console.log(`🧪 读取结果: ${folderCount} 文件夹, ${fileCount} 文件`);
    return {
      success: true,
      folderCount,
      fileCount,
      folders: Object.keys(data),
      sampleFile: fileCount > 0 ? `${Object.keys(data)[0]}/${data[Object.keys(data)[0]][0].name}` : '无'
    };
  } catch (error) {
    console.error('🧪 读取失败:', error);
    return { success: false, error: error.message };
  }
});