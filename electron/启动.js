// 鱼儿知识库浏览器 · 一键启动
// 双击此文件即可启动（不需要任何黑窗口）

const { spawn } = require('child_process');
const path = require('path');

// 获取当前目录
const dir = __dirname;

// 启动 Electron（不显示控制台窗口）
const child = spawn('npm.cmd', ['start'], {
  cwd: dir,
  stdio: 'ignore',
  windowsHide: true,
  detached: true
});

child.unref();
