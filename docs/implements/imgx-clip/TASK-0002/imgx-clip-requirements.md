# TASK-0002 要件定義書: 画像読み込みIPCコマンド (load_image)

**タスクID**: TASK-0002
**機能名**: load_image IPCコマンド
**要件名**: imgx-clip
**作成日**: 2026-03-12
**フェーズ**: Phase 1 - 基盤・バックエンド

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測

---

## 1. 機能の概要

### 何をする機能か 🔵

ファイルパスを受け取り、画像ファイルを読み込み、Base64エンコードした画像データと画像メタデータ（幅・高さ・形式）をフロントエンドに返すRust側のIPCコマンド。

- **参照元**: TASK-0002タスク定義、requirements.md REQ-001

### どのような問題を解決するか 🔵

ユーザーが選択した画像ファイルをWebView（React）上のCanvas描画で表示するために、Rust側で画像をデコードしBase64文字列として安全にフロントエンドへ転送する。フロントエンドは直接ファイルシステムにアクセスできないため、Tauri IPC経由でのデータ受け渡しが必要。

- **参照元**: ユーザーストーリー1「画像の読み込みとクリップ」、architecture.md システム構成図

### 想定されるユーザー 🔵

画像のY軸クリップ操作を行うデスクトップアプリケーションのユーザー。本コマンドはフロントエンドから呼び出される内部APIであり、エンドユーザーが直接意識する機能ではないが、ユーザーの「ファイル選択→画像表示」操作を支える基盤機能。

- **参照元**: requirements.md ストーリー1

### システム内での位置づけ 🔵

- **レイヤー**: Tauri バックエンド（Rust）
- **呼び出し元**: フロントエンド Toolbar コンポーネント → `invoke("load_image", { path })`
- **役割**: データフローの起点。画像ファイル → Base64 + メタデータ変換の責務を担う
- **依存関係**: `image` crate（デコード）、`base64` crate（エンコード）

- **参照したEARS要件**: REQ-001, REQ-401
- **参照した設計文書**: architecture.md システム構成図、dataflow.md 機能1シーケンス図

---

## 2. 入力・出力の仕様

### 入力パラメータ 🔵

| パラメータ | 型 | 説明 | 制約 |
|---|---|---|---|
| `path` | `String` | 画像ファイルの絶対パス | 有効なファイルシステムパス。ファイルが存在すること。対応形式: PNG, JPG/JPEG |

- **参照元**: architecture.md IPCコマンド定義、commands.rs 実装

### 出力値 🔵

**正常系**: `Result<ImageMetadata, String>` の `Ok` パターン

```rust
pub struct ImageMetadata {
    pub base64: String,     // Base64エンコードされた画像データ（STANDARD方式）
    pub width: u32,         // 画像幅（ピクセル）
    pub height: u32,        // 画像高さ（ピクセル）
    pub format: String,     // 画像形式: "png" または "jpeg"
}
```

**JSON出力例**:

```json
{
  "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "width": 1920,
  "height": 1080,
  "format": "png"
}
```

**異常系**: `Result<ImageMetadata, String>` の `Err` パターン（日本語エラーメッセージ）

- **参照元**: commands.rs ImageMetadata構造体定義、note.md IPC通信の型定義

### 入出力の関係性 🔵

1. `path` で指定されたファイルを `image::open()` で読み込み
2. `img.dimensions()` で幅・高さを取得
3. `image::ImageReader::format()` で画像フォーマットを判定
4. 元の形式で `Cursor<Vec<u8>>` にエンコード後、`base64::STANDARD.encode()` でBase64文字列化
5. `ImageMetadata` 構造体として返却

- **参照元**: image_processor.rs 実装、dataflow.md 機能1詳細ステップ

### データフロー 🔵

```
ファイルパス(String)
  → image::open() でデコード (DynamicImage)
  → dimensions() でメタデータ抽出 (width, height)
  → ImageReader::format() でフォーマット判定 ("png" | "jpeg")
  → write_to(Cursor) で元形式にエンコード
  → base64::STANDARD.encode() でBase64文字列化
  → ImageMetadata { base64, width, height, format }
```

- **参照したEARS要件**: REQ-001
- **参照した設計文書**: dataflow.md 機能1シーケンス図、image_processor.rs

---

## 3. 制約条件

### 対応画像形式 🔵

- PNG (`ImageFormat::Png`)
- JPEG/JPG (`ImageFormat::Jpeg`)
- その他の形式（GIF, WebP, BMP等）: `image::open()` でデコード可能なものは読み込まれるが、フォーマット判定で "png" にフォールバック

**注意**: 現在の実装では、非対応形式の場合もデコード可能であればフォールバックで "png" として処理される。明示的にエラーを返す仕様との差異あり（後述の実装上の注意点を参照）。

- **参照元**: architecture.md 技術的制約、requirements.md REQ-001

### エラーハンドリング 🔵

| エラーケース | エラーメッセージ | 発生タイミング |
|---|---|---|
| ファイルが存在しない / 読み込み不可 | `"画像の読み込みに失敗しました: {詳細}"` | `image::open()` 失敗時 |
| ファイルオープン失敗（フォーマット判定時） | `"ファイルを開けませんでした: {詳細}"` | `ImageReader::open()` 失敗時 |
| Base64エンコード失敗 | `"画像のエンコードに失敗しました: {詳細}"` | `img.write_to()` 失敗時 |

- **参照元**: image_processor.rs 実装、note.md エラーケース定義

### アーキテクチャ制約 🔵

- Tauri v2のIPCコマンドとして `#[tauri::command]` マクロで定義
- `Result<T, String>` でエラーハンドリング（Tauri v2標準パターン）
- エラーメッセージは日本語で返却
- コマンドは `lib.rs` の `invoke_handler` に登録済み

- **参照元**: architecture.md アーキテクチャパターン、lib.rs 実装

### 依存crate 🔵

| crate | バージョン | 用途 |
|---|---|---|
| `image` | 0.25 | 画像デコード・エンコード・メタデータ取得 |
| `base64` | 0.22 | Base64エンコード |
| `serde` | 1 | ImageMetadata のシリアライズ |

- **参照元**: note.md 技術スタック、Cargo.toml

### パフォーマンス要件 🟡

- 大規模画像でもRust側の処理は高速に行われること（具体的な数値目標なし）
- Base64変換は `Cursor<Vec<u8>>` のメモリバッファを使用し効率的に処理

- **参照元**: architecture.md パフォーマンス（具体数値なしのため黄信号）

### プラットフォーム制約 🔵

- Windows 11上で動作（Windows 10 1803以降互換）
- Tauri v2 WebView2 (Edge) 使用

- **参照したEARS要件**: REQ-402
- **参照した設計文書**: architecture.md 技術的制約

---

## 4. 想定される使用例

### 基本的な使用パターン: PNG画像の読み込み 🔵

**Given**: アプリが起動し、PNG画像ファイルがファイルシステム上に存在する
**When**: フロントエンドが `invoke("load_image", { path: "C:\\path\\to\\image.png" })` を呼び出す
**Then**: `{ base64: "...", width: 1920, height: 1080, format: "png" }` が返却される

- **参照元**: requirements.md REQ-001 受け入れ基準、dataflow.md 機能1

### 基本的な使用パターン: JPG画像の読み込み 🔵

**Given**: アプリが起動し、JPG画像ファイルがファイルシステム上に存在する
**When**: フロントエンドが `invoke("load_image", { path: "C:\\path\\to\\photo.jpg" })` を呼び出す
**Then**: `{ base64: "...", width: 800, height: 600, format: "jpeg" }` が返却される

- **参照元**: requirements.md REQ-001 受け入れ基準

### エラーケース: 存在しないファイル 🔵

**Given**: 指定パスにファイルが存在しない
**When**: `invoke("load_image", { path: "C:\\nonexistent\\file.png" })` を呼び出す
**Then**: `Err("画像の読み込みに失敗しました: ...")` が返却される

- **参照元**: note.md テスト関連情報、requirements.md REQ-001異常系テスト

### エラーケース: 非対応形式 🔵

**Given**: GIF等の非対応形式ファイルが存在する
**When**: `invoke("load_image", { path: "C:\\path\\to\\animation.gif" })` を呼び出す
**Then**: エラーが返却される

**実装上の注意**: 現在の実装では、`image` crateでデコード可能な形式（GIF, WebP等）はエラーにならずフォールバックで "png" として処理される。タスク完了条件「非対応形式の場合にエラーを返す」を満たすには、フォーマット判定後にPNG/JPEG以外を明示的にエラーにするロジックが必要。

- **参照元**: TASK-0002 完了条件、requirements.md REQ-001異常系テスト

### エッジケース: 空ファイル / 破損ファイル 🟡

**Given**: ファイルパスは有効だがファイル内容が壊れている
**When**: `invoke("load_image", { path: "C:\\path\\to\\corrupted.png" })` を呼び出す
**Then**: `Err("画像の読み込みに失敗しました: ...")` が返却される（`image::open()` がデコードエラーを返す）

- **参照元**: 設計文書に明示記載なし。image crateの標準動作から推測

- **参照したEARS要件**: REQ-001
- **参照した設計文書**: dataflow.md 機能1シーケンス図、note.md テスト関連情報

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー1**: 画像の読み込みとクリップ（requirements.md）

### 参照した機能要件

- **REQ-001**: ユーザーは画像ファイルを読み込めなければならない（PNG/JPG等の一般的な画像形式に対応）
- **REQ-401**: アプリケーションはTauri v2 + React (TypeScript)で構築しなければならない

### 参照した非機能要件

- **REQ-402**: アプリケーションはWindows上で動作しなければならない

### 参照したEdgeケース

- 非対応形式ファイル指定時のエラー処理（requirements.md REQ-001異常系テスト）

### 参照した受け入れ基準

- REQ-001: PNG/JPG画像を読み込み表示できる
- REQ-001: 非対応形式の場合エラーメッセージを表示する

### 参照した設計文書

- **アーキテクチャ**: `docs/design/imgx-clip/architecture.md` - システム構成図、IPCコマンド定義、技術的制約
- **データフロー**: `docs/design/imgx-clip/dataflow.md` - 機能1シーケンス図、詳細ステップ
- **型定義**: `src-tauri/src/commands.rs` - ImageMetadata構造体
- **画像処理実装**: `src-tauri/src/image_processor.rs` - load_image関数
- **モジュール登録**: `src-tauri/src/lib.rs` - invoke_handler登録

---

## 6. 実装上の注意点

### 非対応形式のフォールバック問題 🟡

現在の `image_processor.rs` の実装では、フォーマット判定の `_ => "png"` で非対応形式がPNGにフォールバックされる。TASK-0002の完了条件「非対応形式の場合にエラーを返す」を満たすためには、PNG/JPEG以外の場合に明示的に `Err` を返す修正が必要。

```rust
// 現在の実装（フォールバック）
_ => "png",

// 完了条件を満たす実装（エラー返却）
_ => return Err("対応していない画像形式です".to_string()),
```

### テストデータの準備

- テスト用画像ファイル（PNG, JPG）を `tests/fixtures/` ディレクトリに配置
- 小さいサイズ（100x100px程度）を推奨
- 非対応形式テスト用のファイル（GIF等）も用意

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|---|---|---|
| 🔵 青信号 | 18件 | 86% |
| 🟡 黄信号 | 3件 | 14% |
| 🔴 赤信号 | 0件 | 0% |

**品質評価**: ✅ 高品質
