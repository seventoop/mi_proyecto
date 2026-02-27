@echo off
echo ==========================================
echo   GentionGeodevia - Reparador de Servidor
echo ==========================================
echo.
echo 1. Deteniendo procesos de Node.js (servidores fantasma)...
taskkill /F /IM node.exe
echo.

echo 2. Limpiando cache de Next.js...
if exist ".next" rd /s /q ".next"
echo.

echo 3. Sincronizando base de datos...
call npx prisma generate
echo.

echo 4. Iniciando servidor correctamente...
echo    La pagina deberia abrirse en unos segundos.
echo    Cuando termine de cargar, ve a: http://localhost:3000/dashboard/proyectos
echo.
call npm run dev
pause
