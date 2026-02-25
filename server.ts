import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("app.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    pin TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount INTEGER,
    price INTEGER,
    wallet_number TEXT,
    bank_account TEXT,
    proof_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('rate', '850'); -- 1000 Asiacell = 850 IQD
  INSERT OR IGNORE INTO settings (key, value) VALUES ('transfer_phone', '077XXXXXXXX');
`);

// Seed Admin if not exists
const adminPhone = "07806165532";
const adminPin = "fff0780";
const existingAdmin = db.prepare("SELECT * FROM users WHERE phone = ?").get(adminPhone);
if (!existingAdmin) {
  // Remove old admin if exists to avoid confusion
  db.prepare("DELETE FROM users WHERE role = 'admin'").run();
  db.prepare("INSERT INTO users (phone, pin, role) VALUES (?, ?, 'admin')").run(adminPhone, adminPin);
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // WebSocket handling
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Auth Middleware
  const auth = (req: any, res: any, next: any) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  };

  const adminAuth = (req: any, res: any, next: any) => {
    auth(req, res, () => {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      next();
    });
  };

  // API Routes
  app.post("/api/auth/register", (req, res) => {
    const { phone, pin } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (phone, pin) VALUES (?, ?)").run(phone, pin);
      res.cookie("userId", result.lastInsertRowid, { httpOnly: true, sameSite: 'none', secure: true });
      res.json({ id: result.lastInsertRowid, phone, role: 'user' });
    } catch (e) {
      res.status(400).json({ error: "Phone already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { phone, pin } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE phone = ? AND pin = ?").get(phone, pin);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.cookie("userId", user.id, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ id: user.id, phone: user.phone, role: user.role });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("userId");
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.json(null);
    const user: any = db.prepare("SELECT id, phone, role FROM users WHERE id = ?").get(userId);
    res.json(user || null);
  });

  // User Routes
  app.get("/api/settings", (req, res) => {
    const rate = db.prepare("SELECT value FROM settings WHERE key = 'rate'").get();
    const transferPhone = db.prepare("SELECT value FROM settings WHERE key = 'transfer_phone'").get();
    res.json({ 
      rate: parseInt(rate.value),
      transfer_phone: transferPhone.value
    });
  });

  app.post("/api/requests", auth, (req: any, res) => {
    const { amount, price, wallet_number, bank_account, proof_image } = req.body;
    const result = db.prepare(`
      INSERT INTO requests (user_id, amount, price, wallet_number, bank_account, proof_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, amount, price, wallet_number, bank_account, proof_image);
    
    const newRequest = db.prepare("SELECT * FROM requests WHERE id = ?").get(result.lastInsertRowid);
    broadcast({ type: 'NEW_REQUEST', payload: newRequest });
    res.json(newRequest);
  });

  app.get("/api/my-requests", auth, (req: any, res) => {
    const requests = db.prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(requests);
  });

  // Admin Routes
  app.get("/api/admin/requests", adminAuth, (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.phone as user_phone 
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.patch("/api/admin/requests/:id", adminAuth, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, req.params.id);
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id);
    broadcast({ type: 'UPDATE_REQUEST', payload: updated });
    res.json(updated);
  });

  app.post("/api/admin/settings", adminAuth, (req, res) => {
    const { rate, transfer_phone } = req.body;
    if (rate !== undefined) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'rate'").run(rate.toString());
    }
    if (transfer_phone !== undefined) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'transfer_phone'").run(transfer_phone);
    }
    broadcast({ type: 'SETTINGS_CHANGED', payload: { rate, transfer_phone } });
    res.json({ success: true });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
