#!/usr/bin/env node
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'shop.db'));

// 动态加字段
try { db.exec('ALTER TABLE products ADD COLUMN delivery_type TEXT DEFAULT "manual"'); } catch(e) {}
try { db.exec('ALTER TABLE products ADD COLUMN delivery_content TEXT'); } catch(e) {}

const products = [
    {
        name: 'AI工具使用入门指南',
        description: '涵盖ChatGPT、Claude、Midjourney等主流AI工具使用技巧，提示词写法，免费获取方法，适合零基础入门。',
        price: 9.99,
        stock: 9999,
        category: '教程',
        delivery_type: 'link',
        delivery_content: fs.readFileSync(path.join(__dirname, 'content/ai-tools-guide.md'), 'utf8')
    },
    {
        name: '海外账号注册完全指南',
        description: '手把手教你注册Twitter/X、Instagram、TikTok、PayPal等海外账号，含接码平台推荐和保号技巧。',
        price: 14.99,
        stock: 9999,
        category: '教程',
        delivery_type: 'link',
        delivery_content: fs.readFileSync(path.join(__dirname, 'content/overseas-account-guide.md'), 'utf8')
    },
    {
        name: '加密货币入门完全指南',
        description: '从零开始学加密货币：主流币种介绍、交易所选择、MetaMask钱包教程、安全存储和防骗指南。',
        price: 19.99,
        stock: 9999,
        category: '教程',
        delivery_type: 'link',
        delivery_content: fs.readFileSync(path.join(__dirname, 'content/crypto-guide.md'), 'utf8')
    }
];

const insert = db.prepare('INSERT INTO products (name, description, price, stock, category, delivery_type, delivery_content) VALUES (?, ?, ?, ?, ?, ?, ?)');
products.forEach(p => {
    insert.run(p.name, p.description, p.price, p.stock, p.category, p.delivery_type, p.delivery_content);
    console.log(`✓ 上架：${p.name}`);
});

console.log('完成');
