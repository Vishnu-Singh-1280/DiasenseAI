@echo off
title DiaSense AI Production Server
echo ===================================================
echo           DiaSense AI - Production Server
echo ===================================================
echo Server starting at http://localhost:3000
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
node dist/index.js
pause
