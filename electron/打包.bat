@echo off
chcp 65001 >nul
title 鱼儿知识库浏览器 - 打包工具

echo.
echo ========================================
echo    🐟 鱼儿知识库浏览器 - 打包工具
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ 未检测到 Node.js！
  echo 请先安装 Node.js：https://nodejs.org/
  pause
  exit /b 1
)

REM 检查依赖
if not exist "node_modules" (
  echo 📦 首次运行，正在安装依赖...
  call npm install
  if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败！
    pause
    exit /b 1
  )
)

echo.
echo 📦 开始打包成 .exe ...
echo ⏳ 首次打包约需 3-5 分钟，请耐心等待
echo.
call npm run build

if %errorlevel% neq 0 (
  echo.
  echo ❌ 打包失败！请将错误信息发给开发者。
  pause
  exit /b 1
)

echo.
echo ========================================
echo ✅ 打包完成！
echo ========================================
echo.
echo 📂 .exe 文件位置：..\dist\
echo.
echo 双击 dist 目录下的 .exe 文件即可安装使用
echo.
pause