@echo off
chcp 65001 >nul

:MENU
cls
color 0E
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           🛍️ Smart Kids Kuwait - لوحة التحكم الشاملة 🛍️           ║
echo ║                   المتجر  مع نظام المجموعات                   ║  
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  🎉 المميزات الجديدة:
echo  ✅ 420 منتج حقيقي مصنف في 14 مجموعة
echo  ✅ نظام المجموعات الذكي والمتطور  
echo  ✅ بحث وفلترة متقدمة
echo  ✅ صور وأسعار حقيقية من Shopify
echo  ✅ واجهة متجاوبة وجميلة
echo.
echo ╔══════════════════════════════════════════════════════════════
echo ║  1️⃣  🚀 المتجر  - جميع المنتجات
echo ║  2️⃣  🏷️ المجموعات - تصفح حسب النوع (جديد!)
echo ║  3️⃣  🏪 المتجر التقليدي - الواجهة الأصلية  
echo ║  4️⃣  👨‍💼 لوحة الإدارة - إدارة الطلبات
echo ║  5️⃣  📊 تقرير المنتجات - معلومات التحديث
echo ║  6️⃣  📋 تقرير المجموعات - نظام التصنيف (جديد!)
echo ║  7️⃣  🌐 دليل النشر على Vercel
echo ║  0️⃣  ❌ خروج
echo ╚══════════════════════════════════════════════════════════════
set /p choice="اختر رقم (0-7): "

if %choice%==1 (
    echo.
    echo 🚀 جاري فتح المتجر  مع جميع المنتجات...
    start "" "products-full.html"
    echo ✅ تم فتح المتجر! يحتوي على 420+ منتج
    pause
    goto MENU
)
if %choice%==2 (
    echo.
    echo 🏷️ جاري فتح صفحة المجموعات...
    start "" "collections.html"
    echo ✅ تم فتح المجموعات! 14 مجموعة متخصصة
    pause
    goto MENU
)
if %choice%==3 (
    echo.
    echo 🏪 جاري فتح المتجر التقليدي...
    start "" "index.html"
    echo ✅ تم فتح المتجر التقليدي
    pause
    goto MENU
)
if %choice%==4 (
    echo.
    echo 👨‍💼 جاري فتح لوحة الإدارة...
    start "" "admin-panel.html"
    echo ✅ تم فتح لوحة الإدارة
    pause
    goto MENU
)
if %choice%==5 (
    echo.
    echo 📊 جاري عرض تقرير تحديث المنتجات...
    start "" "PRODUCTS_UPDATE_REPORT.md"
    echo ✅ تم فتح التقرير
    pause
    goto MENU
)
if %choice%==6 (
    echo.
    echo 📋 جاري عرض تقرير نظام المجموعات...
    start "" "COLLECTIONS_SYSTEM_README.md"
    echo ✅ تم فتح تقرير المجموعات
    pause
    goto MENU
)
if %choice%==7 (
    echo.
    echo 🌐 جاري عرض دليل النشر على Vercel...
    start "" "VERCEL_DEPLOY_GUIDE.md"
    echo ✅ تم فتح دليل النشر
    pause
    goto MENU
)
if %choice%==0 (
    echo.
    echo 👋 شكراً لاستخدام Smart Kids Kuwait!
    echo 🎉 نتمنى لك تجربة تسوق رائعة
    echo.
    pause
    exit
)

echo.
echo ❌ اختيار غير صحيح! يرجى اختيار رقم من 0 إلى 7
pause
goto MENU