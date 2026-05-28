const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
// const { PeerServer } = require('peer'); // 外部PeerJSを使用するためコメントアウト
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'hc_secret_change_in_prod';

const app = express();

// リクエストログミドルウェア（デバッグ用）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors({ 
  origin: (origin, callback) => {
    // ローカルホスト、cloudflared、localhost のバリエーションを許可
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://hc.koupi.dev',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
    ];
    
    // ローカルネットワークからのアクセスも許可
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168') || origin.includes('10.')) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // デバッグ用：全て許可
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // プリフライトキャッシュ: 24時間
}));
app.use(express.json({ limit: '10mb' }));

// IP ごと 5req/1min のレートリミット（認証エンドポイント用）
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 5e7,
  cors: { 
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://hc.koupi.dev',
        'https://localhost:3000',
        'https://127.0.0.1:3000',
      ];
      
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168') || origin.includes('10.')) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // デバッグ用：全て許可
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

// PeerServerは外部で起動するためコメントアウト
// const peerServer = PeerServer({
//   port: 9000, path: '/', allow_discovery: true,
//   alive_timeout: 60000, key: 'peerjs', concurrent_limit: 5000,
// });
// peerServer.on('connection', c => console.log(`[Peer] +${c.getId()}`));
// peerServer.on('disconnect', c => console.log(`[Peer] -${c.getId()}`));
// peerServer.on('error', (err) => {
//   if (err.code === 'EADDRINUSE') {
//     console.error('[Peer] ⚠️  ポート 9000 は既に使用中です。別のターミナルでPeerJSが起動している可能性があります。');
//     console.error('[Peer] 💡 解決方法: pkill -f peerjs を実行してください');
//   } else {
//     console.error('[Peer] エラー:', err.message);
//   }
// });

console.log('[Peer] 外部PeerJSサーバーを使用します (ポート 9000)');

let db;
let voiceUsers = {};

async function initDB() {
  db = await open({ filename: path.join(__dirname, 'db.db'), driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, user TEXT, timestamp INTEGER, text TEXT,
      imageUrl TEXT, channelId TEXT, replyTo TEXT, reactions TEXT
    );
    CREATE TABLE IF NOT EXISTS whiteboard (
      id INTEGER PRIMARY KEY,
      snapshot TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
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
    CREATE TABLE IF NOT EXISTS accounts (
      accountId TEXT PRIMARY KEY,
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
  `);
}
initDB().catch(err => console.error('[DB] init error:', err));

// ---- JWT ミドルウェア ----
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

// ---- 認証 API ----
app.post('/auth/login', authLimiter, async (req, res) => {
  const { accountId, password } = req.body;
  if (!accountId || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    if (!db) await initDB();
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [accountId]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ accountId: user.accountId }, JWT_SECRET, { expiresIn: '3d' });
    const { passwordHash, ...profile } = user;
    res.json({ token, profile });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// トークン検証 & プロフィール取得（アクセスのたびにトークンをリフレッシュ）
app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const user = await db.get('SELECT * FROM accounts WHERE accountId = ?', [req.user.accountId]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { passwordHash, ...profile } = user;
    // 3日以内にアクセスがあれば新しいトークンを発行してリセット
    const newToken = jwt.sign({ accountId: user.accountId }, JWT_SECRET, { expiresIn: '3d' });
    res.json({ profile, token: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// プロフィール更新
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
    // 接続中の全クライアントにプロフィール更新を通知
    io.emit('profile_updated', { accountId: req.user.accountId, profile });
    res.json({ profile });
  } catch (err) {
    console.error('[Profile] update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// パスワード変更
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

// DM チャンネル ID 生成（順序固定）
function dmChannelId(a, b) {
  return [a, b].sort().join('__dm__');
}

// DM チャンネルを開く（なければ作成）
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

// 自分の DM チャンネル一覧
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

// 既読位置を更新（チャンネルを開いたとき）
app.post('/read', requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'Missing channelId' });
  const accountId = req.user.accountId;
  try {
    if (!db) await initDB();
    await db.run(
      `INSERT INTO read_state (accountId, channelId, lastReadAt) VALUES (?, ?, ?)
       ON CONFLICT(accountId, channelId) DO UPDATE SET lastReadAt = excluded.lastReadAt`,
      [accountId, channelId, Date.now()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 全チャンネルの未読数を取得（ログイン時・リロード時）
app.get('/unread', requireAuth, async (req, res) => {
  const accountId = req.user.accountId;
  try {
    if (!db) await initDB();
    // 各チャンネルで lastReadAt より新しいメッセージ数を集計
    const rows = await db.all(`
      SELECT m.channelId,
             COUNT(*) as count
      FROM messages m
      LEFT JOIN read_state rs
        ON rs.accountId = ? AND rs.channelId = m.channelId
      WHERE m.timestamp > COALESCE(rs.lastReadAt, 0)
        AND m.user != ?
      GROUP BY m.channelId
    `, [accountId, accountId]);
    const counts = {};
    rows.forEach(r => { if (r.count > 0) counts[r.channelId] = r.count; });
    res.json({ counts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// オンラインメンバー一覧（Socket 接続中）
app.get('/members', requireAuth, async (req, res) => {
  try {
    if (!db) await initDB();
    const all = await db.all('SELECT accountId, firstName, displayName, pronouns, bio, profileColor1, profileColor2, profileBannerColor, avatarUrl FROM accounts');
    res.json({ members: all });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Socket.io ----
function broadcastVoiceState() {
  io.emit('voice_state_update', Object.values(voiceUsers));
}

function cleanupVoiceUser(socketId) {
  const user = voiceUsers[socketId];
  if (!user) return;
  const rid = user.roomId;
  delete voiceUsers[socketId];
  io.emit('user_left_voice', { socketId });
  broadcastVoiceState();
}

// 接続中ソケット → accountId のマップ
const socketAccounts = {};

io.on('connection', (socket) => {
  console.log(`[Socket] +${socket.id}`);
  socket.emit('voice_state_update', Object.values(voiceUsers));

  // 認証
  socket.on('authenticate', ({ token }) => {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socketAccounts[socket.id] = payload.accountId;
      socket.emit('authenticated', { ok: true });
      // オンラインメンバー更新をブロードキャスト
      io.emit('online_users', Object.values(socketAccounts));
    } catch {
      socket.emit('authenticated', { ok: false });
    }
  });

  // ---- Chat ----
  socket.on('join_room', async (roomId) => {
    socket.join(roomId);
    try {
      if (!db) await initDB();
      // 最新 30 件だけ返す
      const rows = await db.all(
        'SELECT * FROM messages WHERE channelId = ? ORDER BY timestamp DESC LIMIT 30', [roomId]
      );
      const messages = rows.reverse().map(r => ({
        ...r,
        replyTo: r.replyTo ? JSON.parse(r.replyTo) : null,
        reactions: r.reactions ? JSON.parse(r.reactions) : [],
      }));
      socket.emit('message_history', { messages, hasMore: rows.length === 30 });
    } catch (err) { console.error('[DB] join_room:', err); }
  });

  // 過去メッセージの追加ロード（before = 一番古いメッセージの timestamp）
  socket.on('load_more', async ({ channelId, before }) => {
    try {
      if (!db) await initDB();
      const rows = await db.all(
        'SELECT * FROM messages WHERE channelId = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 30',
        [channelId, before]
      );
      const messages = rows.reverse().map(r => ({
        ...r,
        replyTo: r.replyTo ? JSON.parse(r.replyTo) : null,
        reactions: r.reactions ? JSON.parse(r.reactions) : [],
      }));
      socket.emit('load_more_result', { messages, hasMore: rows.length === 30 });
    } catch (err) { console.error('[DB] load_more:', err); }
  });

  socket.on('send_message', async (data) => {
    try {
      if (!db) await initDB();
      await db.run(
        `INSERT OR REPLACE INTO messages (id, user, timestamp, text, imageUrl, channelId, replyTo, reactions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.user, data.timestamp, data.text, data.imageUrl, data.channelId,
         data.replyTo ? JSON.stringify(data.replyTo) : null, JSON.stringify(data.reactions || [])]
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

  // ---- Voice ----
  socket.on('join_voice', ({ roomId, peerId, userState }) => {
    if (!roomId || !peerId) return;
    if (voiceUsers[socket.id]) {
      const oldRid = voiceUsers[socket.id].roomId;
      socket.leave(oldRid);
      io.to(oldRid).emit('user_left_voice', { socketId: socket.id });
    }
    voiceUsers[socket.id] = { socketId: socket.id, peerId, userState: { ...userState, connectedRoom: roomId }, roomId };
    socket.join(roomId);
    const roomMembers = Object.values(voiceUsers).filter(u => u.roomId === roomId && u.socketId !== socket.id);
    socket.emit('voice_room_members', roomMembers);
    socket.to(roomId).emit('user_joined_voice', { socketId: socket.id, peerId, roomId, userState });
    broadcastVoiceState();
  });

  socket.on('update_voice_state', ({ roomId, userState }) => {
    if (voiceUsers[socket.id]) {
      voiceUsers[socket.id].userState = { ...userState, connectedRoom: roomId };
      broadcastVoiceState();
    }
  });

  socket.on('leave_voice', () => {
    if (voiceUsers[socket.id]) {
      const rid = voiceUsers[socket.id].roomId;
      socket.leave(rid);
      cleanupVoiceUser(socket.id);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] -${socket.id} (${reason})`);
    delete socketAccounts[socket.id];
    io.emit('online_users', Object.values(socketAccounts));
    cleanupVoiceUser(socket.id);
  });

  socket.on('error', err => console.error(`[Socket] error ${socket.id}:`, err));

  // ---- Whiteboard ----
  socket.on('wb_join', async () => {
    socket.join('whiteboard');
    try {
      if (!db) await initDB();
      const row = await db.get('SELECT snapshot FROM whiteboard WHERE id = 1');
      if (row) socket.emit('wb_snapshot', { snapshot: row.snapshot });
    } catch (err) { console.error('[WB] join error:', err); }
  });

  // ストローク中のリアルタイム描画（他ユーザーへ転送、socketId を付与）
  socket.on('wb_draw', (data) => {
    socket.to('whiteboard').emit('wb_draw', { ...data, socketId: socket.id });
  });

  // ストローク確定 → 他ユーザーへ転送
  socket.on('wb_stroke_end', (data) => {
    socket.to('whiteboard').emit('wb_stroke_end', { ...data, socketId: socket.id });
  });

  // カーソル位置
  socket.on('wb_cursor', (data) => {
    socket.to('whiteboard').emit('wb_cursor', { ...data, socketId: socket.id });
  });

  // キャンバス全体のスナップショット保存（定期的にクライアントから送る）
  socket.on('wb_save_snapshot', async ({ snapshot }) => {
    try {
      if (!db) await initDB();
      await db.run(
        'INSERT OR REPLACE INTO whiteboard (id, snapshot, updatedAt) VALUES (1, ?, ?)',
        [snapshot, Date.now()]
      );
    } catch (err) { console.error('[WB] save error:', err); }
  });

  // キャンバスクリア
  socket.on('wb_clear', () => {
    io.to('whiteboard').emit('wb_clear');
    db?.run('DELETE FROM whiteboard WHERE id = 1').catch(() => {});
  });
});

server.listen(3001, () => console.log('[Server] port 3001'));
