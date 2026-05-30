#!/usr/bin/env node
// Usage: node make_account <userID> <password> <firstName>
// Creates a new account with a random 20-digit numeric internalId.

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const [,, accountId, password, firstName] = process.argv;

if (!accountId || !password || !firstName) {
  console.error('Usage: node make_account <userID> <password> <firstName>');
  console.error('Example: node make_account koupi mypass123 こうぴ');
  process.exit(1);
}

function generate20DigitId() {
  // Generate a 20-digit numeric-only ID
  let id = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    id += bytes[i] % 10;
  }
  // Ensure first digit is not 0
  if (id[0] === '0') id = String(Math.floor(Math.random() * 9) + 1) + id.slice(1);
  return id;
}

(async () => {
  const db = await open({ filename: path.join(__dirname, 'db.db'), driver: sqlite3.Database });

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
    )
  `);

  const existing = await db.get('SELECT accountId FROM accounts WHERE accountId = ?', [accountId]);
  if (existing) {
    console.error(`❌ Account "${accountId}" already exists.`);
    await db.close();
    process.exit(1);
  }

  // Generate unique 20-digit internalId
  let internalId;
  while (true) {
    internalId = generate20DigitId();
    const dup = await db.get('SELECT internalId FROM accounts WHERE internalId = ?', [internalId]);
    if (!dup) break;
  }

  const hash = await bcrypt.hash(password, 12);

  await db.run(
    `INSERT INTO accounts (accountId, internalId, firstName, passwordHash, displayName, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, internalId, firstName, hash, firstName, Date.now()]
  );

  console.log('');
  console.log('✅ Account created!');
  console.log(`   Account ID  : ${accountId}`);
  console.log(`   Internal ID : ${internalId}`);
  console.log(`   First Name  : ${firstName}`);
  console.log(`   Password    : ${password}`);
  console.log('');

  await db.close();
})().catch(err => { console.error(err); process.exit(1); });
