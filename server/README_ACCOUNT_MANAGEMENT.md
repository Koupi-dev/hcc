# アカウント管理スクリプト

データベースのアカウントを管理するためのコマンドラインツールです。

## 📋 利用可能なコマンド

### 1. アカウント一覧表示
```bash
node list_account.js
```

全アカウントの情報を表示します。
- アカウントID
- 表示名
- 代名詞
- 自己紹介
- プロフィールカラー
- 作成日時
- メッセージ数
- DM数

### 2. アカウント追加
```bash
node add_account.js <accountID> <password> <displayName>
```

**例:**
```bash
node add_account.js user123 mypassword "山田太郎"
node add_account.js alice pass123 "Alice"
node add_account.js bob secretpass "Bob Smith"
```

**機能:**
- 新しいアカウントを作成
- パスワードを自動的にハッシュ化（bcrypt）
- アカウントIDの重複チェック
- デフォルトのプロフィールカラーを設定

**注意:**
- アカウントIDは一意である必要があります
- 既存のアカウントIDを使用するとエラーになります
- パスワードは12ラウンドのbcryptでハッシュ化されます

### 3. アカウント削除
```bash
node remove_account.js <accountID>
```

**例:**
```bash
node remove_account.js user123
```

**機能:**
- 指定されたアカウントを削除
- 関連するデータも全て削除:
  - メッセージ
  - DMチャンネル
  - 既読状態
  - ホワイトボードデータ

**注意:**
- この操作は取り消せません
- アカウントが存在しない場合はエラーになります

### 4. 全データリセット
```bash
node reset_account.js
```

**機能:**
- データベースの全データを削除
- 二重確認プロンプトあり
- 削除前にデータ量を表示

**警告:**
- ⚠️ この操作は取り消せません！
- 全アカウント、メッセージ、DMなどが完全に削除されます
- 確認プロンプトで "YES" と入力する必要があります

## 🔧 使用例

### 初回セットアップ
```bash
# 1. アカウントを作成
node add_account.js admin admin123 "管理者"
node add_account.js user1 pass123 "ユーザー1"
node add_account.js user2 pass456 "ユーザー2"

# 2. アカウント一覧を確認
node list_account.js
```

### アカウント管理
```bash
# アカウントを追加
node add_account.js newuser password "新しいユーザー"

# アカウント一覧を確認
node list_account.js

# 特定のアカウントを削除
node remove_account.js olduser

# 全データをリセット（開発環境のみ推奨）
node reset_account.js
```

## 📊 データベース構造

### accounts テーブル
- `accountId` (TEXT, PRIMARY KEY) - アカウントID
- `firstName` (TEXT) - 名前
- `passwordHash` (TEXT) - パスワードハッシュ
- `displayName` (TEXT) - 表示名
- `pronouns` (TEXT) - 代名詞
- `bio` (TEXT) - 自己紹介
- `profileColor1` (TEXT) - プロフィールカラー1
- `profileColor2` (TEXT) - プロフィールカラー2
- `profileBannerColor` (TEXT) - バナーカラー
- `avatarUrl` (TEXT) - アバターURL
- `bannerUrl` (TEXT) - バナーURL
- `createdAt` (INTEGER) - 作成日時

### 関連テーブル
- `messages` - メッセージ
- `dm_channels` - DMチャンネル
- `read_state` - 既読状態
- `whiteboard` - ホワイトボードデータ

## 🔒 セキュリティ

### パスワードハッシュ化
- bcryptを使用（12ラウンド）
- パスワードは平文で保存されません
- ハッシュ化されたパスワードのみデータベースに保存

### アカウントID検証
- 重複チェックあり
- 一意性が保証されます

## ⚠️ 注意事項

1. **本番環境での使用**
   - `reset_account.js` は本番環境で使用しないでください
   - データのバックアップを取ってから操作してください

2. **パスワード管理**
   - コマンドライン引数でパスワードを渡すため、履歴に残る可能性があります
   - 本番環境では環境変数や設定ファイルの使用を検討してください

3. **削除操作**
   - アカウント削除とデータリセットは取り消せません
   - 実行前に必ず確認してください

## 🐛 トラブルシューティング

### エラー: アカウントIDが既に存在します
```
❌ エラー: アカウントID "user123" は既に存在します。
```
**解決方法:** 別のアカウントIDを使用するか、既存のアカウントを削除してください。

### エラー: アカウントが見つかりません
```
❌ エラー: アカウントID "user123" が見つかりません。
```
**解決方法:** `list_account.js` で正しいアカウントIDを確認してください。

### エラー: データベースファイルが見つかりません
```
❌ エラー: SQLITE_CANTOPEN: unable to open database file
```
**解決方法:** `server/db.db` が存在することを確認してください。サーバーを一度起動してデータベースを初期化してください。

## 📝 開発者向け情報

### スクリプトの場所
```
server/
├── add_account.js      # アカウント追加
├── remove_account.js   # アカウント削除
├── reset_account.js    # 全データリセット
├── list_account.js     # アカウント一覧
└── db.db              # SQLiteデータベース
```

### 依存パッケージ
- `sqlite3` - SQLiteデータベース
- `sqlite` - Promise版SQLite
- `bcryptjs` - パスワードハッシュ化
- `readline` - 対話型プロンプト（reset_account.jsのみ）

### カスタマイズ
各スクリプトは独立しているため、必要に応じて機能を追加・変更できます。
