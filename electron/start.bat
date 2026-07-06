@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js not found! Install from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if %errorlevel% neq 0 ( pause & exit /b 1 )
)
echo Launching...
call npm start
