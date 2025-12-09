@echo off
echo ========================================
echo    نظام إدارة الطلبات المتقدم
echo ========================================
echo.

echo تحقق من تنصيب Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo خطأ: Node.js غير مثبت!
    echo يرجى تنصيب Node.js من https://nodejs.org
    pause
    exit /b 1
)

echo تحقق من ملف package.json...
if not exist package.json (
    echo خطأ: ملف package.json غير موجود!
    pause
    exit /b 1
)

echo تنصيب الحزم المطلوبة...
call npm install

echo.
echo تشغيل النظام...
echo ========================================
echo الواجهات المتاحة:
echo.
echo - الموقع الرئيسي: http://localhost:3001
echo - لوحة الإدارة: http://localhost:3001/admin
echo - لوحة الإدارة المتقدمة: http://localhost:3001/admin-enhanced  
echo - تتبع الطلبات: http://localhost:3001/track
echo.
echo ========================================

call npm run dev