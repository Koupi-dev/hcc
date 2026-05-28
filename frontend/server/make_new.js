#!/usr/bin/env node
// Usage: node make_new <accountID> <firstName>
// Creates a new account and prints a temporary password.

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const [,, accountId, firstName] = process.argv;

if (!accountId || !firstName) {
  console.error('Usage: node make_new <accountID> <firstName>');
  process.exit(1);
}

(async () => {
  const db = await open({ filename: path.join(__dirname, 'db.db'), driver: sqlite3.Database });

  await db.exec(`
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
    )
  `);

  const existing = await db.get('SELECT accountId FROM accounts WHERE accountId = ?', [accountId]);
  if (existing) {
    console.error(`Account "${accountId}" already exists.`);
    process.exit(1);
  }

  const tempPassword = crypto.randomBytes(6).toString('hex'); // 12文字
  const hash = await bcrypt.hash(tempPassword, 12);

  await db.run(
    `INSERT INTO accounts (accountId, firstName, passwordHash, displayName, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [accountId, firstName, hash, firstName, Date.now()]
  );

  console.log('');
  console.log('✅ Account created!');
  console.log(`   Account ID : ${accountId}`);
  console.log(`   First Name : ${firstName}`);
  console.log(`   Password   : ${tempPassword}`);
  console.log('');
  console.log('Share the password with the user. They can change it in Settings.');

  await db.close();
})().catch(err => { console.error(err); process.exit(1); });
