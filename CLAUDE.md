# imgX-Clip

画像のY軸方向をクリップするWindowsデスクトップアプリ（Tauri v2 + React TypeScript）

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **バックエンド**: Rust (Tauri v2)
- **ビルドツール**: Vite / Cargo

## 開発コマンド

### アプリケーション実行

```bash
# 開発サーバー起動（フロントエンド + Tauriウィンドウを同時起動）
npm run tauri dev

# フロントエンドのみ開発サーバー起動
npm run dev
```

### ビルド

```bash
# フロントエンドビルド（dist/ に出力）
npm run build

# Tauriアプリのリリースビルド（インストーラーを生成）
npm run tauri build
```

### Rust チェック

```bash
# Rustコンパイル確認（src-tauri/ で実行）
cd src-tauri && cargo check

# Rustのみビルド
cd src-tauri && cargo build
```

### TypeScript チェック

```bash
# TypeScript型チェック（エラーがなければ何も出力されない）
npx tsc --noEmit --skipLibCheck
```

## プロジェクト構成

```
imgX-Clip/
├── src/                    # フロントエンド (React)
│   ├── components/         # Reactコンポーネント
│   │   ├── ImageCanvas.tsx # 画像表示・操作 (TASK-0002で実装)
│   │   ├── PreviewPanel.tsx # プレビュー (TASK-0003で実装)
│   │   └── Toolbar.tsx     # ツールバー (TASK-0004で実装)
│   ├── hooks/
│   │   └── useClipRegion.ts # ドラッグ操作フック (TASK-0003で実装)
│   └── styles/
│       └── index.css
├── src-tauri/              # バックエンド (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs          # Tauriアプリのエントリポイント
│   │   ├── commands.rs     # IPCコマンド定義
│   │   └── image_processor.rs # 画像処理ロジック
│   ├── capabilities/
│   │   └── default.json    # ファイルアクセス権限設定
│   └── tauri.conf.json     # Tauri設定（ウィンドウサイズ等）
└── package.json
```

## Tauri IPCコマンド

| コマンド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `load_image` | `path: string` | `ImageMetadata` | 画像読み込みとBase64エンコード |
| `clip_and_save` | `src_path, top_y, bottom_y, dest_path` | `void` | Y範囲クリップ・保存 |
