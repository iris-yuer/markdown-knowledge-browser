const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronDir = __dirname;
const projectDir = path.join(electronDir, '..');

console.log('📦 开始打包...\n');

// 1. 拷贝文件（缺失的文件自动跳过）
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

// 2. 运行打包
console.log('🔨 运行 electron-packager...\n');
execSync('npx electron-packager . "鱼儿知识库浏览器" --platform=win32 --arch=x64 --out=../dist --overwrite --no-prune', {
  cwd: electronDir,
  stdio: 'inherit'
});

// 3. 清理
console.log('\n🧹 清理临时文件...');
try { fs.unlinkSync(path.join(electronDir, 'index.html')); } catch(e) {}
try { fs.unlinkSync(path.join(electronDir, 'data.js')); } catch(e) {}
try { fs.unlinkSync(path.join(electronDir, 'logo.png')); } catch(e) {}
try { fs.unlinkSync(path.join(electronDir, 'favicon.png')); } catch(e) {}
try { fs.unlinkSync(path.join(electronDir, 'icon.ico')); } catch(e) {}
console.log('   ✅ 清理完成');

console.log('\n✅ 打包完成！');
console.log(`📁 双击 → ${path.join(projectDir, 'dist', '鱼儿知识库浏览器-win32-x64', '🐟 启动浏览器.bat')}`);
