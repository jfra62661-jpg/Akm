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
    email TEXT UNIQUE,
    pin TEXT,
    role TEXT DEFAULT 'user',
    points INTEGER DEFAULT 0,
    last_claim DATETIME,
    package_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    bonus_percent INTEGER,
    return_months INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_counters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    package_id INTEGER,
    name TEXT,
    price INTEGER,
    daily_reward INTEGER,
    total_days INTEGER,
    days_claimed INTEGER DEFAULT 0,
    last_claim DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(package_id) REFERENCES packages(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    points INTEGER,
    amount INTEGER,
    wallet_number TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS package_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    package_id INTEGER,
    proof_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(package_id) REFERENCES packages(id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER UNIQUE,
    name TEXT,
    image TEXT,
    max_mics INTEGER DEFAULT 8,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS room_admins (
    room_id INTEGER,
    user_id INTEGER,
    PRIMARY KEY(room_id, user_id),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS room_mics (
    room_id INTEGER,
    mic_index INTEGER,
    user_id INTEGER,
    PRIMARY KEY(room_id, mic_index),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    icon TEXT,
    type TEXT DEFAULT 'normal'
  );

  CREATE TABLE IF NOT EXISTS charge_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount INTEGER,
    price INTEGER,
    proof_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    sender_type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('rate', '850');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('transfer_phone', '077XXXXXXXX');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('min_withdraw_points', '100000');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('win_rate_luck', '30');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('luck_gift_win_rate', '30');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('luck_gift_multiplier', '5');

  INSERT OR IGNORE INTO packages (id, name, price, bonus_percent, return_months) VALUES (1, 'العداد البرونزي', 100000, 2, 365);
  INSERT OR IGNORE INTO packages (id, name, price, bonus_percent, return_months) VALUES (2, 'العداد الفضي', 200000, 2, 365);
  INSERT OR IGNORE INTO packages (id, name, price, bonus_percent, return_months) VALUES (3, 'العداد الذهبي', 400000, 2, 365);
  INSERT OR IGNORE INTO packages (id, name, price, bonus_percent, return_months) VALUES (4, 'العداد الماسي', 1000000, 2, 365);
  INSERT OR IGNORE INTO packages (id, name, price, bonus_percent, return_months) VALUES (5, 'العداد الملكي', 2400000, 2, 365);

  INSERT OR IGNORE INTO gifts (id, name, price, icon) VALUES (1, 'وردة', 100, '🌹');
  INSERT OR IGNORE INTO gifts (id, name, price, icon) VALUES (2, 'قلب', 500, '❤️');
  INSERT OR IGNORE INTO gifts (id, name, price, icon) VALUES (3, 'سيارة', 5000, '🚗');
  INSERT OR IGNORE INTO gifts (id, name, price, icon) VALUES (4, 'طائرة', 10000, '✈️');
  INSERT OR IGNORE INTO gifts (id, name, price, icon) VALUES (5, 'قصر', 50000, '🏰');
`);

try { db.exec("ALTER TABLE users ADD COLUMN mining_start DATETIME"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'ar'"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN spent_points INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE gifts ADD COLUMN type TEXT DEFAULT 'normal'"); } catch (e) {}
try { db.exec("UPDATE rooms SET max_mics = 8 WHERE max_mics = 2"); } catch (e) {}

// Seed Gifts
const giftsCount = db.prepare("SELECT COUNT(*) as count FROM gifts").get() as any;
if (giftsCount.count < 10) {
  db.exec("DELETE FROM gifts");
  // Normal
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('وردة', 100, '🌹', 'normal')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('ماسات', 500, '💎', 'normal')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('صندوق', 1000, '🎁', 'normal')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('كيس نقود', 2000, '💰', 'normal')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('اسد', 5000, '🦁', 'normal')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('ملك', 10000, '👑', 'normal')");
  
  // Flags
  const flags = [
    { name: 'العراق', icon: '🇮🇶' }, { name: 'السعودية', icon: '🇸🇦' }, { name: 'مصر', icon: '🇪🇬' },
    { name: 'الإمارات', icon: '🇦🇪' }, { name: 'الكويت', icon: '🇰🇼' }, { name: 'قطر', icon: '🇶🇦' },
    { name: 'البحرين', icon: '🇧🇭' }, { name: 'عمان', icon: '🇴🇲' }, { name: 'الأردن', icon: '🇯🇴' },
    { name: 'سوريا', icon: '🇸🇾' }, { name: 'لبنان', icon: '🇱🇧' }, { name: 'فلسطين', icon: '🇵🇸' },
    { name: 'اليمن', icon: '🇾🇪' }, { name: 'المغرب', icon: '🇲🇦' }, { name: 'الجزائر', icon: '🇩🇿' },
    { name: 'تونس', icon: '🇹🇳' }, { name: 'ليبيا', icon: '🇱🇾' }, { name: 'السودان', icon: '🇸🇩' }
  ];
  flags.forEach(f => {
    db.prepare("INSERT INTO gifts (name, price, icon, type) VALUES (?, 250, ?, 'flag')").run(f.name, f.icon);
  });

  // Luck gifts
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('حظ صغير', 250, '🍀', 'luck')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('حظ متوسط', 1000, '🌟', 'luck')");
  db.exec("INSERT INTO gifts (name, price, icon, type) VALUES ('حظ كبير', 5000, '✨', 'luck')");
}

// Seed Admin if not exists
const adminPhone = "07806165532";
const adminPin = "fff0780";
const existingAdmin = db.prepare("SELECT * FROM users WHERE phone = ?").get(adminPhone);
if (!existingAdmin) {
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
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'webrtc') {
          // Broadcast WebRTC signaling to everyone else
          // In a real app, we should route this only to the target user
          const msgString = JSON.stringify(data);
          clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(msgString);
            }
          });
        }
      } catch (e) {}
    });

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
    const { phone, email, pin } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (phone, email, pin) VALUES (?, ?, ?)").run(phone, email, pin);
      res.cookie("userId", result.lastInsertRowid, { httpOnly: true, sameSite: 'none', secure: true });
      res.json({ id: result.lastInsertRowid, phone, email, role: 'user', points: 0, package_id: null, theme: 'light', language: 'ar', spent_points: 0 });
    } catch (e) {
      res.status(400).json({ error: "Phone or Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { phone, pin } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE (phone = ? OR email = ?) AND pin = ?").get(phone, phone, pin);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.cookie("userId", user.id, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ id: user.id, phone: user.phone, email: user.email, role: user.role, points: user.points, package_id: user.package_id, mining_start: user.mining_start, name: user.name, avatar: user.avatar, theme: user.theme, language: user.language, spent_points: user.spent_points });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("userId");
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.json(null);
    const user: any = db.prepare("SELECT id, phone, email, role, points, package_id, mining_start, name, avatar, theme, language, spent_points FROM users WHERE id = ?").get(userId);
    res.json(user || null);
  });

  app.patch("/api/profile", auth, (req: any, res) => {
    const { name, avatar, theme, language } = req.body;
    db.prepare("UPDATE users SET name = ?, avatar = ?, theme = ?, language = ? WHERE id = ?").run(name, avatar, theme, language, req.user.id);
    res.json({ success: true });
  });

  // Mining
  app.post("/api/mining/start", auth, (req: any, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (user.mining_start) return res.status(400).json({ error: "العداد يعمل بالفعل" });
    
    const now = new Date().toISOString();
    db.prepare("UPDATE users SET mining_start = ? WHERE id = ?").run(now, req.user.id);
    res.json({ success: true, mining_start: now });
  });

  app.post("/api/mining/collect", auth, (req: any, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user.mining_start) return res.status(400).json({ error: "العداد لم يبدأ" });
    
    const now = new Date();
    const start = new Date(user.mining_start);
    const diff = now.getTime() - start.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "لم ينته الوقت بعد" });
    }

    let reward = 1000;
    if (user.package_id) {
      const pkg = db.prepare("SELECT bonus_percent FROM packages WHERE id = ?").get(user.package_id);
      reward += (reward * pkg.bonus_percent) / 100;
    }

    db.prepare("UPDATE users SET points = points + ?, mining_start = NULL WHERE id = ?").run(reward, user.id);
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    res.json({ success: true, reward, points: updatedUser.points, mining_start: null });
  });

  // Packages
  app.get("/api/packages", (req, res) => {
    const pkgs = db.prepare("SELECT * FROM packages").all();
    res.json(pkgs);
  });

  app.get("/api/my-counters", auth, (req: any, res) => {
    const counters = db.prepare("SELECT * FROM user_counters WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(counters);
  });

  app.post("/api/counters/buy", auth, (req: any, res) => {
    const { package_id } = req.body;
    const pkg = db.prepare("SELECT * FROM packages WHERE id = ?").get(package_id);
    if (!pkg) return res.status(400).json({ error: "العداد غير موجود" });

    const user = db.prepare("SELECT points FROM users WHERE id = ?").get(req.user.id);
    if (user.points < pkg.price) return res.status(400).json({ error: "نقاطك غير كافية" });

    const daily_reward = Math.floor(pkg.price * (pkg.bonus_percent / 100));

    db.prepare("BEGIN TRANSACTION").run();
    try {
      db.prepare("UPDATE users SET points = points - ?, spent_points = spent_points + ? WHERE id = ?").run(pkg.price, pkg.price, req.user.id);
      db.prepare(`
        INSERT INTO user_counters (user_id, package_id, name, price, daily_reward, total_days, last_claim)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, pkg.id, pkg.name, pkg.price, daily_reward, pkg.return_months, new Date().toISOString());
      
      db.prepare("UPDATE users SET package_id = ? WHERE id = ?").run(pkg.id, req.user.id);
      
      db.prepare("COMMIT").run();
      res.json({ success: true, newPoints: user.points - pkg.price });
    } catch (e) {
      db.prepare("ROLLBACK").run();
      res.status(500).json({ error: "حدث خطأ أثناء الشراء" });
    }
  });

  app.post("/api/counters/:id/claim", auth, (req: any, res) => {
    const counter = db.prepare("SELECT * FROM user_counters WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
    if (!counter) return res.status(404).json({ error: "العداد غير موجود" });

    if (counter.days_claimed >= counter.total_days) {
      return res.status(400).json({ error: "انتهت صلاحية هذا العداد" });
    }

    const lastClaim = new Date(counter.last_claim).getTime();
    const now = new Date().getTime();
    const diff = now - lastClaim;
    const total = 24 * 60 * 60 * 1000;

    if (diff < total) {
      return res.status(400).json({ error: "لم يمر 24 ساعة على آخر جمع" });
    }

    db.prepare("BEGIN TRANSACTION").run();
    try {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(counter.daily_reward, req.user.id);
      db.prepare("UPDATE user_counters SET days_claimed = days_claimed + 1, last_claim = ? WHERE id = ?").run(new Date().toISOString(), counter.id);
      db.prepare("COMMIT").run();
      res.json({ success: true, reward: counter.daily_reward });
    } catch (e) {
      db.prepare("ROLLBACK").run();
      res.status(500).json({ error: "حدث خطأ أثناء الجمع" });
    }
  });

  app.post("/api/package-requests", auth, (req: any, res) => {
    const { package_id, proof_image } = req.body;
    db.prepare("INSERT INTO package_requests (user_id, package_id, proof_image) VALUES (?, ?, ?)").run(req.user.id, package_id, proof_image);
    broadcast({ type: 'NEW_PACKAGE_REQUEST' });
    res.json({ success: true });
  });

  app.get("/api/admin/package-requests", adminAuth, (req, res) => {
    const list = db.prepare(`
      SELECT pr.*, u.phone as user_phone, p.name as package_name, p.price as package_price
      FROM package_requests pr
      JOIN users u ON pr.user_id = u.id
      JOIN packages p ON pr.package_id = p.id
      ORDER BY pr.created_at DESC
    `).all();
    res.json(list);
  });

  app.patch("/api/admin/package-requests/:id", adminAuth, (req, res) => {
    const { status } = req.body;
    const reqData = db.prepare("SELECT * FROM package_requests WHERE id = ?").get(req.params.id);
    
    if (reqData.status === 'pending' && status === 'accepted') {
      db.prepare("UPDATE users SET package_id = ? WHERE id = ?").run(reqData.package_id, reqData.user_id);
    }
    
    db.prepare("UPDATE package_requests SET status = ? WHERE id = ?").run(status, req.params.id);
    broadcast({ type: 'UPDATE_PACKAGE_REQUEST' });
    res.json({ success: true });
  });

  // Withdrawals
  app.post("/api/withdrawals", auth, (req: any, res) => {
    const { points, wallet_number } = req.body;
    const user = db.prepare("SELECT points, package_id FROM users WHERE id = ?").get(req.user.id);
    
    if (!user.package_id) return res.status(400).json({ error: "يجب تفعيل باقة أولاً" });
    if (user.points < points) return res.status(400).json({ error: "نقاط غير كافية" });
    
    const minWithdraw = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'min_withdraw_points'").get().value);
    if (points < minWithdraw) return res.status(400).json({ error: `الحد الأدنى للسحب هو ${minWithdraw} نقطة` });

    const amount = Math.floor(points * 0.25);
    
    db.prepare("BEGIN TRANSACTION").run();
    try {
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(points, req.user.id);
      db.prepare("INSERT INTO withdrawals (user_id, points, amount, wallet_number) VALUES (?, ?, ?, ?)").run(req.user.id, points, amount, wallet_number);
      db.prepare("COMMIT").run();
      broadcast({ type: 'NEW_WITHDRAWAL' });
      res.json({ success: true });
    } catch (e) {
      db.prepare("ROLLBACK").run();
      res.status(500).json({ error: "خطأ في السحب" });
    }
  });

  app.get("/api/my-withdrawals", auth, (req: any, res) => {
    const list = db.prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(list);
  });

  app.get("/api/admin/withdrawals", adminAuth, (req, res) => {
    const list = db.prepare(`
      SELECT w.*, u.phone as user_phone 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
      ORDER BY w.created_at DESC
    `).all();
    res.json(list);
  });

  app.patch("/api/admin/withdrawals/:id", adminAuth, (req, res) => {
    const { status } = req.body;
    const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(req.params.id);
    
    if (withdrawal.status === 'pending' && status === 'rejected') {
      // Refund points
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(withdrawal.points, withdrawal.user_id);
    }
    
    db.prepare("UPDATE withdrawals SET status = ? WHERE id = ?").run(status, req.params.id);
    broadcast({ type: 'UPDATE_WITHDRAWAL' });
    res.json({ success: true });
  });

  // Games
  app.post("/api/games/luck", auth, (req: any, res) => {
    const { bet } = req.body;
    const user = db.prepare("SELECT points FROM users WHERE id = ?").get(req.user.id);
    if (user.points < bet) return res.status(400).json({ error: "نقاط غير كافية" });

    const winRate = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'win_rate_luck'").get().value);
    const isWin = Math.random() * 100 < winRate;
    const multiplier = isWin ? 2 : 0;
    const change = isWin ? bet : -bet;

    db.prepare("UPDATE users SET points = points + ?, spent_points = spent_points + ? WHERE id = ?").run(change, bet, req.user.id);
    res.json({ isWin, multiplier, newPoints: user.points + change });
  });

  app.post("/api/games/dice", auth, (req: any, res) => {
    const { bet, target } = req.body; // target is 'high' (4-6) or 'low' (1-3)
    const user = db.prepare("SELECT points FROM users WHERE id = ?").get(req.user.id);
    if (user.points < bet) return res.status(400).json({ error: "نقاط غير كافية" });

    const roll = Math.floor(Math.random() * 6) + 1;
    const isWin = (target === 'high' && roll >= 4) || (target === 'low' && roll <= 3);
    const change = isWin ? bet : -bet;

    db.prepare("UPDATE users SET points = points + ?, spent_points = spent_points + ? WHERE id = ?").run(change, bet, req.user.id);
    res.json({ roll, isWin, newPoints: user.points + change });
  });

  app.post("/api/games/slot", auth, (req: any, res) => {
    const { bet } = req.body;
    const validBets = [100, 1000, 5000];
    if (!validBets.includes(bet)) return res.status(400).json({ error: "مبلغ الرهان غير صالح" });

    const user = db.prepare("SELECT points FROM users WHERE id = ?").get(req.user.id);
    if (user.points < bet) return res.status(400).json({ error: "نقاط غير كافية" });

    const symbols = ['💎', '👑', '🌟', '💰', '🍒', '🔔', '7️⃣'];
    const result = [
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]
    ];

    let totalMultiplier = 0;
    
    // Check each row for matches
    result.forEach(row => {
      if (row[0] === row[1] && row[1] === row[2]) {
        totalMultiplier += 10; // All 3 match in a row
      } else if (row[0] === row[1] || row[1] === row[2] || row[0] === row[2]) {
        totalMultiplier += 2; // 2 match in a row
      }
    });

    const winAmount = bet * totalMultiplier;
    const change = winAmount - bet;

    db.prepare("UPDATE users SET points = points + ?, spent_points = spent_points + ? WHERE id = ?").run(change, bet, req.user.id);
    res.json({ result, multiplier: totalMultiplier, winAmount, newPoints: user.points + change });
  });

  // Voice Rooms
  app.get("/api/rooms", (req, res) => {
    const rooms = db.prepare(`
      SELECT r.*, u.name as owner_name, u.avatar as owner_avatar 
      FROM rooms r JOIN users u ON r.owner_id = u.id
    `).all();
    res.json(rooms);
  });

  app.get("/api/rooms/:id", (req, res) => {
    const room = db.prepare(`
      SELECT r.*, u.name as owner_name, u.avatar as owner_avatar 
      FROM rooms r JOIN users u ON r.owner_id = u.id 
      WHERE r.id = ?
    `).get(req.params.id);
    if (!room) return res.status(404).json({error: "Not found"});
    
    const mics = db.prepare(`
      SELECT rm.mic_index, u.id, u.name, u.avatar 
      FROM room_mics rm JOIN users u ON rm.user_id = u.id 
      WHERE rm.room_id = ?
    `).all(room.id);
    
    const admins = db.prepare(`
      SELECT u.id, u.name, u.avatar 
      FROM room_admins ra 
      JOIN users u ON ra.user_id = u.id 
      WHERE ra.room_id = ?
    `).all(room.id);
    res.json({ ...room, mics, admins });
  });

  app.post("/api/rooms", auth, (req: any, res) => {
    const { name, image } = req.body;
    try {
      db.prepare("INSERT INTO rooms (owner_id, name, image) VALUES (?, ?, ?)").run(req.user.id, name, image);
      broadcast({ type: 'ROOMS_UPDATED' });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "لديك غرفة بالفعل" });
    }
  });

  app.patch("/api/rooms/:id", auth, (req: any, res) => {
    const { name, image } = req.body;
    const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(req.params.id);
    if (!room || room.owner_id !== req.user.id) return res.status(403).json({ error: "غير مصرح" });
    
    db.prepare("UPDATE rooms SET name = ?, image = ? WHERE id = ?").run(name, image, req.params.id);
    broadcast({ type: 'ROOMS_UPDATED' });
    broadcast({ type: 'ROOM_STATE_UPDATED', roomId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/rooms/:id/mics", auth, (req: any, res) => {
    const { target_mics } = req.body;
    const allowedMics = [3, 4, 8];
    
    if (!allowedMics.includes(target_mics)) {
      return res.status(400).json({ error: "عدد المايكات غير صالح" });
    }

    const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(req.params.id);
    if (!room) return res.status(404).json({ error: "الغرفة غير موجودة" });

    const isAdmin = room.owner_id === req.user.id || db.prepare("SELECT * FROM room_admins WHERE room_id = ? AND user_id = ?").get(req.params.id, req.user.id);
    if (!isAdmin) return res.status(403).json({ error: "غير مصرح لك بتغيير عدد المايكات" });

    db.prepare("UPDATE rooms SET max_mics = ? WHERE id = ?").run(target_mics, req.params.id);
    
    // Kick users from mics that are no longer available
    db.prepare("DELETE FROM room_mics WHERE room_id = ? AND mic_index >= ?").run(req.params.id, target_mics);

    broadcast({ type: 'ROOMS_UPDATED' });
    broadcast({ type: 'ROOM_STATE_UPDATED', roomId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/rooms/:id/mic", auth, (req: any, res) => {
    const { mic_index, action } = req.body; // action: 'take', 'leave', 'kick'
    const roomId = req.params.id;
    
    if (action === 'take') {
      db.prepare("DELETE FROM room_mics WHERE room_id = ? AND user_id = ?").run(roomId, req.user.id);
      db.prepare("INSERT OR REPLACE INTO room_mics (room_id, mic_index, user_id) VALUES (?, ?, ?)").run(roomId, mic_index, req.user.id);
    } else if (action === 'leave') {
      db.prepare("DELETE FROM room_mics WHERE room_id = ? AND user_id = ?").run(roomId, req.user.id);
    } else if (action === 'kick') {
      const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(roomId);
      const isAdmin = room.owner_id === req.user.id || db.prepare("SELECT * FROM room_admins WHERE room_id = ? AND user_id = ?").get(roomId, req.user.id);
      if (isAdmin) {
        db.prepare("DELETE FROM room_mics WHERE room_id = ? AND mic_index = ?").run(roomId, mic_index);
      }
    }
    broadcast({ type: 'ROOM_STATE_UPDATED', roomId });
    res.json({ success: true });
  });

  app.post("/api/rooms/:id/admins", auth, (req: any, res) => {
    const { user_id, action } = req.body; // action: 'add', 'remove'
    const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(req.params.id);
    if (!room || room.owner_id !== req.user.id) return res.status(403).json({ error: "غير مصرح" });

    if (action === 'add') {
      db.prepare("INSERT OR IGNORE INTO room_admins (room_id, user_id) VALUES (?, ?)").run(req.params.id, user_id);
    } else {
      db.prepare("DELETE FROM room_admins WHERE room_id = ? AND user_id = ?").run(req.params.id, user_id);
    }
    broadcast({ type: 'ROOM_STATE_UPDATED', roomId: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/gifts", (req, res) => {
    res.json(db.prepare("SELECT * FROM gifts").all());
  });

  app.post("/api/gifts/send", auth, (req: any, res) => {
    const { room_id, receiver_id, gift_id, quantity = 1 } = req.body;
    const gift = db.prepare("SELECT * FROM gifts WHERE id = ?").get(gift_id);
    const user = db.prepare("SELECT points, name, spent_points FROM users WHERE id = ?").get(req.user.id);
    
    const totalCost = gift.price * quantity;
    if (user.points < totalCost) return res.status(400).json({ error: "نقاط غير كافية" });

    let receiverAmount = 0;
    let adminAmount = 0;
    let isWin = false;

    if (gift.type === 'luck') {
      const winRate = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'luck_gift_win_rate'").get().value || '30');
      const multiplier = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'luck_gift_multiplier'").get().value || '5');
      
      // Calculate luck for each gift individually
      let totalWon = 0;
      for (let i = 0; i < quantity; i++) {
        if (Math.random() * 100 < winRate) {
          totalWon += gift.price * multiplier;
          isWin = true;
        }
      }
      
      // For luck gifts, receiver gets 25% of the won amount, admin gets the remaining 75%
      receiverAmount = Math.floor(totalWon * 0.25);
      adminAmount = totalWon - receiverAmount;
    } else {
      // For normal gifts, receiver gets 70% of the gift price, admin gets the remaining 30%
      receiverAmount = Math.floor(totalCost * 0.70);
      adminAmount = totalCost - receiverAmount;
    }

    db.prepare("BEGIN TRANSACTION").run();
    try {
      db.prepare("UPDATE users SET points = points - ?, spent_points = spent_points + ? WHERE id = ?").run(totalCost, totalCost, req.user.id);
      if (receiverAmount > 0) {
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(receiverAmount, receiver_id);
      }
      if (adminAmount > 0) {
        db.prepare("UPDATE users SET points = points + ? WHERE role = 'admin'").run(adminAmount);
      }
      db.prepare("COMMIT").run();
      
      const receiver = db.prepare("SELECT name FROM users WHERE id = ?").get(receiver_id);
      let message = `أرسل ${user.name || 'مستخدم'} ${gift.icon} ${gift.name} (x${quantity}) إلى ${receiver?.name || 'مستخدم'}`;
      if (gift.type === 'luck') {
        message += isWin ? ` (ربح ${receiverAmount} نقطة! 🎉)` : ` (لم يحالفه الحظ 😢)`;
      }

      broadcast({ 
        type: 'GIFT_SENT', 
        roomId: room_id, 
        message,
        giftIcon: gift.icon,
        quantity
      });
      res.json({ success: true, newPoints: user.points - totalCost });
    } catch (e) {
      db.prepare("ROLLBACK").run();
      res.status(500).json({ error: "خطأ في إرسال الهدية" });
    }
  });

  // Charge Requests
  app.post("/api/charge-requests", auth, (req: any, res) => {
    const { amount, price, proof_image } = req.body;
    db.prepare("INSERT INTO charge_requests (user_id, amount, price, proof_image) VALUES (?, ?, ?, ?)").run(req.user.id, amount, price, proof_image);
    broadcast({ type: 'NEW_CHARGE_REQUEST' });
    res.json({ success: true });
  });

  app.get("/api/my-charge-requests", auth, (req: any, res) => {
    const list = db.prepare("SELECT * FROM charge_requests WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(list);
  });

  app.get("/api/admin/charge-requests", adminAuth, (req, res) => {
    const list = db.prepare(`
      SELECT cr.*, u.phone as user_phone, u.name as user_name
      FROM charge_requests cr
      JOIN users u ON cr.user_id = u.id
      ORDER BY cr.created_at DESC
    `).all();
    res.json(list);
  });

  app.patch("/api/admin/charge-requests/:id", adminAuth, (req, res) => {
    const { status } = req.body;
    const reqData = db.prepare("SELECT * FROM charge_requests WHERE id = ?").get(req.params.id);
    
    if (reqData.status === 'pending' && status === 'accepted') {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(reqData.amount, reqData.user_id);
    }
    
    db.prepare("UPDATE charge_requests SET status = ? WHERE id = ?").run(status, req.params.id);
    broadcast({ type: 'UPDATE_CHARGE_REQUEST' });
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result: any = {};
    settings.forEach((s: any) => result[s.key] = s.value);
    res.json({
      rate: parseInt(result.rate),
      transfer_phone: result.transfer_phone,
      min_withdraw_points: parseInt(result.min_withdraw_points),
      win_rate_luck: parseInt(result.win_rate_luck),
      luck_gift_win_rate: parseInt(result.luck_gift_win_rate || '30'),
      luck_gift_multiplier: parseInt(result.luck_gift_multiplier || '5')
    });
  });

  // Admin Settings Update
  app.post("/api/admin/settings", adminAuth, (req, res) => {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value.toString(), key);
    }
    broadcast({ type: 'SETTINGS_CHANGED' });
    res.json({ success: true });
  });

  app.get("/api/admin/users", adminAuth, (req, res) => {
    const users = db.prepare("SELECT id, phone, email, points, package_id, role, spent_points FROM users").all();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", adminAuth, (req, res) => {
    const { points, package_id } = req.body;
    if (points !== undefined) db.prepare("UPDATE users SET points = ? WHERE id = ?").run(points, req.params.id);
    if (package_id !== undefined) db.prepare("UPDATE users SET package_id = ? WHERE id = ?").run(package_id, req.params.id);
    res.json({ success: true });
  });

  // Existing Credit Request Routes
  app.post("/api/requests", auth, (req: any, res) => {
    const { amount, price, wallet_number, bank_account, proof_image } = req.body;
    const result = db.prepare(`
      INSERT INTO requests (user_id, amount, price, wallet_number, bank_account, proof_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, amount, price, wallet_number, bank_account, proof_image);
    broadcast({ type: 'NEW_REQUEST' });
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/my-requests", auth, (req: any, res) => {
    const requests = db.prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    res.json(requests);
  });

  app.get("/api/admin/requests", adminAuth, (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u.phone as user_phone 
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  });

  app.get("/api/users/search", auth, (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const users = db.prepare(`
      SELECT id, name, avatar, phone, points, role 
      FROM users 
      WHERE id = ? OR name LIKE ? OR phone LIKE ?
      LIMIT 20
    `).all(q, `%${q}%`, `%${q}%`);
    res.json(users);
  });

  app.patch("/api/admin/requests/:id", adminAuth, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, req.params.id);
    broadcast({ type: 'UPDATE_REQUEST' });
    res.json({ success: true });
  });

  // Support Chat
  app.get("/api/support/messages", auth, (req: any, res) => {
    const messages = db.prepare("SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC").all(req.user.id);
    // Mark admin messages as read
    db.prepare("UPDATE support_messages SET is_read = 1 WHERE user_id = ? AND sender_type = 'admin'").run(req.user.id);
    res.json(messages);
  });

  app.post("/api/support/messages", auth, (req: any, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Message cannot be empty" });
    const result = db.prepare("INSERT INTO support_messages (user_id, sender_type, message) VALUES (?, 'user', ?)").run(req.user.id, message.trim());
    const newMessage = db.prepare("SELECT * FROM support_messages WHERE id = ?").get(result.lastInsertRowid);
    broadcast({ type: 'NEW_SUPPORT_MESSAGE', message: newMessage });
    res.json(newMessage);
  });

  app.get("/api/admin/support/conversations", adminAuth, (req, res) => {
    const conversations = db.prepare(`
      SELECT 
        u.id as user_id, 
        u.name as user_name, 
        u.phone as user_phone,
        u.avatar as user_avatar,
        (SELECT message FROM support_messages sm WHERE sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages sm WHERE sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM support_messages sm WHERE sm.user_id = u.id AND sm.sender_type = 'user' AND sm.is_read = 0) as unread_count
      FROM users u
      WHERE EXISTS (SELECT 1 FROM support_messages sm WHERE sm.user_id = u.id)
      ORDER BY last_message_time DESC
    `).all();
    res.json(conversations);
  });

  app.get("/api/admin/support/messages/:userId", adminAuth, (req, res) => {
    const userId = req.params.userId;
    const messages = db.prepare("SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC").all(userId);
    // Mark user messages as read
    db.prepare("UPDATE support_messages SET is_read = 1 WHERE user_id = ? AND sender_type = 'user'").run(userId);
    res.json(messages);
  });

  app.post("/api/admin/support/messages/:userId", adminAuth, (req, res) => {
    const userId = req.params.userId;
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Message cannot be empty" });
    const result = db.prepare("INSERT INTO support_messages (user_id, sender_type, message) VALUES (?, 'admin', ?)").run(userId, message.trim());
    const newMessage = db.prepare("SELECT * FROM support_messages WHERE id = ?").get(result.lastInsertRowid);
    broadcast({ type: 'NEW_SUPPORT_MESSAGE', message: newMessage });
    res.json(newMessage);
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