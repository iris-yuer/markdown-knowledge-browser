/**
 * macOS DMG 安装包制作脚本
 *
 * 在 macOS 上使用 electron-builder 制作 .dmg 安装包
 * 用户双击 .dmg 即可将应用拖入「应用程序」文件夹
 *
 * 使用方法：
 *   npm run build:dmg
 *
 * 前置条件：
 *   先运行 npm run build:mac 生成 .app，再制作 DMG
 *   或者直接运行此脚本（会先打包 .app 再制作 DMG）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = __dirname;
const projectDir = path.join(electronDir, '..');

console.log('📦 开始制作 macOS DMG 安装包...\n');

// ==========================================================
// 1. 检查是否在 macOS 上运行
// ==========================================================
if (process.platform !== 'darwin') {
  console.error('❌ 制作 DMG 安装包必须在 macOS 上运行！');
  process.exit(1);
}

// ==========================================================
// 2. 检查 electron-builder 是否已安装
// ==========================================================
try {
  require.resolve('electron-builder');
  console.log('✅ electron-builder 已就绪');
} catch (e) {
  console.log('📦 electron-builder 未安装，正在安装...');
  execSync('npm install --save-dev electron-builder', {
    cwd: electronDir,
    stdio: 'inherit'
  });
  console.log('✅ electron-builder 安装完成\n');
}

// ==========================================================
// 3. 拷贝资源文件
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
    console.log('   ⏭️ ' + f + ' 已存在');
  } else {
    console.warn('   ⚠️ ' + f + ' 未找到');
  }
});

// ==========================================================
// 4. 检查 logo.png 并生成临时 .icns
// ==========================================================
const logoPath = path.join(electronDir, 'logo.png');
if (fs.existsSync(logoPath)) {
  console.log('\n🎨 检查图标文件...');
  const iconsetDir = path.join(electronDir, 'mac-icon.iconset');

  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  const sizes = [
    { size: 16, scale: 1 }, { size: 16, scale: 2 },
    { size: 32, scale: 1 }, { size: 32, scale: 2 },
    { size: 128, scale: 1 }, { size: 128, scale: 2 },
    { size: 256, scale: 1 }, { size: 256, scale: 2 },
    { size: 512, scale: 1 }, { size: 512, scale: 2 },
  ];

  sizes.forEach(({ size, scale }) => {
    const px = size * scale;
    const name = `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
    const outPath = path.join(iconsetDir, name);
    try {
      execSync(`sips -z ${px} ${px} "${logoPath}" --out "${outPath}"`, {
        stdio: 'ignore'
      });
    } catch (e) {
      // 忽略单个尺寸失败
    }
  });

  const icnsPath = path.join(electronDir, 'icon.icns');
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, {
      stdio: 'ignore'
    });
    console.log('   ✅ icon.icns 已生成');
  } catch (e) {
    console.warn('   ⚠️ icon.icns 生成失败');
  }

  try {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (e) {}
}

// ==========================================================
// 5. 配置 electron-builder 参数
// ==========================================================
console.log('\n📝 准备 DMG 配置...');

// 创建临时 electron-builder 配置文件
const builderConfig = {
  appId: 'com.iris.fish-browser',
  productName: '鱼儿知识库浏览器',
  directories: {
    output: '../dist'
  },
  mac: {
    category: 'public.app-category.productivity',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] }
    ],
    artifactName: '${productName}-mac-${arch}.${ext}',
    icon: fs.existsSync(path.join(electronDir, 'icon.icns'))
      ? path.join(electronDir, 'icon.icns')
      : undefined
  },
  dmg: {
    title: '鱼儿知识库浏览器',
    background: null,
    icon: fs.existsSync(path.join(electronDir, 'logo.png'))
      ? path.join(electronDir, 'logo.png')
      : undefined,
    contents: [
      { x: 130, y: 220, type: 'file' },
      { x: 410, y: 220, type: 'link', path: '/Applications' }
    ],
    window: {
      width: 540,
      height: 380
    }
  }
};

// 写入临时配置文件
const configPath = path.join(electronDir, 'electron-builder-mac.yml');
const yamlContent = `appId: ${builderConfig.appId}
productName: "${builderConfig.productName}"
directories:
  output: ${builderConfig.directories.output}
mac:
  category: ${builderConfig.mac.category}
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  artifactName: "${builderConfig.mac.artifactName}"
${builderConfig.mac.icon ? `  icon: "${builderConfig.mac.icon}"` : ''}
dmg:
  title: "${builderConfig.dmg.title}"
  contents:
    - x: 130
      y: 220
      type: file
    - x: 410
      y: 220
      type: link
      path: /Applications
  window:
    width: 540
    height: 380
`;

fs.writeFileSync(configPath, yamlContent, 'utf-8');
console.log('   ✅ 配置文件已生成');

// ==========================================================
// 6. 执行 DMG 构建
// ==========================================================
console.log('\n🔨 开始构建 DMG...\n');
console.log('⏳ 首次构建约需 3-5 分钟...\n');

try {
  execSync('npx electron-builder --mac --config electron-builder-mac.yml', {
    cwd: electronDir,
    stdio: 'inherit'
  });
  console.log('\n✅ DMG 构建完成！');
} catch (error) {
  console.error('\n❌ DMG 构建失败:', error.message);
  cleanupTempFiles();
  process.exit(1);
}

// ==========================================================
// 7. 清理
// ==========================================================
cleanupTempFiles();

// ==========================================================
// 8. 输出结果
// ==========================================================
console.log('\n' + '='.repeat(50));
console.log('✅ macOS DMG 安装包制作完成！');
console.log('='.repeat(50));

const distDir = path.join(projectDir, 'dist');
if (fs.existsSync(distDir)) {
  const dmgFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.dmg'));
  console.log('\n📁 生成的 DMG 文件:');
  dmgFiles.forEach(f => {
    const filePath = path.join(distDir, f);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`   ✅ ${f}  (${sizeMB} MB)`);
  });

  console.log(`\n📦 位置: ${distDir}`);
  console.log(`\n💡 用户安装方法:`);
  console.log(`   1. 双击 .dmg 文件`);
  console.log(`   2. 将「鱼儿知识库浏览器」拖入「应用程序」文件夹`);
  console.log(`   3. 首次打开需要右键 → 打开（绕过 Gatekeeper）`);
}
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
  try { fs.unlinkSync(path.join(electronDir, 'electron-builder-mac.yml')); } catch(e) {}
  try { fs.unlinkSync(path.join(electronDir, 'electron-builder-mac.yml')); } catch(e) {}
  console.log('   ✅ 清理完成');
}
