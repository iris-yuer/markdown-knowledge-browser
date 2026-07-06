#!/bin/bash
# ============================================
#  🐟 鱼儿知识库浏览器 · macOS 一键启动
# ============================================
#  双击此文件即可启动（.command 文件）
#  如果弹出安全提示，请去 系统设置 → 隐私与安全性 → 仍要打开
# ============================================

# 获取脚本所在目录
DIR="$(cd "$(dirname "$0")"; pwd)"
cd "$DIR" || exit 1

echo "============================================"
echo "  🐟 鱼儿知识库浏览器"
echo "============================================"
echo ""

# ============================================
# 1. 检测 Node.js
# ============================================
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js！"
  echo ""
  echo "请访问 https://nodejs.org/ 下载安装"
  echo "建议选择 LTS（长期支持）版本"
  echo ""
  echo "💡 安装 Homebrew 后也可以这样安装："
  echo "   brew install node"
  echo ""
  read -p "按 Enter 键退出..."
  exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js $NODE_VER"

# ============================================
# 2. 检测 npm
# ============================================
if ! command -v npm &> /dev/null; then
  echo "❌ 未检测到 npm！"
  read -p "按 Enter 键退出..."
  exit 1
fi

echo "✅ npm $(npm -v)"
echo ""

# ============================================
# 3. 安装依赖（首次运行）
# ============================================
if [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在安装依赖..."
  echo "⏳ 约需 1-2 分钟，请稍候..."
  echo ""
  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 依赖安装失败！"
    echo "请检查网络连接后重试"
    read -p "按 Enter 键退出..."
    exit 1
  fi
  echo "✅ 依赖安装完成"
  echo ""
fi

# ============================================
# 4. 启动应用
# ============================================
echo "🚀 正在启动..."
echo "💡 提示：应用启动后可以关闭此窗口"
echo ""

# macOS 下使用 open 让应用获得焦点
npm start &

# 等待一会儿后检查是否成功启动
sleep 3

# 检查是否有 Electron 进程在运行
if pgrep -f "Electron" > /dev/null 2>&1; then
  echo "✅ 启动成功！"
else
  echo "⚠️  如果应用没有弹出，请检查终端中的错误信息"
fi

# 延迟自动关闭终端（给用户看状态的时间）
osascript -e 'tell application "Terminal" to delay 3' > /dev/null 2>&1
