#!/usr/bin/env node
// Usage: node remove_account.js <accountID>
// 指定されたアカウントを削除します。

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const [,, accountId] = process.argv;

if (!accountId) {
  console.error('使用方法: node remove_account.js <accountID>');
  console.error('例: node remove_account.js user123');
  process.exit(1);
}

(async () => {
  const db = await open({ 
    filename: path.join(__dirname, 'db.db'), 
    driver: sqlite3.Database 
  });

  console.log('');
  console.log('🔍 アカウントを検索中...');
  
  // アカウントの存在確認
  const account = await db.get(
    'SELECT accountId, firstName, displayName FROM accounts WHERE accountId = ?',
    [accountId]
  );

  if (!account) {
    console.error(`❌ エラー: アカウントID "${accountId}" が見つかりません。`);
    await db.close();
    process.exit(1);
  }

  console.log('');
  console.log('📝 削除対象のアカウント:');
  console.log(`   アカウントID : ${account.accountId}`);
  console.log(`   表示名       : ${account.displayName || account.firstName}`);
  console.log('');

  // アカウントに関連するデータを削除
  console.log('🗑️  アカウントデータを削除中...');
  
  // メッセージを削除
  const messagesResult = await db.run('DELETE FROM messages WHERE user = ?', [accountId]);
  console.log(`   - メッセージ: ${messagesResult.changes}件削除`);
  
  // DMチャンネルを削除
  const dmResult = await db.run(
    'DELETE FROM dm_channels WHERE member1 = ? OR member2 = ?',
    [accountId, accountId]
  );
  console.log(`   - DMチャンネル: ${dmResult.changes}件削除`);
  
  // 既読状態を削除
  const readResult = await db.run('DELETE FROM read_state WHERE accountId = ?', [accountId]);
  console.log(`   - 既読状態: ${readResult.changes}件削除`);
  
  // ホワイトボードデータを削除
  try {
    const whiteboardResult = await db.run('DELETE FROM whiteboard WHERE accountId = ?', [accountId]);
    console.log(`   - ホワイトボード: ${whiteboardResult.changes}件削除`);
  } catch (e) {
    // ホワイトボードテーブルが存在しない場合はスキップ
  }
  
  // アカウント本体を削除
  await db.run('DELETE FROM accounts WHERE accountId = ?', [accountId]);
  console.log(`   - アカウント: 削除完了`);
  
  console.log('');
  console.log('✅ アカウント削除完了！');
  console.log('');

  await db.close();
})().catch(err => { 
  console.error('❌ エラー:', err); 
  process.exit(1); 
});
