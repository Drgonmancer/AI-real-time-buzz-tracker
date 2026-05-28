@echo off
setlocal
cd /d "%~dp0"
title Pulse-Backend
npm run dev
echo.
echo Backend stopped.
pause
