@echo off
chcp 65001 >nul
cls
color 0C
echo ╔══════════════════════════════════════════════╗
echo ║               🛑 إيقاف النظام 🛑              ║
echo ╚══════════════════════════════════════════════╝
echo.

echo 🛑 إيقاف جميع العمليات...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo ✅ تم إيقاف النظام بنجاح!
echo.
pause