use crate::image_processor;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub base64: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
}

/// 画像を読み込み、Base64エンコードとメタデータを返す
#[tauri::command]
pub fn load_image(path: String) -> Result<ImageMetadata, String> {
    image_processor::load_image(&path)
}

/// 指定範囲でトリム+クリップして保存する
#[tauri::command]
pub fn clip_and_save(
    src_path: String,
    top_y: u32,
    bottom_y: u32,
    trim_top_y: u32,
    trim_bottom_y: u32,
    dest_path: String,
) -> Result<(), String> {
    image_processor::clip_and_save(&src_path, top_y, bottom_y, trim_top_y, trim_bottom_y, &dest_path)
}
