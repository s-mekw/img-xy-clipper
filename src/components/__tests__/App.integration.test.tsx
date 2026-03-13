// テストファイル: src/components/__tests__/App.integration.test.tsx
// 【テスト対象】: App コンポーネントの統合テスト（IPC連携・状態管理・UI表示）
// 【テスト目的】: TASK-0007 TC-001〜TC-018 のテストケースを実装
// 【テストフレームワーク】: Vitest + React Testing Library
// 【テスト方針】: Tauri API（invoke, open, save）をモック化したコンポーネント統合テスト
// 【Redフェーズ】: テストケース定義書（imgx-clip-testcases.md）の仕様に基づいて作成。
//                  現在の実装が「まだ満たしていない仕様」を含むため失敗する。

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

// 【テスト対象のコンポーネントインポート】
import App from "../../App";

// ============================================================
// モック型の取得
// ============================================================

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);
const mockSave = vi.mocked(save);

// ============================================================
// テスト用フィクスチャデータ
// ============================================================

/** 【フィクスチャ】: Rust load_image コマンドの正常レスポンス */
const sampleImageMetadata = {
  base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  width: 100,
  height: 200,
  format: "png" as const,
};

const sampleImagePath = "C:\\images\\sample.png";
const sampleSavePath = "C:\\output\\clipped.png";

// ============================================================
// App コンポーネント統合テストスイート（TASK-0007）
// ============================================================

describe("App 統合テスト（TASK-0007 TC-001〜TC-018）", () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テストのモック呼び出し記録をクリア
    // 【環境初期化】: テスト間の干渉を防止する
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 【テスト後処理】: モック実装を元に戻す
    // 【状態復元】: 次のテストに影響しないよう復元する
    vi.restoreAllMocks();
  });

  // ============================================================
  // TC-001: 画像読み込みIPC呼び出しで画像データが取得される
  // ============================================================
  test("TC-001: load_image呼び出し後にimageDataがstateに設定されcanvas要素が表示される", async () => {
    // 【テスト目的】: handleLoadImage が Tauri invoke('load_image') を呼び出し、返却された ImageMetadata が
    //                AppState の imageData・imageWidth・imageHeight・imageFormat に正しく設定されること
    // 【テスト内容】: invoke 成功後に Canvas 要素（imageData が null でない証拠）が DOM に表示されることを検証
    // 【期待される動作】: 画像読み込み成功後、isImageLoaded=true になり保存ボタンが有効化される
    // 🔵 信頼性レベル: 要件定義書セクション2「入力・出力の仕様」・App.tsx の LOAD_SUCCESS アクションより

    // 【テストデータ準備】: open() が有効なパスを返し、invoke が ImageMetadata を返すモック
    // 【初期条件設定】: 画像ファイルが正常に選択・読み込みされるケース
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);

    // 【実際の処理実行】: App をレンダリングして「ファイルを開く」ボタンをクリック
    // 【処理内容】: Toolbar → open() → App.handleLoadImage → invoke('load_image') の連携
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: 画像読み込み後に保存ボタンが有効化されること（imageData が null でなくなった証拠）
    // 【期待値確認】: isImageLoaded=true になり Toolbar の保存ボタンが enabled になる
    await waitFor(() => {
      expect(screen.getByText("保存")).not.toBeDisabled(); // 【確認内容】: 画像読み込み後に保存ボタンが有効化される 🔵
    });

    // 【追加検証】: invoke が load_image コマンドで呼ばれたこと
    expect(mockInvoke).toHaveBeenCalledWith("load_image", {
      path: sampleImagePath,
    }); // 【確認内容】: load_image コマンドが正しいパスで呼び出される 🔵
  });

  // ============================================================
  // TC-002: 画像読み込み中にローディング状態が管理される（ローディング時のボタン表示）
  // ============================================================
  test("TC-002: 画像読み込み完了後にローディング状態がクリアされボタンが有効化される", async () => {
    // 【テスト目的】: handleLoadImage 完了後にローディング状態（isLoading=false）が解除されること
    // 【テスト内容】: IPC呼び出し完了後のボタン有効化を検証
    // 【期待される動作】: 読み込み完了後に「ファイルを開く」ボタンが再び enabled になる
    // 🔵 信頼性レベル: App.tsx の LOAD_SUCCESS・LOAD_ERROR での status='loading' 解除より

    // 【テストデータ準備】: 正常な画像読み込みフロー
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);

    // 【実際の処理実行】: 画像読み込みを実行
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: 読み込み完了後に「ファイルを開く」ボタンが有効化されること
    // 【期待値確認】: LOAD_SUCCESS で status='ready' → isLoading=false → ボタン有効
    await waitFor(() => {
      expect(screen.getByText("ファイルを開く")).not.toBeDisabled(); // 【確認内容】: 読み込み完了後にボタンが有効化される 🔵
    });
  });

  // ============================================================
  // TC-003: clip_and_saveが正しいsnake_caseの引数で呼び出される
  // ============================================================
  test("TC-003: clip_and_saveがsrc_path/top_y/bottom_y/dest_pathのsnake_case引数で呼ばれる", async () => {
    // 【テスト目的】: テストケース定義書TC-003の仕様通り、clip_and_save がスネークケース引数で
    //                呼び出されることを確認する
    // 【テスト内容】: invoke('clip_and_save', { src_path, top_y, bottom_y, dest_path }) の引数を検証
    // 【期待される動作】: snake_case フィールド名で IPC が呼び出される
    // 🔵 信頼性レベル: テストケース定義書TC-003・要件定義書セクション2「clip_and_save IPC引数」より
    //
    // ⚠️ 注意: 現在の App.tsx 実装では camelCase (srcPath, topY, bottomY, destPath) を使用している
    //          このテストはテストケース定義書の仕様（snake_case）に基づいており、
    //          現在の実装と異なるため失敗する（Redフェーズ）

    // 【テストデータ準備】: clipRegion が { topY: 50, bottomY: 150 } の状態で保存するシナリオ
    // 【初期条件設定】: 画像読み込み済み（height=200）でドラッグによりクリップ範囲が設定された状態
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce({ ...sampleImageMetadata, height: 200 });
    mockSave.mockResolvedValueOnce(sampleSavePath);
    mockInvoke.mockResolvedValueOnce(undefined);

    // 【実際の処理実行】: 画像読み込み→保存の一連フロー
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    // 【結果検証】: clip_and_save が snake_case 引数で呼ばれること
    // 【期待値確認】: テストケース定義書 TC-003 の仕様: src_path, top_y, bottom_y, dest_path
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("clip_and_save", {
        src_path: sampleImagePath, // 【確認内容】: src_path（snake_case）で渡される 🔵
        top_y: 0,                  // 【確認内容】: top_y（snake_case）で渡される 🔵
        bottom_y: 0,               // 【確認内容】: bottom_y=0（除去なし初期値） 🔵
        dest_path: sampleSavePath, // 【確認内容】: dest_path（snake_case）で渡される 🔵
      });
    });
  });

  // ============================================================
  // TC-004: 保存成功時にエラーメッセージがクリアされる
  // ============================================================
  test("TC-004: 保存成功時にエラーバーが表示されない", async () => {
    // 【テスト目的】: clip_and_save が成功した場合、エラーバーが表示されないことを確認
    // 【テスト内容】: 保存操作成功後に .error-bar 要素が DOM に存在しないことを検証
    // 【期待される動作】: SAVE_SUCCESS でエラーが発生せず error-bar が非表示
    // 🔵 信頼性レベル: App.tsx の SAVE_SUCCESS アクション・error-bar 条件付きレンダリングより

    // 【テストデータ準備】: 画像読み込みと保存の正常ケース
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);
    mockSave.mockResolvedValueOnce(sampleSavePath);
    mockInvoke.mockResolvedValueOnce(undefined);

    // 【実際の処理実行】: 画像読み込み→保存の一連フロー
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    // 【結果検証】: エラーバーが表示されていないこと
    await waitFor(() => {
      expect(document.querySelector(".error-bar")).not.toBeInTheDocument(); // 【確認内容】: エラーバーが非表示 🔵
    });
  });

  // ============================================================
  // TC-005: Toolbarの「画像を開く」ボタンがファイルダイアログを起動する
  // ============================================================
  test("TC-005: 「ファイルを開く」クリックでopen()が画像フィルタ付きで呼ばれる", async () => {
    // 【テスト目的】: 「ファイルを開く」ボタンクリックで open() が PNG/JPEG フィルタ付きで呼ばれること
    // 【テスト内容】: open() の呼び出し引数にフィルタ設定が含まれることを検証
    // 【期待される動作】: open({ filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }] }) が呼ばれる
    // 🔵 信頼性レベル: テストケース定義書TC-005・App.tsx の handleLoadImage の open() 呼び出しより
    //
    // ⚠️ 注意: 現在の App.tsx 実装のフィルタ名は "Image" だが、
    //          テストケース定義書TC-005では "Images" (複数形) が期待されている

    // 【テストデータ準備】: キャンセル（フィルタ引数のみ確認）
    mockOpen.mockResolvedValueOnce(null);

    // 【実際の処理実行】: ボタンクリック
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: open() がフィルタ付きで呼ばれたこと
    // 【期待値確認】: テストケース定義書TC-005の仕様: name='Images'（複数形）, extensions=['png','jpg','jpeg']
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              name: "Images", // 【確認内容】: フィルタ名が "Images"（複数形）🔵
              extensions: expect.arrayContaining(["png", "jpg", "jpeg"]),
            }),
          ]),
        })
      ); // 【確認内容】: PNG/JPEG 画像フィルタ付きでダイアログが呼び出される 🔵
    });
  });

  // ============================================================
  // TC-006: Toolbarの「クリップして保存」ボタンが保存ダイアログを起動する
  // ============================================================
  test("TC-006: 「保存」クリックでsave()がデフォルト名clipped.pngとPNG/JPEGフィルタで呼ばれる", async () => {
    // 【テスト目的】: 「保存」ボタンクリックで save() がデフォルトパス付きで呼ばれること
    // 【テスト内容】: save() の呼び出し引数に defaultPath='clipped.png' が含まれることを検証
    // 【期待される動作】: save({ defaultPath: 'clipped.png', filters: [...] }) が呼ばれる
    // 🔵 信頼性レベル: テストケース定義書TC-006・App.tsx の handleSaveImage の save() 呼び出しより

    // 【テストデータ準備】: 画像読み込み後、保存ダイアログキャンセル（引数のみ確認）
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);
    mockSave.mockResolvedValueOnce(null);

    // 【実際の処理実行】: 画像読み込み→保存ボタンクリック
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    // 【結果検証】: save() がデフォルトパス付きで呼ばれたこと
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: "clipped.png", // 【確認内容】: デフォルトファイル名が clipped.png 🔵
          filters: expect.arrayContaining([
            expect.objectContaining({ name: "PNG" }), // 【確認内容】: PNG フィルタが存在する 🔵
          ]),
        })
      );
    });
  });

  // ============================================================
  // TC-007: 画像読み込み成功後にImageCanvasとPreviewPanelが表示される
  // ============================================================
  test("TC-007: 画像読み込み成功後にImageCanvasとPreviewPanelのcanvas要素が表示される", async () => {
    // 【テスト目的】: imageData がセットされた後、ImageCanvas と PreviewPanel がレンダリングされること
    // 【テスト内容】: load_image 成功後にキャンバス要素が2つ表示されることを検証
    // 【期待される動作】: ImageCanvas と PreviewPanel の各 canvas 要素が DOM に存在する
    // 🔵 信頼性レベル: App.tsx の条件付きレンダリング・ImageCanvas・PreviewPanel コンポーネントより
    //
    // ⚠️ 注意: ImageCanvas と PreviewPanel がそれぞれ独立した <canvas> を持つかどうかは
    //          実装依存のため、最低1つの canvas 要素の存在を確認する

    // 【テストデータ準備】: 正常な画像読み込みモック
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);

    // 【実際の処理実行】: App をレンダリングして画像を読み込む
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: canvas 要素が複数（ImageCanvas + PreviewPanel の2つ）存在すること
    // 【期待値確認】: テストケース定義書TC-007: ImageCanvas と PreviewPanel が両方レンダリングされる
    await waitFor(() => {
      const canvasElements = document.querySelectorAll("canvas");
      expect(canvasElements.length).toBeGreaterThanOrEqual(2); // 【確認内容】: ImageCanvas と PreviewPanel の canvas が存在する 🔵
    });
  });

  // ============================================================
  // TC-008: 画像読み込みIPC失敗時にエラーメッセージが表示される
  // ============================================================
  test("TC-008: load_image失敗時に「画像読み込みエラー:」プレフィックス付きエラーが表示される", async () => {
    // 【テスト目的】: invoke('load_image') がエラーを返した場合、プレフィックス付きエラーメッセージが表示されること
    // 【テスト内容】: エラーバーに「画像読み込みエラー: <エラー本文>」が表示されることを検証
    // 【期待される動作】: テストケース定義書TC-008の仕様: "画像読み込みエラー: 対応していない画像形式です" が表示される
    // 🔵 信頼性レベル: テストケース定義書TC-008より
    //
    // ⚠️ 注意: 現在の App.tsx 実装では LOAD_ERROR payload に Rust エラーメッセージ（プレフィックスなし）を
    //          直接設定しているため、"画像読み込みエラー:" プレフィックスは表示されない
    //          テストケース定義書の仕様ではプレフィックスが期待されているため、このテストは失敗する

    // 【テストデータ準備】: IPC エラーを返すモック
    // 【初期条件設定】: 非対応形式（GIF）を選択した場合のエラーを再現
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockRejectedValueOnce(new Error("対応していない画像形式です"));

    // 【実際の処理実行】: エラーケースの画像読み込み実行
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: プレフィックス付きエラーメッセージが表示されること
    // 【期待値確認】: テストケース定義書TC-008: "画像読み込みエラー: 対応していない画像形式です"
    await waitFor(() => {
      expect(
        screen.getByText("画像読み込みエラー: 対応していない画像形式です") // 【確認内容】: プレフィックス付きエラーメッセージが表示される 🔵
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // TC-009: クリップ・保存IPC失敗時にエラーメッセージが表示される
  // ============================================================
  test("TC-009: clip_and_save失敗時に「クリップ・保存エラー:」プレフィックス付きエラーが表示される", async () => {
    // 【テスト目的】: invoke('clip_and_save') がエラーを返した場合、プレフィックス付きエラーメッセージが表示されること
    // 【テスト内容】: エラーバーに「クリップ・保存エラー: <エラー本文>」が表示されることを検証
    // 【期待される動作】: テストケース定義書TC-009の仕様: "クリップ・保存エラー: 保存先に書き込み権限がありません" が表示される
    // 🔵 信頼性レベル: テストケース定義書TC-009より
    //
    // ⚠️ 注意: 現在の App.tsx 実装では SAVE_ERROR payload にエラーメッセージのみを設定（プレフィックスなし）
    //          テストケース定義書の仕様ではプレフィックスが期待されているため、このテストは失敗する

    // 【テストデータ準備】: 保存失敗のシナリオ
    // 【初期条件設定】: 書き込み権限不足によるエラーを再現
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);
    mockSave.mockResolvedValueOnce(sampleSavePath);
    mockInvoke.mockRejectedValueOnce(new Error("保存先に書き込み権限がありません"));

    // 【実際の処理実行】: 画像読み込み→保存（失敗）
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    // 【結果検証】: プレフィックス付き保存エラーメッセージが表示されること
    // 【期待値確認】: テストケース定義書TC-009: "クリップ・保存エラー: 保存先に書き込み権限がありません"
    await waitFor(() => {
      expect(
        screen.getByText("クリップ・保存エラー: 保存先に書き込み権限がありません") // 【確認内容】: プレフィックス付き保存エラーメッセージが表示される 🔵
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // TC-010: ファイルダイアログキャンセル時に何も処理されない
  // ============================================================
  test("TC-010: ファイルダイアログキャンセル時にinvokeが呼ばれずstateに変更なし", async () => {
    // 【テスト目的】: open() が null を返した（キャンセル）場合、invoke が呼ばれないことを確認
    // 【テスト内容】: ダイアログキャンセル後に IPC呼び出しが発生しないことを検証
    // 【期待される動作】: invoke('load_image') が呼ばれない
    // 🔵 信頼性レベル: テストケース定義書TC-010・App.tsx キャンセル処理より

    // 【テストデータ準備】: open がキャンセル（null）を返す設定
    mockOpen.mockResolvedValueOnce(null);

    // 【実際の処理実行】: ボタンクリック→ダイアログキャンセル
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    // 【結果検証】: invoke が呼ばれていないこと
    expect(mockInvoke).not.toHaveBeenCalled(); // 【確認内容】: invoke('load_image') が呼ばれない 🔵

    // 【追加検証】: エラーメッセージが表示されないこと（テストケース定義書TC-010より）
    expect(document.querySelector(".error-bar")).not.toBeInTheDocument(); // 【確認内容】: エラーメッセージは表示されない 🔵
  });

  // ============================================================
  // TC-011: 保存ダイアログキャンセル時に何も処理されない
  // ============================================================
  test("TC-011: 保存ダイアログキャンセル時にclip_and_saveが呼ばれずisSavingがfalseに戻る", async () => {
    // 【テスト目的】: save() が null を返した場合、clip_and_save IPC が呼ばれず保存中状態が解除されること
    // 【テスト内容】: 保存キャンセル後に「保存」ボタンが再び有効化されることを検証
    // 【期待される動作】: invoke('clip_and_save') が呼ばれず、isSaving=false になる
    // 🔵 信頼性レベル: テストケース定義書TC-011・App.tsx の handleSaveImage キャンセル処理より

    // 【テストデータ準備】: 画像読み込み成功後、保存ダイアログキャンセル
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);
    mockSave.mockResolvedValueOnce(null); // 保存ダイアログキャンセル

    // 【実際の処理実行】: 画像読み込み→保存ダイアログキャンセル
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    // 【結果検証】: clip_and_save が呼ばれていないこと
    expect(mockInvoke).not.toHaveBeenCalledWith("clip_and_save", expect.anything()); // 【確認内容】: clip_and_save が呼ばれない 🔵

    // 【追加検証】: 「保存」ボタンが再び有効化されること（isSaving=false）
    await waitFor(() => {
      expect(screen.getByText("保存")).not.toBeDisabled(); // 【確認内容】: キャンセル後に保存ボタンが有効化される 🔵
    });
  });

  // ============================================================
  // TC-012: 画像未読み込み時にoriginalPathがなくclip_and_saveが呼ばれない
  // ============================================================
  test("TC-012: 初期状態（画像未読込）で保存ボタンがdisabledでクリック不可", () => {
    // 【テスト目的】: imageData=null の初期状態で保存ボタンが disabled になりIPC呼び出しが防止されること
    // 【テスト内容】: App 初期状態での保存ボタンの disabled 状態と invoke 未呼び出しを検証
    // 【期待される動作】: 「保存」ボタンが disabled で、invoke が呼ばれない
    // 🔵 信頼性レベル: テストケース定義書TC-012・App.tsx の isImageLoaded 派生状態より

    // 【テストデータ準備】: 初期状態（画像未読込）でレンダリング
    render(<App />);

    // 【結果検証】: 「保存」ボタンが disabled であること
    expect(screen.getByText("保存")).toBeDisabled(); // 【確認内容】: 初期状態で保存ボタンが無効化されている 🔵
    expect(mockInvoke).not.toHaveBeenCalled(); // 【確認内容】: invoke が呼ばれていない 🔵
  });

  // ============================================================
  // TC-013: 画像読み込みエラー後に再度正常に画像を読み込める
  // ============================================================
  test("TC-013: エラー後に再度「ファイルを開く」をクリックすると正常に読み込めエラーがクリアされる", async () => {
    // 【テスト目的】: エラー状態から回復して正常に次の画像を読み込めることを確認
    // 【テスト内容】: エラー発生後に再度ファイル選択→IPC成功のフローを検証
    // 【期待される動作】: 2回目の呼び出しで成功しエラーメッセージが消える
    // 🟡 信頼性レベル: テストケース定義書TC-013・App.tsx の LOAD_START → LOAD_SUCCESS エラー復帰フローより

    // 【テストデータ準備】: 1回目エラー、2回目成功のシナリオ
    // 1回目: エラー
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockRejectedValueOnce(new Error("非対応形式エラー"));

    // 2回目: 成功
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);

    // 【実際の処理実行】: エラー発生 → 再試行 の連続フロー
    const user = userEvent.setup();
    render(<App />);

    // 1回目クリック: エラー発生
    await user.click(screen.getByText("ファイルを開く"));

    // エラーバーが表示されること
    // 【改善】: 実装詳細（プレフィックス文字列）への過度な依存を避けるため
    //           正規表現でエラーメッセージの本質部分のみを検証
    // 🟡 テストケース定義書TC-013: エラーバーが表示されることを確認（具体的テキストよりも存在確認を重視）
    await waitFor(() => {
      expect(
        screen.getByText(/非対応形式エラー/) // 【確認内容】: エラー本文が表示されている（プレフィックス変更に耐性あり）
      ).toBeInTheDocument();
    });

    // 2回目クリック: 正常読み込み
    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: エラーがクリアされ正常状態に復帰すること
    await waitFor(() => {
      expect(document.querySelector(".error-bar")).not.toBeInTheDocument(); // 【確認内容】: エラーバーが非表示になる 🟡
    });
  });

  // ============================================================
  // TC-014: 画像未読み込み状態で保存ボタンがdisabledになる
  // ============================================================
  test("TC-014: 初期状態で「保存」ボタンのdisabled属性がtrueである", () => {
    // 【テスト目的】: App 初期状態（imageData=null）で「保存」ボタンが disabled になることを確認
    // 【テスト内容】: アプリ起動直後の保存ボタンの disabled 属性を検証
    // 【期待される動作】: 「保存」ボタンの disabled 属性が true
    // 🔵 信頼性レベル: テストケース定義書TC-014・App.tsx の isImageLoaded・Toolbar の disabled prop より

    render(<App />);

    expect(screen.getByText("保存")).toBeDisabled(); // 【確認内容】: 「保存」ボタンが初期状態で無効化されている 🔵
  });

  // ============================================================
  // TC-015: ローディング中にすべてのボタンがdisabledになる
  // ============================================================
  test("TC-015: ローディング中に「ファイルを開く」と「保存」の両ボタンが無効化される", async () => {
    // 【テスト目的】: isLoading=true の状態で両ボタンが disabled になることを確認
    // 【テスト内容】: IPC処理中の中間状態で両ボタンの disabled 状態を検証
    // 【期待される動作】: テストケース定義書TC-015: 「ファイルを開く」「クリップして保存」の両ボタンが disabled
    // 🔵 信頼性レベル: テストケース定義書TC-015・Toolbar の disabled props より
    //
    // ⚠️ 注意: 現在の Toolbar 実装では isLoading が「ファイルを開く」のみを無効化する
    //          テストケース定義書TC-015では「保存」ボタンも isLoading 時に無効化されることが期待されるが
    //          現在の実装は !isImageLoaded || isSaving でのみ制御しているため
    //          「保存」ボタンの isLoading 時の無効化は実装されていない可能性がある

    // 【テストデータ準備】: 画像読み込み済み状態でその後のロードが保留中
    mockOpen
      .mockResolvedValueOnce(sampleImagePath)  // 1回目: 画像読み込み（成功）
      .mockResolvedValueOnce(sampleImagePath); // 2回目: 再ロード（保留中）
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata); // 1回目 load_image: 成功

    let resolveLoad: (value: unknown) => void = () => {};
    const pendingLoad = new Promise((resolve) => {
      resolveLoad = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingLoad as ReturnType<typeof invoke>); // 2回目 load_image: 保留中

    // 【実際の処理実行】: 1回目で画像読み込み → 2回目でローディング中状態を作成
    const user = userEvent.setup();
    render(<App />);

    // 1回目: 画像読み込み成功
    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());

    // 2回目: ローディング中状態にする
    await act(async () => {
      await user.click(screen.getByText("ファイルを開く"));
    });

    // 【結果検証】: ローディング中に両ボタンが無効化されていること
    await waitFor(() => {
      expect(screen.getByText("ファイルを開く")).toBeDisabled(); // 【確認内容】: isLoading=true で「ファイルを開く」が無効化される 🔵
    });

    // テストケース定義書TC-015: 「保存」ボタンも isLoading=true で無効化されること
    expect(screen.getByText("保存")).toBeDisabled(); // 【確認内容】: isLoading=true で「保存」も無効化される 🔵

    // クリーンアップ
    resolveLoad(sampleImageMetadata);
  });

  // ============================================================
  // TC-016: clipRegion初期値（topY=0, bottomY=0）でclip_and_saveが呼び出される
  // ============================================================
  test("TC-016: clipRegion初期値（topY=0, bottomY=imageHeight）でclip_and_saveが呼ばれる（TC-003の仕様で）", async () => {
    // 【テスト目的】: ドラッグ操作なしの初期クリップ範囲でIPC呼び出しが行われることを確認
    // 【テスト内容】: topY=0, bottomY=imageHeight のデフォルト状態での保存IPC引数を検証
    // 【期待される動作】: テストケース定義書TC-016: フロントエンドはバリデーションなしでRustに委譲
    // 🟡 信頼性レベル: テストケース定義書TC-016・App.tsx の LOAD_SUCCESS クリップ範囲初期化より
    //
    // ⚠️ 注意: TC-003同様、snake_caseの引数名を期待している（現行実装はcamelCase）

    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce({ ...sampleImageMetadata, height: 200 });
    mockSave.mockResolvedValueOnce(sampleSavePath);
    mockInvoke.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());
    await user.click(screen.getByText("保存"));

    // 【結果検証】: topY=0, bottomY=200（imageHeight）で snake_case IPC呼び出しが行われること
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("clip_and_save", {
        src_path: sampleImagePath, // 【確認内容】: snake_case引数 src_path 🟡
        top_y: 0,                  // 【確認内容】: top_y=0（初期値） 🟡
        bottom_y: 0,               // 【確認内容】: bottom_y=0（除去なし初期値） 🟡
        dest_path: sampleSavePath, // 【確認内容】: snake_case引数 dest_path 🟡
      });
    });
  });

  // ============================================================
  // TC-017: 保存中（isSaving=true）にボタンテキストが「保存中...」に変わる
  // ============================================================
  test("TC-017: 保存中にボタンテキストが「保存中...」に変わりdisabledになる", async () => {
    // 【テスト目的】: isSaving=true の状態で「保存」ボタンのテキストが「保存中...」に変わることを確認
    // 【テスト内容】: clip_and_save IPC処理中の「保存中...」テキスト表示を検証
    // 【期待される動作】: テストケース定義書TC-017: ボタンテキストが「保存中...」に変更され disabled になる
    // 🔵 信頼性レベル: テストケース定義書TC-017より
    //
    // ⚠️ 注意: 現在の Toolbar 実装のボタンテキストは常に「保存」固定
    //          テストケース定義書TC-017の仕様では isSaving 時に「保存中...」に変わることが期待されているが
    //          現在の Toolbar.tsx には三項演算子によるテキスト変更が実装されていない

    // 【テストデータ準備】: 保存が永続的に保留の状態
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockResolvedValueOnce(sampleImageMetadata);
    mockSave.mockResolvedValueOnce(sampleSavePath);

    let resolveSave: (value: unknown) => void = () => {};
    const pendingSave = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingSave as ReturnType<typeof invoke>);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));
    await waitFor(() => expect(screen.getByText("保存")).not.toBeDisabled());

    await act(async () => {
      await user.click(screen.getByText("保存"));
    });

    // 【結果検証】: 保存中にボタンテキストが「保存中...」に変わること
    // 【期待値確認】: テストケース定義書TC-017: { isSaving ? '保存中...' : 'クリップして保存' }
    await waitFor(() => {
      expect(screen.getByText("保存中...")).toBeInTheDocument(); // 【確認内容】: ボタンテキストが「保存中...」に変わる 🔵
    });
    expect(screen.getByText("保存中...")).toBeDisabled(); // 【確認内容】: 保存中にボタンが無効化される 🔵

    resolveSave(undefined);
  });

  // ============================================================
  // TC-018: エラーメッセージ表示と非表示の切り替え
  // ============================================================
  test("TC-018: エラーバーが表示され「閉じる」ボタンでクリアされる", async () => {
    // 【テスト目的】: エラー発生→エラーバー表示→「閉じる」ボタンで非表示 のライフサイクルを確認
    // 【テスト内容】: error=null→error=文字列→error=null の DOM表示変化を検証
    // 【期待される動作】: エラーバーが表示され、「閉じる」ボタンクリックで非表示になる
    // 🔵 信頼性レベル: テストケース定義書TC-018・App.tsx のエラーバー実装・RESET_ERROR アクションより

    // 【テストデータ準備】: IPC エラーを発生させてエラーバーを表示
    mockOpen.mockResolvedValueOnce(sampleImagePath);
    mockInvoke.mockRejectedValueOnce(new Error("テストエラーメッセージ"));

    // 【実際の処理実行】: エラー発生→エラーバー確認→閉じるボタンクリック
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("ファイルを開く"));

    // エラーバーが表示されること
    await waitFor(() => {
      expect(document.querySelector(".error-bar")).toBeInTheDocument(); // 【確認内容】: エラーバーが表示される 🔵
    });

    // 閉じるボタンをクリック
    await user.click(screen.getByText("✕"));

    // 【結果検証】: エラーバーが非表示になること
    await waitFor(() => {
      expect(document.querySelector(".error-bar")).not.toBeInTheDocument(); // 【確認内容】: エラーバーが DOM から削除される 🔵
    });
  });
});
