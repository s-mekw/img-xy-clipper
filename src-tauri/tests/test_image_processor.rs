/// TASK-0002 Redフェーズ テスト: 画像読み込みIPCコマンド (load_image)
///
/// このファイルはTDDのRedフェーズで作成された失敗するテスト群です。
/// テスト実行: `cd src-tauri && cargo test`
///
/// 対象テストケース: TC-001〜TC-010
/// - TC-001: PNG正常読み込み
/// - TC-002: JPG正常読み込み
/// - TC-003: Base64の有効性検証
/// - TC-004: 画像寸法の正確性検証
/// - TC-005: 存在しないファイルパスエラー
/// - TC-006: 非対応形式（GIF等）エラー ← 現行実装ではフォールバックするためREDになる
/// - TC-007: 画像でないファイルエラー
/// - TC-008: 空文字列パスエラー
/// - TC-009: 1x1ピクセル最小画像
/// - TC-010: 大きい画像ファイル（2000x2000px）
use base64::Engine;
use image::{ImageBuffer, Rgb, RgbImage};
use imgx_clip_lib::image_processor;

// ============================================================
// テストユーティリティ
// ============================================================

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

/// テスト用GIF画像を指定パスに生成する（非対応形式テスト用）
///
/// 【テスト前準備】: GIF形式の最小画像を作成（手動でGIFバイナリを書き込む）
fn create_test_gif(path: &str) {
    // GIF89aの最小バイナリ（1x1px、単色）
    // GIF89a ヘッダ + 論理スクリーン記述子 + カラーテーブル + 画像記述子 + 画像データ + トレーラ
    let gif_bytes: &[u8] = &[
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
        0x01, 0x00, 0x01, 0x00, // 論理スクリーン幅・高さ (1x1)
        0x80, 0x00, 0x00, // グローバルカラーテーブルフラグ等
        0xFF, 0x00, 0x00, // カラーテーブル（赤）
        0x00, 0x00, 0x00, // カラーテーブル（黒）
        0x2C, // 画像区切り子
        0x00, 0x00, 0x00, 0x00, // 画像左・上
        0x01, 0x00, 0x01, 0x00, // 画像幅・高さ
        0x00, // パックフィールド
        0x02, // LZW最小コードサイズ
        0x02, 0x4C, 0x01, 0x00, // 圧縮データ
        0x3B, // トレーラ
    ];
    std::fs::write(path, gif_bytes).expect("テスト用GIF画像の作成に失敗");
}

/// テスト用非画像テキストファイルを生成する
///
/// 【テスト前準備】: 画像ではないテキストファイルを作成
fn create_test_text_file(path: &str) {
    std::fs::write(path, "これは画像ではないテキストファイルです。")
        .expect("テスト用テキストファイルの作成に失敗");
}

// ============================================================
// TC-001: PNG画像の正常読み込み
// ============================================================

#[test]
fn test_load_image_png_success() {
    // 【テスト目的】: PNG形式の画像ファイルをload_imageに渡した際、正しいImageMetadata構造体が返却されること
    // 【テスト内容】: 100x50pxのテスト用PNGファイルを作成し、load_imageを呼び出して全フィールドを検証
    // 【期待される動作】: Ok(ImageMetadata)が返り、width=100, height=50, format="png", base64が空でない
    // 🔵 要件定義REQ-001の受け入れ基準「PNG画像を読み込み表示できる」から直接導出

    // 【テストデータ準備】: 100x50pxのPNGファイルをテスト用フィクスチャとして作成
    // 【初期条件設定】: テストごとにフィクスチャを再生成して一貫性を保証
    let path = fixture_path("sample.png");
    create_test_png(&path, 100, 50);

    // 【実際の処理実行】: image_processor::load_image() を呼び出し
    // 【処理内容】: 画像デコード→寸法取得→フォーマット判定("png")→Base64エンコード
    let result = image_processor::load_image(&path);

    // 【結果検証】: Result型がOkであることを確認
    assert!(result.is_ok(), "PNG画像の読み込みがOkでない: {:?}", result);

    let metadata = result.unwrap();

    // 【期待値確認】: 全フィールドが正しい値であることを確認
    assert_eq!(metadata.width, 100); // 【確認内容】: テスト画像の実幅100pxと一致すること 🔵
    assert_eq!(metadata.height, 50); // 【確認内容】: テスト画像の実高さ50pxと一致すること 🔵
    assert_eq!(metadata.format, "png"); // 【確認内容】: PNG形式が正しく判定されること 🔵
    assert!(!metadata.base64.is_empty()); // 【確認内容】: Base64データが空でないこと 🔵
}

// ============================================================
// TC-002: JPG画像の正常読み込み
// ============================================================

#[test]
fn test_load_image_jpg_success() {
    // 【テスト目的】: JPEG形式の画像ファイルをload_imageに渡した際、正しいImageMetadata構造体が返却されること
    // 【テスト内容】: 80x60pxのテスト用JPEGファイルを作成し、load_imageを呼び出して全フィールドを検証
    // 【期待される動作】: Ok(ImageMetadata)が返り、width=80, height=60, format="jpeg", base64が空でない
    // 🔵 要件定義REQ-001の受け入れ基準「JPG画像を読み込み表示できる」から直接導出

    // 【テストデータ準備】: 80x60pxのJPEGファイルをテスト用フィクスチャとして作成
    // 【初期条件設定】: .jpg拡張子でファイルを作成し、JPEG形式のフォーマット判定を検証
    let path = fixture_path("sample.jpg");
    create_test_jpeg(&path, 80, 60);

    // 【実際の処理実行】: image_processor::load_image() を呼び出し
    // 【処理内容】: 画像デコード→寸法取得→フォーマット判定("jpeg")→Base64エンコード
    let result = image_processor::load_image(&path);

    // 【結果検証】: Result型がOkであることを確認
    assert!(result.is_ok(), "JPEG画像の読み込みがOkでない: {:?}", result);

    let metadata = result.unwrap();

    // 【期待値確認】: 全フィールドが正しい値であることを確認
    assert_eq!(metadata.width, 80); // 【確認内容】: テスト画像の実幅80pxと一致すること 🔵
    assert_eq!(metadata.height, 60); // 【確認内容】: テスト画像の実高さ60pxと一致すること 🔵
    assert_eq!(metadata.format, "jpeg"); // 【確認内容】: JPEG形式が"jpeg"（"jpg"でなく）正しく判定されること 🔵
    assert!(!metadata.base64.is_empty()); // 【確認内容】: Base64データが空でないこと 🔵
}

// ============================================================
// TC-003: Base64データが有効でデコード可能であること（PNG）
// ============================================================

#[test]
fn test_load_image_base64_validity() {
    // 【テスト目的】: 返却されたbase64フィールドをSTANDARD方式でデコードし、有効なバイナリデータが得られること
    // 【テスト内容】: PNG画像を読み込み、返却されたBase64文字列が正しくデコードできることを検証
    // 【期待される動作】: base64::STANDARD.decode()がOkを返し、デコード結果が空でない
    // 🔵 実装コード（base64::engine::general_purpose::STANDARD.encode）から直接導出

    // 【テストデータ準備】: Base64エンコード→デコードの往復検証用PNGファイルを作成
    // 【初期条件設定】: 有効なPNG画像をフィクスチャとして配置
    let path = fixture_path("sample_for_base64.png");
    create_test_png(&path, 100, 50);

    // 【実際の処理実行】: load_imageを呼び出してBase64データを取得
    // 【処理内容】: Base64エンコードされた画像データをImageMetadataから取り出す
    let result = image_processor::load_image(&path);
    assert!(result.is_ok(), "PNG画像の読み込みに失敗: {:?}", result);

    let metadata = result.unwrap();

    // 【結果検証】: Base64文字列がSTANDARD方式でデコード可能であることを確認
    // 【期待値確認】: フロントエンドでdata URIとして使用するために有効なBase64が必須
    let decoded = base64::engine::general_purpose::STANDARD.decode(&metadata.base64);
    assert!(decoded.is_ok(), "Base64のデコードに失敗: {:?}", decoded); // 【確認内容】: STANDARD方式でデコードできること 🔵
    assert!(!decoded.unwrap().is_empty()); // 【確認内容】: デコード結果が空でないこと 🔵
}

// ============================================================
// TC-004: 画像寸法が実際のファイルと一致すること
// ============================================================

#[test]
fn test_load_image_dimensions_accuracy() {
    // 【テスト目的】: load_imageが返すwidth/heightが、image crateで直接読み込んだ場合の寸法と一致すること
    // 【テスト内容】: 既知サイズ（100x50px）の画像を使い、返却メタデータの寸法を正確に検証
    // 【期待される動作】: dimensions()で取得した値がそのままImageMetadataに設定される
    // 🔵 実装コード（img.dimensions()）・要件定義書から直接導出

    // 【テストデータ準備】: 寸法が事前に分かっている100x50pxのPNGファイルを作成
    // 【初期条件設定】: フロントエンドのCanvas描画で正確な寸法が必要なため、厳密な一致を検証
    let path = fixture_path("sample_dimensions.png");
    create_test_png(&path, 100, 50);

    // 【実際の処理実行】: load_imageを呼び出して寸法データを取得
    let result = image_processor::load_image(&path);
    assert!(result.is_ok(), "画像の読み込みに失敗: {:?}", result);

    let metadata = result.unwrap();

    // 【結果検証】: 返却された寸法が実画像の寸法と一致することを確認
    // 【期待値確認】: image::open() → dimensions() の結果が正しく伝搬されること
    assert_eq!(metadata.width, 100); // 【確認内容】: 幅100pxが正確に返されること 🔵
    assert_eq!(metadata.height, 50); // 【確認内容】: 高さ50pxが正確に返されること 🔵
}

// ============================================================
// TC-005: 存在しないファイルパスを指定した場合
// ============================================================

#[test]
fn test_load_image_file_not_found() {
    // 【テスト目的】: ファイルシステム上に存在しないパスを指定した場合にエラーが返ること
    // 【テスト内容】: 存在しないファイルパスをload_imageに渡し、Err(String)が返ることを検証
    // 【期待される動作】: Err(String)が返り、エラーメッセージに"画像の読み込みに失敗しました"が含まれる
    // 🔵 要件定義書・タスク定義・実装コードのmap_errから直接導出

    // 【テストデータ準備】: 物理的に存在しないファイルパスを指定
    // 【初期条件設定】: ファイルが移動・削除された場合や外部メディアが取り外された場合を模倣
    let path = "/nonexistent/path/to/image.png";

    // 【実際の処理実行】: 存在しないパスでload_imageを呼び出し
    // 【処理内容】: image::open()がファイルオープンエラーを返し、map_errでString化
    let result = image_processor::load_image(path);

    // 【結果検証】: Err(String)が返ることを確認
    assert!(result.is_err(), "存在しないファイルでErrが返らなかった"); // 【確認内容】: パニックせずErrが返ること 🔵

    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("画像の読み込みに失敗しました"),
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: 日本語エラーメッセージが含まれること 🔵
}

// ============================================================
// TC-006: 非対応画像形式（GIF等）を指定した場合
// ============================================================
//
// ⚠️ このテストはREDフェーズで意図的に失敗する設計です。
// 現行実装: `_ => "png"` でフォールバックするため、GIFでもOk(...)が返る
// GREEN化要件: `_ => return Err("対応していない画像形式です".to_string())` への修正が必要
//
#[test]
fn test_load_image_unsupported_format_gif() {
    // 【テスト目的】: PNG/JPEG以外の形式（GIF）を指定した場合にエラーが返ること
    // 【テスト内容】: GIFファイルをload_imageに渡し、Err(String)が返ることを検証
    // 【期待される動作】: Err(String)が返り、非対応形式であることを示すエラーメッセージ
    // 🔵 TASK-0002完了条件「非対応形式の場合にエラーを返す」から直接導出
    //
    // ※ 現行実装は _ => "png" でフォールバックするため、このテストは失敗する（RED状態）

    // 【テストデータ準備】: GIFバイナリを手動で作成（image crateがデコードできる最小GIF）
    // 【初期条件設定】: アプリの対応形式はPNGとJPEGのみ。GIFは明示的に拒否すべき
    let path = fixture_path("sample.gif");
    create_test_gif(&path);

    // 【実際の処理実行】: GIFファイルパスでload_imageを呼び出し
    // 【処理内容】: フォーマット判定でGIFを検出→Errを返すべき（現行実装は"png"にフォールバック）
    let result = image_processor::load_image(&path);

    // 【結果検証】: Err(String)が返ることを確認（現行実装ではOkが返るためREDになる）
    assert!(
        result.is_err(),
        "GIF画像でErrが返らなかった（現行実装の`_ => \"png\"`フォールバックが原因。GREENフェーズで修正が必要）: {:?}",
        result
    ); // 【確認内容】: 非対応形式が明示的にエラーになること 🔵
}

// ============================================================
// TC-007: 画像でないファイルを指定した場合
// ============================================================

#[test]
fn test_load_image_not_image_file() {
    // 【テスト目的】: ファイル内容が画像データでないファイルを指定した場合にエラーが返ること
    // 【テスト内容】: テキストファイルをload_imageに渡し、Err(String)が返ることを検証
    // 【期待される動作】: Err(String)が返り、"画像の読み込みに失敗しました"が含まれる
    // 🟡 要件定義書のエッジケース（4章）から妥当な推測。image crateの動作に基づく

    // 【テストデータ準備】: 画像データではないテキストファイルを作成
    // 【初期条件設定】: ファイル拡張子偽装や破損ファイルに対する堅牢性を検証
    let path = fixture_path("not_an_image.txt");
    create_test_text_file(&path);

    // 【実際の処理実行】: テキストファイルパスでload_imageを呼び出し
    // 【処理内容】: image::open()がデコードエラーを返し、map_errでString化
    let result = image_processor::load_image(&path);

    // 【結果検証】: Err(String)が返ることを確認
    assert!(result.is_err(), "テキストファイルでErrが返らなかった"); // 【確認内容】: 非画像ファイルで安全にErrが返ること 🟡

    let err_msg = result.unwrap_err();
    assert!(
        err_msg.contains("画像の読み込みに失敗しました"),
        "エラーメッセージが期待値と異なる: {}",
        err_msg
    ); // 【確認内容】: image::open()のエラーが適切にmap_errで変換されること 🟡
}

// ============================================================
// TC-008: 空文字列のパスを指定した場合
// ============================================================

#[test]
fn test_load_image_empty_path() {
    // 【テスト目的】: 空文字列パスを指定した場合にエラーが返ること（パニックしないこと）
    // 【テスト内容】: 空文字列をload_imageに渡し、Err(String)が安全に返ることを検証
    // 【期待される動作】: Err(String)が返り、パニックやクラッシュが発生しない
    // 🟡 要件定義書に明示なし。防御的プログラミングの観点から妥当な推測

    // 【テストデータ準備】: 空文字列（有効なファイルパスではない）
    // 【初期条件設定】: プログラムのバグにより空文字列が渡される場合を模倣
    let path = "";

    // 【実際の処理実行】: 空文字列パスでload_imageを呼び出し
    // 【処理内容】: image::open("")がエラーを返し、Err(String)として安全に返却
    let result = image_processor::load_image(path);

    // 【結果検証】: Err(String)が返ることを確認（パニックなし）
    assert!(result.is_err(), "空文字列パスでErrが返らなかった"); // 【確認内容】: パニックせずErrが返ること 🟡
}

// ============================================================
// TC-009: 1x1ピクセルの最小画像
// ============================================================

#[test]
fn test_load_image_minimum_size_1x1() {
    // 【テスト目的】: 1x1ピクセルの最小サイズ画像が正常に読み込めること
    // 【テスト内容】: 1x1pxのPNG画像を作成し、load_imageを呼び出して正常に処理されることを検証
    // 【期待される動作】: Ok(ImageMetadata)が返り、width=1, height=1, format="png", base64が空でない
    // 🟡 要件定義書に明示なし。一般的なテスト設計（境界値分析）から妥当な推測

    // 【テストデータ準備】: 1x1ピクセルの最小有効PNGファイルを作成
    // 【初期条件設定】: 画像の最小有効サイズ。image crateが処理可能な最小単位を確認
    let path = fixture_path("1x1.png");
    create_test_png(&path, 1, 1);

    // 【実際の処理実行】: 1x1pxの最小画像でload_imageを呼び出し
    // 【処理内容】: 極小サイズでもデコード→寸法取得→フォーマット判定→Base64エンコードが完了する
    let result = image_processor::load_image(&path);

    // 【結果検証】: 最小サイズでも正常にOkが返ることを確認
    assert!(result.is_ok(), "1x1画像の読み込みがOkでない: {:?}", result);

    let metadata = result.unwrap();

    // 【期待値確認】: 境界値での正確性を確認
    assert_eq!(metadata.width, 1); // 【確認内容】: 幅1pxが正確に返されること 🟡
    assert_eq!(metadata.height, 1); // 【確認内容】: 高さ1pxが正確に返されること 🟡
    assert_eq!(metadata.format, "png"); // 【確認内容】: PNG形式が正しく判定されること 🟡
    assert!(!metadata.base64.is_empty()); // 【確認内容】: 最小サイズでもBase64データが生成されること 🟡
}

// ============================================================
// TC-010: 大きい画像ファイルの読み込み（2000x2000px）
// ============================================================

#[test]
fn test_load_image_large_size_2000x2000() {
    // 【テスト目的】: 比較的大きいサイズ（2000x2000px）の画像が正常に読み込めること
    // 【テスト内容】: 2000x2000pxのPNG画像を作成し、load_imageを呼び出して正常に処理されることを検証
    // 【期待される動作】: Ok(ImageMetadata)が返り、width=2000, height=2000, base64が空でない
    // 🟡 要件定義書のパフォーマンス要件（曖昧）から妥当な推測

    // 【テストデータ準備】: 2000x2000pxの比較的大きいPNGファイルを作成
    // 【初期条件設定】: 一般的なデスクトップ画像のサイズ範囲上限付近での動作確認
    let path = fixture_path("large.png");
    create_test_png(&path, 2000, 2000);

    // 【実際の処理実行】: 大きい画像でload_imageを呼び出し
    // 【処理内容】: メモリ確保・デコード→寸法取得→Base64エンコードが大サイズでも完了する
    let result = image_processor::load_image(&path);

    // 【結果検証】: 大きいサイズでも正常にOkが返ることを確認
    assert!(
        result.is_ok(),
        "2000x2000画像の読み込みがOkでない: {:?}",
        result
    );

    let metadata = result.unwrap();

    // 【期待値確認】: 大サイズでも正確なメタデータが返ること
    assert_eq!(metadata.width, 2000); // 【確認内容】: 幅2000pxが正確に返されること 🟡
    assert_eq!(metadata.height, 2000); // 【確認内容】: 高さ2000pxが正確に返されること 🟡
    assert!(!metadata.base64.is_empty()); // 【確認内容】: 大きい画像でもBase64データが生成されること 🟡
}
