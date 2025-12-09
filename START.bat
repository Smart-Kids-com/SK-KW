@echo off
chcp 65001 >nul
cls
color 0A
echo ╔══════════════════════════════════════════════╗
echo ║            🚀 Smart Kids Store 🚀             ║
echo ║        نظام إدارة الطلبات المتكامل           ║
echo ╚══════════════════════════════════════════════╝
echo.

REM تنظيف أي عمليات سابقة
echo 🧹 تنظيف العمليات السابقة...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

REM انتظار قصير للتنظيف
timeout /t 2 /nobreak >nul

echo 🚀 بدء تشغيل النظام...
echo.

REM تشغيل الخادم
npm run dev

REM في حالة توقف الخادم
echo.
echo ⚠️  النظام توقف! اضغط أي مفتاح لإعادة التشغيل...
pause >nul
goto :eof