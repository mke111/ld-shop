const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 安全头：隐藏技术栈，防点击劫持，防 XSS
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
// DB init
const dbPath = process.env.DB_PATH || './shop.db';
const db = new Database(dbPath);
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        category TEXT,
        image TEXT,
        status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        contact TEXT,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS crypto_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain TEXT NOT NULL,
        symbol TEXT NOT NULL,
        address TEXT NOT NULL,
        label TEXT,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crypto_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        chain TEXT NOT NULL,
        symbol TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        amount_usd REAL NOT NULL,
        amount_crypto REAL NOT NULL,
        tx_hash TEXT,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`);

// 默认网站设置
const defaultSettings = {
    site_name: '零度小铺',
    site_slogan: '专注海外社交账户',
    footer_notice: '本站所有商品仅供娱乐和学习，请勿用于非法用途',
    refund_policy: '若产品未使用有任何问题我们会全额退款',
    contact_telegram: '@xman',
    contact_hours: '9:00-2:00',
    copyright: '© 2024 零度小铺'
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, v));

function getSettings() {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// Seed admin
const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!admin) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}
// Seed sample products
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
    const products = [
        ['Twitter 老号 (2015年)', '美国IP注册、已验证登录、点友50+', 28, 100, 'Twitter'],
        ['Twitter 新号 (2023年)', '美国IP注册、不用', 8, 200, 'Twitter'],
        ['Instagram 定名号', '真实头像、发送记录、点友100+', 45, 50, 'Instagram'],
        ['Facebook 老号 (2018年)', '已给短信打录、有好友', 35, 80, 'Facebook'],
        ['TikTok 美區号', '美国IP注册、已验证', 15, 150, 'TikTok'],
        ['YouTube 频道号', '已验证邮件、空记下载', 12, 60, 'YouTube'],
        ['Gmail 邮件资源', '美国IP注册、不用', 5, 500, 'Gmail'],
        ['Telegram 资源', '已验证手机、不用', 10, 200, 'Telegram'],
    ];
    const insert = db.prepare('INSERT INTO products (name, description, price, stock, category) VALUES (?, ?, ?, ?, ?)');
    products.forEach(p => insert.run(...p));
}
// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'ld-shop-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
// Auth middleware
const requireLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    next();
};
// Locals
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + i.qty, 0);
    res.locals.settings = getSettings();
    next();
});
// ===== ROUTES =====
// Home
app.get('/', (req, res) => {
    const { cat, q } = req.query;
    let query = 'SELECT * FROM products WHERE status = 1';
    const params = [];
    if (cat) {
        query += ' AND category = ?';
        params.push(cat);
    }
    if (q) {
        query += ' AND name LIKE ?';
        params.push(`%${q}%`);
    }
    query += ' ORDER BY id DESC';
    const products = db.prepare(query).all(...params);
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE status = 1').all().map(r => r.category);
    res.render('index', { products, categories, cat: cat || '', q: q || '' });
});
// Product detail
app.get('/product/:id', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = 1').get(req.params.id);
    if (!product) return res.redirect('/');
    res.render('product', { product });
});
// Cart
app.post('/cart/add', (req, res) => {
    const { product_id, qty } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = 1').get(product_id);
    if (!product) return res.json({ ok: false });
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(i => i.id == product_id);
    if (existing) existing.qty += parseInt(qty) || 1;
    else req.session.cart.push({ id: product.id, name: product.name, price: product.price, qty: parseInt(qty) || 1 });
    res.json({ ok: true, count: req.session.cart.reduce((s, i) => s + i.qty, 0) });
});
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    res.render('cart', { cart, total });
});
app.post('/cart/remove', (req, res) => {
    const { product_id } = req.body;
    req.session.cart = (req.session.cart || []).filter(i => i.id != product_id);
    res.redirect('/cart');
});
// Checkout
app.get('/checkout', requireLogin, (req, res) => {
    const cart = req.session.cart || [];
    if (!cart.length) return res.redirect('/cart');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    res.render('checkout', { cart, total });
});
app.post('/checkout', requireLogin, (req, res) => {
    const cart = req.session.cart || [];
    if (!cart.length) return res.redirect('/cart');
    const { contact, remark } = req.body;
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const order = db.prepare('INSERT INTO orders (user_id, total, contact, remark) VALUES (?, ?, ?, ?)').run(req.session.user.id, total, contact, remark);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    cart.forEach(i => insertItem.run(order.lastInsertRowid, i.id, i.qty, i.price));
    req.session.cart = [];
    res.redirect('/orders');
});
// Orders
app.get('/orders', requireLogin, (req, res) => {
    const orders = db.prepare(`
        SELECT o.*, GROUP_CONCAT(p.name, ', ') as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `).all(req.session.user.id);
    res.render('orders', { orders });
});
// Auth
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.render('login', { error: '用户名或密码错误' });
    }
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect(user.role === 'admin' ? '/admin' : '/');
});
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    try {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(username, hash, email);
        res.redirect('/login');
    } catch (e) {
        res.render('register', { error: '用户名已经被使用' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
// ===== ADMIN =====
app.get('/admin', requireAdmin, (req, res) => {
    const tab = req.query.tab || 'products';
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    const orders = db.prepare(`
        SELECT o.*, u.username
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `).all();
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC').all();
    const wallets = db.prepare('SELECT * FROM crypto_wallets ORDER BY id DESC').all();
    const cryptoOrders = db.prepare('SELECT * FROM crypto_orders ORDER BY created_at DESC').all();
    res.render('admin', { tab, products, orders, users, wallets, cryptoOrders });
});
app.post('/admin/products/add', requireAdmin, (req, res) => {
    const { name, description, price, stock, category, image } = req.body;
    db.prepare('INSERT INTO products (name, description, price, stock, category, image) VALUES (?, ?, ?, ?, ?, ?)').run(name, description, parseFloat(price), parseInt(stock), category, image || null);
    res.redirect('/admin');
});
app.post('/admin/products/toggle', requireAdmin, (req, res) => {
    const p = db.prepare('SELECT status FROM products WHERE id = ?').get(req.body.id);
    db.prepare('UPDATE products SET status = ? WHERE id = ?').run(p.status ? 0 : 1, req.body.id);
    res.redirect('/admin');
});
app.post('/admin/products/delete', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.body.id);
    res.redirect('/admin');
});
app.post('/admin/orders/status', requireAdmin, (req, res) => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.body.id);
    res.redirect('/admin?tab=orders');
});

// ===== 钱包管理 =====
app.post('/admin/wallets/add', requireAdmin, (req, res) => {
    const { chain, symbol, address, label } = req.body;
    db.prepare('INSERT INTO crypto_wallets (chain, symbol, address, label) VALUES (?, ?, ?, ?)').run(chain, symbol, address, label || null);
    res.redirect('/admin?tab=payment');
});
app.post('/admin/wallets/toggle', requireAdmin, (req, res) => {
    const w = db.prepare('SELECT enabled FROM crypto_wallets WHERE id = ?').get(req.body.id);
    db.prepare('UPDATE crypto_wallets SET enabled = ? WHERE id = ?').run(w.enabled ? 0 : 1, req.body.id);
    res.redirect('/admin?tab=payment');
});
app.post('/admin/wallets/delete', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM crypto_wallets WHERE id = ?').run(req.body.id);
    res.redirect('/admin?tab=payment');
});

// ===== 确认收款 =====
app.post('/admin/crypto/confirm', requireAdmin, (req, res) => {
    const { crypto_order_id, tx_hash } = req.body;
    const co = db.prepare('SELECT * FROM crypto_orders WHERE id = ?').get(crypto_order_id);
    if (co) {
        db.prepare('UPDATE crypto_orders SET status = ?, tx_hash = ? WHERE id = ?').run('paid', tx_hash || null, crypto_order_id);
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('completed', co.order_id);
    }
    res.redirect('/admin?tab=payment');
});

// ===== 支付 API =====
app.post('/api/crypto/pay', requireLogin, (req, res) => {
    const { order_id, chain, symbol } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.session.user.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    const wallet = db.prepare('SELECT * FROM crypto_wallets WHERE chain = ? AND symbol = ? AND enabled = 1').get(chain, symbol);
    if (!wallet) return res.status(400).json({ error: '该链暂不支持，请选择其他' });
    const amount_crypto = parseFloat(order.total.toFixed(2)); // USDT 1:1
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const result = db.prepare(
        'INSERT INTO crypto_orders (order_id, chain, symbol, wallet_address, amount_usd, amount_crypto, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(order_id, chain, symbol, wallet.address, order.total, amount_crypto, expires_at);
    res.json({ id: result.lastInsertRowid, wallet_address: wallet.address, amount_crypto, amount_usd: order.total, chain, symbol, expires_at });
});

app.get('/api/crypto/status/:order_id', requireLogin, (req, res) => {
    const co = db.prepare('SELECT * FROM crypto_orders WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(req.params.order_id);
    if (!co) return res.json({ status: 'none' });
    res.json({ status: co.status, tx_hash: co.tx_hash, amount_crypto: co.amount_crypto, wallet_address: co.wallet_address, chain: co.chain, symbol: co.symbol });
});

// ===== 网站设置 =====
app.post('/admin/site/save', requireAdmin, (req, res) => {
    const fields = ['site_name','site_slogan','footer_notice','refund_policy','contact_telegram','contact_hours','copyright'];
    const update = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
    fields.forEach(k => { if (req.body[k] !== undefined) update.run(k, req.body[k]); });
    res.redirect('/admin?tab=site');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
