@echo off
setlocal
cd /d "%~dp0"
title Pulse-Frontend
npm run dev
echo.
echo Frontend stopped.
pause
