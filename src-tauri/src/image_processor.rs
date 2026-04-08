use base64::Engine;
use image::{GenericImageView, ImageFormat};
use std::io::Cursor;

use crate::commands::ImageMetadata;

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

// ============================================================
// 公開関数
// ============================================================

/// 画像ファイルを読み込み、Base64エンコードとメタデータを返す
///
/// 【機能概要】: 指定パスの PNG/JPEG 画像を1回のファイルオープンで
///   フォーマット判定・デコード・寸法取得・Base64エンコードまで一括処理する
/// 【改善内容】: Greenフェーズの2重ファイルオープン（image::open + ImageReader::open）を
///   ImageReader の1パスに統合し、I/Oコストを削減した 🔵
/// 【設計方針】: ImageReader::with_guessed_format() でバイトシグネチャからフォーマットを
///   推定し、拡張子偽装ファイルも正しく判定できる
/// 【パフォーマンス】: ファイルI/Oを1回に削減。大きい画像でも追加コストなし
/// 【保守性】: エラーメッセージを定数化しテストとの一貫性を確保
/// 【セキュリティ】: 拡張子ではなくバイトシグネチャでフォーマット判定するため
///   拡張子偽装ファイルへの堅牢性が高い
///
/// # 引数
/// - `path`: 読み込む画像ファイルの絶対パスまたは相対パス
///
/// # 戻り値
/// - `Ok(ImageMetadata)`: 読み込み成功時。base64・width・height・format を含む
/// - `Err(String)`: ファイルが存在しない・非対応形式・非画像ファイルの場合
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

    // 【フォーマット文字列確定】: デコード成功後、フォーマット不明だった場合はデフォルト "png" とする
    // ただしデコードが成功した場合は PNG として扱う（フォーマット不明で画像として読めるケース）🟡
    let format = format_str.unwrap_or("png");

    // 【寸法取得】: デコード後の DynamicImage から幅・高さを取得する 🔵
    let (width, height) = img.dimensions();

    // 【Base64エンコード】: フロントエンドで data URI として使用するための変換 🔵
    // メモリ上のバッファに書き出してから STANDARD Base64 に変換する
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
    trim_top_y: u32,
    trim_bottom_y: u32,
    fill_right_x: u32,
    dest_path: &str,
) -> Result<(), String> {
    // 【座標バリデーション】: trim_top_y <= top_y <= bottom_y <= trim_bottom_y
    if trim_top_y > top_y {
        return Err("トリム上端Y座標はクリップ上端Y座標以下である必要があります".to_string());
    }
    if top_y > bottom_y {
        return Err("上端Y座標は下端Y座標以下である必要があります".to_string());
    }
    if bottom_y > trim_bottom_y {
        return Err("クリップ下端Y座標はトリム下端Y座標以下である必要があります".to_string());
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
    if trim_bottom_y > height {
        return Err(format!(
            "トリム下端Y座標 {} が画像の高さ {} を超えています",
            trim_bottom_y, height
        ));
    }
    if fill_right_x > width {
        return Err(format!(
            "塗りつぶしX座標 {} が画像の幅 {} を超えています",
            fill_right_x, width
        ));
    }

    // 【トリム+クリップ処理】: 残る部分 = [trim_top_y..top_y] + [bottom_y..trim_bottom_y]
    let top_height = top_y - trim_top_y;
    let bottom_height = trim_bottom_y - bottom_y;
    let new_height = top_height + bottom_height;

    if new_height == 0 {
        return Err("除去範囲が画像全体のため出力画像がありません".to_string());
    }

    let mut output = if top_y == bottom_y && trim_top_y == 0 && trim_bottom_y == height {
        // 【変更なし】: クリップもトリムもない場合は元画像をそのまま使用
        img
    } else {
        use image::GenericImage;
        let mut output = image::DynamicImage::new_rgba8(width, new_height);
        if top_height > 0 {
            let top_part = img.crop_imm(0, trim_top_y, width, top_height);
            output
                .copy_from(&top_part, 0, 0)
                .map_err(|e| format!("画像の結合に失敗しました: {}", e))?;
        }
        if bottom_height > 0 {
            let bottom_part = img.crop_imm(0, bottom_y, width, bottom_height);
            output
                .copy_from(&bottom_part, 0, top_height)
                .map_err(|e| format!("画像の結合に失敗しました: {}", e))?;
        }
        output
    };

    // 【塗りつぶし処理】: fillRightX より右側を #fffdea で塗りつぶし
    if fill_right_x < output.width() {
        let mut rgba = output.to_rgba8();
        let fill = image::Rgba([0xff, 0xfd, 0xea, 0xff]);
        for y in 0..rgba.height() {
            for x in fill_right_x..rgba.width() {
                rgba.put_pixel(x, y, fill);
            }
        }
        output = image::DynamicImage::ImageRgba8(rgba);
    }

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

    // 【ファイル保存】: くり抜き済み画像を指定形式でファイルシステムに書き出す。 🔵
    output
        .save_with_format(dest_path, save_format)
        .map_err(|e| format!("画像の保存に失敗しました: {}", e))?;

    Ok(())
}
