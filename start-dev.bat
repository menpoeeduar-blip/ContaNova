@echo off
REM ============================================================
REM ContaNova ERP - Script de inicio local para Windows
REM ============================================================
echo.
echo  ====================================================
echo    ContaNova ERP - Iniciando servidores locales
echo  ====================================================
echo.

REM Verificar si DATABASE_URL esta configurado
if "%DATABASE_URL%"=="" (
    echo  [ERROR] La variable DATABASE_URL no esta configurada.
    echo.
    echo  Configura la URL de tu base de datos PostgreSQL:
    echo    set DATABASE_URL=postgresql://user:pass@host:5432/dbname
    echo.
    echo  Opciones gratuitas: supabase.com  o  neon.tech
    echo.
    pause
    exit /b 1
)

echo  [OK] DATABASE_URL detectada
echo.
echo  Iniciando API Server (puerto 8080)...
start "ContaNova API" cmd /k "set PORT=8080 && pnpm --filter @workspace/api-server run dev"

timeout /t 3 /nobreak >nul

echo  Iniciando Frontend (puerto 5173)...
start "ContaNova Frontend" cmd /k "set PORT=5173 && set BASE_PATH=/ && pnpm --filter @workspace/contanova run dev"

echo.
echo  Servidores iniciados:
echo    Frontend: http://localhost:5173
echo    API:      http://localhost:8080/api/healthz
echo.
echo  Presiona cualquier tecla para cerrar esta ventana.
pause >nul
