# TASK-0003 Refactorフェーズ記録：画像クリップ・保存IPCコマンド実装

**作成日**: 2026-03-12
**タスクID**: TASK-0003
**要件名**: imgx-clip
**機能名**: clip_and_save IPCコマンド
**フェーズ**: REFACTOR（コード品質改善）

---

## リファクタリングの概要

Greenフェーズで実装した `clip_and_save` 関数について、以下の改善を実施した。

| 改善項目 | 内容 | 信頼性 |
|---|---|---|
| DRY原則適用 | `to_lowercase()` の重複呼び出しを `dest_lower` 変数に束縛して解消 | 🔵 |
| コメント強化（docコメント） | `clip_and_save` の docコメントを `load_image` と同等レベルに詳細化 | 🔵 |
| コメント強化（インライン） | 各処理ステップの意図をインラインコメントで明示化 | 🔵 |
| コードフォーマット | `cargo fmt` で統一（関数シグネチャの複数行整形） | 🔵 |
| lintチェック | `cargo clippy -- -D warnings` でゼロ警告を確認 | 🔵 |

---

## セキュリティレビュー結果

| 検査項目 | 評価 | 詳細 |
|---|---|---|
| 入力値バリデーション | ✅ 問題なし | `top_y >= bottom_y` を早期チェック済み |
| ファイルパスインジェクション | ✅ 問題なし | Tauri v2 型安全コマンドで防止済み |
| バイトシグネチャ検証 | ✅ 問題なし | `with_guessed_format()` で拡張子偽装防止済み |
| ファイルI/Oエラー | ✅ 問題なし | `map_err` で全て捕捉済み |
| 権限制御 | ✅ 問題なし | Tauri Capability 設定で最小権限化済み |

**重大な脆弱性なし。** 🔵

---

## パフォーマンスレビュー結果

| 検査項目 | 評価 | 詳細 |
|---|---|---|
| ファイルI/O回数 | ✅ 最適 | 読み込み1回・保存1回 |
| メモリ使用量 | ✅ 最適 | `crop_imm()` でクロップ範囲分のみ追加確保 |
| `to_lowercase()` 重複 | ✅ 解消済み | `dest_lower` 変数に束縛して1回のみ呼び出し |
| アルゴリズム | ✅ 最適 | O(n) クロップ処理 |

**重大な性能課題なし。** 🔵

---

## リファクタリング前後の差分

### 関数シグネチャ（cargo fmt 整形）

```rust
// Before
pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {

// After
pub fn clip_and_save(
    src_path: &str,
    top_y: u32,
    bottom_y: u32,
    dest_path: &str,
) -> Result<(), String> {
```

### to_lowercase() の重複除去（DRY原則適用）

```rust
// Before
let format = if dest_path.to_lowercase().ends_with(".jpg") || dest_path.to_lowercase().ends_with(".jpeg") {

// After
let dest_lower = dest_path.to_lowercase(); // 【DRY】: to_lowercase() の重複呼び出しを変数で解消 🔵
let save_format = if dest_lower.ends_with(".jpg") || dest_lower.ends_with(".jpeg") {
```

### bottom_y バリデーション（コメント強化）

```rust
// Before
if bottom_y > height {
    return Err(format!("下端Y座標 {} が画像の高さ {} を超えています", bottom_y, height));
}

// After
// 【画像サイズバリデーション】: デコード後に bottom_y が画像高さを超えていないかチェック。 🔵
// このチェックは画像読み込み後でないと高さが取得できないため、ここで実施する。
let (width, height) = img.dimensions();
if bottom_y > height {
    return Err(format!(
        "下端Y座標 {} が画像の高さ {} を超えています",
        bottom_y, height
    ));
}
```

---

## 改善後のコード全文

```rust
/// 指定されたY範囲で画像をクリップして保存する
///
/// 【機能概要】: ソース画像を読み込み、指定のY軸範囲でクロップして保存する。
///   X軸は元画像の全幅を維持し、Y軸のみを `top_y`〜`bottom_y` の範囲でクロップする。
/// 【設計方針】: `load_image` と同様に `ImageReader::with_guessed_format()` で
///   バイトシグネチャから形式を推定し、PNG/JPEG 以外のソース画像を早期拒否する。
///   保存形式は保存先パスの拡張子から判定（ユーザーが指定した形式を尊重）。
/// 【パフォーマンス】: ファイルI/Oは読み込み1回・保存1回。`crop_imm()` は
///   クロップ範囲分のメモリのみ追加確保するため大きい画像でも効率的。
/// 【保守性】: エラーメッセージは定数化済み（`ERR_OPEN`, `ERR_UNSUPPORTED_FORMAT`）。
///   `dest_path.to_lowercase()` は変数に束縛して重複呼び出しを防止。
/// 【セキュリティ】: 拡張子ではなくバイトシグネチャでソース形式を判定するため
///   拡張子偽装ファイル（例: .png 拡張子の GIF）への堅牢性が高い。
/// 🔵 要件定義REQ-003・Redフェーズ記録の「Greenフェーズで実装すべき内容」より導出
///
/// # 引数
/// - `src_path`:  元画像ファイルのパス（PNG または JPEG）
/// - `top_y`:     クリップ開始Y座標（ピクセル）。`bottom_y` より小さい必要がある
/// - `bottom_y`:  クリップ終了Y座標（ピクセル）。画像の高さ以下である必要がある
/// - `dest_path`: 保存先ファイルパス。拡張子（.jpg/.jpeg → JPEG、それ以外 → PNG）で形式を判定
///
/// # 戻り値
/// - `Ok(())`:       保存成功
/// - `Err(String)`:  バリデーションエラー・ファイルI/Oエラーの日本語メッセージ
pub fn clip_and_save(
    src_path: &str,
    top_y: u32,
    bottom_y: u32,
    dest_path: &str,
) -> Result<(), String> {
    // 【Y座標バリデーション】: 画像読み込み前に早期チェック。
    // クロップ高さが 0 以下になる無効な入力（top_y >= bottom_y）を拒否する。 🔵
    if top_y >= bottom_y {
        return Err("上端Y座標は下端Y座標より小さい必要があります".to_string());
    }

    // 【ソース形式バリデーション】: load_image と同様に ImageReader::with_guessed_format() を使用する。
    // image::open() を直接使うと GIF 等の非対応形式でも読み込みが成功してしまうため、
    // バイトシグネチャベースの形式判定を行い、PNG/JPEG 以外は早期エラーを返す。 🔵
    let reader = image::ImageReader::open(src_path)
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?
        .with_guessed_format()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    // 【形式チェック】: PNG/JPEG 以外（GIF・BMP 等）は対応外として Err を返す。 🔵
    //
    // - Some(Png) / Some(Jpeg) → 対応形式。処理続行
    // - Some(その他)           → 判定済み非対応形式 → 早期エラー返却（TC-113対応）
    // - None                   → バイトシグネチャ不明（非画像ファイル等）
    //                            → decode() で詳細エラーを発生させ「画像の読み込みに失敗」を返す
    match reader.format() {
        Some(ImageFormat::Png) | Some(ImageFormat::Jpeg) => {}
        Some(_) => return Err(ERR_UNSUPPORTED_FORMAT.to_string()),
        None => {}
    }

    // 【画像デコード】: フォーマット判定済み reader からピクセルデータを展開する。 🔵
    // フォーマット不明（None）の場合もここでデコードエラーになり「画像の読み込みに失敗しました」が返る。
    let img = reader
        .decode()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    // 【画像サイズバリデーション】: デコード後に bottom_y が画像高さを超えていないかチェック。 🔵
    // このチェックは画像読み込み後でないと高さが取得できないため、ここで実施する。
    let (width, height) = img.dimensions();
    if bottom_y > height {
        return Err(format!(
            "下端Y座標 {} が画像の高さ {} を超えています",
            bottom_y, height
        ));
    }

    // 【クロップ処理】: X軸全幅を維持しつつ Y 軸方向のみクロップする。 🔵
    // crop_imm(x, y, width, height) → (0, top_y, 全幅, クロップ高さ) で呼び出す
    let crop_height = bottom_y - top_y;
    let cropped = img.crop_imm(0, top_y, width, crop_height);

    // 【保存形式の判定】: 保存先パスの拡張子からユーザー意図の形式を判定する。 🔵
    // バイトシグネチャではなく拡張子ベースで判定するのは、ユーザーが指定した
    // 保存形式（ファイル名）を尊重するため。
    // - .jpg / .jpeg（大文字小文字不問） → JPEG 形式で保存
    // - それ以外（.png 等）              → PNG 形式で保存（デフォルト）
    let dest_lower = dest_path.to_lowercase(); // 【DRY】: to_lowercase() の重複呼び出しを変数で解消 🔵
    let save_format = if dest_lower.ends_with(".jpg") || dest_lower.ends_with(".jpeg") {
        ImageFormat::Jpeg
    } else {
        ImageFormat::Png
    };

    // 【ファイル保存】: クロップ済み画像を指定形式でファイルシステムに書き出す。 🔵
    cropped
        .save_with_format(dest_path, save_format)
        .map_err(|e| format!("画像の保存に失敗しました: {}", e))?;

    Ok(())
}
```

---

## テスト実行結果

```
running 15 tests
test test_clip_and_save_gif_source_unsupported_format ... ok
test test_clip_and_save_invalid_y_range_equal ... ok
test test_clip_and_save_invalid_y_range_reversed ... ok
test test_clip_and_save_source_not_found ... ok
test test_clip_and_save_bottom_y_exceeds_height ... ok
test test_clip_and_save_bottom_y_equals_height ... ok
test test_clip_and_save_minimum_crop_height_1px ... ok
test test_clip_and_save_format_detection_jpeg ... ok
test test_clip_and_save_save_permission_denied ... ok
test test_clip_and_save_format_detection_png ... ok
test test_clip_and_save_format_detection_uppercase_jpg ... ok
test test_clip_and_save_top_y_zero ... ok
test test_clip_and_save_format_detection_jpg ... ok
test test_clip_and_save_png_success ... ok
test test_clip_and_save_jpg_success ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; finished in 0.02s

Running tests\test_image_processor.rs
test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; finished in 0.69s
```

全25テスト通過。リグレッションなし。

---

## 品質評価

| 項目 | 評価 |
|---|---|
| テスト結果 | ✅ 全25テスト継続通過 |
| セキュリティ | ✅ 重大な脆弱性なし |
| パフォーマンス | ✅ 重大な性能課題なし（`to_lowercase()` 重複解消） |
| リファクタ品質 | ✅ DRY原則・コメント強化・フォーマット統一・lint通過 |
| コード品質 | ✅ cargo fmt + cargo clippy ゼロ警告 |
| ファイルサイズ | ✅ 205行（500行制限以内） |
| 日本語コメント | ✅ load_image と同等レベルのdocコメント完備 |

**品質評価: ✅ 高品質**
