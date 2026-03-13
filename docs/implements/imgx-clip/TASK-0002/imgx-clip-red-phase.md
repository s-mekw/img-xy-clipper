# TASK-0002 Redフェーズ記録: 画像読み込みIPCコマンド (load_image)

**タスクID**: TASK-0002
**機能名**: imgx-clip (load_image IPCコマンド)
**要件名**: imgx-clip
**作成日**: 2026-03-12
**フェーズ**: RED（失敗するテスト作成完了）

---

## 1. 作成したテストケース一覧

| ID | テスト関数名 | カテゴリ | 信頼性 | 状態 |
|---|---|---|---|---|
| TC-001 | `test_load_image_png_success` | 正常系 | 🔵 | ✅ 合格（実装済み確認） |
| TC-002 | `test_load_image_jpg_success` | 正常系 | 🔵 | ✅ 合格（実装済み確認） |
| TC-003 | `test_load_image_base64_validity` | 正常系 | 🔵 | ✅ 合格（実装済み確認） |
| TC-004 | `test_load_image_dimensions_accuracy` | 正常系 | 🔵 | ✅ 合格（実装済み確認） |
| TC-005 | `test_load_image_file_not_found` | 異常系 | 🔵 | ✅ 合格（実装済み確認） |
| TC-006 | `test_load_image_unsupported_format_gif` | 異常系 | 🔵 | ❌ **失敗（RED）** |
| TC-007 | `test_load_image_not_image_file` | 異常系 | 🟡 | ✅ 合格（実装済み確認） |
| TC-008 | `test_load_image_empty_path` | 異常系 | 🟡 | ✅ 合格（実装済み確認） |
| TC-009 | `test_load_image_minimum_size_1x1` | 境界値 | 🟡 | ✅ 合格（実装済み確認） |
| TC-010 | `test_load_image_large_size_2000x2000` | 境界値 | 🟡 | ✅ 合格（実装済み確認） |

**合計**: 10件（9合格・1失敗）

---

## 2. テストファイル

**テストファイルパス**: `src-tauri/tests/test_image_processor.rs`

### 実行コマンド

```bash
# テストファイルのみ実行
cd src-tauri
cargo test --test test_image_processor

# 特定のテストのみ実行
cargo test --test test_image_processor test_load_image_unsupported_format_gif
```

---

## 3. 期待される失敗内容

### TC-006: 非対応形式（GIF）テストの失敗

```
---- test_load_image_unsupported_format_gif stdout ----
thread 'test_load_image_unsupported_format_gif' panicked at tests\test_image_processor.rs:268:5:
GIF画像でErrが返らなかった（現行実装の`_ => "png"`フォールバックが原因。GREENフェーズで修正が必要）:
Ok(ImageMetadata { base64: "iVBOR...", width: 1, height: 1, format: "png" })

test result: FAILED. 9 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out
```

**失敗の根本原因**: `src-tauri/src/image_processor.rs` の以下のコード：

```rust
// 現行実装（問題箇所）
let format = match image::ImageReader::open(path)
    .map_err(|e| format!("ファイルを開けませんでした: {}", e))?
    .format()
{
    Some(ImageFormat::Png) => "png",
    Some(ImageFormat::Jpeg) => "jpeg",
    _ => "png",   // ← GIF等の非対応形式がここでフォールバックされる
};
```

GIF は `image` crate でデコード可能なため `image::open()` が成功し、フォーマット判定の `_ => "png"` でフォールバックされ、`Ok(ImageMetadata { format: "png", ... })` が返ってしまう。

---

## 4. テストコード全文

テストコードは `src-tauri/tests/test_image_processor.rs` に保存済み。

### テスト用フィクスチャ生成方式

テスト画像はテストコード内でプログラマティックに生成する（外部ファイル配置不要）：

- PNG/JPEG: `image` crate の `ImageBuffer` を使って生成
- GIF: 最小 GIF89a バイナリを手動で書き込み
- テキストファイル: `std::fs::write` でテキスト内容を書き込み

フィクスチャは `src-tauri/tests/fixtures/` ディレクトリに生成される。

---

## 5. Greenフェーズで実装すべき内容

### 必須修正: TC-006 を通すための変更

**対象ファイル**: `src-tauri/src/image_processor.rs`

**変更内容**:

```rust
// 現行（フォールバック）
_ => "png",

// 修正後（明示的エラー返却）
_ => return Err("対応していない画像形式です。PNG または JPEG ファイルを選択してください。".to_string()),
```

**修正箇所**: `load_image` 関数内のフォーマット判定ブロック（`match` の `_` アーム）

### 修正後の期待されるテスト結果

```
test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

---

## 6. テスト実行結果（Redフェーズ）

```
running 10 tests
test test_load_image_file_not_found ... ok
test test_load_image_empty_path ... ok
test test_load_image_jpg_success ... ok
test test_load_image_minimum_size_1x1 ... ok
test test_load_image_not_image_file ... ok
test test_load_image_base64_validity ... ok
test test_load_image_png_success ... ok
test test_load_image_unsupported_format_gif ... FAILED
test test_load_image_dimensions_accuracy ... ok
test test_load_image_large_size_2000x2000 ... ok

failures:
    test_load_image_unsupported_format_gif

test result: FAILED. 9 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.71s
```

---

## 7. 品質評価

| 評価項目 | 結果 |
|---|---|
| テスト実行 | ✅ 実行可能（コンパイル成功） |
| 意図した失敗 | ✅ TC-006 が意図通りに失敗 |
| 期待値の明確さ | ✅ 明確・具体的 |
| アサーション | ✅ 適切（assert!, assert_eq!, contains） |
| 実装方針の明確さ | ✅ GREENフェーズでの修正箇所がコメントに記載済み |
| 信頼性レベル分布 | 🔵 6件 / 🟡 4件 / 🔴 0件 |
| **総合評価** | **✅ 高品質** |
