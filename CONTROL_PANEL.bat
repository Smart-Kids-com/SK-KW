@echo off
chcp 65001 >nul

:MENU
cls
color 0E
echo ╔══════════════════════════════════════════════╗
echo ║           🏪 Smart Kids Control Panel 🏪      ║
echo ║              لوحة التحكم الرئيسية            ║
echo ╚══════════════════════════════════════════════╝
echo.
echo  1️⃣  🚀 تشغيل النظام
echo  2️⃣  🌐 فتح الموقع الرئيسي
echo  3️⃣  👨‍💼 فتح لوحة الإدارة
echo  4️⃣  💎 فتح لوحة الإدارة المتقدمة
echo  5️⃣  📱 فتح صفحة تتبع الطلبات
echo  6️⃣  🛑 إيقاف النظام
echo  7️⃣  🔧 إعداد النظام
echo  0️⃣  ❌ خروج
echo.
echo ╚════════════════════════════════════════════════
set /p choice="اختر رقم: "

if %choice%==1 (
    start "" "START.bat"
    goto MENU
)
if %choice%==2 (
    start "" "http://localhost:3000"
    goto MENU
)
if %choice%==3 (
    start "" "http://localhost:3000/admin"
    goto MENU
)
if %choice%==4 (
    start "" "http://localhost:3000/admin-enhanced"
    goto MENU
)
if %choice%==5 (
    start "" "http://localhost:3000/track"
    goto MENU
)
if %choice%==6 (
    start "" "STOP.bat"
    goto MENU
)
if %choice%==7 (
    start "" "SETUP.bat"
    goto MENU
)
if %choice%==0 exit

goto MENU