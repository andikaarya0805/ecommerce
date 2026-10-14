import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { initDb } from './db.js';

const JWT_SECRET = 'super-secret-key-for-jawir-garage-ecommerce';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database tables (including users)
initDb();

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

// Get all vouchers
app.get('/api/vouchers', (req, res) => {
  const vouchers = db.prepare('SELECT * FROM vouchers').all().map((v: any) => ({
    ...v,
    claimed: v.claimed === 1
  }));
  res.json(vouchers);
});

// Get products (with optional filtering)
app.get('/api/products', (req, res) => {
  const category = req.query.category as string;
  const bikeType = req.query.bike as string;

  let query = 'SELECT p.* FROM products p';
  const params: any[] = [];

  if (bikeType) {
    query += ' JOIN product_bike_compatibility c ON p.id = c.product_id WHERE c.bike_type = ?';
    params.push(bikeType);
    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }
  } else if (category) {
    query += ' WHERE p.category = ?';
    params.push(category);
  }

  const products = db.prepare(query).all(...params).map((p: any) => ({
    ...p,
    specs: JSON.parse(p.specs),
    isPromo: p.isPromo === 1,
    isPaketUpgrade: p.isPaketUpgrade === 1,
    bikeCompatibility: db.prepare('SELECT bike_type FROM product_bike_compatibility WHERE product_id = ?').all(p.id).map((c: any) => c.bike_type)
  }));
  
  res.json(products);
});

// Get bikes
app.get('/api/bikes', (req, res) => {
  const bikes = db.prepare('SELECT * FROM bikes').all();
  res.json(bikes);
});

app.post('/api/checkout', (req: any, res: any) => {
  // We'll update this later to use authMiddleware.
  // For now, let's keep it as is, or we can add auth right away.
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized. Please login to checkout.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token. Please login.' });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items format' });
  }

  const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const getStock = db.prepare('SELECT stock FROM products WHERE id = ?');
  
  // Use a transaction
  const transaction = db.transaction((cartItems: any[]) => {
    for (const item of cartItems) {
      const product = getStock.get(item.productId) as any;
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      deductStock.run(item.quantity, item.productId);
    }
  });

  try {
    transaction(items);
    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// AUTH ENDPOINTS
// =======================

app.post('/api/auth/login', (req: any, res: any) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/register', (req: any, res: any) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const id = 'u-' + Date.now();
  
  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, 'user');
  const token = jwt.sign({ id, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({ token, user: { id, username, role: 'user' } });
});

// Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

app.get('/api/auth/me', authMiddleware, (req: any, res: any) => {
  res.json({ user: req.user });
});

// =======================
// ADMIN ENDPOINTS
// =======================

app.post('/api/admin/products', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const p = req.body;
  const id = p.id || 'prod-' + Date.now();
  
  try {
    db.prepare(`
      INSERT INTO products (id, name, category, compatibilityText, fitmentTag, price, originalPrice, discountPercent, promoTag, rating, soldCount, image, description, specs, isPromo, isPaketUpgrade, stock, originCity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, p.name, p.category, p.compatibilityText || 'Universal', p.fitmentTag || 'PnP', p.price, p.originalPrice || null, 
      p.discountPercent || null, p.promoTag || null, p.rating || 5.0, p.soldCount || 0, p.image || '/images/default.jpg', 
      p.description || '', JSON.stringify(p.specs || {}), p.isPromo ? 1 : 0, p.isPaketUpgrade ? 1 : 0, p.stock || 0, p.originCity || 'Jakarta'
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  const p = req.body;
  
  try {
    // Only updating common fields for brevity
    db.prepare(`
      UPDATE products SET name=?, price=?, stock=?, image=?, category=?, isPromo=? WHERE id=?
    `).run(p.name, p.price, p.stock, p.image, p.category, p.isPromo ? 1 : 0, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, (req: any, res: any) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM products WHERE id=?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
