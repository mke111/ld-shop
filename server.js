const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
`);

// Seed admin
const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!admin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

// Seed sample products
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const products = [
    ['Twitter 老号 (2015年)', '美国IP注册，已验证邮箱，粉丝50+', 28, 100, 'Twitter'],
    ['Twitter 新号 (2023年)', '美国IP注册，未使用', 8, 200, 'Twitter'],
    ['Instagram 实名号', '真实头像，发帖记录，粉丝100+', 45, 50, 'Instagram'],
    ['Facebook 老号 (2018年)', '已绑定手机，有好友', 35, 80, 'Facebook'],
    ['TikTok 美区号', '美国IP注册，已验证', 15, 150, 'TikTok'],
    ['YouTube 频道号', '已验证邮箱，0订阅', 12, 60, 'YouTube'],
    ['Gmail 邮箱账号', '美国IP注册，未使用', 5, 500, 'Gmail'],
    ['Telegram 账号', '已验证手机，未使用', 10, 200, 'Telegram'],
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
  next();
});

// ===== ROUTES =====

// Home
app.get('/', (req, res) => {
  const { cat, q } = req.query;
  let query = 'SELECT * FROM products WHERE status = 1';
  const params = [];
  if (cat) { query += ' AND category = ?'; params.push(cat); }
  if (q) { query += ' AND name LIKE ?'; params.push(`%${q}%`); }
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
    GROUP BY o.id ORDER BY o.created_at DESC
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
    res.render('register', { error: '用户名已存在' });
  }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ===== ADMIN =====
app.get('/admin', requireAdmin, (req, res) => {
  const tab = req.query.tab || 'products';
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  const orders = db.prepare(`
    SELECT o.*, u.username FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY id DESC').all();
  res.render('admin', { tab, products, orders, users });
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
