/**
 * macOS 打包脚本
 *
 * 在 macOS 电脑上运行此脚本，将应用打包成 .app 可执行程序
 *
 * 使用方法：
 *   npm run build:mac          （打包 Intel + Apple Silicon 双架构）
 *   npm run build:mac:intel    （仅 Intel x64）
 *   npm run build:mac:silicon  （仅 Apple Silicon arm64）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = __dirname;
const projectDir = path.join(electronDir, '..');

console.log('🍎 开始打包 macOS 版本...\n');

// ==========================================================
// 1. 检查是否在 macOS 上运行
// ==========================================================
if (process.platform !== 'darwin') {
  console.warn('⚠️  当前不在 macOS 系统上！');
  console.warn('   构建 macOS 应用需要在 macOS 电脑上运行此脚本。');
  console.warn('   如果继续，生成的 .app 可能无法正常运行。\n');
}

// ==========================================================
// 2. 检查 electron-packager 是否已安装
// ==========================================================
try {
  require.resolve('electron-packager');
  console.log('✅ electron-packager 已就绪');
} catch (e) {
  console.log('📦 electron-packager 未安装，正在安装...');
  execSync('npm install --save-dev electron-packager', {
    cwd: electronDir,
    stdio: 'inherit'
  });
  console.log('✅ electron-packager 安装完成\n');
}

// ==========================================================
// 3. 拷贝资源文件到 electron/ 目录
// ==========================================================
console.log('📂 拷贝资源文件...');
const filesToCopy = ['index.html', 'data.js', 'logo.png', 'favicon.png'];
filesToCopy.forEach(f => {
  const src = path.join(projectDir, f);
  const dest = path.join(electronDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('   ✅ ' + f);
  } else if (fs.existsSync(dest)) {
    console.log('   ⏭️ ' + f + ' 已在 electron 目录，跳过');
  } else {
    console.warn('   ⚠️ ' + f + ' 未找到，跳过');
  }
});

// ==========================================================
// 4. 生成 macOS 图标（从 logo.png 转 .icns）
// ==========================================================
console.log('\n🎨 生成 macOS 图标...');
const logoPath = path.join(electronDir, 'logo.png');

if (process.platform === 'darwin' && fs.existsSync(logoPath)) {
  // macOS: 用 iconutil 从 PNG 生成 .icns
  const iconsetDir = path.join(electronDir, 'icon.iconset');

  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  const sizes = [
    { size: 16, scale: 1 }, { size: 16, scale: 2 },
    { size: 32, scale: 1 }, { size: 32, scale: 2 },
    { size: 64, scale: 1 }, { size: 64, scale: 2 },
    { size: 128, scale: 1 }, { size: 128, scale: 2 },
    { size: 256, scale: 1 }, { size: 256, scale: 2 },
    { size: 512, scale: 1 }, { size: 512, scale: 2 },
  ];

  // 使用 sips 命令生成不同尺寸（macOS 自带）
  sizes.forEach(({ size, scale }) => {
    const px = size * scale;
    const name = `icon_${size}x${size}${scale === 2 ? `@2x` : ''}.png`;
    const outPath = path.join(iconsetDir, name);
    try {
      execSync(
        `sips -z ${px} ${px} "${logoPath}" --out "${outPath}"`,
        { stdio: 'ignore' }
      );
      console.log(`   ✅ 生成 ${name} (${px}×${px})`);
    } catch (e) {
      console.warn(`   ⚠️ 生成 ${name} 失败`);
    }
  });

  // 用 iconutil 转换成 .icns
  const icnsPath = path.join(electronDir, 'icon.icns');
  try {
    execSync(
      `iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`,
      { stdio: 'ignore' }
    );
    console.log('   ✅ 图标已生成: icon.icns');
  } catch (e) {
    console.warn('   ⚠️ 图标生成失败（不影响打包，将使用默认图标）');
  }

  // 清理临时 iconset 目录
  try {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (e) {}
} else {
  console.log('   ⏭️ 非 macOS 环境或找不到 logo.png，跳过图标生成');
}

// ==========================================================
// 5. 读取命令行参数决定架构
// ==========================================================
const args = process.argv.slice(2);
let arch = 'universal';  // 默认：双架构

if (args.includes('--intel')) {
  arch = 'x64';
} else if (args.includes('--silicon')) {
  arch = 'arm64';
}

console.log(`\n🔨 使用 electron-packager 打包 (${arch === 'universal' ? 'Intel + Apple Silicon 通用' : arch})...\n`);

// ==========================================================
// 6. 执行打包
// ==========================================================
let packagerCmd;
if (arch === 'universal') {
  // 构建通用二进制（同时包含 x64 和 arm64）
  packagerCmd = `npx electron-packager . "鱼儿知识库浏览器" --platform=darwin --arch=x64 --arch=arm64 --out=../dist --overwrite --no-prune --app-bundle-id=com.iris.fish-browser --app-version=1.0.0`;
} else {
  packagerCmd = `npx electron-packager . "鱼儿知识库浏览器" --platform=darwin --arch=${arch} --out=../dist --overwrite --no-prune --app-bundle-id=com.iris.fish-browser --app-version=1.0.0`;
}

// 如果存在图标文件，添加 --icon 参数
const icnsCheck = path.join(electronDir, 'icon.icns');
if (fs.existsSync(icnsCheck)) {
  packagerCmd += ` --icon="${icnsCheck}"`;
} else {
  console.log('   ℹ️  未找到 icon.icns，将使用 Electron 默认图标');
}

try {
  execSync(packagerCmd, {
    cwd: electronDir,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('\n❌ 打包失败:', error.message);
  cleanupTempFiles();
  process.exit(1);
}

// ==========================================================
// 7. 清理临时文件
// ==========================================================
cleanupTempFiles();

// ==========================================================
// 8. 创建 macOS 启动脚本（放入 dist 目录）
// ==========================================================
console.log('\n📝 创建 macOS 启动脚本...');
const distDir = path.join(projectDir, 'dist');
const appFolders = fs.readdirSync(distDir).filter(f => f.endsWith('.app') || f.includes('darwin'));

if (appFolders.length > 0) {
  const appFolder = appFolders[0];
  const appPath = path.join(distDir, appFolder);

  const launchScript = `#!/bin/bash
# 鱼儿知识库浏览器 - macOS 启动脚本
# 如果应用在 "应用程序" 文件夹中，用下面命令启动：
APP_PATH="$(cd "$(dirname "$0")"; pwd)/${appFolder}"
if [ -d "$APP_PATH" ]; then
  echo "🚀 正在启动鱼儿知识库浏览器..."
  open "$APP_PATH"
else
  echo "❌ 未找到应用: ${appFolder}"
  echo "请确认脚本在 dist/ 目录中运行"
  exit 1
fi
`;

  const launchScriptPath = path.join(distDir, '🐟 启动浏览器.command');
  fs.writeFileSync(launchScriptPath, launchScript, 'utf-8');
  try {
    // 添加可执行权限（macOS 需要）
    fs.chmodSync(launchScriptPath, '755');
    console.log(`   ✅ ${path.relative(projectDir, launchScriptPath)}`);
  } catch (e) {
    console.log('   ⚠️ 无法设置可执行权限（Windows 跨平台限制）');
  }
}

console.log('\n' + '='.repeat(50));
console.log('✅ macOS 打包完成！');
console.log('='.repeat(50));
console.log(`\n📁 .app 位置:`);
appFolders.forEach(f => {
  console.log(`   ${path.join(distDir, f)}`);
});
console.log(`\n💡 使用方法:`);
console.log(`   1. 打开 ${path.join(projectDir, 'dist')} 目录`);
console.log(`   2. 将 .app 拖入「应用程序」文件夹`);
console.log(`   3. 首次打开需要右键 → 打开（绕过 Gatekeeper）`);
console.log(`\n📦 如需制作 .dmg 安装包，运行:`);
console.log(`   npm run build:dmg`);
console.log();

// ==========================================================
// 清理函数
// ==========================================================
function cleanupTempFiles() {
  console.log('\n🧹 清理临时文件...');
  filesToCopy.forEach(f => {
    try { fs.unlinkSync(path.join(electronDir, f)); } catch(e) {}
  });
  try { fs.unlinkSync(path.join(electronDir, 'icon.icns')); } catch(e) {}
  console.log('   ✅ 清理完成');
}
