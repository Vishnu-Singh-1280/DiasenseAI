@echo off
title DiaSense AI Dev Server
echo ===================================================
echo          DiaSense AI - Development Server
echo ===================================================
echo Server starting in dev mode at http://localhost:3000
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
pnpm dev
pause
