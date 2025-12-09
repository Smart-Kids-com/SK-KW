#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// مطابقة MIME types للملفات
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - الصفحة غير موجودة</h1>');
            } else {
                res.writeHead(500);
                res.end('خطأ في الخادم: ' + err.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType + (contentType.startsWith('text/') ? '; charset=utf-8' : ''),
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 خادم Smart Kids يعمل على: http://localhost:${PORT}`);
    console.log('📂 جاهز لخدمة الملفات من المجلد الحالي');
});