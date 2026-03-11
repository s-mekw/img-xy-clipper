# TASK-0001 設定作業実行記録

## 作業概要

- **タスクID**: TASK-0001
- **作業内容**: Tauri v2 + React (TypeScript) プロジェクト初期設定
- **実行日時**: 2026-03-11
- **実行者**: Claude (AI)

## 設計文書参照

- **参照文書**:
  - `docs/design/imgx-clip/architecture.md`
  - `docs/design/imgx-clip/dataflow.md`
  - `docs/tasks/imgx-clip/TASK-0001.md`
- **関連要件**: REQ-401

## 実行した作業

### 1. Tauri CLI のインストール

```bash
npm install -g @tauri-apps/cli@latest
```

- tauri-cli v2.10.1 をグローバルインストール

### 2. Tauri v2 + React プロジェクトの作成

一時ディレクトリ（`/tmp/imgx-clip-tmp`）で `create-tauri-app` を使ってプロジェクトを生成し、プロジェクトディレクトリにコピー。

```bash
cd /tmp
npm create tauri-app@latest imgx-clip-tmp -- --template react-ts --manager npm --yes
cp -r /tmp/imgx-clip-tmp/* /path/to/imgX-Clip/
```

**テンプレート**: `react-ts` (React 19 + TypeScript + Vite)

### 3. プロジェクト名の修正

`imgx-clip-tmp` → `imgx-clip` / `imgX-Clip` に修正。

**変更ファイル**:
- `src-tauri/Cargo.toml`: `name = "imgx-clip"`, `lib.name = "imgx_clip_lib"`
- `src-tauri/src/main.rs`: `imgx_clip_lib::run()` に更新
- `src-tauri/tauri.conf.json`: `productName = "imgX-Clip"`, `identifier = "com.shota.imgx-clip"`
- `package.json`: `name = "imgx-clip"`

### 4. ウィンドウサイズの設定

設計文書に基づき、アプリサイズを調整。

```json
// src-tauri/tauri.conf.json
{
  "windows": [
    {
      "title": "imgX-Clip",
      "width": 1200,
      "height": 800
    }
  ]
}
```

### 5. Rust 依存関係の追加

`src-tauri/Cargo.toml` に以下を追加:

```toml
tauri-plugin-dialog = "2"
image = "0.25"
base64 = "0.22"
```

### 6. フロントエンドディレクトリ構造の作成

アーキテクチャ設計に基づくディレクトリを作成:

```bash
mkdir -p src/components
mkdir -p src/hooks
mkdir -p src/styles
```

**作成ファイル**:
- `src/components/ImageCanvas.tsx` - プレースホルダー（TASK-0002で実装）
- `src/components/PreviewPanel.tsx` - プレースホルダー（TASK-0003で実装）
- `src/components/Toolbar.tsx` - プレースホルダー（TASK-0004で実装）
- `src/hooks/useClipRegion.ts` - プレースホルダー（TASK-0003で実装）
- `src/styles/index.css` - 基本スタイル

### 7. Rust モジュールの作成

**作成ファイル**:
- `src-tauri/src/commands.rs` - IPCコマンド定義（`load_image`, `clip_and_save`）
- `src-tauri/src/image_processor.rs` - 画像処理ロジック（image crateを使用）

**更新ファイル**:
- `src-tauri/src/lib.rs` - モジュール登録・plugin追加

### 8. Tauri Capability 設定

ファイルダイアログアクセスを許可:

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save"
  ]
}
```

### 9. npm 依存関係のインストール

```bash
cd /path/to/imgX-Clip
npm install
```

132パッケージをインストール。脆弱性 0件。

### 10. Rust ビルド確認

```bash
cd src-tauri
cargo check
```

**結果**: `Finished dev profile [unoptimized + debuginfo]` - エラーなし

## 作業結果

- [x] Tauri v2 + React (TypeScript) プロジェクトが作成されている
- [x] Rust 側に `image` crate と `base64` crate が追加されている
- [x] フロントエンド側に `@tauri-apps/api` が追加されている（テンプレートに含まれていた）
- [x] `tauri-plugin-dialog` が追加されている
- [x] アーキテクチャ設計に基づくディレクトリ構造が作成されている
- [x] `cargo check` でエラーなくコンパイル確認済み
- [x] `npm install` 完了

## 備考

- `cargo tauri dev` の実際の起動確認は direct-verify フェーズで実施
- コンポーネントのスケルトン（ImageCanvas, PreviewPanel, Toolbar, useClipRegion）はプレースホルダーとして作成済み。後続タスクで実装予定

## 次のステップ

- `/tsumiki:direct-verify` を実行して設定を確認
- TASK-0002: 画像読み込み機能の実装
- TASK-0003: ドラッグ操作とリアルタイムプレビューの実装
