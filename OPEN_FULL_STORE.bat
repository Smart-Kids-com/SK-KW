@echo off
chcp 65001 >nul

cls
color 0E
echo ╔═══════════════════════════════════════════════════╗
echo ║       🛍️ Smart Kids Kuwait - المتجر الكامل 🛍️       ║
echo ║              جميع المنتجات متاحة الآن!              ║  
echo ╚═══════════════════════════════════════════════════╝
echo.
echo  🌟 المميزات الجديدة:
echo  ✅ 40,000+ منتج من قاعدة البيانات الحقيقية
echo  ✅ بحث ذكي في المنتجات  
echo  ✅ فلترة بالفئات
echo  ✅ صور حقيقية عالية الجودة
echo  ✅ أسعار حقيقية من Shopify
echo.
echo ╔════════════════════════════════════════════════════
echo ║  1️⃣  🚀 فتح المتجر الكامل (products-full.html)
echo ║  2️⃣  🏪 فتح المتجر التقليدي (index.html)  
echo ║  3️⃣  👨‍💼 فتح لوحة الإدارة
echo ║  4️⃣  📊 عرض تقرير التحديث
echo ║  0️⃣  ❌ خروج
echo ╚════════════════════════════════════════════════════
set /p choice="اختر رقم: "

if %choice%==1 (
    echo 🚀 جاري فتح المتجر الكامل...
    start "" "products-full.html"
    goto MENU
)
if %choice%==2 (
    echo 🏪 جاري فتح المتجر التقليدي...  
    start "" "index.html"
    goto MENU
)
if %choice%==3 (
    echo 👨‍💼 جاري فتح لوحة الإدارة...
    start "" "admin-panel.html" 
    goto MENU
)
if %choice%==4 (
    echo 📊 جاري عرض تقرير التحديث...
    start "" "PRODUCTS_UPDATE_REPORT.md"
    goto MENU
)
if %choice%==0 (
    echo 👋 شكراً لك! وإلى اللقاء
    exit
)

echo ❌ اختيار غير صحيح! يرجى المحاولة مرة أخرى
pause
goto MENU

:MENU
echo.
echo 🔄 هل تريد فتح شيء آخر؟ 
echo.
echo ╔════════════════════════════════════════════════════
echo ║  1️⃣  🚀 فتح المتجر الكامل (products-full.html)
echo ║  2️⃣  🏪 فتح المتجر التقليدي (index.html)  
echo ║  3️⃣  👨‍💼 فتح لوحة الإدارة
echo ║  4️⃣  📊 عرض تقرير التحديث
echo ║  0️⃣  ❌ خروج
echo ╚════════════════════════════════════════════════════
set /p choice="اختر رقم: "

if %choice%==1 (
    echo 🚀 جاري فتح المتجر الكامل...
    start "" "products-full.html"
    goto MENU
)
if %choice%==2 (
    echo 🏪 جاري فتح المتجر التقليدي...  
    start "" "index.html"
    goto MENU
)
if %choice%==3 (
    echo 👨‍💼 جاري فتح لوحة الإدارة...
    start "" "admin-panel.html" 
    goto MENU
)
if %choice%==4 (
    echo 📊 جاري عرض تقرير التحديث...
    start "" "PRODUCTS_UPDATE_REPORT.md"
    goto MENU
)
if %choice%==0 (
    echo 👋 شكراً لك! وإلى اللقاء
    exit
)

echo ❌ اختيار غير صحيح! يرجى المحاولة مرة أخرى
pause
goto MENU