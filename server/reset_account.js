#!/usr/bin/env node
// Usage: node reset_account.js
// データベースの全データを削除します（確認あり）

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
  const db = await open({ 
    filename: path.join(__dirname, 'db.db'), 
    driver: sqlite3.Database 
  });

  console.log('');
  console.log('⚠️  警告: データベース全削除');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 現在のデータ量を表示
  const accountCount = await db.get('SELECT COUNT(*) as count FROM accounts');
  const messageCount = await db.get('SELECT COUNT(*) as count FROM messages');
  const dmCount = await db.get('SELECT COUNT(*) as count FROM dm_channels');
  const whiteboardCount = await db.get('SELECT COUNT(*) as count FROM whiteboard');

  console.log('削除されるデータ:');
  console.log(`  - アカウント    : ${accountCount.count}件`);
  console.log(`  - メッセージ    : ${messageCount.count}件`);
  console.log(`  - DMチャンネル  : ${dmCount.count}件`);
  console.log(`  - ホワイトボード: ${whiteboardCount.count}件`);
  console.log('');

  if (accountCount.count > 0) {
    const accounts = await db.all('SELECT accountId, displayName FROM accounts');
    console.log('削除されるアカウント:');
    accounts.forEach(acc => {
      console.log(`  - ${acc.accountId} (${acc.displayName})`);
    });
    console.log('');
  }

  console.log('⚠️  この操作は取り消せません！');
  console.log('');

  // 確認
  const answer = await question('本当に全データを削除しますか？ (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('');
    console.log('キャンセルしました。');
    console.log('');
    rl.close();
    await db.close();
    process.exit(0);
  }

  // 二重確認
  const confirm = await question('もう一度確認します。全データを削除しますか？ (YES/no): ');
  
  if (confirm !== 'YES') {
    console.log('');
    console.log('キャンセルしました。');
    console.log('');
    rl.close();
    await db.close();
    process.exit(0);
  }

  console.log('');
  console.log('🗑️  全データを削除中...');
  
  // 全データを削除
  await db.run('DELETE FROM accounts');
  console.log('   ✅ アカウント削除完了');
  
  await db.run('DELETE FROM messages');
  console.log('   ✅ メッセージ削除完了');
  
  await db.run('DELETE FROM dm_channels');
  console.log('   ✅ DMチャンネル削除完了');
  
  await db.run('DELETE FROM read_state');
  console.log('   ✅ 既読状態削除完了');
  
  await db.run('DELETE FROM whiteboard');
  console.log('   ✅ ホワイトボード削除完了');

  console.log('');
  console.log('✅ 全データの削除が完了しました！');
  console.log('');
  console.log('新しいアカウントを作成するには:');
  console.log('  node add_account.js <accountID> <password> <displayName>');
  console.log('');

  rl.close();
  await db.close();
})().catch(err => { 
  console.error('❌ エラー:', err);
  rl.close();
  process.exit(1); 
});
