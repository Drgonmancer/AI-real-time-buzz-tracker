@echo off
setlocal
title Pulse - AI Hot Topic Monitor

echo ========================================
echo   Pulse AI Hot Topic Monitor - Startup
echo ========================================
echo.

cd /d "%~dp0"
set "ROOT=%~dp0"
set "SERVER_DIR=%ROOT%server"
set "CLIENT_DIR=%ROOT%client"
set "LOG=%ROOT%startup.log"

echo [%date% %time%] Startup begin > "%LOG%"

call :ResolveNodeTools
if errorlevel 1 goto :FAIL

echo [Step 1] Checking Node.js...
"%NODE_CMD%" --version
call "%NPM_CMD%" --version
if errorlevel 1 (
    echo [ERROR] npm is not working. Check Node.js installation.
    echo [ERROR] npm is not working >> "%LOG%"
    goto :FAIL
)
echo   (Node.js OK)
echo   Node: %NODE_CMD% >> "%LOG%"

echo.
echo [Step 2] Cleaning up stale processes...
echo   Stopping any previous Pulse servers...

taskkill /FI "WINDOWTITLE eq Pulse-Backend*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq Pulse-Frontend*" /F /T >nul 2>&1

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%server\scripts\startup\pulse-cleanup.ps1"
if errorlevel 1 (
    echo   [WARN] cleanup script returned error, continuing...
)

echo   Waiting for file locks to release...
ping 127.0.0.1 -n 5 >nul
echo   (Cleanup OK)

echo.
echo [Step 3] Setting up backend...
cd /d "%SERVER_DIR%"

if not exist ".env" (
    if exist ".env.example" (
        echo   Creating .env from .env.example...
        copy /Y ".env.example" ".env" >nul
    ) else (
        echo [WARN] .env.example not found, using defaults
    )
)

if not exist "node_modules" (
    echo   Installing backend dependencies...
    call "%NPM_CMD%" install
    if errorlevel 1 goto :FAIL_BACKEND
) else (
    echo   Backend dependencies already installed
)

echo.
echo [Step 4] Setting up database...

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%server\scripts\startup\ensure-prisma.ps1"
if errorlevel 1 (
    echo [ERROR] Prisma setup failed >> "%LOG%"
    echo.
    echo [ERROR] Prisma setup failed
    echo   Close all Pulse/Node windows, run stop.bat, then retry.
    echo   Log: %LOG%
    goto :FAIL
)

echo   Pushing database schema...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%server\scripts\startup\ensure-db.ps1"
if errorlevel 1 (
    echo [ERROR] Database setup failed >> "%LOG%"
    echo [ERROR] Database setup failed
    goto :FAIL
)
echo   (Database OK)

echo.
echo [Step 5] Setting up frontend...
cd /d "%CLIENT_DIR%"

if not exist "node_modules" (
    echo   Installing frontend dependencies...
    call "%NPM_CMD%" install
    if errorlevel 1 goto :FAIL_FRONTEND
) else (
    echo   Frontend dependencies already installed
)

echo.
echo [Step 6] Starting servers...

for %%D in ("%NODE_CMD%") do set "NODE_DIR=%%~dpD"

echo.
echo Starting BACKEND server on port 3000...
start "Pulse-Backend" cmd /k "set "PATH=%NODE_DIR%;%PATH%" && cd /d ""%SERVER_DIR%"" && title Pulse-Backend && npm run dev"

echo Waiting for backend to initialize (8 seconds)...
ping 127.0.0.1 -n 9 >nul

echo.
echo Starting FRONTEND server on port 5173...
start "Pulse-Frontend" cmd /k "set "PATH=%NODE_DIR%;%PATH%" && cd /d ""%CLIENT_DIR%"" && title Pulse-Frontend && npm run dev"

echo.
echo ========================================
echo.
echo   SUCCESS! All servers are starting...
echo.
echo   Frontend URL: http://localhost:5173
echo   Backend URL:  http://localhost:3000/health
echo.
echo   Open in browser: http://localhost:5173
echo.
echo ========================================
echo [%date% %time%] Startup success >> "%LOG%"
echo.
echo Press any key to close this window...
echo (Keep Pulse-Backend and Pulse-Frontend windows open)
echo.
pause >nul
exit /b 0

:ResolveNodeTools
set "NODE_CMD="
set "NPM_CMD="

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" if not defined NODE_CMD set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"

if not defined NODE_CMD (
    where node >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%i in ('where node 2^>nul') do (
            if not defined NODE_CMD (
                echo %%i | findstr /I "System32" >nul
                if errorlevel 1 set "NODE_CMD=%%i"
            )
        )
    )
)

if not defined NODE_CMD (
    echo.
    echo [ERROR] Node.js not found!
    echo   Install Node.js 18+ from https://nodejs.org/
    echo   Make sure "Add to PATH" is checked during installation.
    echo.
    exit /b 1
)

if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD (
    for %%D in ("%NODE_CMD%") do if exist "%%~dpDnpm.cmd" set "NPM_CMD=%%~dpDnpm.cmd"
)

if not defined NPM_CMD (
    for /f "delims=" %%i in ('where npm 2^>nul') do (
        if not defined NPM_CMD (
            echo %%i | findstr /I "System32" >nul
            if errorlevel 1 set "NPM_CMD=%%i"
        )
    )
)

if not defined NPM_CMD (
    echo [ERROR] npm.cmd not found
    exit /b 1
)

call "%NPM_CMD%" --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm command failed: %NPM_CMD%
    exit /b 1
)

exit /b 0

:FAIL_BACKEND
echo [ERROR] npm install failed for backend >> "%LOG%"
echo [ERROR] npm install failed for backend
goto :FAIL

:FAIL_FRONTEND
echo [ERROR] npm install failed for frontend >> "%LOG%"
echo [ERROR] npm install failed for frontend
goto :FAIL

:FAIL
echo.
echo Startup failed. See log: %LOG%
echo.
pause
exit /b 1
