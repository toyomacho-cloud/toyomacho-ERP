@echo off
cd /d "%~dp0"
echo Iniciando NOVAinv...
echo Espere a que el servidor se inicie...
start http://localhost:5173
npm run dev
pause
