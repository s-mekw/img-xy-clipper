use base64::Engine;
use image::{GenericImageView, ImageFormat};
use std::io::Cursor;

use crate::commands::ImageMetadata;

/// 画像ファイルを読み込み、Base64エンコードとメタデータを返す
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

/// 指定されたY範囲で画像をクリップして保存する
pub fn clip_and_save(src_path: &str, top_y: u32, bottom_y: u32, dest_path: &str) -> Result<(), String> {
    if top_y >= bottom_y {
        return Err("上端Y座標は下端Y座標より小さい必要があります".to_string());
    }

    let img = image::open(src_path).map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?;
    let (width, height) = img.dimensions();

    if bottom_y > height {
        return Err(format!("下端Y座標 {} が画像の高さ {} を超えています", bottom_y, height));
    }

    let crop_height = bottom_y - top_y;
    let cropped = img.crop_imm(0, top_y, width, crop_height);

    // 保存フォーマットを拡張子から判定
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
