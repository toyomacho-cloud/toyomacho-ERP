@echo off
title Dynamic-Nova Server
cd /d "C:\Users\Luis\.gemini\antigravity\playground\dynamic-nova"
echo.
echo ========================================
echo   Iniciando Dynamic-Nova...
echo ========================================
echo.
start http://localhost:5173
npm run dev
pause
