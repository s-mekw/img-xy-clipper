// テストファイル: src/components/__tests__/App.test.tsx
// 【テスト対象】: appReducer（App.tsx内のuseReducer状態管理）
// 【テスト目的】: TC-001〜TC-010, TC-015, TC-021〜TC-023, TC-025〜TC-026 のテストケースを実装
// 【テストフレームワーク】: Vitest + TypeScript
// 【テスト方針】: appReducerは純粋関数なので、直接インポートして単体テストを行う

import { describe, test, expect, beforeEach } from "vitest";

// 【テスト対象の型・関数インポート】
// 【注意】: App.tsx の appReducer, initialState, AppState, AppAction を named export で
//          実装する必要がある。現時点では未実装のため、テストは必ず失敗する。
import { appReducer, initialState } from "../../App";
import type { AppState } from "../../App";

// ============================================================
// appReducer のテストスイート
// ============================================================
describe("appReducer", () => {
  // 【テスト前準備】: 各テスト実行前にbaseStateを初期状態から作成
  // 【環境初期化】: 各テストが独立した初期状態から始まることを保証する
  let baseState: AppState;

  beforeEach(() => {
    // 【テストデータ準備】: 毎回クリーンな初期状態を作成
    // 【初期条件設定】: 前のテストの副作用がないことを保証
    baseState = { ...initialState };
  });

  // ============================================================
  // TC-022: 初期状態の正確性
  // ============================================================
  test("TC-022: 初期状態が正しく定義されている", () => {
    // 【テスト目的】: appReducerの基盤となる初期状態（initialState）が全プロパティ正しく定義されていること
    // 【テスト内容】: initialState定数の全フィールド値を検証
    // 【期待される動作】: 全プロパティがnull/0/空文字/idleで初期化されている
    // 🔵 信頼性レベル: 要件定義書2.2 initialState 定義より

    // 【結果検証】: 全プロパティが正しい初期値を持つこと
    // 【期待値確認】: 画像未読込の完全な初期状態

    expect(initialState.imagePath).toBeNull(); // 【確認内容】: 画像パスが未設定（null）🔵
    expect(initialState.imageData).toBeNull(); // 【確認内容】: 画像データが未設定（null）🔵
    expect(initialState.imageWidth).toBe(0); // 【確認内容】: 画像幅が0 🔵
    expect(initialState.imageHeight).toBe(0); // 【確認内容】: 画像高さが0 🔵
    expect(initialState.imageFormat).toBe(""); // 【確認内容】: 画像フォーマットが空文字列 🔵
    expect(initialState.clipTopY).toBe(0); // 【確認内容】: クリップ上端Y座標が0 🔵
    expect(initialState.clipBottomY).toBe(0); // 【確認内容】: クリップ下端Y座標が0 🔵
    expect(initialState.status).toBe("idle"); // 【確認内容】: ステータスが'idle' 🔵
    expect(initialState.errorMessage).toBeNull(); // 【確認内容】: エラーメッセージが未設定（null）🔵
  });

  // ============================================================
  // TC-001: LOAD_START アクション
  // ============================================================
  test("TC-001: LOAD_STARTアクションでstatusがloadingに遷移する", () => {
    // 【テスト目的】: appReducer の LOAD_START アクションで status が 'loading' に遷移することを確認
    // 【テスト内容】: initialState に LOAD_START をディスパッチした結果の状態を検証
    // 【期待される動作】: status が 'idle' から 'loading' に変わり、他のプロパティは不変
    // 🔵 信頼性レベル: 要件定義書4.1、note.md Reducer パターンより

    // 【テストデータ準備】: アプリ初期状態（idle）を Reducer の入力として使用
    // 【初期条件設定】: status='idle', imageData=null の未読込状態
    const inputState: AppState = { ...baseState, status: "idle" };

    // 【実際の処理実行】: appReducer に LOAD_START アクションをディスパッチ
    // 【処理内容】: 読み込み開始の状態遷移を Reducer 関数に実行させる
    const result = appReducer(inputState, { type: "LOAD_START" });

    // 【結果検証】: 返された状態の status フィールドが 'loading' であること
    // 【期待値確認】: 状態遷移図 idle → LOAD_START → loading に従った結果
    expect(result.status).toBe("loading"); // 【確認内容】: status が 'loading' に遷移している 🔵
    expect(result.imageData).toBeNull(); // 【確認内容】: 画像データは未設定のまま 🔵
    expect(result.imagePath).toBeNull(); // 【確認内容】: 画像パスは変更されない 🔵
  });

  // ============================================================
  // TC-002: LOAD_SUCCESS アクション
  // ============================================================
  test("TC-002: LOAD_SUCCESSアクションで画像情報とstatusが正しく設定される", () => {
    // 【テスト目的】: LOAD_SUCCESS アクションで画像メタデータ・Base64データ・クリップ範囲初期値が設定されること
    // 【テスト内容】: loading状態に LOAD_SUCCESS をディスパッチした結果の全フィールドを検証
    // 【期待される動作】: status が 'ready' に遷移し、画像情報が保存され、clipTopY=0, clipBottomY=imageHeight に初期化される
    // 🔵 信頼性レベル: 要件定義書4.1、note.md Reducer パターンより

    // 【テストデータ準備】: ローディング中の状態を作成
    // 【初期条件設定】: LOAD_START 実行後の状態（status='loading'）
    const inputState: AppState = { ...baseState, status: "loading" };

    // 【実際の処理実行】: LOAD_SUCCESS アクションをディスパッチ（Rust load_image コマンド成功レスポンス相当）
    // 【処理内容】: 画像メタデータを state に保存し、クリップ範囲を初期化する
    const result = appReducer(inputState, {
      type: "LOAD_SUCCESS",
      payload: {
        imagePath: "/test/image.png",
        imageData: "data:image/png;base64,abc123",
        imageWidth: 800,
        imageHeight: 600,
        imageFormat: "png",
      },
    });

    // 【結果検証】: 全フィールドが正しく設定されていること
    // 【期待値確認】: 画像情報5項目 + クリップ範囲初期化 + status + errorMessage のリセット
    expect(result.status).toBe("ready"); // 【確認内容】: status が 'ready' に遷移 🔵
    expect(result.imagePath).toBe("/test/image.png"); // 【確認内容】: 画像パスが設定される 🔵
    expect(result.imageData).toBe("data:image/png;base64,abc123"); // 【確認内容】: Base64画像データが設定される 🔵
    expect(result.imageWidth).toBe(800); // 【確認内容】: 画像幅が設定される 🔵
    expect(result.imageHeight).toBe(600); // 【確認内容】: 画像高さが設定される 🔵
    expect(result.imageFormat).toBe("png"); // 【確認内容】: 画像フォーマットが設定される 🔵
    expect(result.clipTopY).toBe(150); // 【確認内容】: クリップ上端が画像高さの25%に初期化される 🔵
    expect(result.clipBottomY).toBe(450); // 【確認内容】: クリップ下端が画像高さの75%に初期化される 🔵
    expect(result.errorMessage).toBeNull(); // 【確認内容】: エラーメッセージがクリアされる 🔵
  });

  // ============================================================
  // TC-003: LOAD_ERROR アクション
  // ============================================================
  test("TC-003: LOAD_ERRORアクションでerror状態に遷移しエラーメッセージが設定される", () => {
    // 【テスト目的】: LOAD_ERROR アクションで status が 'error' に遷移し errorMessage が設定されること
    // 【テスト内容】: loading状態に LOAD_ERROR をディスパッチした結果を検証
    // 【期待される動作】: status='error', errorMessage にエラー文字列が設定される
    // 🔵 信頼性レベル: 要件定義書4.4 エラーケースより

    // 【テストデータ準備】: ローディング中の状態
    // 【初期条件設定】: ファイル読み込み試行中の状態
    const inputState: AppState = { ...baseState, status: "loading" };

    // 【実際の処理実行】: LOAD_ERROR アクションをディスパッチ
    // 【処理内容】: エラー発生時の状態遷移を実行する
    const result = appReducer(inputState, {
      type: "LOAD_ERROR",
      payload: "非対応の画像形式です",
    });

    // 【結果検証】: error 状態へ遷移し errorMessage が設定されること
    // 【期待値確認】: エラー情報がユーザーに表示できる状態になる
    expect(result.status).toBe("error"); // 【確認内容】: status が 'error' に遷移 🔵
    expect(result.errorMessage).toBe("非対応の画像形式です"); // 【確認内容】: エラーメッセージが設定される 🔵
  });

  // ============================================================
  // TC-004: UPDATE_CLIP_REGION アクション
  // ============================================================
  test("TC-004: UPDATE_CLIP_REGIONアクションでクリップ範囲が更新される", () => {
    // 【テスト目的】: UPDATE_CLIP_REGION アクションで clipTopY, clipBottomY が更新されること
    // 【テスト内容】: ready状態から UPDATE_CLIP_REGION をディスパッチした結果を検証
    // 【期待される動作】: クリップ範囲のY座標が指定された値に更新され、statusは変わらない
    // 🔵 信頼性レベル: note.md Reducer パターン、要件定義書4.6状態遷移図より

    // 【テストデータ準備】: 画像読み込み済みで初期クリップ範囲の状態
    // 【初期条件設定】: status='ready', clipTopY=0, clipBottomY=600（初期値）
    const inputState: AppState = {
      ...baseState,
      status: "ready",
      clipTopY: 0,
      clipBottomY: 600,
      imageHeight: 600,
    };

    // 【実際の処理実行】: UPDATE_CLIP_REGION アクションをディスパッチ（ドラッグ操作の結果）
    // 【処理内容】: ユーザーが ImageCanvas 上でドラッグ操作した結果を状態に反映する
    const result = appReducer(inputState, {
      type: "UPDATE_CLIP_REGION",
      payload: { topY: 100, bottomY: 500 },
    });

    // 【結果検証】: clipTopY/clipBottomY のみ変更されること
    // 【期待値確認】: status は変更されない、クリップ範囲のみ更新
    expect(result.clipTopY).toBe(100); // 【確認内容】: クリップ上端が100に更新される 🔵
    expect(result.clipBottomY).toBe(500); // 【確認内容】: クリップ下端が500に更新される 🔵
    expect(result.status).toBe("ready"); // 【確認内容】: status は変更されない 🔵
  });

  // ============================================================
  // TC-005: SAVE_START アクション
  // ============================================================
  test("TC-005: SAVE_STARTアクションでstatusがsavingに遷移する", () => {
    // 【テスト目的】: SAVE_START アクションで status が 'saving' に遷移すること
    // 【テスト内容】: ready状態に SAVE_START をディスパッチした結果の statusを検証
    // 【期待される動作】: status が 'ready' から 'saving' に変わる
    // 🔵 信頼性レベル: 要件定義書4.2、note.md Reducer パターンより

    // 【テストデータ準備】: 画像読み込み済みで保存可能な状態
    // 【初期条件設定】: 保存ボタン押下前の状態（status='ready'）
    const inputState: AppState = {
      ...baseState,
      status: "ready",
      imagePath: "/test/image.png",
      imageData: "data:image/png;base64,abc",
    };

    // 【実際の処理実行】: SAVE_START アクションをディスパッチ
    // 【処理内容】: 保存開始の状態遷移を実行する
    const result = appReducer(inputState, { type: "SAVE_START" });

    // 【結果検証】: status が 'saving' に遷移すること
    // 【期待値確認】: 保存中状態で保存ボタンが無効化される前提
    expect(result.status).toBe("saving"); // 【確認内容】: status が 'saving' に遷移 🔵
  });

  // ============================================================
  // TC-006: SAVE_SUCCESS アクション
  // ============================================================
  test("TC-006: SAVE_SUCCESSアクションでstatusがreadyに戻る", () => {
    // 【テスト目的】: SAVE_SUCCESS アクションで status が 'ready' に戻ること
    // 【テスト内容】: saving状態に SAVE_SUCCESS をディスパッチした結果の statusを検証
    // 【期待される動作】: status が 'saving' から 'ready' に変わる
    // 🔵 信頼性レベル: 要件定義書4.2、note.md Reducer パターンより

    // 【テストデータ準備】: 保存中の状態
    // 【初期条件設定】: clip_and_save IPC コマンド実行中の状態（status='saving'）
    const inputState: AppState = {
      ...baseState,
      status: "saving",
      imagePath: "/test/image.png",
      imageData: "data:image/png;base64,abc",
      clipTopY: 100,
      clipBottomY: 500,
    };

    // 【実際の処理実行】: SAVE_SUCCESS アクションをディスパッチ
    // 【処理内容】: 保存成功時の状態遷移を実行する
    const result = appReducer(inputState, { type: "SAVE_SUCCESS" });

    // 【結果検証】: status が 'ready' に戻り、画像情報・クリップ範囲は保持されること
    // 【期待値確認】: 保存完了後も画像は表示されたままの状態を維持する
    expect(result.status).toBe("ready"); // 【確認内容】: status が 'ready' に戻る 🔵
    expect(result.imagePath).toBe("/test/image.png"); // 【確認内容】: 画像パスは保持される 🔵
    expect(result.clipTopY).toBe(100); // 【確認内容】: クリップ範囲は保持される 🔵
    expect(result.clipBottomY).toBe(500); // 【確認内容】: クリップ下端は保持される 🔵
  });

  // ============================================================
  // TC-007: SAVE_ERROR アクション
  // ============================================================
  test("TC-007: SAVE_ERRORアクションでerror状態に遷移する", () => {
    // 【テスト目的】: SAVE_ERROR アクションで status が 'error' に遷移し errorMessage が設定されること
    // 【テスト内容】: saving状態に SAVE_ERROR をディスパッチした結果を検証
    // 【期待される動作】: status='error', errorMessage にエラー文字列が設定される
    // 🔵 信頼性レベル: 要件定義書4.5 エラーケースより

    // 【テストデータ準備】: 保存中の状態
    // 【初期条件設定】: clip_and_save IPC コマンド実行中（status='saving'）
    const inputState: AppState = { ...baseState, status: "saving" };

    // 【実際の処理実行】: SAVE_ERROR アクションをディスパッチ
    // 【処理内容】: 保存エラー時の状態遷移を実行する
    const result = appReducer(inputState, {
      type: "SAVE_ERROR",
      payload: "書き込み権限がありません",
    });

    // 【結果検証】: error 状態へ遷移し errorMessage が設定されること
    // 【期待値確認】: エラー情報がユーザーに表示できる状態になる
    expect(result.status).toBe("error"); // 【確認内容】: status が 'error' に遷移 🔵
    expect(result.errorMessage).toBe("書き込み権限がありません"); // 【確認内容】: エラーメッセージが設定される 🔵
  });

  // ============================================================
  // TC-008: START_DRAGGING アクション
  // ============================================================
  test("TC-008: START_DRAGGINGアクションでstatusがdraggingに遷移する", () => {
    // 【テスト目的】: START_DRAGGING アクションで status が 'dragging' に遷移すること
    // 【テスト内容】: ready状態に START_DRAGGING をディスパッチした結果を検証
    // 【期待される動作】: status が 'ready' から 'dragging' に変わる
    // 🟡 信頼性レベル: 要件定義書4.6の状態遷移図から妥当な推測

    // 【テストデータ準備】: 画像読み込み済みの状態
    // 【初期条件設定】: ユーザーがドラッグ開始直前の状態（status='ready'）
    const inputState: AppState = { ...baseState, status: "ready" };

    // 【実際の処理実行】: START_DRAGGING アクションをディスパッチ
    // 【処理内容】: ドラッグ開始時の状態遷移を実行する
    const result = appReducer(inputState, { type: "START_DRAGGING" });

    // 【結果検証】: status が 'dragging' に遷移すること
    // 【期待値確認】: ドラッグ中であることを示す状態への遷移
    expect(result.status).toBe("dragging"); // 【確認内容】: status が 'dragging' に遷移 🟡
  });

  // ============================================================
  // TC-009: END_DRAGGING アクション
  // ============================================================
  test("TC-009: END_DRAGGINGアクションでstatusがreadyに戻る", () => {
    // 【テスト目的】: END_DRAGGING アクションで status が 'ready' に戻ること
    // 【テスト内容】: dragging状態に END_DRAGGING をディスパッチした結果を検証
    // 【期待される動作】: status が 'dragging' から 'ready' に変わる
    // 🟡 信頼性レベル: 要件定義書4.6の状態遷移図から妥当な推測

    // 【テストデータ準備】: ドラッグ中の状態
    // 【初期条件設定】: ユーザーがドラッグ中の状態（status='dragging'）
    const inputState: AppState = { ...baseState, status: "dragging" };

    // 【実際の処理実行】: END_DRAGGING アクションをディスパッチ
    // 【処理内容】: ドラッグ終了時の状態遷移を実行する
    const result = appReducer(inputState, { type: "END_DRAGGING" });

    // 【結果検証】: status が 'ready' に戻ること
    // 【期待値確認】: マウスアップ後に操作可能な ready 状態に戻る
    expect(result.status).toBe("ready"); // 【確認内容】: status が 'ready' に戻る 🟡
  });

  // ============================================================
  // TC-010: RESET_ERROR アクション
  // ============================================================
  test("TC-010: RESET_ERRORアクションでerrorMessageがnullにリセットされる", () => {
    // 【テスト目的】: RESET_ERROR アクションで errorMessage が null になること
    // 【テスト内容】: error状態から RESET_ERROR をディスパッチした結果を検証
    // 【期待される動作】: errorMessage がクリアされる
    // 🟡 信頼性レベル: note.md Reducer パターンから妥当な推測

    // 【テストデータ準備】: エラー状態のstateを作成
    // 【初期条件設定】: ユーザーがエラーメッセージを確認後に閉じる操作の前の状態
    const inputState: AppState = {
      ...baseState,
      status: "error",
      errorMessage: "前回のエラーメッセージ",
    };

    // 【実際の処理実行】: RESET_ERROR アクションをディスパッチ
    // 【処理内容】: エラーメッセージをクリアする状態遷移を実行する
    const result = appReducer(inputState, { type: "RESET_ERROR" });

    // 【結果検証】: errorMessage が null になること
    // 【期待値確認】: エラー状態がリセットされユーザーが次の操作を行える状態になる
    expect(result.errorMessage).toBeNull(); // 【確認内容】: errorMessage が null にリセットされる 🟡
  });

  // ============================================================
  // TC-015: 別画像読み込み時のクリップ範囲リセット
  // ============================================================
  test("TC-015: 別画像をLOAD_SUCCESSで読み込むとクリップ範囲が新画像のサイズにリセットされる", () => {
    // 【テスト目的】: 画像が既に読み込まれた状態から別画像をLOAD_SUCCESSした場合、クリップ範囲が新画像のサイズにリセットされること
    // 【テスト内容】: ready状態（既存クリップ範囲あり）に別画像の LOAD_SUCCESS をディスパッチ
    // 【期待される動作】: 前の画像のクリップ範囲が破棄され、新画像の全高さが設定される
    // 🔵 信頼性レベル: 要件定義書4.1、note.md Reducer パターンより

    // 【テストデータ準備】: 既存画像のクリップ範囲が設定された状態を作成
    // 【初期条件設定】: imageHeight=600, clipTopY=100, clipBottomY=500（前の画像のクリップ範囲）
    const inputState: AppState = {
      ...baseState,
      status: "ready",
      imagePath: "/old/image.png",
      imageData: "data:image/png;base64,olddata",
      imageWidth: 800,
      imageHeight: 600,
      imageFormat: "png",
      clipTopY: 100,
      clipBottomY: 500,
    };

    // 【実際の処理実行】: 別の画像の LOAD_SUCCESS をディスパッチ
    // 【処理内容】: 新しい画像（高さ400px）に切り替えるシナリオ
    const result = appReducer(inputState, {
      type: "LOAD_SUCCESS",
      payload: {
        imagePath: "/new/image.png",
        imageData: "data:image/png;base64,newdata",
        imageWidth: 600,
        imageHeight: 400,
        imageFormat: "png",
      },
    });

    // 【結果検証】: 新画像のサイズに合わせてクリップ範囲がリセットされること
    // 【期待値確認】: 前の画像のクリップ範囲情報（topY=100, bottomY=500）が残らない
    expect(result.clipTopY).toBe(100); // 【確認内容】: クリップ上端が新画像高さの25%にリセットされる 🔵
    expect(result.clipBottomY).toBe(300); // 【確認内容】: クリップ下端が新画像高さの75%にリセットされる 🔵
    expect(result.imageHeight).toBe(400); // 【確認内容】: 画像高さが新しい値に更新される 🔵
  });

  // ============================================================
  // TC-021: 未定義のアクションタイプ
  // ============================================================
  test("TC-021: 未定義のアクションタイプで状態が変更されない", () => {
    // 【テスト目的】: Reducer が未知のアクションを受け取った場合でも状態が維持されること
    // 【テスト内容】: 定義されていないアクションタイプ（UNKNOWN_ACTION）をディスパッチ
    // 【期待される動作】: 入力と同じ initialState がそのまま返される（default: return state）
    // 🔵 信頼性レベル: note.md Reducer パターン（default: return state）より

    // 【テストデータ準備】: 初期状態を使用
    // 【初期条件設定】: Reducer に未知のアクションが渡される一般的なシナリオ

    // 【実際の処理実行】: 未定義のアクションタイプをディスパッチ
    // 【処理内容】: default ケースで現在の状態をそのまま返すことを確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = appReducer(baseState, { type: "UNKNOWN_ACTION" } as any);

    // 【結果検証】: 全プロパティが変更されていないこと
    // 【期待値確認】: 予期しないアクションで状態が破壊されない防御的実装
    expect(result.status).toBe("idle"); // 【確認内容】: status が変更されない 🔵
    expect(result.imageData).toBeNull(); // 【確認内容】: imageData が変更されない 🔵
    expect(result.errorMessage).toBeNull(); // 【確認内容】: errorMessage が変更されない 🔵
    expect(result).toEqual(baseState); // 【確認内容】: 全プロパティが入力と同一 🔵
  });

  // ============================================================
  // TC-023: エラー状態からの復帰
  // ============================================================
  test("TC-023: エラー状態からLOAD_SUCCESSで正常に復帰する", () => {
    // 【テスト目的】: エラー状態から再読み込みを試みた場合に正常状態に復帰できること
    // 【テスト内容】: error状態 → LOAD_START → LOAD_SUCCESS の遷移シーケンスを検証
    // 【期待される動作】: LOAD_SUCCESS 後に status='ready', errorMessage=null の正常状態になる
    // 🔵 信頼性レベル: 要件定義書4.6 状態遷移図、note.md Reducer パターンより

    // 【テストデータ準備】: エラー状態のstateを作成
    // 【初期条件設定】: 前回の読み込みが失敗した状態（status='error', errorMessage あり）
    const errorState: AppState = {
      ...baseState,
      status: "error",
      errorMessage: "前回のエラー",
    };

    // 【実際の処理実行】: LOAD_START → LOAD_SUCCESS の遷移シーケンス
    // 【処理内容】: エラー状態からのリカバリフローを再現
    const loadingState = appReducer(errorState, { type: "LOAD_START" });
    const result = appReducer(loadingState, {
      type: "LOAD_SUCCESS",
      payload: {
        imagePath: "/new/image.png",
        imageData: "data:image/png;base64,newdata",
        imageWidth: 640,
        imageHeight: 480,
        imageFormat: "png",
      },
    });

    // 【結果検証】: 正常な ready 状態に復帰し、errorMessage がクリアされること
    // 【期待値確認】: エラー状態が永続化しない。ユーザーが再試行できる
    expect(result.status).toBe("ready"); // 【確認内容】: status が 'ready' に復帰 🔵
    expect(result.errorMessage).toBeNull(); // 【確認内容】: errorMessage が null にクリアされる 🔵
    expect(result.imageData).toBe("data:image/png;base64,newdata"); // 【確認内容】: 新しい画像データが設定される 🔵
  });

  // ============================================================
  // TC-025: LOAD_SUCCESS 後のクリップ範囲初期値
  // ============================================================
  test("TC-025: LOAD_SUCCESS後のクリップ範囲初期値が画像全体を選択している", () => {
    // 【テスト目的】: LOAD_SUCCESS 後の clipTopY=0, clipBottomY=imageHeight であることを確認
    // 【テスト内容】: imageHeight=1000 の画像を読み込んだ場合のクリップ範囲初期値を検証
    // 【期待される動作】: clipTopY=0, clipBottomY=1000（画像全体が選択される）
    // 🔵 信頼性レベル: 要件定義書4.1 ステップ6、note.md Reducer パターンより

    // 【テストデータ準備】: 高さ1000pxの大画像を読み込むシナリオ
    // 【初期条件設定】: imageHeight=1000 の任意の画像データ

    // 【実際の処理実行】: LOAD_SUCCESS アクションをディスパッチ
    // 【処理内容】: 任意の画像サイズに対してクリップ範囲が正しく初期化されることを確認
    const result = appReducer(baseState, {
      type: "LOAD_SUCCESS",
      payload: {
        imagePath: "/test/large.png",
        imageData: "data:image/png;base64,largedata",
        imageWidth: 1920,
        imageHeight: 1000,
        imageFormat: "png",
      },
    });

    // 【結果検証】: clipTopY=0, clipBottomY=imageHeight=1000 であること
    // 【期待値確認】: 画像読み込み直後はデフォルトで全体が選択された状態
    expect(result.clipTopY).toBe(250); // 【確認内容】: クリップ上端が画像高さの25%（250px）🔵
    expect(result.clipBottomY).toBe(750); // 【確認内容】: クリップ下端が画像高さの75%（750px）🔵
  });

  // ============================================================
  // TC-026: loading 状態での重複 LOAD_START
  // ============================================================
  test("TC-026: loading状態でLOAD_STARTを受けてもstatusはloadingのまま", () => {
    // 【テスト目的】: すでに loading 状態に LOAD_START を受け取っても状態が破壊されないこと
    // 【テスト内容】: loading状態に再度 LOAD_START をディスパッチした結果を検証
    // 【期待される動作】: status が 'loading' のままで、他の状態も変わらない
    // 🟡 信頼性レベル: note.md Reducer パターンから妥当な推測（Reducer の冪等性）

    // 【テストデータ準備】: すでに loading 中の状態を作成
    // 【初期条件設定】: 何らかの理由で LOAD_START が重複してディスパッチされるシナリオ
    const inputState: AppState = { ...baseState, status: "loading" };

    // 【実際の処理実行】: loading 状態に再度 LOAD_START をディスパッチ
    // 【処理内容】: 重複アクションに対する Reducer の安全な処理を確認
    const result = appReducer(inputState, { type: "LOAD_START" });

    // 【結果検証】: status が 'loading' のままであること
    // 【期待値確認】: Reducer は純粋関数であり、同じ遷移ルールが適用される
    expect(result.status).toBe("loading"); // 【確認内容】: status が 'loading' のまま 🟡
    expect(result.imageData).toBeNull(); // 【確認内容】: 画像データは変更されない 🟡
  });
});
