@echo off
chcp 65001 >nul
cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║        DEPLOY TO PRODUCTION - Dynamic Nova                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] 📦 Construyendo versión de producción...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ Error al construir el proyecto
    pause
    exit /b 1
)

echo.
echo ✅ Build completado
echo.
echo [2/3] 🚀 Desplegando a Firebase Hosting...
echo.
call firebase deploy --only hosting
if errorlevel 1 (
    echo.
    echo ❌ Error al desplegar a Firebase
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ DEPLOY COMPLETADO EXITOSAMENTE                         ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║                                                            ║
echo ║  🌐 Producción: https://nova-inv-eb210.web.app            ║
echo ║                                                            ║
echo ║  Presiona cualquier tecla para cerrar...                  ║
echo ╚════════════════════════════════════════════════════════════╝
pause >nul
