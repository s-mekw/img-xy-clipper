# TASK-0003 Greenフェーズ記録：画像クリップ・保存IPCコマンド実装

**作成日**: 2026-03-12
**タスクID**: TASK-0003
**要件名**: imgx-clip
**機能名**: clip_and_save IPCコマンド
**フェーズ**: GREEN（テストを通す最小実装）

---

## 実装対象

**ファイル**: `src-tauri/src/image_processor.rs`

**対象関数**: `clip_and_save()`

**実装内容**: ソース画像の形式バリデーション追加（TC-113対応）

---

## 実装方針と判断理由

### 問題の根本原因

`clip_and_save` は `image::open()` を使って元画像を読み込んでいた。
`image::open()` は GIF を含む多くの形式を処理できるため、TC-113（GIF形式ソース画像のバリデーション）が失敗していた。

一方、既に実装済みの `load_image` では `ImageReader::open()` + `with_guessed_format()` を使って
バイトシグネチャから形式を推定し、PNG/JPEG 以外は早期エラーを返していた。

### 実装判断

`clip_and_save` にも `load_image` と同じパターンを適用する。

- `image::open()` を `ImageReader::open().with_guessed_format()` に置き換え
- `match reader.format()` で PNG/JPEG 以外を早期エラー返却
- エラーメッセージは既存定数 `ERR_UNSUPPORTED_FORMAT` / `ERR_OPEN` を再利用

この方針は Redフェーズ記録の「Greenフェーズで実装すべき内容」に完全に一致する。 🔵

---

## 実装コード

```rust
/// 指定されたY範囲で画像をクリップして保存する
///
/// 【機能概要】: ソース画像を読み込み、指定のY軸範囲でクロップして保存する
/// 【実装方針】: load_image と同様に ImageReader::with_guessed_format() で形式バリデーションを行う
/// 【テスト対応】: TC-113（GIF形式ソース画像のバリデーション）を通すための実装
/// 🔵 Redフェーズ記録の「Greenフェーズで実装すべき内容」より直接導出
pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {
    // 【Y座標バリデーション】: 画像読み込み前に早期チェック 🔵
    if top_y >= bottom_y {
        return Err("上端Y座標は下端Y座標より小さい必要があります".to_string());
    }

    // 【ソース形式バリデーション】: ImageReader::with_guessed_format() でバイトシグネチャ判定 🔵
    let reader = image::ImageReader::open(src_path)
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?
        .with_guessed_format()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    // 【形式チェック】: PNG/JPEG 以外は早期エラー返却（TC-113対応） 🔵
    match reader.format() {
        Some(ImageFormat::Png) | Some(ImageFormat::Jpeg) => {}
        Some(_) => return Err(ERR_UNSUPPORTED_FORMAT.to_string()),
        None => {}
    }

    // 【画像デコード】: フォーマット判定済み reader からデコード 🔵
    let img = reader
        .decode()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    let (width, height) = img.dimensions();

    if bottom_y > height {
        return Err(format!("下端Y座標 {} が画像の高さ {} を超えています", bottom_y, height));
    }

    let crop_height = bottom_y - top_y;
    let cropped = img.crop_imm(0, top_y, width, crop_height);

    let format = if dest_path.to_lowercase().ends_with(".jpg") || dest_path.to_lowercase().ends_with(".jpeg") {
        ImageFormat::Jpeg
    } else {
        ImageFormat::Png
    };

    cropped
        .save_with_format(dest_path, format)
        .map_err(|e| format!("画像の保存に失敗しました: {}", e))?;

    Ok(())
}
```

---

## テスト実行結果

```
running 15 tests
test test_clip_and_save_gif_source_unsupported_format ... ok   ← TC-113 GREEN化成功
test test_clip_and_save_invalid_y_range_reversed ... ok
test test_clip_and_save_invalid_y_range_equal ... ok
test test_clip_and_save_source_not_found ... ok
test test_clip_and_save_bottom_y_exceeds_height ... ok
test test_clip_and_save_save_permission_denied ... ok
test test_clip_and_save_format_detection_jpeg ... ok
test test_clip_and_save_bottom_y_equals_height ... ok
test test_clip_and_save_top_y_zero ... ok
test test_clip_and_save_format_detection_uppercase_jpg ... ok
test test_clip_and_save_minimum_crop_height_1px ... ok
test test_clip_and_save_format_detection_png ... ok
test test_clip_and_save_format_detection_jpg ... ok
test test_clip_and_save_png_success ... ok
test test_clip_and_save_jpg_success ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; finished in 0.05s
```

`test_image_processor.rs`（TASK-0002テスト）も全10件通過、リグレッションなし。

---

## 品質評価

| 項目 | 評価 |
|---|---|
| テスト結果 | ✅ 全25テスト通過 |
| 実装品質 | ✅ load_image の既存パターンを再利用しシンプル |
| リファクタ箇所 | 特になし（既存定数・パターンを適切に利用） |
| 機能的問題 | なし |
| コンパイルエラー | なし |
| ファイルサイズ | 167行（800行以下） |
| モック使用 | なし |

**品質評価: ✅ 高品質**

---

## 課題・改善点（Refactorフェーズで対応）

### 軽微な改善候補

1. **`clip_and_save` のコメント強化**: `load_image` 関数コメントと同等レベルに詳細化する
2. **`None` ケースの扱い**: `load_image` と `clip_and_save` で `None` の処理が同じパターンであることをコメントで明示する
3. **`cargo fmt` 実行**: コードフォーマットの統一

### Refactorフェーズ不要の判断

現時点で実装はシンプルかつ正確であり、大きなリファクタリングは不要。
軽微なコメント改善は Refactorフェーズで対応する。
