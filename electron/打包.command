#!/bin/bash
# ============================================
#  🐟 鱼儿知识库浏览器 · macOS 打包工具
# ============================================
#  一键打包成 macOS .app 可执行程序
#  制作完成后可以直接分发给其他 Mac 用户
# ============================================

DIR="$(cd "$(dirname "$0")"; pwd)"
cd "$DIR" || exit 1

clear
echo "============================================"
echo "  🐟 鱼儿知识库浏览器 - macOS 打包工具"
echo "============================================"
echo ""

# ============================================
# 1. 检测 Node.js
# ============================================
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js！请先安装：https://nodejs.org/"
  read -p "按 Enter 键退出..."
  exit 1
fi
echo "✅ Node.js $(node -v)"

# ============================================
# 2. 检测依赖
# ============================================
if [ ! -d "node_modules" ]; then
  echo "📦 正在安装依赖..."
  npm install
  if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    read -p "按 Enter 键退出..."
    exit 1
  fi
  echo "✅ 依赖安装完成"
fi
echo ""

# ============================================
# 3. 选择打包架构
# ============================================
echo "请选择打包架构："
echo ""
echo "  1) 🖥️  通用版（Intel + Apple Silicon）✅ 推荐"
echo "  2) 💻 Intel 芯片（x64）"
echo "  3) 🍎 Apple 芯片（M1/M2/M3/M4）"
echo "  4) 📦 DMG 安装包（拖入应用程序文件夹）"
echo ""
read -p "请输入数字 (1-4，默认 1）：" CHOICE

case "${CHOICE:-1}" in
  1)
    echo ""
    echo "🔨 开始打包通用版..."
    echo "⏳ 约需 3-5 分钟，请耐心等待..."
    echo ""
    npm run build:mac
    ;;
  2)
    echo ""
    echo "🔨 开始打包 Intel 版..."
    npm run build:mac:intel
    ;;
  3)
    echo ""
    echo "🔨 开始打包 Apple Silicon 版..."
    npm run build:mac:silicon
    ;;
  4)
    echo ""
    echo "📦 开始制作 DMG 安装包..."
    echo "⏳ 约需 5-8 分钟..."
    echo ""
    npm run build:dmg
    ;;
  *)
    echo "❌ 无效选项"
    read -p "按 Enter 键退出..."
    exit 1
    ;;
esac

# ============================================
# 4. 检查打包结果
# ============================================
if [ $? -eq 0 ]; then
  echo ""
  echo "============================================"
  echo "  ✅ 打包完成！"
  echo "============================================"
  echo ""

  # 显示生成的 .app 文件
  DIST_DIR="$DIR/../dist"
  if [ -d "$DIST_DIR" ]; then
    echo "📁 输出目录：$DIST_DIR"
    echo ""
    echo "📦 生成的文件："
    ls -lh "$DIST_DIR" | grep -v "^total" | grep -v "^d" | awk '{print "   " $NF "  (" $5 ")"}'
    ls -d "$DIST_DIR"/*.app 2>/dev/null | while read app; do
      APP_NAME=$(basename "$app")
      APP_SIZE=$(du -sh "$app" | cut -f1)
      echo "   📱 $APP_NAME  ($APP_SIZE)"
    done
    echo ""
    echo "💡 分发方法："
    echo "   1. 压缩 .app 文件为 .zip"
    echo "   2. 发给其他 Mac 用户"
    echo "   3. 对方解压后拖入「应用程序」文件夹"
    echo ""
    echo "   或运行 build:dmg 制作安装包"
  fi
else
  echo ""
  echo "❌ 打包失败，请检查上方错误信息"
fi

echo ""
read -p "按 Enter 键退出..."
