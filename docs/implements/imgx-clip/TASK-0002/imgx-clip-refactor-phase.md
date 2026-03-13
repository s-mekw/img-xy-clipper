# TASK-0002 Refactorフェーズ記録: 画像読み込みIPCコマンド (load_image)

**タスクID**: TASK-0002
**機能名**: imgx-clip (load_image IPCコマンド)
**要件名**: imgx-clip
**作成日**: 2026-03-12
**フェーズ**: REFACTOR（コード品質改善完了）

---

## 1. リファクタリング概要

Greenフェーズで特定した2つの改善候補を実施した。

| # | 改善内容 | 信頼性 | 適用結果 |
|---|---|---|---|
| 1 | 2重ファイルオープンを1回に統合 | 🔵 | 適用完了 |
| 2 | エラーメッセージを定数化 | 🔵 | 適用完了 |
| 3 | 日本語コメントの充実 | 🔵 | 適用完了 |

---

## 2. セキュリティレビュー結果

| 観点 | 評価 | 詳細 |
|---|---|---|
| パスインジェクション | ✅ 問題なし | Tauriのcapabilitiesファイルによりファイルアクセス権限が制御される |
| エラー情報漏洩 | ✅ 問題なし | エラーメッセージはOSレベルの詳細を含むが、デスクトップアプリのローカル用途のみ |
| 入力値検証 | ✅ 問題なし | 空文字列・存在しないパス・非画像ファイル・非対応形式、全て安全にErr返却 |
| 拡張子偽装対策 | ✅ 向上 | `with_guessed_format()` によりバイトシグネチャからフォーマット判定するため、拡張子偽装ファイルへの堅牢性が高まった 🔵 |
| 重大な脆弱性 | ✅ なし | — |

---

## 3. パフォーマンスレビュー結果

| 観点 | 評価 | 詳細 |
|---|---|---|
| **ファイルI/O回数** | ✅ 改善済み | Greenフェーズの2回→1回に削減 🔵 |
| メモリ効率 | ✅ 問題なし | `Cursor<Vec<u8>>` の使用は適切 |
| 計算量 | ✅ 問題なし | デコードO(w×h)は必要最小限 |
| Base64エンコード | ✅ 問題なし | 標準ライブラリの最適実装を使用 |

---

## 4. 改善されたコード（全文）

対象ファイル: `src-tauri/src/image_processor.rs`（`load_image` 関数部分）

### 4-1. 追加したエラーメッセージ定数

```rust
// ============================================================
// エラーメッセージ定数
// 【設定定数】: エラーメッセージを一元管理し、テストとの一貫性を保証する 🔵
// 【調整可能性】: ユーザー向けメッセージの変更はここだけで完結する
// ============================================================

/// ファイルオープン失敗時のエラープレフィックス 🔵
const ERR_OPEN: &str = "画像の読み込みに失敗しました";

/// エンコード失敗時のエラープレフィックス 🔵
const ERR_ENCODE: &str = "画像のエンコードに失敗しました";

/// 非対応形式のエラーメッセージ 🔵
const ERR_UNSUPPORTED_FORMAT: &str =
    "対応していない画像形式です。PNG または JPEG ファイルを選択してください。";
```

### 4-2. リファクタリング後の load_image 関数

```rust
pub fn load_image(path: &str) -> Result<ImageMetadata, String> {
    // 【1回のオープンでフォーマット判定 + デコード】:
    // ImageReader を使い、バイトシグネチャからフォーマットを推定した後にデコードする。
    // これにより以前の image::open() → ImageReader::open() の2重オープンを解消する。 🔵
    let reader = image::ImageReader::open(path)
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?
        .with_guessed_format()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    // 【フォーマット判定】: デコード前にフォーマットを確認し、対応形式かどうかチェックする 🔵
    //
    // 判定結果の3パターン:
    //   Some(Png)  → "png" として処理続行
    //   Some(Jpeg) → "jpeg" として処理続行
    //   Some(その他) → GIF・BMP・WEBP 等の判定済み非対応形式 → 早期エラー返却（TC-006対応）
    //   None       → バイトシグネチャからフォーマット不明（非画像ファイル等）
    //                → decode() で詳細なデコードエラーを発生させて「画像の読み込みに失敗」を返す
    //
    // ※ None を decode() に渡すのは、テキストファイル等の非画像ファイルに対して
    //   「画像の読み込みに失敗しました」メッセージを返すため（TC-007対応）🟡
    let format_str = match reader.format() {
        Some(ImageFormat::Png) => Some("png"),
        Some(ImageFormat::Jpeg) => Some("jpeg"),
        // 【非対応形式エラー】: 判定できた形式が PNG/JPEG 以外（GIF等）は即エラー 🔵
        Some(_) => return Err(ERR_UNSUPPORTED_FORMAT.to_string()),
        // 【フォーマット不明】: None はデコードを試みてエラーを自然に発生させる 🟡
        None => None,
    };

    // 【画像デコード】: reader からピクセルデータを展開する 🔵
    // フォーマット不明の場合もここでデコードエラーになり「画像の読み込みに失敗しました」が返る
    let img = reader
        .decode()
        .map_err(|e| format!("{}: {}", ERR_OPEN, e))?;

    // 【フォーマット文字列確定】: デコード成功後、フォーマット不明だった場合はデフォルト "png" とする 🟡
    let format = format_str.unwrap_or("png");

    // 【寸法取得】: デコード後の DynamicImage から幅・高さを取得する 🔵
    let (width, height) = img.dimensions();

    // 【Base64エンコード】: フロントエンドで data URI として使用するための変換 🔵
    let mut buf = Cursor::new(Vec::new());
    let encode_format = if format == "jpeg" {
        ImageFormat::Jpeg
    } else {
        ImageFormat::Png
    };
    img.write_to(&mut buf, encode_format)
        .map_err(|e| format!("{}: {}", ERR_ENCODE, e))?;

    let base64 = base64::engine::general_purpose::STANDARD.encode(buf.get_ref());

    Ok(ImageMetadata {
        base64,
        width,
        height,
        format: format.to_string(),
    })
}
```

---

## 5. 改善ポイントの説明

### 改善1: 2重ファイルオープンの解消 🔵

**変更前（Greenフェーズ）:**
```rust
// 1回目: デコード
let img = image::open(path).map_err(...)?;
// 2回目: フォーマット判定のため再度オープン
let format = match image::ImageReader::open(path)...format() { ... };
```

**変更後（Refactorフェーズ）:**
```rust
// 1回のみ: ImageReader でオープン＋フォーマット推定
let reader = image::ImageReader::open(path)?.with_guessed_format()?;
let format_str = match reader.format() { ... };
let img = reader.decode()?;  // 同じ reader でデコード
```

**効果:**
- ファイルI/Oを2回→1回に削減（パフォーマンス向上）
- バイトシグネチャからフォーマット判定するため拡張子偽装に堅牢（セキュリティ向上）
- コードのロジックが線形で追いやすい（可読性向上）

### 改善2: エラーメッセージ定数化 🔵

**変更前:** エラー文字列がコード中に散在
**変更後:** `ERR_OPEN`, `ERR_ENCODE`, `ERR_UNSUPPORTED_FORMAT` として定数化

**効果:**
- メッセージ変更が1箇所で完結（保守性向上）
- テストとの一貫性が明示的に保証される（品質向上）

### 改善3: フォーマット判定ロジックの明確化 🟡

`None` ケースの扱いを明示的にコメントで説明。
テキストファイル（TC-007）と GIF（TC-006）で異なるエラーメッセージが返る理由をコードに記録した。

---

## 6. テスト実行結果

```
running 10 tests
test test_load_image_empty_path ... ok
test test_load_image_file_not_found ... ok
test test_load_image_unsupported_format_gif ... ok
test test_load_image_dimensions_accuracy ... ok
test test_load_image_base64_validity ... ok
test test_load_image_png_success ... ok
test test_load_image_minimum_size_1x1 ... ok
test test_load_image_not_image_file ... ok
test test_load_image_jpg_success ... ok
test test_load_image_large_size_2000x2000 ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.64s
```

**結果**: 全 10 件合格（リファクタリング前後で変化なし）

---

## 7. 品質評価

| 評価項目 | 結果 |
|---|---|
| テスト成功状況 | ✅ 全 10 件合格 |
| セキュリティ | ✅ 重大な脆弱性なし。拡張子偽装への堅牢性が向上 |
| パフォーマンス | ✅ ファイルI/Oを2回→1回に削減 |
| リファクタ品質 | ✅ 全3つの改善候補を適用完了 |
| コード品質 | ✅ DRY原則適用・詳細日本語コメント追加 |
| ファイルサイズ | ✅ 138行（500行制限以下） |
| モック使用 | ✅ 実装コードにモック・スタブなし |
| **総合評価** | **✅ 高品質** |
