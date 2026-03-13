# TASK-0003 TDD要件定義書：画像クリップ・保存IPCコマンド実装

**生成日**: 2026-03-12
**タスクID**: TASK-0003
**要件名**: imgx-clip
**機能名**: clip_and_save IPCコマンド
**フェーズ**: Phase 1 - 基盤・バックエンド

---

## 1. 機能の概要

### 何をする機能か 🔵

**信頼性**: 🔵 *要件定義REQ-003・ユーザーストーリー1より*

Rust側で `clip_and_save` IPCコマンドを提供する。元画像のファイルパス、Y軸の開始座標（top_y）・終了座標（bottom_y）、保存先パスを受け取り、`image` crateで画像をY軸方向にクロップして入力と同じ形式（PNG/JPEG）で保存する。

### どのような問題を解決するか 🔵

**信頼性**: 🔵 *ユーザーストーリー1「So that」より*

ユーザーがGUI上でドラッグ操作により選択したY軸範囲で画像を切り取り、必要な部分だけの画像を素早く作成・保存できるようにする。本タスクはバックエンド側の画像処理・保存ロジックを担当する。

### 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザーストーリー1「As a」より*

画像のY軸方向の不要部分をトリミングしたいユーザー。フロントエンド（Toolbar）から本IPCコマンドが呼び出される。

### システム内での位置づけ 🔵

**信頼性**: 🔵 *アーキテクチャ設計・データフロー図「機能3: クリップと保存」より*

- Tauri v2のIPCコマンドとして `commands.rs` に定義
- 画像処理ロジックは `image_processor.rs` の `clip_and_save()` 関数に委譲
- フロントエンドのToolbarから「保存」操作時に呼び出される
- `lib.rs` の `invoke_handler` にコマンド登録済み

**参照したEARS要件**: REQ-003
**参照した設計文書**: `docs/design/imgx-clip/architecture.md` - IPCコマンド定義、`docs/design/imgx-clip/dataflow.md` - 機能3シーケンス図

---

## 2. 入力・出力の仕様

### 入力パラメータ 🔵

**信頼性**: 🔵 *アーキテクチャ設計のIPCコマンド定義・TASK-0003タスク定義より*

| パラメータ | 型 | 説明 | 制約 |
|---|---|---|---|
| `src_path` | `String` | 元画像のファイルパス（絶対パス） | 存在するPNG/JPEGファイル |
| `top_y` | `u32` | クリップ開始Y座標（ピクセル） | 0 <= top_y < bottom_y |
| `bottom_y` | `u32` | クリップ終了Y座標（ピクセル） | top_y < bottom_y <= 画像高さ |
| `dest_path` | `String` | 保存先ファイルパス | 書き込み可能なパス |

### 出力値 🔵

**信頼性**: 🔵 *アーキテクチャ設計・TASK-0003タスク定義より*

| 結果 | 型 | 説明 |
|---|---|---|
| 成功 | `Ok(())` | クロップ済み画像が保存された |
| 失敗 | `Err(String)` | 日本語エラーメッセージ |

### 入出力の関係性 🔵

**信頼性**: 🔵 *データフロー図・機能3の詳細ステップより*

- 入力画像の幅（width）はそのまま維持される
- 出力画像の高さ = `bottom_y - top_y`
- 出力画像の形式は保存先パスの拡張子から判定（`.jpg`/`.jpeg` → JPEG、それ以外 → PNG）

### データフロー 🔵

**信頼性**: 🔵 *データフロー図「機能3: クリップと保存」シーケンス図より*

1. フロントエンド（Toolbar）が `clip_and_save(srcPath, topY, bottomY, destPath)` をIPC呼び出し
2. Rust側で入力値のバリデーション（Y座標の妥当性チェック）
3. `image::open()` で元画像をファイルシステムから読み込み
4. `img.dimensions()` で画像サイズ取得、`bottom_y <= height` を検証
5. `crop_imm(0, top_y, width, crop_height)` でY軸範囲をクロップ
6. 保存先パスの拡張子から出力形式を判定
7. `save_with_format(dest_path, format)` でファイル保存
8. フロントエンドに成功/失敗を返却

**参照したEARS要件**: REQ-003
**参照した設計文書**: `docs/design/imgx-clip/dataflow.md` - 機能3シーケンス図、`docs/design/imgx-clip/architecture.md` - IPCコマンド定義

---

## 3. 制約条件

### パフォーマンス要件 🟡

**信頼性**: 🟡 *非機能要件から妥当な推測*

- `crop_imm()` はimmutableクロップでメモリ効率が高い
- ファイルI/Oは1回の読み込み + 1回の書き込み
- 大きい画像でもクロップ範囲分のメモリのみ追加確保

### セキュリティ要件 🟡

**信頼性**: 🟡 *アーキテクチャ設計のセキュリティセクションから妥当な推測*

- Tauri v2 Capabilityでファイルアクセス権限を最小限に制限
- 設定ファイル: `src-tauri/capabilities/default.json`
- Tauri v2の型安全なコマンド定義によりインジェクション防止
- Rust側でY座標のバリデーションを実施（フロントエンドの検証に依存しない）

### 互換性要件 🔵

**信頼性**: 🔵 *要件定義REQ-401, REQ-402・技術的制約より*

- 対応画像形式: PNG, JPG/JPEG（`image` crateの対応範囲）
- 対応OS: Windows 11（Windows 10 1803以降でも動作）
- Tauri v2 + WebView2（Edge）環境

### アーキテクチャ制約 🔵

**信頼性**: 🔵 *アーキテクチャ設計・既存実装パターンより*

- IPCコマンドは `commands.rs` に定義、ロジックは `image_processor.rs` に委譲
- エラーハンドリングは `Result<(), String>` で統一（TASK-0002のパターン継承）
- エラーメッセージは日本語、定数化して一元管理
- X軸は常に画像全幅を維持（Y軸方向のみクリップ）

### 形式判定の制約 🔵

**信頼性**: 🔵 *note.md・既存実装パターンより*

- 保存先パスの拡張子から形式を判定（バイトシグネチャではなく拡張子ベース）
- `.jpg` または `.jpeg`（大文字小文字不問）→ JPEG形式
- それ以外 → PNG形式（デフォルト）
- 理由: 保存先はユーザーが指定するため、ユーザー意図の形式を尊重

**参照したEARS要件**: REQ-003, REQ-401, REQ-402
**参照した設計文書**: `docs/design/imgx-clip/architecture.md` - 技術的制約・セキュリティ

---

## 4. 想定される使用例

### 基本的な使用パターン 🔵

**信頼性**: 🔵 *要件定義REQ-003の受け入れ基準より*

#### UC-1: PNG画像のY軸クリップ・保存

- **Given**: 100x100px のPNG画像 (`src_path`) が存在する
- **When**: `clip_and_save(src_path, 20, 80, dest_path.png)` を呼び出す
- **Then**: 100x60px のPNG画像が `dest_path` に保存される

#### UC-2: JPEG画像のY軸クリップ・保存

- **Given**: 200x150px のJPEG画像 (`src_path`) が存在する
- **When**: `clip_and_save(src_path, 30, 120, dest_path.jpg)` を呼び出す
- **Then**: 200x90px のJPEG画像が `dest_path` に保存される

### エッジケース 🔵

**信頼性**: 🔵 *TASK-0003のテスト要件・完了条件より*

#### EC-1: Y座標範囲が不正（top_y >= bottom_y）

- **Given**: `top_y = 50`, `bottom_y = 50`（等しい）
- **When**: `clip_and_save(src_path, 50, 50, dest_path)` を呼び出す
- **Then**: `Err("上端Y座標は下端Y座標より小さい必要があります")` が返る

#### EC-2: Y座標範囲が不正（top_y > bottom_y）

- **Given**: `top_y = 80`, `bottom_y = 20`（逆転）
- **When**: `clip_and_save(src_path, 80, 20, dest_path)` を呼び出す
- **Then**: `Err("上端Y座標は下端Y座標より小さい必要があります")` が返る

#### EC-3: bottom_yが画像の高さを超える

- **Given**: 画像高さ 100px、`bottom_y = 120`
- **When**: `clip_and_save(src_path, 10, 120, dest_path)` を呼び出す
- **Then**: `Err("下端Y座標 120 が画像の高さ 100 を超えています")` が返る

### エラーケース 🔵

**信頼性**: 🔵 *TASK-0003のテスト要件・完了条件より*

#### ER-1: 元画像が存在しない

- **Given**: 存在しないファイルパス
- **When**: `clip_and_save("/nonexistent/image.png", 10, 50, dest_path)` を呼び出す
- **Then**: `Err("画像の読み込みに失敗しました: ...")` が返る

#### ER-2: 保存先に書き込み権限がない

- **Given**: 読み取り専用ディレクトリへの保存先パス
- **When**: `clip_and_save(src_path, 10, 50, readonly_path)` を呼び出す
- **Then**: `Err("画像の保存に失敗しました: ...")` が返る

### 形式判定パターン 🔵

**信頼性**: 🔵 *note.md・既存実装の形式判定ロジックより*

#### FD-1: PNG拡張子での保存

- **Given**: `dest_path = "output.png"`
- **When**: クリップ・保存を実行
- **Then**: PNG形式で保存される（PNGシグネチャ確認可能）

#### FD-2: JPG拡張子での保存

- **Given**: `dest_path = "output.jpg"`
- **When**: クリップ・保存を実行
- **Then**: JPEG形式で保存される（JPEGシグネチャ確認可能）

#### FD-3: JPEG拡張子での保存

- **Given**: `dest_path = "output.jpeg"`
- **When**: クリップ・保存を実行
- **Then**: JPEG形式で保存される

**参照したEARS要件**: REQ-003の受け入れ基準
**参照した設計文書**: `docs/design/imgx-clip/dataflow.md` - 機能3の詳細フロー

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザーストーリー

- **ストーリー1**: 画像の読み込みとクリップ（REQ-001, REQ-002, REQ-003）

### 参照した機能要件

- **REQ-003**: システムは指定されたY軸範囲で画像を切り取り、結果を入力と同じ形式で保存しなければならない

### 参照した非機能要件

- **パフォーマンス**: クリップ処理のメモリ効率（`crop_imm()` 使用）
- **セキュリティ**: Tauri v2 Capability によるファイルアクセス権限制限

### 参照した受け入れ基準

- REQ-003: 切り取り後の画像が正しいサイズ・形式で保存される
- REQ-003: 保存先に書き込み権限がない場合エラーメッセージを表示する

### 参照した設計文書

- **アーキテクチャ**: `docs/design/imgx-clip/architecture.md` - IPCコマンド定義、コンポーネント構成、技術的制約
- **データフロー**: `docs/design/imgx-clip/dataflow.md` - 機能3「クリップと保存」シーケンス図
- **要件定義**: `docs/spec/imgx-clip/requirements.md` - REQ-003の要件・受け入れ基準

### 既存実装の参照

- **コマンド定義**: `src-tauri/src/commands.rs` - `clip_and_save` コマンド（定義済み・`image_processor` に委譲）
- **画像処理**: `src-tauri/src/image_processor.rs` - `clip_and_save()` 関数（既に実装あり）
- **コマンド登録**: `src-tauri/src/lib.rs` - `invoke_handler` にコマンド登録済み
- **テストファイル**: `src-tauri/tests/test_image_processor.rs` - TASK-0002のテストパターン

---

## 6. 実装ファイル一覧

| ファイル | 状態 | 説明 |
|---|---|---|
| `src-tauri/src/commands.rs` | 定義済み | `clip_and_save` IPCコマンド（`image_processor` に委譲） |
| `src-tauri/src/image_processor.rs` | 実装済み（要TDDテスト） | `clip_and_save()` 関数の画像処理ロジック |
| `src-tauri/src/lib.rs` | 登録済み | `invoke_handler` にコマンド登録 |
| `src-tauri/tests/test_image_processor.rs` | テスト追加必要 | TASK-0003のテストケース（TC-101〜TC-108） |

---

## 7. エラーメッセージ一覧

| エラー条件 | エラーメッセージ | 信頼性 |
|---|---|---|
| `top_y >= bottom_y` | `"上端Y座標は下端Y座標より小さい必要があります"` | 🔵 |
| `bottom_y > 画像の高さ` | `"下端Y座標 {bottom_y} が画像の高さ {height} を超えています"` | 🔵 |
| 元画像読み込み失敗 | `"画像の読み込みに失敗しました: {詳細}"` | 🔵 |
| 保存先書き込み失敗 | `"画像の保存に失敗しました: {詳細}"` | 🔵 |

---

## 信頼性レベルサマリー

- **総項目数**: 19項目
- 🔵 **青信号**: 17項目 (89%)
- 🟡 **黄信号**: 2項目 (11%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: ✅ 高品質
