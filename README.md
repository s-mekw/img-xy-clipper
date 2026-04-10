# imgX-Clip

画像のY軸方向をクリップ（トリミング）するWindowsデスクトップアプリケーションです。

画像を読み込み、マウスドラッグでY軸方向の範囲を選択し、選択範囲のみをクリップして保存できます。

## 機能一覧

- **画像読み込み** — PNG / JPEG 画像をファイルダイアログまたはドラッグ＆ドロップで読み込み
- **Y軸クリップ選択** — マウスドラッグで上端・下端のY座標を指定し、選択範囲を除去して上下を結合
- **Y軸トリミング** — トリム線2本で画像の上下を切り取り
- **右側塗りつぶし** — fillRightX垂直線で指定した位置より右側を塗りつぶし（#fffdea）
- **拡大鏡（マグニファイア）** — ドラッグ操作時にピクセル単位の拡大鏡を表示
- **リアルタイムプレビュー** — クリップ・トリミング結果をリアルタイムでプレビュー表示
- **上書き保存 / 別名で保存** — config.jsonのsaveModeで保存フローを制御（上書き時は確認ダイアログ付き）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TypeScript |
| バックエンド | Rust (Tauri v2) |
| ビルドツール | Vite 7 / Cargo |
| テスト | Vitest / Rust テスト |

## 必要な環境

- [Node.js](https://nodejs.org/) v18 以上
- [Rust](https://www.rust-lang.org/tools/install) 1.70 以上
- [Tauri CLI v2](https://v2.tauri.app/start/prerequisites/)
- Windows 10 / 11（WebView2 が必要。Windows 11 はデフォルトでインストール済み）

## セットアップ・起動方法

```bash
# リポジトリをクローン
git clone <repository-url>
cd imgX-Clip

# 依存パッケージをインストール
npm install

# 開発サーバー起動（フロントエンド + Tauriウィンドウを同時起動）
npm run tauri dev
```

## 開発コマンド一覧

```bash
# 開発サーバー起動（Tauriウィンドウ付き）
npm run tauri dev

# フロントエンドのみ開発サーバー起動
npm run dev

# フロントエンドビルド（dist/ に出力）
npm run build

# Tauriアプリのリリースビルド（インストーラーを生成）
npm run tauri build

# テスト実行
npm test

# テスト（watchモード）
npm run test:watch

# TypeScript型チェック
npx tsc --noEmit --skipLibCheck

# Rustコンパイル確認
cd src-tauri && cargo check

# Rustテスト実行
cd src-tauri && cargo test
```

## プロジェクト構成

```
imgX-Clip/
├── src/                        # フロントエンド (React)
│   ├── App.tsx                 # メインアプリコンポーネント
│   ├── main.tsx                # エントリーポイント
│   ├── config.json             # アプリ設定（saveMode等）
│   ├── components/
│   │   ├── ImageCanvas.tsx     # 画像表示・ドラッグ操作・拡大鏡
│   │   ├── PreviewPanel.tsx    # クリップ結果プレビュー
│   │   └── Toolbar.tsx         # ツールバー（読み込み・保存・別名保存）
│   ├── hooks/
│   │   └── useClipRegion.ts    # ドラッグ状態管理フック
│   ├── types/                  # TypeScript型定義
│   ├── utils/
│   │   └── clipMath.ts         # クリップ計算ユーティリティ
│   └── styles/
│       └── index.css
├── src-tauri/                  # バックエンド (Rust)
│   ├── src/
│   │   ├── main.rs             # Tauriエントリーポイント
│   │   ├── lib.rs              # ライブラリルート・Builder設定
│   │   ├── commands.rs         # IPCコマンド定義
│   │   └── image_processor.rs  # 画像処理ロジック
│   ├── capabilities/
│   │   └── default.json        # Tauriセキュリティ設定
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── docs/                       # 設計・実装ドキュメント
```

## IPC コマンド仕様

フロントエンドとRustバックエンド間の通信は Tauri IPC で行います。

| コマンド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `load_image` | `path: string` | `ImageMetadata` | 画像を読み込み、Base64エンコードとメタデータ（幅・高さ・形式）を返す |
| `clip_and_save` | `src_path, top_y, bottom_y, trim_top_y, trim_bottom_y, fill_right_x, dest_path` | `void` | クリップ・トリミング・右側塗りつぶしを適用して保存 |

### ImageMetadata

```typescript
{
  base64: string;   // Base64エンコードされた画像データ
  width: number;    // 画像の幅（ピクセル）
  height: number;   // 画像の高さ（ピクセル）
  format: string;   // 画像形式（"png" | "jpeg"）
}
```

## 対応画像形式

| 形式 | 読み込み | 保存 |
|------|---------|------|
| PNG  | ○ | ○ |
| JPEG | ○ | ○ |

画像形式の判定はファイル拡張子ではなくバイトシグネチャ（マジックナンバー）に基づいて行われるため、拡張子が偽装されたファイルも正しく判定されます。

## トラブルシューティング

### `npm run tauri dev` が起動しない

```bash
# WebView2がインストールされているか確認（Windows 11はデフォルトでインストール済み）

# Rust依存関係を再取得
cd src-tauri
cargo clean
cargo fetch
```

### npm install がエラーになる

```bash
# Node.jsのバージョンを確認（v18以上が必要）
node --version

# キャッシュをクリアして再インストール
npm cache clean --force
npm install
```

## ライセンス

MIT
