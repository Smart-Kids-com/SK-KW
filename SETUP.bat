@echo off
chcp 65001 >nul
cls
color 0F
echo ╔══════════════════════════════════════════════╗
echo ║               🔧 إعداد النظام 🔧              ║
echo ╚══════════════════════════════════════════════╝
echo.

echo 📦 تحديث المكتبات...
call npm install

echo 🗃️  إعداد قاعدة البيانات...
node -e "const db = require('./lib/database'); db.initDatabase(); console.log('✅ قاعدة البيانات جاهزة!');"

echo.
echo ✅ تم إعداد النظام بنجاح!
echo 💡 الآن يمكنك تشغيل النظام بالضغط على START.bat
echo.
pause