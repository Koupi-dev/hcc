#!/usr/bin/env node
// Usage: node list_account.js
// 全アカウントを一覧表示します。

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
  const db = await open({ 
    filename: path.join(__dirname, 'db.db'), 
    driver: sqlite3.Database 
  });

  console.log('');
  console.log('📊 アカウント一覧');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 全アカウントを取得
  const accounts = await db.all(`
    SELECT 
      accountId, 
      firstName, 
      displayName, 
      pronouns,
      bio,
      profileColor1,
      profileColor2,
      createdAt
    FROM accounts 
    ORDER BY createdAt DESC
  `);

  if (accounts.length === 0) {
    console.log('アカウントが登録されていません。');
    console.log('');
    console.log('新しいアカウントを作成するには:');
    console.log('  node add_account.js <accountID> <password> <displayName>');
    console.log('');
  } else {
    console.log(`登録アカウント数: ${accounts.length}`);
    console.log('');

    for (const acc of accounts) {
      // 各アカウントの統計情報を取得
      const messageCount = await db.get(
        'SELECT COUNT(*) as count FROM messages WHERE user = ?',
        [acc.accountId]
      );
      
      const dmCount = await db.get(
        'SELECT COUNT(*) as count FROM dm_channels WHERE member1 = ? OR member2 = ?',
        [acc.accountId, acc.accountId]
      );

      console.log(`┌─ ${acc.accountId}`);
      console.log(`│  表示名     : ${acc.displayName || acc.firstName}`);
      if (acc.pronouns) {
        console.log(`│  代名詞     : ${acc.pronouns}`);
      }
      if (acc.bio) {
        console.log(`│  自己紹介   : ${acc.bio}`);
      }
      console.log(`│  カラー     : ${acc.profileColor1} / ${acc.profileColor2}`);
      console.log(`│  作成日時   : ${new Date(acc.createdAt).toLocaleString('ja-JP')}`);
      console.log(`│  メッセージ : ${messageCount.count}件`);
      console.log(`│  DM         : ${dmCount.count}件`);
      console.log(`└${'─'.repeat(60)}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('コマンド:');
    console.log('  アカウント追加: node add_account.js <accountID> <password> <displayName>');
    console.log('  アカウント削除: node remove_account.js <accountID>');
    console.log('  全データリセット: node reset_account.js');
    console.log('');
  }

  await db.close();
})().catch(err => { 
  console.error('❌ エラー:', err); 
  process.exit(1); 
});
