const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'hc_secret_change_in_prod';

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168') || origin.includes('10.')) {
      callback(null, true);
    } else {
      callback(null, true); // allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 5e7,
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168') || origin.includes('10.')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
  upgradeTimeout: 10000,
});

let db;

// Voice state: { socketId: { socketId, accountId, internalId, displayName, roomId, isMuted, isSpeaking, isScreenSharing } }
let voiceUsers = {};

function generate20DigitId() {
  let id = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    id += bytes[i] % 10;
  }
  if (id[0] === '0') id = String(Math.floor(Math.random() * 9) + 1) + id.slice(1);
  return id;
}

async function initDB() {
  db = await open({ filename: path.join(__dirname, 'db.db'), driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      accountId TEXT PRIMARY KEY,
      internalId TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      displayName TEXT,
      pronouns TEXT,
      bio TEXT,
      profileColor1 TEXT DEFAULT '#4f46e5',
      profileColor2 TEXT DEFAULT '#9333ea',
      profileBannerColor TEXT DEFAULT '#2a2a2e',
      avatarUrl TEXT,
      bannerUrl TEXT,
      createdAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS channels (
      internalId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      displayName TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'text'
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user TEXT,
      timestamp INTEGER,
      text TEXT,
      imageUrl TEXT,
      channelId TEXT,
      replyTo TEXT,
      reactions TEXT,
      fileData TEXT
    );
    CREATE TABLE IF NOT EXISTS dm_channels (
      channelId TEXT PRIMARY KEY,
      member1 TEXT NOT NULL,
      member2 TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS read_state (
      accountId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      lastReadAt INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (accountId, channelId)
    );
  `);

  // Migrate: add internalId column to accounts if missing (for old DBs)
  try {
    await db.get('SELECT internalId FROM accounts LIMIT 1');
  } catch (e) {
    console.log('[DB] Migrating accounts table: adding internalId column...');
    await db.exec(`ALTER TABLE accounts ADD COLUMN internalId TEXT`);
    // Backfill existing accounts with generated IDs
    const rows = await db.all('SELECT accountId FROM accounts WHERE internalId IS NULL');
    for (const row of rows) {
      let iid;
      while (true) {
        iid = generate20DigitId();
        const dup = await db.get('SELECT internalId FROM accounts WHERE internalId = ?', [iid]);
        if (!dup) break;
      }
      await db.run('UPDATE accounts SET internalId = ? WHERE accountId = ?', [iid, row.accountId]);
    }
    // Create unique index
    try {
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_internalId ON accounts(internalId)');
    } catch (e2) { /* ignore */ }
  }

  // Migrate: add fileData column to messages if missing
  try {
    await db.get('SELECT fileData FROM messages LIMIT 1');
  } catch (e) {
    await db.exec('ALTER TABLE messages ADD COLUMN fileData TEXT');
  }

  // Seed default channels if empty
  const channelCount = await db.get('SELECT COUNT(*) as count FROM channels');
  if (channelCount.count === 0) {
    const defaults = [
      { name: 'rule', displayName: 'ルール', category: 'text' },
      { name: 'jarujaru', displayName: 'ジャルジャル', category: 'text' },
      { name: 'general', displayName: '全般', category: 'text' },
      { name: 'vc1', displayName: 'VC 1', category: 'vc' },
      { name: 'vc2', displayName: 'VC 2', category: 'vc' },
      { name: 'vc3', displayName: 'VC 3', category: 'vc' },
    ];
    for (const ch of defaults) {
      let iid;
      while (true) {
        iid = generate20DigitId();
        const dup = await db.get('SELECT internalId FROM channels WHERE internalId = ?', [iid]);
        if (!dup) break;
      }
      await db.run(
        'INSERT INTO channels (internalId, name, displayName, category) VALUES (?, ?, ?, ?)',
        [iid, ch.name, ch.displayName, ch.category]
      );
    }
    console.log('[DB] Default channels seeded.');
  }
}
initDB().catch(err => console.error('[DB] init error:', err));

// ---- JWT middleware ----
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ---- Auth API ----
app.post('/auth/login', authLimiter, async (req, res) => {
  const { accountId, password } = req.body;
  if (!accountId || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    if (!db) await initDB();
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [accountId]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ accountId: user.accountId, internalId: user.internalId }, JWT_SECRET, { expiresIn: '3d' });
    const { passwordHash, ...profile } = user;
    res.json({ token, profile });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [req.user.accountId]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { passwordHash, ...profile } = user;
    const newToken = jwt.sign({ accountId: user.accountId, internalId: user.internalId }, JWT_SECRET, { expiresIn: '3d' });
    res.json({ profile, token: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/auth/profile', requireAuth, async (req, res) => {
  const { displayName, pronouns, bio, profileColor1, profileColor2, profileBannerColor, avatarUrl, bannerUrl } = req.body;
  try {
    if (!db) await initDB();
    await db.run(
      `UPDATE accounts SET
        displayName = COALESCE(?, displayName),
        pronouns = COALESCE(?, pronouns),
        bio = COALESCE(?, bio),
        profileColor1 = COALESCE(?, profileColor1),
        profileColor2 = COALESCE(?, profileColor2),
        profileBannerColor = COALESCE(?, profileBannerColor),
        avatarUrl = COALESCE(?, avatarUrl),
        bannerUrl = COALESCE(?, bannerUrl)
      WHERE accountId = ?`,
      [displayName, pronouns, bio, profileColor1, profileColor2, profileBannerColor, avatarUrl, bannerUrl, req.user.accountId]
    );
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [req.user.accountId]);
    const { passwordHash, ...profile } = user;
    io.emit('profile_updated', { accountId: req.user.accountId, profile });
    res.json({ profile });
  } catch (err) {
    console.error('[Profile] update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/change-password', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    if (!db) await initDB();
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [req.user.accountId]);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });
    const hash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE accounts SET passwordHash = ? WHERE accountId = ?', [hash, req.user.accountId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Channels API ----
app.get('/channels', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const channels = await db.all('SELECT * FROM channels ORDER BY rowid');
    res.json({ channels });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/channels', requireAuth, async (req, res) => {
  const { name, displayName, category } = req.body;
  if (!name || !displayName || !category) return res.status(400).json({ error: 'Missing fields' });
  try {
    if (!db) await initDB();
    let internalId;
    while (true) {
      internalId = generate20DigitId();
      const dup = await db.get('SELECT internalId FROM channels WHERE internalId = ?', [internalId]);
      if (!dup) break;
    }
    await db.run(
      'INSERT INTO channels (internalId, name, displayName, category) VALUES (?, ?, ?, ?)',
      [internalId, name, displayName, category]
    );
    const channel = await db.get('SELECT * FROM channels WHERE internalId = ?', [internalId]);
    io.emit('channel_created', channel);
    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/channels/:internalId', requireAuth, async (req, res) => {
  const { displayName } = req.body;
  try {
    if (!db) await initDB();
    await db.run('UPDATE channels SET displayName = ? WHERE internalId = ?', [displayName, req.params.internalId]);
    const channel = await db.get('SELECT * FROM channels WHERE internalId = ?', [req.params.internalId]);
    io.emit('channel_updated', channel);
    res.json({ channel });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- DM API ----
function dmChannelId(a, b) {
  return [a, b].sort().join('__dm__');
}

app.post('/dm/open', requireAuth, async (req, res) => {
  const { targetAccountId } = req.body;
  if (!targetAccountId) return res.status(400).json({ error: 'Missing targetAccountId' });
  const me = req.user.accountId;
  const channelId = dmChannelId(me, targetAccountId);
  try {
    if (!db) await initDB();
    const existing = await db.get('SELECT * FROM dm_channels WHERE channelId = ?', [channelId]);
    if (!existing) {
      await db.run(
        'INSERT INTO dm_channels (channelId, member1, member2, createdAt) VALUES (?, ?, ?, ?)',
        [channelId, ...([me, targetAccountId].sort()), Date.now()]
      );
    }
    res.json({ channelId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/dm/list', requireAuth, async (req, res) => {
  const me = req.user.accountId;
  try {
    if (!db) await initDB();
    const rows = await db.all(
      'SELECT * FROM dm_channels WHERE member1 = ? OR member2 = ? ORDER BY createdAt DESC',
      [me, me]
    );
    const result = rows.map(r => ({
      channelId: r.channelId,
      partnerAccountId: r.member1 === me ? r.member2 : r.member1,
    }));
    res.json({ dms: result });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Read state ----
app.post('/read', requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'Missing channelId' });
  try {
    if (!db) await initDB();
    await db.run(
      `INSERT INTO read_state (accountId, channelId, lastReadAt) VALUES (?, ?, ?)
       ON CONFLICT(accountId, channelId) DO UPDATE SET lastReadAt = excluded.lastReadAt`,
      [req.user.accountId, channelId, Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/unread', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const rows = await db.all(`
      SELECT m.channelId, COUNT(*) as count
      FROM messages m
      LEFT JOIN read_state rs ON rs.accountId = ? AND rs.channelId = m.channelId
      WHERE m.timestamp > COALESCE(rs.lastReadAt, 0) AND m.user != ?
      GROUP BY m.channelId
    `, [req.user.accountId, req.user.accountId]);
    const counts = {};
    rows.forEach(r => { if (r.count > 0) counts[r.channelId] = r.count; });
    res.json({ counts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Members ----
app.get('/members', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const all = await db.all('SELECT accountId, internalId, firstName, displayName, pronouns, bio, profileColor1, profileColor2, profileBannerColor, avatarUrl FROM accounts');
    res.json({ members: all });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Socket.io ----
const socketAccounts = {}; // socketId -> { accountId, internalId, displayName }

function broadcastVoiceState() {
  io.emit('voice_state_update', Object.values(voiceUsers));
}

function cleanupVoiceUser(socketId) {
  const user = voiceUsers[socketId];
  if (!user) return;
  const rid = user.roomId;
  delete voiceUsers[socketId];
  io.to(rid).emit('user_left_voice', { socketId, internalId: user.internalId });
  broadcastVoiceState();
}

io.on('connection', (socket) => {
  console.log(`[Socket] +${socket.id}`);
  socket.emit('voice_state_update', Object.values(voiceUsers));

  // Auth
  socket.on('authenticate', async ({ token }) => {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (!db) await initDB();
      const user = await db.get('SELECT accountId, internalId, displayName, firstName FROM accounts WHERE accountId = ?', [payload.accountId]);
      if (!user) { socket.emit('authenticated', { ok: false }); return; }
      socketAccounts[socket.id] = {
        accountId: user.accountId,
        internalId: user.internalId,
        displayName: user.displayName || user.firstName,
      };
      socket.emit('authenticated', { ok: true, internalId: user.internalId });
      io.emit('online_users', Object.values(socketAccounts).map(u => u.internalId));
    } catch {
      socket.emit('authenticated', { ok: false });
    }
  });

  // ---- Chat ----
  socket.on('join_room', async (roomId) => {
    for (const r of socket.rooms) {
      if (r !== socket.id) {
        socket.leave(r);
      }
    }
    socket.join(roomId);
    try {
      if (!db) await initDB();
      const rows = await db.all(
        'SELECT * FROM messages WHERE channelId = ? ORDER BY timestamp DESC, rowid DESC LIMIT 30', [roomId]
      );
      const messages = rows.reverse().map(r => ({
        ...r,
        replyTo: r.replyTo ? JSON.parse(r.replyTo) : null,
        reactions: r.reactions ? JSON.parse(r.reactions) : {},
        file: r.fileData ? JSON.parse(r.fileData) : null,
      }));
      socket.emit('message_history', { channelId: roomId, messages, hasMore: rows.length === 30 });
    } catch (err) { console.error('[DB] join_room:', err); }
  });

  socket.on('load_more', async ({ channelId, before }) => {
    try {
      if (!db) await initDB();
      const rows = await db.all(
        'SELECT * FROM messages WHERE channelId = ? AND timestamp < ? ORDER BY timestamp DESC, rowid DESC LIMIT 30',
        [channelId, before]
      );
      const messages = rows.reverse().map(r => ({
        ...r,
        replyTo: r.replyTo ? JSON.parse(r.replyTo) : null,
        reactions: r.reactions ? JSON.parse(r.reactions) : {},
        file: r.fileData ? JSON.parse(r.fileData) : null,
      }));
      socket.emit('load_more_result', { messages, hasMore: rows.length === 30 });
    } catch (err) { console.error('[DB] load_more:', err); }
  });

  socket.on('send_message', async (data) => {
    try {
      if (!db) await initDB();
      
      // Strict security write check for ルール and ジャルジャル channels
      const isRestricted = 
        data.channelId === '59519306642961598809' || 
        data.channelId === '76452634932084464634';
      if (isRestricted) {
        const sender = socketAccounts[socket.id];
        if (!sender || sender.accountId !== 'user_4cd9001d') {
          console.warn(`[Blocked] Blocked message to restricted channel ${data.channelId} from user:`, sender?.accountId);
          return;
        }
      }

      await db.run(
        `INSERT OR REPLACE INTO messages (id, user, timestamp, text, imageUrl, channelId, replyTo, reactions, fileData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.user, data.timestamp, data.text, data.imageUrl, data.channelId,
         data.replyTo ? JSON.stringify(data.replyTo) : null,
         JSON.stringify(data.reactions || {}),
         data.file ? JSON.stringify(data.file) : null]
      );
      io.to(data.channelId).emit('receive_message', data);
    } catch (err) { console.error('[DB] send_message:', err); }
  });

  socket.on('add_reaction', async ({ messageId, channelId, reactions }) => {
    try {
      if (!db) await initDB();
      await db.run('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), messageId]);
      io.to(channelId).emit('reaction_updated', { messageId, reactions });
    } catch (err) { console.error('[DB] add_reaction:', err); }
  });

  socket.on('delete_message', async ({ messageId, channelId }) => {
    try {
      if (!db) await initDB();
      await db.run('DELETE FROM messages WHERE id = ?', [messageId]);
      io.to(channelId).emit('message_deleted', { messageId });
    } catch (err) { console.error('[DB] delete_message:', err); }
  });

  // ---- Voice (WebRTC signaling) ----
  socket.on('join_voice', ({ roomId }) => {
    const account = socketAccounts[socket.id];
    if (!roomId || !account) return;

    // Leave previous room if any
    if (voiceUsers[socket.id]) {
      const oldRid = voiceUsers[socket.id].roomId;
      socket.leave(`vc:${oldRid}`);
      io.to(`vc:${oldRid}`).emit('user_left_voice', { socketId: socket.id, internalId: account.internalId });
    }

    voiceUsers[socket.id] = {
      socketId: socket.id,
      internalId: account.internalId,
      displayName: account.displayName,
      roomId,
      isMuted: false,
      isSpeaking: false,
      isScreenSharing: false,
    };

    socket.join(`vc:${roomId}`);

    // Tell the new user about existing members
    const roomMembers = Object.values(voiceUsers).filter(u => u.roomId === roomId && u.socketId !== socket.id);
    socket.emit('voice_room_members', roomMembers);

    // Tell existing members about the new user
    socket.to(`vc:${roomId}`).emit('user_joined_voice', voiceUsers[socket.id]);

    broadcastVoiceState();
  });

  // WebRTC signaling: offer
  socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc_offer', { fromSocketId: socket.id, offer });
  });

  // WebRTC signaling: answer
  socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc_answer', { fromSocketId: socket.id, answer });
  });

  // WebRTC signaling: ICE candidate
  socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc_ice_candidate', { fromSocketId: socket.id, candidate });
  });

  socket.on('update_voice_state', ({ isMuted, isSpeaking, isScreenSharing }) => {
    if (voiceUsers[socket.id]) {
      if (isMuted !== undefined) voiceUsers[socket.id].isMuted = isMuted;
      if (isSpeaking !== undefined) voiceUsers[socket.id].isSpeaking = isSpeaking;
      if (isScreenSharing !== undefined) voiceUsers[socket.id].isScreenSharing = isScreenSharing;
      broadcastVoiceState();
    }
  });

  socket.on('leave_voice', () => {
    if (voiceUsers[socket.id]) {
      const rid = voiceUsers[socket.id].roomId;
      socket.leave(`vc:${rid}`);
      cleanupVoiceUser(socket.id);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] -${socket.id} (${reason})`);
    delete socketAccounts[socket.id];
    io.emit('online_users', Object.values(socketAccounts).map(u => u.internalId));
    cleanupVoiceUser(socket.id);
  });

  socket.on('error', err => console.error(`[Socket] error ${socket.id}:`, err));
});

server.listen(3001, () => console.log('[Server] port 3001'));
