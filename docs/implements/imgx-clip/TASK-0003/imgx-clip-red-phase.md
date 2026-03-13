# TASK-0003 Redフェーズ記録：画像クリップ・保存IPCコマンド実装

**作成日**: 2026-03-12
**タスクID**: TASK-0003
**要件名**: imgx-clip
**機能名**: clip_and_save IPCコマンド
**フェーズ**: RED（失敗するテスト作成）

---

## 作成したテストケース一覧

テストファイル: `src-tauri/tests/test_clip_and_save.rs`

| # | テスト関数名 | テストケース | 種別 | 信頼性 | 状態 |
|---|---|---|---|---|---|
| 1 | `test_clip_and_save_png_success` | TC-101: PNG画像のクリップ・保存 | 正常系 | 🔵 | ✅ |
| 2 | `test_clip_and_save_jpg_success` | TC-102: JPG画像のクリップ・保存 | 正常系 | 🔵 | ✅ |
| 3 | `test_clip_and_save_invalid_y_range_equal` | TC-103: top_y == bottom_y エラー | 異常系 | 🔵 | ✅ |
| 4 | `test_clip_and_save_invalid_y_range_reversed` | TC-103b: top_y > bottom_y エラー | 異常系 | 🔵 | ✅ |
| 5 | `test_clip_and_save_bottom_y_exceeds_height` | TC-104: bottom_y が高さを超えるエラー | 異常系 | 🔵 | ✅ |
| 6 | `test_clip_and_save_source_not_found` | TC-105: 元画像ファイルが存在しない | 異常系 | 🔵 | ✅ |
| 7 | `test_clip_and_save_save_permission_denied` | TC-106: 保存先ディレクトリが存在しない | 異常系 | 🔵 | ✅ |
| 8 | `test_clip_and_save_format_detection_png` | TC-107: PNG拡張子でPNG形式保存 | 境界値 | 🔵 | ✅ |
| 9 | `test_clip_and_save_format_detection_jpg` | TC-108: JPG拡張子でJPEG形式保存 | 境界値 | 🔵 | ✅ |
| 10 | `test_clip_and_save_format_detection_jpeg` | TC-108b: JPEG拡張子でJPEG形式保存 | 境界値 | 🔵 | ✅ |
| 11 | `test_clip_and_save_top_y_zero` | TC-109: top_y=0 の境界値 | 境界値 | 🟡 | ✅ |
| 12 | `test_clip_and_save_bottom_y_equals_height` | TC-110: bottom_y==height の境界値 | 境界値 | 🔵 | ✅ |
| 13 | `test_clip_and_save_minimum_crop_height_1px` | TC-111: クロップ高さ1pxの最小有効クロップ | 境界値 | 🟡 | ✅ |
| 14 | `test_clip_and_save_format_detection_uppercase_jpg` | TC-112: 大文字 .JPG 拡張子でJPEG形式判定 | 境界値 | 🔵 | ✅ |
| 15 | `test_clip_and_save_gif_source_unsupported_format` | TC-113: GIF形式ソース画像のバリデーション | 異常系 | 🔵 | 🔴 **失敗（RED）** |

---

## テスト実行結果

```
running 15 tests
test test_clip_and_save_invalid_y_range_equal ... ok
test test_clip_and_save_invalid_y_range_reversed ... ok
test test_clip_and_save_source_not_found ... ok
test test_clip_and_save_bottom_y_exceeds_height ... ok
test test_clip_and_save_gif_source_unsupported_format ... FAILED
test test_clip_and_save_save_permission_denied ... ok
...

failures:
---- test_clip_and_save_gif_source_unsupported_format stdout ----
thread '...' panicked at tests\test_clip_and_save.rs:594:5:
GIF ソース画像でErrが返らなかった（現行実装に clip_and_save のソース形式バリデーションがないことが原因。GREENフェーズで修正が必要）: Ok(())

test result: FAILED. 14 passed; 1 failed; 0 ignored; 0 measured
```

---

## 実装状況の分析

### clip_and_save の実装状況

`src-tauri/src/image_processor.rs` を確認した結果：

- TC-101〜TC-112: **既に実装済み**
  - Y座標バリデーション（top_y >= bottom_y チェック）
  - 画像サイズバリデーション（bottom_y > height チェック）
  - 拡張子ベースの形式判定（.jpg/.jpeg/.JPG等）
  - クロップ処理（crop_imm 使用）
  - 保存処理（save_with_format 使用）

- TC-113: **未実装** （Redフェーズ対象）
  - ソース画像の形式バリデーションが `clip_and_save` に存在しない
  - `load_image` では GIF 等の非対応形式に対してエラーを返す（TC-006 対応済み）
  - `clip_and_save` では同様のバリデーションが欠如している

---

## 期待される失敗内容（TC-113）

**失敗テスト**: `test_clip_and_save_gif_source_unsupported_format`

**失敗理由**:
- 現行実装の `clip_and_save` は `image::open()` を使用しており、GIF など非対応形式でも読み込みが成功してしまう
- `load_image` で実装された形式バリデーション（`ImageReader::with_guessed_format()` + `match format`）が `clip_and_save` に適用されていない

**失敗メッセージ**:
```
GIF ソース画像でErrが返らなかった（現行実装に clip_and_save のソース形式バリデーションがないことが原因。GREENフェーズで修正が必要）: Ok(())
```

**期待される動作（GREEN後）**:
```
Err("対応していない画像形式です。PNG または JPEG ファイルを選択してください。")
```

---

## Greenフェーズで実装すべき内容

### 必須実装

**`src-tauri/src/image_processor.rs` の `clip_and_save` 関数に以下を追加**:

```rust
pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {
    // 既存: Y座標バリデーション
    if top_y >= bottom_y {
        return Err("上端Y座標は下端Y座標より小さい必要があります".to_string());
    }

    // 【新規追加】: ソース画像の形式バリデーション（load_image と同様のパターン）
    let reader = image::ImageReader::open(src_path)
        .map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?
        .with_guessed_format()
        .map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?;

    // PNG/JPEG 以外の形式は早期エラー返却
    match reader.format() {
        Some(ImageFormat::Png) | Some(ImageFormat::Jpeg) => {},
        Some(_) => return Err(ERR_UNSUPPORTED_FORMAT.to_string()),
        None => {},
    }

    // 以降は既存処理...
}
```

### テスト実行コマンド

```bash
# TASK-0003 関連テストのみ実行
cd src-tauri && cargo test --test test_clip_and_save

# 特定の失敗テストのみ
cd src-tauri && cargo test test_clip_and_save_gif_source_unsupported_format

# 全テスト実行
cd src-tauri && cargo test
```

---

## 信頼性レベルサマリー

- **総テストケース数**: 15件
- 🔵 **青信号**: 12件 (80%)
- 🟡 **黄信号**: 3件 (20%)
- 🔴 **赤信号**: 0件 (0%)

**品質評価**: ✅ 高品質（14テスト通過、1テスト意図的失敗でREDフェーズ達成）
