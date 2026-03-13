/// TASK-0003 Redフェーズ テスト: 画像クリップ・保存IPCコマンド (clip_and_save)
///
/// このファイルはTDDのRedフェーズで作成されたテスト群です。
/// テスト実行: `cd src-tauri && cargo test --test test_clip_and_save`
///
/// 対象テストケース: TC-101〜TC-112
/// - TC-101: PNG画像のクリップ・保存（正常系）
/// - TC-102: JPG画像のクリップ・保存（正常系）
/// - TC-103: top_y == bottom_y の等値エラー
/// - TC-103b: top_y > bottom_y の逆転エラー
/// - TC-104: bottom_y が画像高さを超えるエラー
/// - TC-105: 元画像ファイルが存在しない場合のエラー
/// - TC-106: 保存先ディレクトリが存在しない場合のエラー
/// - TC-107: PNG拡張子でPNG形式保存（ファイルシグネチャ確認）
/// - TC-108: JPG拡張子でJPEG形式保存（ファイルシグネチャ確認）
/// - TC-108b: JPEG拡張子でJPEG形式保存（ファイルシグネチャ確認）
/// - TC-109: top_y = 0 の境界値（正常系）
/// - TC-110: bottom_y == height の境界値（正常系）
/// - TC-111: クロップ高さが1pxの最小有効クロップ
/// - TC-112: 大文字拡張子 .JPG での JPEG 形式判定
use image::{GenericImageView, ImageBuffer, Rgb, RgbImage};
use imgx_clip_lib::image_processor;
use std::fs;
use std::path::PathBuf;

// ============================================================
// テストユーティリティ
// ============================================================

/// テンポラリ出力ディレクトリのパスを返す
///
/// 【テスト前準備】: CARGO_MANIFEST_DIRを基準にテスト出力ディレクトリパスを構築
fn output_dir() -> PathBuf {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    PathBuf::from(format!("{}/tests/fixtures/clip_output", manifest_dir))
}

/// 出力先ファイルパスを返す（拡張子付き）
///
/// 【テスト前準備】: テストごとに一意なファイル名で出力パスを生成
fn output_path(filename: &str) -> String {
    let dir = output_dir();
    fs::create_dir_all(&dir).expect("出力ディレクトリの作成に失敗");
    dir.join(filename).to_string_lossy().into_owned()
}

/// テストフィクスチャの絶対パスを返す
///
/// 【テスト前準備】: CARGO_MANIFEST_DIRを基準にフィクスチャパスを構築
/// 【環境初期化】: 各テストで独立したパス解決を行い、副作用を防止
fn fixture_path(filename: &str) -> String {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    format!("{}/tests/fixtures/{}", manifest_dir, filename)
}

/// テスト用PNG画像を指定パスに生成する
///
/// 【テスト前準備】: 指定サイズのRGB単色PNG画像をファイルシステムに作成
/// 【環境初期化】: テスト実行前に必要なフィクスチャファイルを生成
fn create_test_png(path: &str, width: u32, height: u32) {
    let mut img: RgbImage = ImageBuffer::new(width, height);
    for pixel in img.pixels_mut() {
        *pixel = Rgb([100u8, 149u8, 237u8]); // コーンフラワーブルー
    }
    img.save(path).expect("テスト用PNG画像の作成に失敗");
}

/// テスト用JPEG画像を指定パスに生成する
///
/// 【テスト前準備】: 指定サイズのRGB単色JPEG画像をファイルシステムに作成
fn create_test_jpeg(path: &str, width: u32, height: u32) {
    let mut img: RgbImage = ImageBuffer::new(width, height);
    for pixel in img.pixels_mut() {
        *pixel = Rgb([255u8, 165u8, 0u8]); // オレンジ色
    }
    img.save(path).expect("テスト用JPEG画像の作成に失敗");
}

// ============================================================
// TC-101: PNG画像のクリップ・保存（正常系）
// ============================================================

#[test]
fn test_clip_and_save_png_success() {
    // 【テスト目的】: PNG画像のY軸クロップが正しく動作し、期待サイズで保存されること
    // 【テスト内容】: 100x100px PNG画像を top_y=20, bottom_y=80 でクロップし保存
    // 【期待される動作】: Ok(())が返り、100x60px の PNG が保存先に作成される
    // 🔵 要件定義REQ-003の受け入れ基準・note.md TC-101より直接導出

    // 【テストデータ準備】: 100x100px のPNG画像をフィクスチャとして作成
    // 【初期条件設定】: テスト用の出力先パスを一時ディレクトリに準備
    let src_path = fixture_path("clip_src_100x100.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc101_result.png");

    // 【実際の処理実行】: clip_and_save() を呼び出す
    // 【処理内容】: top_y=20, bottom_y=80 で Y 軸方向にクロップ（60px 分）
    let result = image_processor::clip_and_save(&src_path, 20, 80, &dest_path);

    // 【結果検証】: Ok(())が返り、期待サイズで保存されていること
    // 【期待値確認】: クロップ高さ = 80 - 20 = 60px、幅はX軸全幅維持で100px
    assert!(
        result.is_ok(),
        "PNG画像のクリップ・保存がOkでない: {:?}",
        result
    ); // 【確認内容】: Result型がOkであること 🔵

    // 【検証項目】: 保存先ファイルが存在すること 🔵
    assert!(
        std::path::Path::new(&dest_path).exists(),
        "保存先ファイルが存在しない: {}",
        dest_path
    );

    // 【検証項目】: 保存画像の寸法が 100x40px であること（上部20px + 下部20px = 40px） 🔵
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (saved_width, saved_height) = saved_img.dimensions();
    assert_eq!(
        saved_width, 100,
        "保存画像の幅が期待値と異なる: {}",
        saved_width
    ); // 【確認内容】: 幅がX軸全幅(100px)で維持されていること 🔵
    assert_eq!(
        saved_height, 40,
        "保存画像の高さが期待値と異なる: {}",
        saved_height
    ); // 【確認内容】: 高さが top_y + (height - bottom_y) = 20 + 20 = 40px であること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-102: JPG画像のクリップ・保存（正常系）
// ============================================================

#[test]
fn test_clip_and_save_jpg_success() {
    // 【テスト目的】: JPEG画像のY軸クロップが正しく動作し、期待サイズで保存されること
    // 【テスト内容】: 200x150px JPG画像を top_y=30, bottom_y=120 でクロップし保存
    // 【期待される動作】: Ok(())が返り、200x90px の JPG が保存先に作成される
    // 🔵 要件定義REQ-003の受け入れ基準・note.md TC-102より直接導出

    // 【テストデータ準備】: 200x150px のJPEG画像をフィクスチャとして作成
    // 【初期条件設定】: .jpg 拡張子の出力先パスを準備
    let src_path = fixture_path("clip_src_200x150.jpg");
    create_test_jpeg(&src_path, 200, 150);
    let dest_path = output_path("tc102_result.jpg");

    // 【実際の処理実行】: clip_and_save() を呼び出す
    // 【処理内容】: top_y=30, bottom_y=120 で Y 軸方向にクロップ（90px 分）
    let result = image_processor::clip_and_save(&src_path, 30, 120, &dest_path);

    // 【結果検証】: Ok(())が返り、期待サイズで保存されていること
    assert!(
        result.is_ok(),
        "JPG画像のクリップ・保存がOkでない: {:?}",
        result
    ); // 【確認内容】: Result型がOkであること 🔵

    // 【検証項目】: 保存先ファイルが存在すること 🔵
    assert!(
        std::path::Path::new(&dest_path).exists(),
        "保存先ファイルが存在しない: {}",
        dest_path
    );

    // 【検証項目】: 保存画像の寸法が 200x60px であること（上部30px + 下部30px = 60px） 🔵
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (saved_width, saved_height) = saved_img.dimensions();
    assert_eq!(
        saved_width, 200,
        "保存画像の幅が期待値と異なる: {}",
        saved_width
    ); // 【確認内容】: 幅がX軸全幅(200px)で維持されていること 🔵
    assert_eq!(
        saved_height, 60,
        "保存画像の高さが期待値と異なる: {}",
        saved_height
    ); // 【確認内容】: 高さが top_y + (height - bottom_y) = 30 + 30 = 60px であること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-103: top_y と bottom_y が等しい場合は除去なし（元画像そのまま）
// ============================================================

#[test]
fn test_clip_and_save_equal_y_range_no_removal() {
    // 【テスト目的】: top_y == bottom_y の等値ケースで除去なし（元画像がそのまま保存される）こと
    // 【テスト内容】: top_y=50, bottom_y=50 でclip_and_saveを呼び出す
    // 【期待される動作】: Ok(())が返り、元画像と同じサイズ（100x100px）の画像が保存される
    // 🔵 設計修正: topY==bottomYは「除去なし」として許可

    let src_path = fixture_path("clip_src_for_tc103.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc103_result.png");

    let result = image_processor::clip_and_save(&src_path, 50, 50, &dest_path);

    assert!(
        result.is_ok(),
        "top_y == bottom_y でOkが返らなかった: {:?}",
        result
    );

    // 【検証項目】: 保存画像の寸法が元画像と同じ100x100pxであること
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (saved_width, saved_height) = saved_img.dimensions();
    assert_eq!(saved_width, 100, "保存画像の幅が期待値と異なる");
    assert_eq!(saved_height, 100, "保存画像の高さが期待値と異なる（除去なしなので元画像と同じ）");

    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-103b: top_y が bottom_y より大きい場合のバリデーションエラー
// ============================================================

#[test]
fn test_clip_and_save_invalid_y_range_reversed() {
    // 【テスト目的】: top_y > bottom_y の逆転ケースで適切なエラーが返ること
    // 【テスト内容】: top_y=80, bottom_y=20 でclip_and_saveを呼び出す
    // 【期待される動作】: Err("上端Y座標は下端Y座標より小さい必要があります") が返る
    // 🔵 要件定義書のエラーメッセージ一覧・エッジケースEC-2より直接導出

    // 【テストデータ準備】: ダミーのパスを使用（バリデーションは画像読み込み前に行われる）
    // 【初期条件設定】: top_y > bottom_y の逆転ケース（論理的に矛盾したY座標）
    let src_path = fixture_path("dummy.png"); // 実際には使用されない（バリデーション優先）
    let dest_path = output_path("tc103b_result.png");

    // 【実際の処理実行】: top_y=80, bottom_y=20（逆転）でclip_and_saveを呼び出す
    // 【処理内容】: top_y > bottom_y のバリデーションチェックが優先してErrを返す
    let result = image_processor::clip_and_save(&src_path, 80, 20, &dest_path);

    // 【結果検証】: Err が返ること
    assert!(result.is_err(), "top_y > bottom_y でErrが返らなかった"); // 【確認内容】: Errが返ること 🔵

    let err_msg = result.unwrap_err();
    assert_eq!(
        err_msg, "上端Y座標は下端Y座標以下である必要があります",
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: エラーメッセージが正確に一致すること 🔵
}

// ============================================================
// TC-104: bottom_y が画像の高さを超える場合のバリデーションエラー
// ============================================================

#[test]
fn test_clip_and_save_bottom_y_exceeds_height() {
    // 【テスト目的】: bottom_y が画像高さを超える場合にエラーが返ること
    // 【テスト内容】: 100px高さの画像に対して bottom_y=120 でclip_and_saveを呼び出す
    // 【期待される動作】: Err("下端Y座標 120 が画像の高さ 100 を超えています") が返る
    // 🔵 要件定義書のエラーメッセージ一覧・note.md TC-104より直接導出

    // 【テストデータ準備】: 100x100px の PNG 画像を用意（高さ=100px を確定）
    // 【初期条件設定】: bottom_y=120 は画像高さ100pxを超える無効な値
    let src_path = fixture_path("clip_src_for_tc104.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc104_result.png");

    // 【実際の処理実行】: bottom_y=120（画像高さ100pxを超える）でclip_and_saveを呼び出す
    // 【処理内容】: 画像読み込み後、bottom_y > height のバリデーションチェックでErrを返す
    let result = image_processor::clip_and_save(&src_path, 10, 120, &dest_path);

    // 【結果検証】: Err が返ること
    assert!(result.is_err(), "bottom_y > height でErrが返らなかった"); // 【確認内容】: Errが返ること 🔵

    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("下端Y座標 120 が画像の高さ 100 を超えています"),
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: エラーメッセージに具体的な座標・高さが含まれること 🔵
}

// ============================================================
// TC-105: 元画像ファイルが存在しない場合のエラー
// ============================================================

#[test]
fn test_clip_and_save_source_not_found() {
    // 【テスト目的】: 存在しないファイルパスで適切なエラーが返ること
    // 【テスト内容】: 存在しないパスでclip_and_saveを呼び出す
    // 【期待される動作】: Err("画像の読み込みに失敗しました: ...") が返る
    // 🔵 要件定義書のエラーメッセージ一覧・note.md TC-105より直接導出

    // 【テストデータ準備】: 物理的に存在しないファイルパスを指定
    // 【初期条件設定】: ファイルが移動・削除された場合を模倣
    let src_path = "/nonexistent/path/to/image.png";
    let dest_path = output_path("tc105_result.png");

    // 【実際の処理実行】: 存在しないパスでclip_and_saveを呼び出す
    // 【処理内容】: image::open() がファイルオープンエラーを返し、map_err でString化
    let result = image_processor::clip_and_save(src_path, 10, 50, &dest_path);

    // 【結果検証】: Err が返ること
    assert!(result.is_err(), "存在しないファイルでErrが返らなかった"); // 【確認内容】: パニックせずErrが返ること 🔵

    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("画像の読み込みに失敗しました"),
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: 日本語エラーメッセージが含まれること 🔵
}

// ============================================================
// TC-106: 保存先ディレクトリが存在しない場合のエラー
// ============================================================

#[test]
fn test_clip_and_save_save_permission_denied() {
    // 【テスト目的】: 書き込み不可能な保存先パスで適切なエラーが返ること
    // 【テスト内容】: 存在しないディレクトリへの保存先パスでclip_and_saveを呼び出す
    // 【期待される動作】: Err("画像の保存に失敗しました: ...") が返る
    // 🔵 TASK-0003完了条件・要件定義書のエラーメッセージ一覧より直接導出

    // 【テストデータ準備】: 有効な元画像を用意、保存先は存在しないディレクトリを指定
    // 【初期条件設定】: 存在しないディレクトリ配下の保存先パス（書き込み不可）
    let src_path = fixture_path("clip_src_for_tc106.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = "/nonexistent_directory_for_test/output.png";

    // 【実際の処理実行】: 存在しないディレクトリへの保存先パスでclip_and_saveを呼び出す
    // 【処理内容】: クロップ処理は成功するが、save_with_format() がディレクトリ不在でエラー
    let result = image_processor::clip_and_save(&src_path, 10, 50, dest_path);

    // 【結果検証】: Err が返ること
    assert!(
        result.is_err(),
        "存在しないディレクトリへの保存でErrが返らなかった"
    ); // 【確認内容】: Errが返ること 🔵

    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("画像の保存に失敗しました"),
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: 保存失敗の日本語エラーメッセージが含まれること 🔵
}

// ============================================================
// TC-107: PNG拡張子でPNG形式保存（ファイルシグネチャ確認）
// ============================================================

#[test]
fn test_clip_and_save_format_detection_png() {
    // 【テスト目的】: .png 拡張子で PNG 形式のファイルが保存されること
    // 【テスト内容】: dest_path に .png を指定してクリップ保存し、出力ファイルのシグネチャを確認
    // 【期待される動作】: 保存ファイルの先頭バイトが PNG シグネチャ (89 50 4E 47)
    // 🔵 note.md TC-107・実装コードの形式判定ロジックより直接導出

    // 【テストデータ準備】: PNG 保存対象用の元画像を生成
    // 【初期条件設定】: dest_path に .png 拡張子を指定（PNG形式判定パス）
    let src_path = fixture_path("clip_src_for_tc107.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc107_result.png");

    // 【実際の処理実行】: .png 拡張子の保存先パスでclip_and_saveを呼び出す
    // 【処理内容】: 拡張子 .png から PNG 形式として save_with_format(ImageFormat::Png) で保存
    let result = image_processor::clip_and_save(&src_path, 20, 80, &dest_path);
    assert!(result.is_ok(), "PNG形式保存がOkでない: {:?}", result);

    // 【結果検証】: 保存ファイルの先頭バイトが PNG シグネチャであること
    // 【期待値確認】: PNG ファイルは必ず 89 50 4E 47 で始まる
    let saved_bytes = fs::read(&dest_path).expect("保存ファイルの読み込みに失敗");
    assert!(saved_bytes.len() >= 4, "保存ファイルが短すぎる");
    assert_eq!(
        &saved_bytes[0..4],
        &[0x89u8, 0x50, 0x4E, 0x47],
        "保存ファイルの先頭バイトが PNG シグネチャ(89 50 4E 47)でない"
    ); // 【確認内容】: 保存ファイルの先頭4バイトが PNG シグネチャであること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-108: JPG拡張子でJPEG形式保存（ファイルシグネチャ確認）
// ============================================================

#[test]
fn test_clip_and_save_format_detection_jpg() {
    // 【テスト目的】: .jpg 拡張子で JPEG 形式のファイルが保存されること
    // 【テスト内容】: dest_path に .jpg を指定してクリップ保存し、出力ファイルのシグネチャを確認
    // 【期待される動作】: 保存ファイルの先頭バイトが JPEG シグネチャ (FF D8 FF)
    // 🔵 note.md TC-108・実装コードの形式判定ロジックより直接導出

    // 【テストデータ準備】: JPEG 保存対象用の元画像を生成
    // 【初期条件設定】: dest_path に .jpg 拡張子を指定（JPEG形式判定パス）
    let src_path = fixture_path("clip_src_for_tc108.jpg");
    create_test_jpeg(&src_path, 100, 100);
    let dest_path = output_path("tc108_result.jpg");

    // 【実際の処理実行】: .jpg 拡張子の保存先パスでclip_and_saveを呼び出す
    // 【処理内容】: 拡張子 .jpg から JPEG 形式として save_with_format(ImageFormat::Jpeg) で保存
    let result = image_processor::clip_and_save(&src_path, 20, 80, &dest_path);
    assert!(result.is_ok(), "JPG形式保存がOkでない: {:?}", result);

    // 【結果検証】: 保存ファイルの先頭バイトが JPEG シグネチャであること
    // 【期待値確認】: JPEG ファイルは必ず FF D8 FF で始まる
    let saved_bytes = fs::read(&dest_path).expect("保存ファイルの読み込みに失敗");
    assert!(saved_bytes.len() >= 3, "保存ファイルが短すぎる");
    assert_eq!(
        &saved_bytes[0..3],
        &[0xFFu8, 0xD8, 0xFF],
        "保存ファイルの先頭バイトが JPEG シグネチャ(FF D8 FF)でない"
    ); // 【確認内容】: 保存ファイルの先頭3バイトが JPEG シグネチャであること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-108b: JPEG拡張子でJPEG形式保存（ファイルシグネチャ確認）
// ============================================================

#[test]
fn test_clip_and_save_format_detection_jpeg() {
    // 【テスト目的】: .jpeg 拡張子でも JPEG 形式のファイルが保存されること
    // 【テスト内容】: dest_path に .jpeg を指定してクリップ保存し、出力ファイルのシグネチャを確認
    // 【期待される動作】: 保存ファイルの先頭バイトが JPEG シグネチャ (FF D8 FF)
    // 🔵 要件定義書FD-3・実装コードの形式判定ロジックより直接導出

    // 【テストデータ準備】: JPEG 保存対象用の元画像を生成
    // 【初期条件設定】: dest_path に .jpeg 拡張子を指定（.jpg との区別）
    let src_path = fixture_path("clip_src_for_tc108b.jpg");
    create_test_jpeg(&src_path, 100, 100);
    let dest_path = output_path("tc108b_result.jpeg");

    // 【実際の処理実行】: .jpeg 拡張子の保存先パスでclip_and_saveを呼び出す
    // 【処理内容】: 拡張子 .jpeg から JPEG 形式として save_with_format(ImageFormat::Jpeg) で保存
    let result = image_processor::clip_and_save(&src_path, 20, 80, &dest_path);
    assert!(result.is_ok(), "JPEG形式保存がOkでない: {:?}", result);

    // 【結果検証】: 保存ファイルの先頭バイトが JPEG シグネチャであること
    let saved_bytes = fs::read(&dest_path).expect("保存ファイルの読み込みに失敗");
    assert!(saved_bytes.len() >= 3, "保存ファイルが短すぎる");
    assert_eq!(
        &saved_bytes[0..3],
        &[0xFFu8, 0xD8, 0xFF],
        "保存ファイルの先頭バイトが JPEG シグネチャ(FF D8 FF)でない"
    ); // 【確認内容】: .jpeg 拡張子でも JPEG シグネチャが確認できること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-109: top_y = 0 の境界値（正常系）
// ============================================================

#[test]
fn test_clip_and_save_top_y_zero() {
    // 【テスト目的】: top_y=0 の境界値で正常にクロップ・保存できること
    // 【テスト内容】: top_y=0, bottom_y=50 でclip_and_saveを呼び出す
    // 【期待される動作】: Ok(())が返り、100x50px の画像が保存される
    // 🟡 u32型の最小値として妥当な推測（要件定義書に明示なし）

    // 【テストデータ準備】: 100x100px の PNG 画像を用意
    // 【初期条件設定】: top_y=0（Y座標の有効最小値）でのクロップ動作確認
    let src_path = fixture_path("clip_src_for_tc109.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc109_result.png");

    // 【実際の処理実行】: top_y=0 の境界値でclip_and_saveを呼び出す
    // 【処理内容】: crop_imm(0, 0, 100, 50) で画像上端から50pxをクロップ
    let result = image_processor::clip_and_save(&src_path, 0, 50, &dest_path);

    // 【結果検証】: Ok(())が返ること
    assert!(result.is_ok(), "top_y=0 でOkが返らなかった: {:?}", result); // 【確認内容】: Ok(())が返ること 🟡

    // 【検証項目】: 保存画像の高さが50pxであること 🟡
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (_, saved_height) = saved_img.dimensions();
    assert_eq!(
        saved_height, 50,
        "保存画像の高さが期待値と異なる: {}",
        saved_height
    ); // 【確認内容】: 高さが(bottom_y - top_y) = 50pxであること 🟡

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-110: bottom_y が画像高さと等しい場合（正常系）
// ============================================================

#[test]
fn test_clip_and_save_bottom_y_equals_height() {
    // 【テスト目的】: bottom_y == height の境界値で正常にクロップ・保存できること
    // 【テスト内容】: 100px高さの画像に対して top_y=50, bottom_y=100 でclip_and_saveを呼び出す
    // 【期待される動作】: Ok(())が返り、100x50px の画像が保存される
    // 🔵 要件定義書の入力仕様 `bottom_y <= 画像高さ` の制約より直接導出

    // 【テストデータ準備】: 100x100px の PNG 画像を用意（高さ = 100px）
    // 【初期条件設定】: bottom_y=100 は画像高さ100pxと等しい（有効な上限境界）
    let src_path = fixture_path("clip_src_for_tc110.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc110_result.png");

    // 【実際の処理実行】: bottom_y == height の境界値でclip_and_saveを呼び出す
    // 【処理内容】: crop_imm(0, 50, 100, 50) で画像下端まで正確にクロップ
    let result = image_processor::clip_and_save(&src_path, 50, 100, &dest_path);

    // 【結果検証】: Ok(())が返ること（bottom_y == height はエラーでない）
    assert!(
        result.is_ok(),
        "bottom_y == height でOkが返らなかった: {:?}",
        result
    ); // 【確認内容】: Ok(())が返ること 🔵

    // 【検証項目】: 保存画像の高さが50pxであること 🔵
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (_, saved_height) = saved_img.dimensions();
    assert_eq!(
        saved_height, 50,
        "保存画像の高さが期待値と異なる: {}",
        saved_height
    ); // 【確認内容】: 高さが(bottom_y - top_y) = 50pxであること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-111: クロップ高さが1pxの最小有効クロップ
// ============================================================

#[test]
fn test_clip_and_save_minimum_crop_height_1px() {
    // 【テスト目的】: クロップ高さが1pxの最小有効範囲で正常動作すること
    // 【テスト内容】: top_y=49, bottom_y=50 でclip_and_saveを呼び出す
    // 【期待される動作】: Ok(())が返り、100x1px の画像が保存される
    // 🟡 要件定義書に最小クロップ高さの明示なし。top_y < bottom_y 制約から妥当な推測

    // 【テストデータ準備】: 100x100px の PNG 画像を用意
    // 【初期条件設定】: top_y=49, bottom_y=50 で高さ1pxの最小有効クロップ
    let src_path = fixture_path("clip_src_for_tc111.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc111_result.png");

    // 【実際の処理実行】: クロップ高さ1pxの最小有効範囲でclip_and_saveを呼び出す
    // 【処理内容】: crop_imm(0, 49, 100, 1) で1pxの高さをクロップ
    let result = image_processor::clip_and_save(&src_path, 49, 50, &dest_path);

    // 【結果検証】: Ok(())が返ること
    assert!(
        result.is_ok(),
        "クロップ高さ1px でOkが返らなかった: {:?}",
        result
    ); // 【確認内容】: Ok(())が返ること 🟡

    // 【検証項目】: 保存画像の高さが99pxであること（上部49px + 下部50px = 99px、除去1px） 🟡
    let saved_img = image::open(&dest_path).expect("保存画像の読み込みに失敗");
    let (_, saved_height) = saved_img.dimensions();
    assert_eq!(
        saved_height, 99,
        "保存画像の高さが期待値と異なる: {}",
        saved_height
    ); // 【確認内容】: 高さが top_y + (height - bottom_y) = 49 + 50 = 99px であること 🟡

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-112: 大文字拡張子 .JPG でのJPEG形式判定
// ============================================================

#[test]
fn test_clip_and_save_format_detection_uppercase_jpg() {
    // 【テスト目的】: 大文字拡張子 .JPG でも JPEG 形式で保存されること
    // 【テスト内容】: dest_path に .JPG を指定してクリップ保存し、出力ファイルのシグネチャを確認
    // 【期待される動作】: 保存ファイルの先頭バイトが JPEG シグネチャ (FF D8 FF)
    // 🔵 実装コードの to_lowercase() 呼び出し・note.mdの形式判定説明より直接導出

    // 【テストデータ準備】: JPEG 保存対象用の元画像を生成
    // 【初期条件設定】: dest_path に .JPG（大文字）拡張子を指定（大文字小文字不問の確認）
    let src_path = fixture_path("clip_src_for_tc112.jpg");
    create_test_jpeg(&src_path, 100, 100);
    let dest_path = output_path("tc112_result.JPG");

    // 【実際の処理実行】: .JPG（大文字）拡張子の保存先パスでclip_and_saveを呼び出す
    // 【処理内容】: to_lowercase()で .jpg に正規化され、JPEG形式として判定・保存
    let result = image_processor::clip_and_save(&src_path, 20, 80, &dest_path);
    assert!(
        result.is_ok(),
        "大文字JPG拡張子での保存がOkでない: {:?}",
        result
    );

    // 【結果検証】: 保存ファイルの先頭バイトが JPEG シグネチャであること
    // 【期待値確認】: 大文字 .JPG でも JPEG 形式で保存される
    let saved_bytes = fs::read(&dest_path).expect("保存ファイルの読み込みに失敗");
    assert!(saved_bytes.len() >= 3, "保存ファイルが短すぎる");
    assert_eq!(
        &saved_bytes[0..3],
        &[0xFFu8, 0xD8, 0xFF],
        "大文字 .JPG 拡張子で JPEG シグネチャ(FF D8 FF)でない"
    ); // 【確認内容】: 大文字拡張子でも JPEG シグネチャが確認できること 🔵

    // 【テスト後処理】: 一時ファイルを削除
    let _ = fs::remove_file(&dest_path);
}

// ============================================================
// TC-114: top_y=0, bottom_y=height の全除去ケースでエラー
// ============================================================

#[test]
fn test_clip_and_save_full_removal_error() {
    // 【テスト目的】: top_y=0, bottom_y=height で画像全体を除去しようとした場合にエラーが返ること
    // 【テスト内容】: 100x100px画像に対して top_y=0, bottom_y=100 でclip_and_saveを呼び出す
    // 【期待される動作】: Err("除去範囲が画像全体のため出力画像がありません") が返る

    let src_path = fixture_path("clip_src_for_tc114.png");
    create_test_png(&src_path, 100, 100);
    let dest_path = output_path("tc114_result.png");

    let result = image_processor::clip_and_save(&src_path, 0, 100, &dest_path);

    assert!(result.is_err(), "全除去ケースでErrが返らなかった");

    let err_msg = result.unwrap_err();
    assert_eq!(
        err_msg, "除去範囲が画像全体のため出力画像がありません",
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    );
}

// ============================================================
// TC-113: GIF形式のソース画像をクリップしようとした場合のエラー
// ============================================================
//
// ⚠️ このテストは RED フェーズで意図的に失敗する設計です。
// 現行実装: clip_and_save には入力形式バリデーションがないため、
//           GIF ソース画像でも Ok(()) が返ってしまう
// GREEN 化要件: clip_and_save にソース画像の形式バリデーションを追加する
//               Err("対応していない画像形式です。PNG または JPEG ファイルを選択してください。") を返すこと
//
#[test]
fn test_clip_and_save_gif_source_unsupported_format() {
    // 【テスト目的】: GIF 形式のソース画像に対してエラーが返ること
    // 【テスト内容】: GIF ファイルをソースとして clip_and_save を呼び出す
    // 【期待される動作】: Err("対応していない画像形式です。PNG または JPEG ファイルを選択してください。") が返る
    // 🔵 load_image の TC-006 パターンを clip_and_save にも適用すべき要件
    //
    // ※ 現行実装は clip_and_save に形式バリデーションがないため、このテストは失敗する（RED状態）

    // 【テストデータ準備】: GIF バイナリを手動で作成
    // 【初期条件設定】: アプリの対応形式はPNGとJPEGのみ。GIF ソースは明示的に拒否すべき
    let src_path = fixture_path("sample.gif");
    let dest_path = output_path("tc113_result.png");

    // 【実際の処理実行】: GIF ファイルをソースとして clip_and_save を呼び出す
    // 【処理内容】: ソース形式バリデーションで GIF を検出 → Err を返すべき（現行実装では Ok(()) が返る）
    let result = image_processor::clip_and_save(&src_path, 0, 1, &dest_path);
    let _ = std::fs::remove_file(&dest_path); // クリーンアップ

    // 【結果検証】: Err(String) が返ることを確認（現行実装では Ok(()) が返るため RED になる）
    assert!(
        result.is_err(),
        "GIF ソース画像でErrが返らなかった（現行実装に clip_and_save のソース形式バリデーションがないことが原因。GREENフェーズで修正が必要）: {:?}",
        result
    ); // 【確認内容】: 非対応形式のソース画像が明示的にエラーになること 🔵
}
