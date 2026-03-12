# TASK-0002 TDD開発ノート：画像読み込みIPCコマンド実装

**生成日**: 2026-03-12
**タスクID**: TASK-0002
**要件名**: imgx-clip
**フェーズ**: Phase 1 - 基盤・バックエンド

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **バックエンド言語**: Rust (Edition 2021)
- **フレームワーク**: Tauri v2
- **画像処理**: `image` crate v0.25
- **エンコーディング**: `base64` crate v0.22
- **シリアライズ**: `serde` v1 + `serde_json` v1
- **ビルドツール**: Cargo

### 関連フロントエンド

- **フレームワーク**: React 19 + TypeScript + Vite
- **Tauri連携**: `@tauri-apps/api` でIPCコマンド呼び出し

### アーキテクチャパターン

- **IPC通信**: Tauri フロントエンド ↔ Rust バックエンド（型安全）
- **画像処理方式**: Rust側で読み込み→Base64エンコード→メタデータ抽出してフロントエンドに返却
- **対応形式**: PNG, JPG/JPEG（`image` crateの対応範囲）

### 参照元

- `src-tauri/Cargo.toml` - 依存関係定義
- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ
- `docs/spec/imgx-clip/requirements.md` - 要件定義（REQ-001）

---

## 2. 開発ルール

### プロジェクト固有ルール

- 新規プロジェクトのため特定のコーディング規約なし
- Rust側は標準的なTauri v2パターンに従う
- エラーハンドリングは日本語エラーメッセージで返却

### コーディング規約

- **Rust**:
  - `cargo fmt` でコード整形
  - `#[tauri::command]` で IPCコマンド定義
  - `Result<T, String>` でエラーハンドリング（文字列でエラー通知）

- **TypeScript/React**:
  - 型定義は明示的に記述
  - `@tauri-apps/api` の `invoke` 関数でIPCコマンド呼び出し

### IPC通信の型定義

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub base64: String,     // Base64エンコードされた画像データ
    pub width: u32,         // 画像幅（ピクセル）
    pub height: u32,        // 画像高さ（ピクセル）
    pub format: String,     // 画像形式（"png" または "jpeg"）
}
```

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計

---

## 3. 関連実装

### 既存実装の構造

TASK-0001で既に以下が実装済み：

- `src-tauri/src/commands.rs` - `load_image` コマンド定義（スケルトン）
- `src-tauri/src/image_processor.rs` - 画像処理関数（スケルトン）
- `src-tauri/src/lib.rs` - モジュール登録・plugin初期化
- `src-tauri/src/main.rs` - Tauriエントリーポイント
- `src-tauri/Cargo.toml` - 依存関係（image, base64 既に追加済み）

### 現在の実装状況（TASK-0002の基盤）

#### `src-tauri/src/commands.rs`

```rust
use serde::{Deserialize, Serialize};
use crate::image_processor;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub base64: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
}

#[tauri::command]
pub fn load_image(path: String) -> Result<ImageMetadata, String> {
    image_processor::load_image(&path)
}

#[tauri::command]
pub fn clip_and_save(
    src_path: String,
    top_y: u32,
    bottom_y: u32,
    dest_path: String,
) -> Result<(), String> {
    image_processor::clip_and_save(&src_path, top_y, bottom_y, &dest_path)
}
```

**現状**: コマンド定義のみ存在。実装ロジックは `image_processor` モジュールに委譲

#### `src-tauri/src/image_processor.rs`

```rust
use base64::Engine;
use image::{GenericImageView, ImageFormat};
use std::io::Cursor;
use crate::commands::ImageMetadata;

pub fn load_image(path: &str) -> Result<ImageMetadata, String> {
    let img = image::open(path).map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?;
    let (width, height) = img.dimensions();

    // フォーマット判定
    let format = match image::ImageReader::open(path)
        .map_err(|e| format!("ファイルを開けませんでした: {}", e))?
        .format()
    {
        Some(ImageFormat::Png) => "png",
        Some(ImageFormat::Jpeg) => "jpeg",
        _ => "png",
    };

    // Base64エンコード
    let mut buf = Cursor::new(Vec::new());
    let encode_format = if format == "jpeg" {
        ImageFormat::Jpeg
    } else {
        ImageFormat::Png
    };
    img.write_to(&mut buf, encode_format)
        .map_err(|e| format!("画像のエンコードに失敗しました: {}", e))?;

    let base64 = base64::engine::general_purpose::STANDARD.encode(buf.get_ref());

    Ok(ImageMetadata {
        base64,
        width,
        height,
        format: format.to_string(),
    })
}

pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {
    // ... クリップ・保存ロジック
}
```

**現状**: 完全実装済み（TASK-0001で実装）

#### `src-tauri/src/lib.rs`

```rust
pub mod commands;
pub mod image_processor;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_image,
            commands::clip_and_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**現状**: コマンド登録完了

### 参照パターン

- **エラーハンドリング**: `Result<T, String>` で エラーを文字列で返却
- **Base64エンコード**: `base64::engine::general_purpose::STANDARD.encode()`
- **画像フォーマット判定**: `image::ImageReader::format()` で拡張子から判定
- **画像メタデータ抽出**: `img.dimensions()` で幅・高さ取得

### 参照元

- `src-tauri/src/commands.rs` - コマンド定義
- `src-tauri/src/image_processor.rs` - 画像処理実装
- `src-tauri/src/lib.rs` - モジュール・コマンド登録
- `src-tauri/src/main.rs` - Tauriアプリエントリーポイント
- `docs/design/imgx-clip/dataflow.md` - 機能1：画像読み込みデータフロー

---

## 4. 設計文書

### アーキテクチャ・API仕様

#### IPCコマンド: `load_image`

**入力**:
- `path: String` - ファイルパス（絶対パス）

**出力**:
```rust
{
  "base64": String,   // Base64エンコード済み画像データ
  "width": u32,       // 画像幅（ピクセル）
  "height": u32,      // 画像高さ（ピクセル）
  "format": String    // "png" または "jpeg"
}
```

**エラーケース**:
- ファイルが存在しない: `"ファイルを開けませんでした: ..."`
- 非対応形式: `"画像の読み込みに失敗しました: ..."`
- エンコード失敗: `"画像のエンコードに失敗しました: ..."`

#### IPCコマンド: `clip_and_save`

**入力**:
- `src_path: String` - 元画像のファイルパス
- `top_y: u32` - クリップ開始Y座標
- `bottom_y: u32` - クリップ終了Y座標
- `dest_path: String` - 保存先ファイルパス

**出力**:
- `Ok(())` - 成功
- `Err(String)` - エラーメッセージ

**エラーケース**:
- `top_y >= bottom_y`: `"上端Y座標は下端Y座標より小さい必要があります"`
- `bottom_y > 画像の高さ`: `"下端Y座標 {bottom_y} が画像の高さ {height} を超えています"`
- 読み込み失敗: `"画像の読み込みに失敗しました: ..."`
- 保存失敗: `"画像の保存に失敗しました: ..."`

### データモデル

```typescript
// フロントエンド側の型定義（推定）
interface ImageMetadata {
  base64: string;    // Base64エンコード済み画像
  width: number;
  height: number;
  format: "png" | "jpeg";
}
```

### システムデータフロー

1. **ユーザーがファイル選択**
   - Toolbar が `open_dialog()` でファイルダイアログを開く
   - ユーザーが画像ファイルを選択

2. **Rust側で画像読み込み・変換**
   - `load_image(path)` IPC呼び出し
   - `image` crate で画像デコード
   - Base64エンコード
   - メタデータ（幅・高さ・形式）抽出

3. **フロントエンドで受け取り・表示**
   - `ImageMetadata` 受け取り
   - Canvas に Base64画像を描画
   - 初期状態で2本の水平線を配置

### 参照元

- `docs/design/imgx-clip/architecture.md` - システム全体設計
- `docs/design/imgx-clip/dataflow.md` - データフロー図・シーケンス図
- `docs/tasks/imgx-clip/TASK-0002.md` - タスク定義

---

## 5. テスト関連情報

### テストフレームワーク・設定

**Rust側**: 標準的なRustユニットテストを使用

- テストファイル: `src-tauri/src/` 内に `#[cfg(test)]` モジュール定義
- テスト実行: `cargo test` コマンド
- テストユーティリティ: 標準ライブラリのみ

**フロントエンド側**: (TASK-0002ではフロントエンドテストは記載なし)

### テストの構成・命名パターン

#### Rust ユニットテスト

- **テストモジュール配置**: 実装ファイル内 `#[cfg(test)] mod tests { }`
- **テスト関数命名**: `test_<機能>_<条件>` 形式
  - 例: `test_load_image_png_success`
  - 例: `test_load_image_invalid_format`
- **テスト対象**: `pub fn` で公開されたユーティリティ関数

#### テスト実行環境

- `cargo test` で全テストを実行
- テストは `--release` モード・デバッグモード両方で動作確認

### テスト関連の主要パターン

#### テストデータの配置

- **テスト画像**: プロジェクト内に テスト用PNGやJPEGを配置
  - サンプル: `tests/fixtures/sample.png`, `tests/fixtures/sample.jpg`
  - 小さいサイズ（100x100px程度）を推奨

#### モック・ユーティリティ

- **ファイルシステム**: テスト時は実ファイルを使用（sandbox化しない）
- **エラーケース**: 意図的に無効なファイルパス・フォーマットで検証

### テスト実行フロー（TASK-0002での想定テスト）

#### 正常系: PNG読み込み

```rust
#[test]
fn test_load_image_png_success() {
    // GIVEN: PNG画像ファイルが存在する
    // WHEN: load_image() を呼び出す
    // THEN: Base64データと正しいメタデータが返る
}
```

#### 正常系: JPG読み込み

```rust
#[test]
fn test_load_image_jpg_success() {
    // GIVEN: JPG画像ファイルが存在する
    // WHEN: load_image() を呼び出す
    // THEN: Base64データと正しいメタデータが返る
}
```

#### 異常系: 非対応形式

```rust
#[test]
fn test_load_image_unsupported_format() {
    // GIVEN: GIF等の非対応形式ファイル
    // WHEN: load_image() を呼び出す
    // THEN: Err(String) が返る
}
```

#### 異常系: ファイルが存在しない

```rust
#[test]
fn test_load_image_file_not_found() {
    // GIVEN: 存在しないファイルパス
    // WHEN: load_image() を呼び出す
    // THEN: Err(String) が返る
}
```

### テスト実行コマンド

```bash
# 全テスト実行
cd src-tauri
cargo test

# 特定のテストのみ実行
cargo test test_load_image_png_success

# テスト出力を詳細表示
cargo test -- --nocapture
```

### 参照元

- `docs/tasks/imgx-clip/TASK-0002.md` - テスト要件
- `src-tauri/` - Rust標準テスト設定
- `docs/design/imgx-clip/dataflow.md` - テストケース参考

---

## 6. 注意事項

### 技術的制約

- **対応画像形式**: PNG, JPG/JPEG のみ（`image` crateの対応範囲）
  - GIF, WebP等の他形式は非対応（エラー返却）

- **Windows 11環境前提**: Tauri v2はWebView2（Edge）を使用
  - Windows 10 1803以降で動作（11推奨）

- **ファイルパス**: 絶対パスを要求（相対パスは未検証）

### セキュリティ・パフォーマンス要件

- **ファイルアクセス権限**: Tauri v2 Capability で必要最小限に制限
  - 設定: `src-tauri/capabilities/default.json`
  - 権限: `dialog:allow-open`, `dialog:allow-save`

- **画像読み込み**: 大規模画像でもRust側の高速処理で対応
  - Base64変換: メモリ効率的（`Cursor`のバッファ使用）

- **IPC型安全性**: Tauri v2の型安全なコマンド定義により インジェクション防止

### 実装上の注意点

1. **エラーメッセージ**: ユーザー向け日本語メッセージで返却
2. **フォーマット判定**: ファイル拡張子から判定（`ImageReader::format()`使用）
3. **Base64エンコード**: `base64::engine::general_purpose::STANDARD` を使用
4. **メモリ効率**: `Cursor::new(Vec::new())` でメモリバッファを確保

### 参照元

- `docs/design/imgx-clip/architecture.md` - セキュリティ設計
- `src-tauri/capabilities/default.json` - ファイルアクセス権限
- `docs/tasks/imgx-clip/TASK-0002.md` - 完了条件・注意事項

---

## 7. 実装進捗・参考資料

### 関連文書マップ

| 文書 | パス | 用途 |
|------|------|------|
| タスク定義 | `docs/tasks/imgx-clip/TASK-0002.md` | タスク概要・完了条件 |
| 要件定義 | `docs/spec/imgx-clip/requirements.md` | REQ-001の要件確認 |
| アーキテクチャ | `docs/design/imgx-clip/architecture.md` | システム全体設計 |
| データフロー | `docs/design/imgx-clip/dataflow.md` | 機能1の詳細フロー・シーケンス |
| 前タスク実装報告 | `docs/implements/imgx-clip/TASK-0001/setup-report.md` | 初期設定の確認 |
| Cargo設定 | `src-tauri/Cargo.toml` | 依存関係 |

### 実装ファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| `src-tauri/src/lib.rs` | モジュール・コマンド登録 | ✅ 完成済み |
| `src-tauri/src/main.rs` | Tauriエントリーポイント | ✅ 完成済み |
| `src-tauri/src/commands.rs` | IPC コマンド定義 | ✅ 完成済み |
| `src-tauri/src/image_processor.rs` | 画像処理実装 | ✅ 完成済み |
| `src-tauri/Cargo.toml` | Rust依存関係 | ✅ 完成済み |

### TDD開発フロー

1. **要件定義フェーズ** (`/tsumiki:tdd-requirements`)
   - TASK-0002の詳細要件を展開
   - テストケースを定義

2. **テストケース設計** (`/tsumiki:tdd-testcases`)
   - 単体テストのGiven/When/Then定義
   - テストデータ（テスト画像）の準備

3. **RED フェーズ** (`/tsumiki:tdd-red`)
   - テストを実装（失敗することを確認）
   - `cargo test` で失敗確認

4. **GREEN フェーズ** (`/tsumiki:tdd-green`)
   - テストが通るように最小実装
   - `cargo test --release` で動作確認

5. **REFACTOR フェーズ** (`/tsumiki:tdd-refactor`)
   - コード品質向上
   - エラーハンドリング改善
   - `cargo fmt`, `cargo clippy` 実行

6. **検証フェーズ** (`/tsumiki:tdd-verify-complete`)
   - 完了条件チェックリスト確認
   - 統合テスト（Tauri全体）確認
   - ドキュメント更新

### 次ステップ

- `/tsumiki:tdd-requirements imgx-clip TASK-0002` - 詳細要件定義
- `/tsumiki:tdd-testcases imgx-clip TASK-0002` - テストケース生成
- `/tsumiki:tdd-red imgx-clip TASK-0002` - テスト実装（RED）
- `/tsumiki:tdd-green imgx-clip TASK-0002` - 最小実装（GREEN）

---

**ノート完成日**: 2026-03-12

