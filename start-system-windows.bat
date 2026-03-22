@echo off
REM start-system.bat - بدء النظام بسهولة على Windows
REM استخدام: قم بتشغيل هذا الملف مباشرة

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║    🚀 نظام إدارة الطلبات - Smart Kids Kuwait         ║
echo ║                   البدء السريع                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM التحقق من وجود Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت!
    echo 📥 قم بتحميل Node.js من: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ تم اكتشاف Node.js

REM التحقق من وجود node_modules
if not exist "node_modules" (
    echo.
    echo 📦 جاري تثبيت المكتبات المطلوبة...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ فشل في تثبيت المكتبات
        pause
        exit /b 1
    )
)

echo.
echo 🚀 بدء الخادم...
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║         سيتم فتح المتصفح تلقائياً بعد قليل            ║
echo ║      للوصول يدوياً: http://localhost:3000             ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM بدء السيرفر
call npm start

pause
