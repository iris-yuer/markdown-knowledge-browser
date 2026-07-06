const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = __dirname;
const projectDir = path.join(electronDir, '..');

console.log('📦 制作安装包...\n');

// 1. 拷贝所有文件到 electron/ 目录（缺失的自动跳过）
console.log('📂 拷贝资源文件...');
const filesToCopy = ['index.html', 'data.js', 'logo.png', 'favicon.png', 'icon.ico'];
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

// 2. 用 electron-builder 制作安装包
console.log('\n🔨 运行 electron-builder (NSIS 安装包)...\n');
console.log('⏳ 首次约需 2-3 分钟...\n');

execSync('npx electron-builder --win --x64', {
  cwd: electronDir,
  stdio: 'inherit'
});

// 3. 清理临时文件
console.log('\n🧹 清理临时文件...');
filesToCopy.forEach(f => {
  try { fs.unlinkSync(path.join(electronDir, f)); } catch(e) {}
});
console.log('   ✅ 清理完成');

console.log('\n✅ 制作完成！');
console.log('📁 安装包位置:');
console.log(path.join(projectDir, 'dist', '鱼儿知识库浏览器 Setup 1.0.0.exe'));
console.log('\n💡 发给别人，双击安装即可使用！');
