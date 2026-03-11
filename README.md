# imgX-Clip

画像のY軸方向を指定範囲でクリップするWindowsデスクトップアプリケーション。

## 概要

- **フロントエンド**: React 19 + TypeScript (Vite)
- **バックエンド**: Tauri v2 (Rust)
- **画像処理**: `image` crate
- **対応OS**: Windows 11

## 必要な環境

- [Rust](https://rustup.rs/) 1.70以上
- [Node.js](https://nodejs.org/) 18以上
- Windows 11 (WebView2 / Edge が必要)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd imgX-Clip
```

### 2. npm 依存関係のインストール

```bash
npm install
```

### 3. Rust 依存関係の取得（初回のみ時間がかかります）

```bash
cd src-tauri
cargo fetch
cd ..
```

## 開発コマンド

### 開発サーバーの起動

```bash
npm run tauri dev
```

または

```bash
npx tauri dev
```

### フロントエンドのみ起動

```bash
npm run dev
```

### プロダクションビルド

```bash
npm run tauri build
```

## プロジェクト構成

```
./
├── src/                    # フロントエンド（React）
│   ├── App.tsx             # メインコンポーネント
│   ├── components/
│   │   ├── ImageCanvas.tsx # 画像表示・ドラッグ操作
│   │   ├── PreviewPanel.tsx# 拡大プレビュー
│   │   └── Toolbar.tsx     # 操作ツールバー
│   ├── hooks/
│   │   └── useClipRegion.ts# ドラッグ状態管理フック
│   ├── main.tsx            # エントリーポイント
│   └── styles/
│       └── index.css       # スタイル
├── src-tauri/              # バックエンド（Rust）
│   ├── src/
│   │   ├── main.rs         # Tauriエントリーポイント
│   │   ├── lib.rs          # ライブラリルート・Builder設定
│   │   ├── commands.rs     # IPCコマンド定義
│   │   └── image_processor.rs # 画像処理ロジック
│   ├── capabilities/
│   │   └── default.json    # Tauriセキュリティ設定
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── docs/
```

## IPC コマンド

| コマンド | 説明 |
|---|---|
| `load_image(path)` | 画像を読み込みBase64 + メタデータを返す |
| `clip_and_save(src_path, top_y, bottom_y, dest_path)` | 指定Y範囲でクリップして保存 |

## トラブルシューティング

### `cargo tauri dev` が起動しない

```bash
# WebView2がインストールされているか確認
# Windows 11はデフォルトでインストール済みのはず

# Rust依存関係を再取得
cd src-tauri
cargo clean
cargo fetch
```

### npm install がエラーになる

```bash
# Node.jsのバージョンを確認
node --version  # 18以上が必要

# キャッシュをクリアして再インストール
npm cache clean --force
npm install
```
