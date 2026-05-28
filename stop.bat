@echo off
setlocal
title Pulse - Stop Servers
cd /d "%~dp0"

echo Stopping Pulse servers...

taskkill /FI "WINDOWTITLE eq Pulse-Backend*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq Pulse-Frontend*" /F /T >nul 2>&1

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%a /F >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\scripts\startup\pulse-cleanup.ps1"

echo Done. You can run start.bat again safely.
ping 127.0.0.1 -n 4 >nul
