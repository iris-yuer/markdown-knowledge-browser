@echo off
chcp 65001 >nul

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ 未检测到 Node.js！
  echo 请安装：https://nodejs.org/
  pause
  exit /b 1
)

REM 安装依赖（如果还没装）
if not exist "node_modules" (
  echo 📦 首次运行，安装依赖中（约 1-2 分钟）...
  call npm install
  if %errorlevel% neq 0 (
    echo ❌ 安装失败！
    pause
    exit /b 1
  )
)

REM 启动应用
echo 🚀 正在启动...
call npm start
