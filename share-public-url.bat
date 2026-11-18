@echo off
title DiaSense AI Public Cloudflare Tunnel
echo ========================================================
echo       DiaSense AI - Live Public Deployment
echo ========================================================
echo Creating secure HTTPS public link for http://localhost:3000 ...
echo.
cd /d "%~dp0"
cloudflared.exe tunnel --url http://localhost:3000
pause
