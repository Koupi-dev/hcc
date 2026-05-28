#!/usr/bin/env node
// Usage: node add_account.js <accountID> <password> <displayName>
// 新しいアカウントを追加します。

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const [,, accountId, password, displayName] = process.argv;

if (!accountId || !password || !displayName) {
  console.error('使用方法: node add_account.js <accountID> <password> <displayName>');
  console.error('例: node add_account.js user123 mypassword "山田太郎"');
  process.exit(1);
}

(async () => {
  const db = await open({ 
    filename: path.join(__dirname, 'db.db'), 
    driver: sqlite3.Database 
  });

  console.log('');
  console.log('📊 現在のデータベース設計:');
  console.log('');
  
  // スキーマを表示
  const schema = await db.get(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'"
  );
  
  if (schema) {
    console.log(schema.sql);
    console.log('');
  }

  // 既存のアカウント数を確認
  const countResult = await db.get('SELECT COUNT(*) as count FROM accounts');
  console.log(`現在のアカウント数: ${countResult.count}`);
  console.log('');

  // 既存のアカウントを表示
  if (countResult.count > 0) {
    const accounts = await db.all('SELECT accountId, firstName, displayName FROM accounts');
    console.log('既存のアカウント:');
    accounts.forEach(acc => {
      console.log(`  - ${acc.accountId} (${acc.firstName}, ${acc.displayName || 'N/A'})`);
    });
    console.log('');
  }

  // アカウントIDの重複チェック
  const existing = await db.get('SELECT accountId FROM accounts WHERE accountId = ?', [accountId]);
  if (existing) {
    console.error(`❌ エラー: アカウントID "${accountId}" は既に存在します。`);
    console.error('別のアカウントIDを使用してください。');
    await db.close();
    process.exit(1);
  }

  // パスワードをハッシュ化
  console.log('🔐 パスワードをハッシュ化中...');
  const passwordHash = await bcrypt.hash(password, 12);
  console.log('✅ ハッシュ化完了');
  console.log('');

  // 新しいアカウントを追加
  console.log('➕ 新しいアカウントを追加中...');
  await db.run(
    `INSERT INTO accounts (
      accountId, 
      firstName, 
      passwordHash, 
      displayName, 
      profileColor1, 
      profileColor2, 
      profileBannerColor,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      accountId, 
      displayName.split(' ')[0] || displayName, // firstNameは表示名の最初の部分
      passwordHash, 
      displayName,
      '#4f46e5',
      '#9333ea',
      '#2a2a2e',
      Date.now()
    ]
  );

  console.log('✅ アカウント作成完了！');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 アカウント情報:');
  console.log(`   アカウントID : ${accountId}`);
  console.log(`   表示名       : ${displayName}`);
  console.log(`   パスワード   : ${password}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('このアカウント情報でログインできます。');
  console.log('パスワードは設定画面から変更可能です。');
  console.log('');

  await db.close();
})().catch(err => { 
  console.error('❌ エラー:', err); 
  process.exit(1); 
});
