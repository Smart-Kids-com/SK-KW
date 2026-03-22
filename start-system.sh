#!/bin/bash
# start-system.sh - بدء النظام على Mac/Linux

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║    🚀 نظام إدارة الطلبات - Smart Kids Kuwait         ║"
echo "║                   البدء السريع                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت!"
    echo "📥 قم بتحميل Node.js من: https://nodejs.org"
    echo ""
    exit 1
fi

echo "✅ تم اكتشاف Node.js"

# التحقق من وجود node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 جاري تثبيت المكتبات المطلوبة..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ فشل في تثبيت المكتبات"
        exit 1
    fi
fi

echo ""
echo "🚀 بدء الخادم..."
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║      للوصول: http://localhost:3000                    ║"
echo "║      اضغط Ctrl+C للإيقاف                              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# بدء السيرفر
npm start
