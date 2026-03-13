# TASK-0003 TDD開発ノート：画像クリップ・保存IPCコマンド実装

**生成日**: 2026-03-12
**タスクID**: TASK-0003
**要件名**: imgx-clip
**フェーズ**: Phase 1 - 基盤・バックエンド

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **バックエンド言語**: Rust (Edition 2021)
- **フレームワーク**: Tauri v2
- **画像処理**: `image` crate v0.25（クロップ機能）
- **シリアライズ**: `serde` v1 + `serde_json` v1
- **ビルドツール**: Cargo

### 関連フロントエンド

- **フレームワーク**: React 19 + TypeScript + Vite
- **Tauri連携**: `@tauri-apps/api` でIPCコマンド呼び出し

### アーキテクチャパターン

- **IPC通信**: Tauri フロントエンド ↔ Rust バックエンド（型安全）
- **画像処理方式**: Rust側で元画像読み込み → Y軸範囲でクロップ → 元形式でエンコード・保存
- **対応形式**: PNG, JPG/JPEG（`image` crateの対応範囲、拡張子から判定）
- **キープレイ**: image crateの `crop_imm()` メソッドでY軸範囲を切り取り

### 参照元

- `src-tauri/Cargo.toml` - 依存関係定義
- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ
- `docs/spec/imgx-clip/requirements.md` - 要件定義（REQ-003）

---

## 2. 開発ルール

### プロジェクト固有ルール

- TASK-0002で確立されたエラーハンドリングパターンを継承
- Rust側は標準的なTauri v2パターンに従う
- エラーハンドリングは日本語エラーメッセージで返却（ユーザー向け）

### コーディング規約

- **Rust**:
  - `cargo fmt` でコード整形
  - `#[tauri::command]` で IPCコマンド定義
  - `Result<T, String>` でエラーハンドリング
  - エラーメッセージは定数化して一元管理

- **テスト**:
  - `src-tauri/tests/test_image_processor.rs` に統合テストを追加
  - テスト関数命名: `test_<機能>_<条件>` 形式
  - テストデータ: フィクスチャ内に一時テストファイルを生成

### IPC通信の型定義

```rust
// 既存（TASK-0002で定義）
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub base64: String,     // Base64エンコードされた画像データ
    pub width: u32,         // 画像幅（ピクセル）
    pub height: u32,        // 画像高さ（ピクセル）
    pub format: String,     // 画像形式（"png" または "jpeg"）
}

// TASK-0003で実装
#[tauri::command]
pub fn clip_and_save(
    src_path: String,       // 元画像ファイルパス（絶対パス）
    top_y: u32,            // クリップ開始Y座標
    bottom_y: u32,         // クリップ終了Y座標
    dest_path: String,     // 保存先ファイルパス
) -> Result<(), String>
```

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計

---

## 3. 関連実装

### 既存実装の構造（TASK-0002で完成）

- `src-tauri/src/commands.rs` - `load_image` コマンド（完全実装済み）
- `src-tauri/src/image_processor.rs` - 画像処理関数（`load_image` 完全実装済み）
- `src-tauri/src/lib.rs` - モジュール登録・plugin初期化（コマンド登録済み）
- `src-tauri/src/main.rs` - Tauriエントリーポイント

### TASK-0003での実装対象

#### `src-tauri/src/commands.rs` - `clip_and_save` コマンド（既にシグネチャ定義済み）

```rust
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

**現状**: コマンド定義のみ。実装ロジックは `image_processor` モジュールに委譲

#### `src-tauri/src/image_processor.rs` - `clip_and_save` 関数（スケルトンのみ）

```rust
pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {
    // ... クリップ・保存ロジック
}
```

**実装順序**:
1. 入力値の検証（`top_y < bottom_y` チェック）
2. 元画像の読み込み（`image::open()`）
3. Y軸範囲のバリデーション（`bottom_y <= height` チェック）
4. `crop_imm()` で Y軸範囲をクロップ
5. 保存先パスから形式判定（PNG/JPEG）
6. `save_with_format()` で元形式で保存

### 参照パターン（TASK-0002から継承）

- **エラーハンドリング**: `Result<T, String>` で統一、日本語メッセージ
- **画像読み込み**: `image::open()` の標準パターン
- **フォーマット判定**: `ends_with(".jpg")` または `ends_with(".jpeg")` で拡張子判定
- **画像メタデータ**: `img.dimensions()` で幅・高さ取得

### 参照元

- `src-tauri/src/commands.rs` - コマンド定義
- `src-tauri/src/image_processor.rs` - 画像処理実装（load_image完成版）
- `src-tauri/src/lib.rs` - モジュール・コマンド登録
- `src-tauri/src/main.rs` - Tauriアプリエントリーポイント
- `docs/design/imgx-clip/dataflow.md` - 機能3：クリップと保存のデータフロー

---

## 4. 設計文書

### アーキテクチャ・API仕様

#### IPCコマンド: `clip_and_save`

**入力**:
- `src_path: String` - 元画像のファイルパス（絶対パス）
- `top_y: u32` - クリップ開始Y座標（ピクセル）
- `bottom_y: u32` - クリップ終了Y座標（ピクセル）
- `dest_path: String` - 保存先ファイルパス

**出力**:
- `Ok(())` - 保存成功
- `Err(String)` - エラーメッセージ（日本語）

**エラーケース**（REQ-003の異常系より）:
1. `top_y >= bottom_y`: `"上端Y座標は下端Y座標より小さい必要があります"`
2. `bottom_y > 画像の高さ`: `"下端Y座標 {bottom_y} が画像の高さ {height} を超えています"`
3. 元画像読み込み失敗: `"画像の読み込みに失敗しました: ..."`
4. 保存先書き込み失敗: `"画像の保存に失敗しました: ..."`

#### クロップ処理の詳細

**キーメソッド**: `image::DynamicImage::crop_imm(x, y, width, height)`

```rust
// クロップ処理の例
let crop_height = bottom_y - top_y;
let cropped = img.crop_imm(0, top_y, width, crop_height);
// X軸は画像全幅を維持（0から幅まで）
// Y軸は指定範囲（top_y から bottom_y まで）
```

**保存形式判定**: 拡張子から判定（破壊的）

```rust
let format = if dest_path.to_lowercase().ends_with(".jpg") ||
                dest_path.to_lowercase().ends_with(".jpeg") {
    ImageFormat::Jpeg
} else {
    ImageFormat::Png
};
cropped.save_with_format(dest_path, format)?;
```

### データモデル

```typescript
// フロントエンド側のコマンド呼び出し（推定）
interface ClipAndSaveParams {
  src_path: string;    // 元画像パス
  top_y: number;       // クリップ開始Y座標
  bottom_y: number;    // クリップ終了Y座標
  dest_path: string;   // 保存先パス
}

// 戻り値: void（成功時）、エラー文字列（失敗時）
```

### システムデータフロー

1. **ユーザーがドラッグ操作でY範囲を指定**
   - ImageCanvas が `top_y` と `bottom_y` を確定
   - Toolbar が 保存ボタンをクリック

2. **ファイルダイアログで保存先を選択**
   - Tauri の保存ダイアログが開く
   - ユーザーが保存先パスとファイル名を指定

3. **Rust側でクリップ・保存処理**
   - `clip_and_save(src_path, top_y, bottom_y, dest_path)` IPC呼び出し
   - 元画像をファイルシステムから読み込み
   - `image` crate で Y軸範囲をクロップ
   - 保存先の拡張子から形式判定
   - クロップ済み画像を同じ形式で保存

4. **フロントエンドに完了通知**
   - 成功: Toolbar に成功メッセージ表示
   - 失敗: Toolbar にエラーメッセージ表示

### 参照元

- `docs/design/imgx-clip/architecture.md` - システム全体設計
- `docs/design/imgx-clip/dataflow.md` - 機能3のデータフロー図・シーケンス図
- `docs/tasks/imgx-clip/TASK-0003.md` - タスク定義
- `docs/spec/imgx-clip/requirements.md` - REQ-003の詳細

---

## 5. テスト関連情報

### テストフレームワーク・設定

**Rust側**: 標準的なRustユニット・統合テストを使用

- テストファイル: `src-tauri/tests/test_image_processor.rs` （TASK-0002から継承）
- テスト実行: `cd src-tauri && cargo test` コマンド
- テストユーティリティ: 標準ライブラリ + `image` crate（テスト画像生成用）

### テストの構成・命名パターン

#### Rust 統合テスト

- **テストモジュール配置**: `src-tauri/tests/test_image_processor.rs`（複数テスト関数）
- **テスト関数命名**: `test_clip_and_save_<条件>_<期待される動作>` 形式
  - 例: `test_clip_and_save_png_success`
  - 例: `test_clip_and_save_invalid_y_range`
- **テスト対象**: `pub fn` で公開されたユーティリティ関数
- **テストデータ**: フィクスチャディレクトリ内にテスト用画像を生成

#### テスト実行環境

- `cargo test` で全テストを実行
- テストは `--release` モード・デバッグモード両方で動作確認

### テスト関連の主要パターン

#### テストデータの配置

- **テスト画像**: `src-tauri/tests/fixtures/` ディレクトリ内に配置
  - 既存: `sample.png`, `sample.jpg`, `sample.gif` etc.
  - TASK-0003用: クリップ対象画像（異なるサイズのテスト画像）
  - 小さいサイズ（100x100px 程度）を推奨

#### テストヘルパー関数（TASK-0002から継承）

既存ユーティリティ関数:
- `fixture_path(filename)` - テストフィクスチャの絶対パスを返す
- `create_test_png(path, width, height)` - テスト用PNG画像を生成
- `create_test_jpeg(path, width, height)` - テスト用JPEG画像を生成

**TASK-0003で追加**: 保存先パスの設定・検証ロジック

### テスト実行フロー（TASK-0003での想定テスト）

#### TC-101: 正常系：PNG画像のクリップ・保存

```rust
#[test]
fn test_clip_and_save_png_success() {
    // GIVEN: 100x100px のテストPNG画像がある
    // WHEN: clip_and_save(src_path, 20, 80, dest_path) を呼び出す
    // THEN:
    //   - Ok(()) が返る
    //   - 保存先に 100x60px（クリップ後）の PNG が保存される
}
```

#### TC-102: 正常系：JPG画像のクリップ・保存

```rust
#[test]
fn test_clip_and_save_jpg_success() {
    // GIVEN: 200x150px のテストJPG画像がある
    // WHEN: clip_and_save(src_path, 30, 120, dest_path) を呼び出す
    // THEN:
    //   - Ok(()) が返る
    //   - 保存先に 200x90px（クリップ後）の JPG が保存される
}
```

#### TC-103: 異常系：top_y >= bottom_y

```rust
#[test]
fn test_clip_and_save_invalid_y_range() {
    // GIVEN: top_y = 50, bottom_y = 50（等しい）
    // WHEN: clip_and_save(src_path, 50, 50, dest_path) を呼び出す
    // THEN: Err("上端Y座標は下端Y座標より小さい必要があります") が返る
}
```

#### TC-104: 異常系：bottom_y > 画像の高さ

```rust
#[test]
fn test_clip_and_save_bottom_y_exceeds_height() {
    // GIVEN: 画像高さ 100px、bottom_y = 120（範囲外）
    // WHEN: clip_and_save(src_path, 10, 120, dest_path) を呼び出す
    // THEN: Err("下端Y座標 120 が画像の高さ 100 を超えています") が返る
}
```

#### TC-105: 異常系：元画像読み込み失敗

```rust
#[test]
fn test_clip_and_save_source_not_found() {
    // GIVEN: 存在しないファイルパス
    // WHEN: clip_and_save("/nonexistent/image.png", 10, 50, dest_path) を呼び出す
    // THEN: Err("画像の読み込みに失敗しました: ...") が返る
}
```

#### TC-106: 異常系：保存先に書き込み権限がない

```rust
#[test]
fn test_clip_and_save_permission_denied() {
    // GIVEN: 読み取り専用ディレクトリへの保存先パス
    // WHEN: clip_and_save(src_path, 10, 50, readonly_path) を呼び出す
    // THEN: Err("画像の保存に失敗しました: ...") が返る
}
```

#### TC-107: 形式判定：PNG拡張子で PNG形式で保存

```rust
#[test]
fn test_clip_and_save_format_detection_png() {
    // GIVEN: dest_path = "output.png"
    // WHEN: clip_and_save(src_path, 10, 50, "output.png") を呼び出す
    // THEN: 保存ファイルが PNG形式で保存される（シグネチャ確認）
}
```

#### TC-108: 形式判定：JPG拡張子で JPG形式で保存

```rust
#[test]
fn test_clip_and_save_format_detection_jpg() {
    // GIVEN: dest_path = "output.jpg"
    // WHEN: clip_and_save(src_path, 10, 50, "output.jpg") を呼び出す
    // THEN: 保存ファイルが JPEG形式で保存される（シグネチャ確認）
}
```

### テスト実行コマンド

```bash
# 全テスト実行
cd src-tauri
cargo test

# TASK-0003関連テストのみ実行
cargo test test_clip_and_save

# 特定のテストのみ実行
cargo test test_clip_and_save_png_success

# テスト出力を詳細表示
cargo test -- --nocapture

# テストの並列実行数を制御（デバッグ時）
cargo test -- --test-threads=1
```

### テストデータファイル管理

**フィクスチャディレクトリ**: `src-tauri/tests/fixtures/`

既存ファイル（TASK-0002から継承）:
- `sample.png` - 100x50px PNG（テスト用）
- `sample.jpg` - 80x60px JPG（テスト用）
- `sample.gif` - GIF（非対応形式テスト用）
- `not_an_image.txt` - テキストファイル（非画像テスト用）

**TASK-0003での追加予定**:
- `large.png` - 200x150px PNG（クリップ対象用）
- その他、特定サイズが必要なテスト画像

### 参照元

- `docs/tasks/imgx-clip/TASK-0003.md` - テスト要件
- `src-tauri/tests/test_image_processor.rs` - 既存テスト実装パターン
- `docs/design/imgx-clip/dataflow.md` - テストケース参考

---

## 6. 注意事項

### 技術的制約

- **対応画像形式**: PNG, JPG/JPEG のみ（`image` crateの対応範囲）
  - クロップ対象形式と保存形式は同じ（GIF等の他形式はサポートしない）

- **Y座標の有効性**:
  - `top_y >= bottom_y` の場合はエラー（0高さのクロップは不可）
  - `bottom_y > height` の場合はエラー（画像範囲外へのクロップは不可）

- **X軸は常に全幅を維持**: `crop_imm(0, top_y, width, crop_height)`
  - Y軸範囲のみクロップ（要件定義REQ-003から）

- **Windows 11環境前提**: Tauri v2はWebView2（Edge）を使用
  - Windows 10 1803以降で動作（11推奨）

- **ファイルパス**: 絶対パスを要求（相対パスは未検証）

### セキュリティ・パフォーマンス要件

- **ファイルアクセス権限**: Tauri v2 Capability で必要最小限に制限
  - 設定: `src-tauri/capabilities/default.json`
  - 権限: `dialog:allow-save`, ファイルシステムアクセス

- **クロップ処理**: `crop_imm()` はメモリ効率的
  - 大きい画像でもクロップ範囲分のメモリのみ確保（全体読み込みなし）

- **エラーハンドリング**: Rust側で堅牢にバリデーション
  - ユーザー入力（Y座標）の範囲チェック必須
  - ファイルI/O失敗時は適切にエラー返却

- **IPC型安全性**: Tauri v2の型安全なコマンド定義により インジェクション防止

### 実装上の注意点

1. **クロップ座標の有効性**:
   - `top_y` 最小値: 0
   - `bottom_y` 最大値: 画像の高さ
   - 範囲チェックは **Rust側で実装**（フロントエンドの検証には依存しない）

2. **エラーメッセージ**:
   - 日本語メッセージをユーザーに返却
   - エラーメッセージは定数化して一元管理（メンテナンス性向上）

3. **形式判定**:
   - 拡張子から判定（バイトシグネチャではなく）
   - 理由: 保存先ユーザー指定のため、ユーザー意図の形式を尊重

4. **クロップ方法**:
   - `crop_imm()` を使用（immutable crop）
   - 元画像は破壊されない（テストフレンドリー）

5. **テスト画像の生成**:
   - `image` crateで動的に生成（固定ファイル配置不要）
   - ただし、テストフィクスチャディレクトリは事前に用意

### 参照元

- `docs/design/imgx-clip/architecture.md` - セキュリティ設計
- `src-tauri/capabilities/default.json` - ファイルアクセス権限
- `docs/tasks/imgx-clip/TASK-0003.md` - 完了条件・注意事項

---

## 7. 実装進捗・参考資料

### 関連文書マップ

| 文書 | パス | 用途 |
|------|------|------|
| タスク定義 | `docs/tasks/imgx-clip/TASK-0003.md` | タスク概要・完了条件 |
| 要件定義 | `docs/spec/imgx-clip/requirements.md` | REQ-003の要件確認 |
| アーキテクチャ | `docs/design/imgx-clip/architecture.md` | システム全体設計 |
| データフロー | `docs/design/imgx-clip/dataflow.md` | 機能3の詳細フロー・シーケンス |
| 前タスク実装報告 | `docs/implements/imgx-clip/TASK-0002/note.md` | TASK-0002の実装パターン参照 |
| Cargo設定 | `src-tauri/Cargo.toml` | 依存関係 |

### 実装ファイル一覧

| ファイル | 説明 | TASK-0003での状態 |
|---------|------|------|
| `src-tauri/src/commands.rs` | IPC コマンド定義 | ✅ 定義済み（実装は`image_processor`に委譲） |
| `src-tauri/src/image_processor.rs` | 画像処理実装 | 🔄 `clip_and_save()` の実装が必要 |
| `src-tauri/src/lib.rs` | モジュール・コマンド登録 | ✅ コマンド登録済み（TASK-0002） |
| `src-tauri/src/main.rs` | Tauriエントリーポイント | ✅ 変更不要 |
| `src-tauri/Cargo.toml` | Rust依存関係 | ✅ 依存関係完備（TASK-0002） |
| `src-tauri/tests/test_image_processor.rs` | 統合テスト | 🔄 TASK-0003テスト追加必要 |

### TDD開発フロー

1. **要件定義フェーズ** (`/tsumiki:tdd-requirements`)
   - TASK-0003の詳細要件を展開
   - テストケース（TC-101〜TC-108）を定義

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

- `/tsumiki:tdd-requirements imgx-clip TASK-0003` - 詳細要件定義
- `/tsumiki:tdd-testcases imgx-clip TASK-0003` - テストケース生成
- `/tsumiki:tdd-red imgx-clip TASK-0003` - テスト実装（RED）
- `/tsumiki:tdd-green imgx-clip TASK-0003` - 最小実装（GREEN）

---

**ノート完成日**: 2026-03-12

