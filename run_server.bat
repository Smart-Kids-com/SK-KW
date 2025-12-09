@echo off
title نظام Smart Kids - خادم مستقل
cls
echo ========================================
echo        نظام Smart Kids للتجارة الإلكترونية
echo ========================================
echo.

:START
echo [%TIME%] بدء تشغيل الخادم...

REM تنظيف العمليات السابقة
taskkill /f /im node.exe >nul 2>&1

REM انتظار قصير
timeout /t 2 /nobreak >nul

REM تشغيل الخادم
echo [%TIME%] تشغيل Next.js...
npm run dev

REM إذا توقف الخادم، أعد التشغيل
echo.
echo [%TIME%] الخادم توقف! إعادة تشغيل خلال 5 ثواني...
timeout /t 5 /nobreak >nul
goto START