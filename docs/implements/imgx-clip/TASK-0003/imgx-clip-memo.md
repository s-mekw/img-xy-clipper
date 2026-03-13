# imgx-clip TDD開発完了記録

## 確認すべきドキュメント

- `docs/tasks/imgx-clip/TASK-0003.md`
- `docs/implements/imgx-clip/TASK-0003/imgx-clip-requirements.md`
- `docs/implements/imgx-clip/TASK-0003/imgx-clip-testcases.md`

## 最終結果 (2026-03-13)

- **実装率**: 100% (15/14+1テストケース、TC-113はGreenフェーズで追加)
- **品質判定**: 合格（全25テスト通過）
- **TODO更新**: 完了マーク追加
- **スコープ内テスト**: 15/15通過（test_clip_and_save.rs）
- **スコープ外テスト**: 10/10通過（test_image_processor.rs）

## 完了条件チェック

| 完了条件 | 状態 | 確認方法 |
|---|---|---|
| `clip_and_save` コマンドがTauriに登録されている | ✅ | `lib.rs` の `invoke_handler` に登録確認 |
| 指定Y範囲で画像をクロップし、入力と同じ形式で保存できる | ✅ | TC-101（PNG）, TC-102（JPG）通過 |
| 保存先に書き込み権限がない場合にエラーを返す | ✅ | TC-106通過 |
| 主要機能の単体テストが通る | ✅ | 全15テスト通過 |

## 重要な技術学習

### 実装パターン

- **ソース形式バリデーション**: `ImageReader::with_guessed_format()` + `match reader.format()` で PNG/JPEG 以外を早期拒否。`image::open()` は GIF 等を通過させてしまうため使用しない
- **DRY原則**: `dest_path.to_lowercase()` を `dest_lower` 変数に束縛して重複呼び出しを防止
- **形式判定の設計方針**: 保存先パスは拡張子ベースで判定（ユーザー意図を尊重）、ソース形式はバイトシグネチャベースで判定（セキュリティ）
- **エラーメッセージ定数化**: `ERR_OPEN`, `ERR_ENCODE`, `ERR_UNSUPPORTED_FORMAT` を一元管理し、テストとの一貫性を保証

### テスト設計

- **TC-113（GIF形式バリデーション）**: Redフェーズで意図的に失敗させ、Greenフェーズで実装追加してグリーン化。TDDサイクルの正しい活用例
- **ファイルシグネチャ検証**: バイトレベルで形式を確認（TC-107〜TC-112）。形式判定ロジックの確実な検証
- **境界値テスト**: `top_y=0`（TC-109）、`bottom_y==height`（TC-110）、クロップ高さ1px（TC-111）で `crop_imm()` の境界動作を保証
- **テスト独立性**: 各テストで `create_test_png/jpeg` で動的生成し、`output_path()` で一意な出力パスを使用

### 品質保証

- `cargo fmt` + `cargo clippy -- -D warnings` でゼロ警告を維持
- docコメントに機能概要・設計方針・パフォーマンス・セキュリティを記載（`load_image` と同等レベル）
- Y座標バリデーションは画像読み込み前に早期チェック（不要なI/Oを防止）
- 画像サイズバリデーションは画像読み込み後にチェック（高さ取得が必要なため）

## テスト一覧（全15件）

| TC | テスト関数名 | 種別 | 状態 |
|---|---|---|---|
| TC-101 | `test_clip_and_save_png_success` | 正常系 | ✅ |
| TC-102 | `test_clip_and_save_jpg_success` | 正常系 | ✅ |
| TC-103 | `test_clip_and_save_invalid_y_range_equal` | 異常系 | ✅ |
| TC-103b | `test_clip_and_save_invalid_y_range_reversed` | 異常系 | ✅ |
| TC-104 | `test_clip_and_save_bottom_y_exceeds_height` | 異常系 | ✅ |
| TC-105 | `test_clip_and_save_source_not_found` | 異常系 | ✅ |
| TC-106 | `test_clip_and_save_save_permission_denied` | 異常系 | ✅ |
| TC-107 | `test_clip_and_save_format_detection_png` | 境界値 | ✅ |
| TC-108 | `test_clip_and_save_format_detection_jpg` | 境界値 | ✅ |
| TC-108b | `test_clip_and_save_format_detection_jpeg` | 境界値 | ✅ |
| TC-109 | `test_clip_and_save_top_y_zero` | 境界値 | ✅ |
| TC-110 | `test_clip_and_save_bottom_y_equals_height` | 境界値 | ✅ |
| TC-111 | `test_clip_and_save_minimum_crop_height_1px` | 境界値 | ✅ |
| TC-112 | `test_clip_and_save_format_detection_uppercase_jpg` | 境界値 | ✅ |
| TC-113 | `test_clip_and_save_gif_source_unsupported_format` | 追加（GIF拒否） | ✅ |
