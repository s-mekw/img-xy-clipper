/**
 * 【機能概要】: imgX-Clip アプリのルートコンポーネント・状態管理
 * 【設計方針】: useReducer による集中状態管理でToolbar・ImageCanvas・PreviewPanelを統合
 * 【テスト対応】: TC-001〜TC-018（App統合テスト）・TC-021〜TC-026（appReducer単体テスト）
 * 🔵 信頼性レベル: note.md・要件定義書2.2/2.3・dataflow.md のReducerパターンより
 */
import { useReducer, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import Toolbar from "./components/Toolbar";
import ImageCanvas from "./components/ImageCanvas";
import PreviewPanel from "./components/PreviewPanel";
import config from "./config.json";
import "./App.css";

// ============================================================
// 型定義（named export）
// ============================================================

/**
 * 【型定義】: アプリ全体の状態インターフェース
 * 🔵 信頼性レベル: 要件定義書2.2 AppState インターフェース定義より
 */
export interface AppState {
  // 【画像情報】: 読み込んだ画像のメタデータとBase64データ
  imagePath: string | null; // 【フィールド】: 読み込んだ画像のファイルパス（未読込はnull）
  imageData: string | null; // 【フィールド】: Base64エンコード済み画像データ（未読込はnull）
  imageWidth: number; // 【フィールド】: 画像の幅（px）、未読込は0
  imageHeight: number; // 【フィールド】: 画像の高さ（px）、未読込は0
  imageFormat: string; // 【フィールド】: 画像形式（"png", "jpeg"など）、未読込は空文字列

  // 【クリップ範囲】: ユーザーが指定したY軸方向のクリップ範囲
  clipTopY: number; // 【フィールド】: クリップ上端のY座標
  clipBottomY: number; // 【フィールド】: クリップ下端のY座標

  // 【UI状態】: ステータスとエラー情報
  status: "idle" | "loading" | "ready" | "dragging" | "saving" | "error"; // 【フィールド】: アプリの現在の状態
  errorMessage: string | null; // 【フィールド】: エラーメッセージ（エラー状態時のみ設定）
}

/**
 * 【型定義】: Reducer で使用するアクション型
 * 🔵 信頼性レベル: 要件定義書2.3 AppAction 型定義より
 */
export type AppAction =
  | { type: "LOAD_START" } // 【アクション】: ファイル読み込み開始（status → 'loading'）
  | {
      type: "LOAD_SUCCESS";
      payload: {
        imagePath: string;
        imageData: string;
        imageWidth: number;
        imageHeight: number;
        imageFormat: string;
      };
    } // 【アクション】: ファイル読み込み成功（status → 'ready'、画像情報設定）
  | { type: "LOAD_ERROR"; payload: string } // 【アクション】: ファイル読み込みエラー（status → 'error'、errorMessage設定）
  | { type: "SAVE_START" } // 【アクション】: 保存開始（status → 'saving'）
  | { type: "SAVE_SUCCESS" } // 【アクション】: 保存成功（status → 'ready'）
  | { type: "SAVE_ERROR"; payload: string } // 【アクション】: 保存エラー（status → 'error'、errorMessage設定）
  | { type: "UPDATE_CLIP_REGION"; payload: { topY: number; bottomY: number } } // 【アクション】: クリップ範囲更新（clipTopY/clipBottomY更新）
  | { type: "START_DRAGGING" } // 【アクション】: ドラッグ開始（status → 'dragging'）
  | { type: "END_DRAGGING" } // 【アクション】: ドラッグ終了（status → 'ready'）
  | { type: "RESET_ERROR" }; // 【アクション】: エラーリセット（errorMessage → null）

// ============================================================
// 初期状態（named export）
// ============================================================

/**
 * 【定数定義】: アプリの初期状態
 * 【実装方針】: 画像未読込状態として全フィールドをnull/0/空文字列/idleで初期化
 * 🔵 信頼性レベル: 要件定義書2.2 initialState 定義より
 */
export const initialState: AppState = {
  // 【画像情報の初期値】: 画像未読込状態（全てnullまたは0）
  imagePath: null, // 【初期値】: 画像パス未設定
  imageData: null, // 【初期値】: 画像データ未設定
  imageWidth: 0, // 【初期値】: 幅0（未読込）
  imageHeight: 0, // 【初期値】: 高さ0（未読込）
  imageFormat: "", // 【初期値】: フォーマット未設定（空文字列）

  // 【クリップ範囲の初期値】: 0,0（画像未読込なのでデフォルト値）
  clipTopY: 0, // 【初期値】: クリップ上端Y=0
  clipBottomY: 0, // 【初期値】: クリップ下端Y=0（画像未読込時は0）

  // 【UI状態の初期値】: アプリ起動直後
  status: "idle", // 【初期値】: idle（待機状態）
  errorMessage: null, // 【初期値】: エラーなし
};

// ============================================================
// Reducer 関数（named export）
// ============================================================

/**
 * 【機能概要】: アプリ全体の状態を管理するReducer関数
 * 【実装方針】: 純粋関数として現在状態とアクションから次状態を計算する
 * 【テスト対応】: TC-001〜TC-010, TC-015, TC-021〜TC-023, TC-025〜TC-026 の全テストケース
 * 🔵 信頼性レベル: note.md のReducer実装パターン・要件定義書4.6の状態遷移図より
 * @param state - 現在のアプリ状態
 * @param action - ディスパッチされたアクション
 * @returns 次のアプリ状態
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // 【LOAD_START処理】: ファイル読み込み開始 → status を 'loading' に遷移
    // 🔵 TC-001, TC-026対応: idle/loading → LOAD_START → loading
    case "LOAD_START":
      return { ...state, status: "loading" };

    // 【LOAD_SUCCESS処理】: ファイル読み込み成功 → 画像情報を設定し status を 'ready' に遷移
    // 🔵 TC-002, TC-015, TC-023, TC-025対応: loading → LOAD_SUCCESS → ready
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "ready",
        // 【画像情報設定】: Rust load_image コマンドの返却値をstateに保存
        imagePath: action.payload.imagePath,
        imageData: action.payload.imageData,
        imageWidth: action.payload.imageWidth,
        imageHeight: action.payload.imageHeight,
        imageFormat: action.payload.imageFormat,
        // 【クリップ範囲初期化】: 新しい画像のデフォルト（除去なし = 画像全体が残る）
        clipTopY: Math.round(action.payload.imageHeight * 0.25), // 【初期化】: クリップ上端を画像高さの25%に設定
        clipBottomY: Math.round(action.payload.imageHeight * 0.75), // 【初期化】: クリップ下端を画像高さの75%に設定
        errorMessage: null, // 【エラーリセット】: 前回のエラーメッセージをクリア
      };

    // 【LOAD_ERROR処理】: ファイル読み込みエラー → status を 'error' に遷移しエラーメッセージを設定
    // 🔵 TC-003対応: loading → LOAD_ERROR → error
    case "LOAD_ERROR":
      return {
        ...state,
        status: "error",
        errorMessage: action.payload, // 【エラーメッセージ設定】: Rust側のエラー文字列をそのまま設定
      };

    // 【SAVE_START処理】: 保存開始 → status を 'saving' に遷移
    // 🔵 TC-005対応: ready → SAVE_START → saving
    case "SAVE_START":
      return { ...state, status: "saving" };

    // 【SAVE_SUCCESS処理】: 保存成功 → status を 'ready' に遷移
    // 🔵 TC-006対応: saving → SAVE_SUCCESS → ready
    case "SAVE_SUCCESS":
      return { ...state, status: "ready" };

    // 【SAVE_ERROR処理】: 保存エラー → status を 'error' に遷移しエラーメッセージを設定
    // 🔵 TC-007対応: saving → SAVE_ERROR → error
    case "SAVE_ERROR":
      return {
        ...state,
        status: "error",
        errorMessage: action.payload, // 【エラーメッセージ設定】: Rust側のエラー文字列をそのまま設定
      };

    // 【UPDATE_CLIP_REGION処理】: クリップ範囲更新 → clipTopY/clipBottomY のみ更新
    // 🔵 TC-004対応: ImageCanvas上でのドラッグ操作結果を状態に反映
    case "UPDATE_CLIP_REGION":
      return {
        ...state,
        clipTopY: action.payload.topY, // 【クリップ上端更新】: ドラッグで指定されたY座標
        clipBottomY: action.payload.bottomY, // 【クリップ下端更新】: ドラッグで指定されたY座標
      };

    // 【START_DRAGGING処理】: ドラッグ開始 → status を 'dragging' に遷移
    // 🟡 TC-008対応: ready → START_DRAGGING → dragging（状態遷移図より）
    case "START_DRAGGING":
      return { ...state, status: "dragging" };

    // 【END_DRAGGING処理】: ドラッグ終了 → status を 'ready' に遷移
    // 🟡 TC-009対応: dragging → END_DRAGGING → ready（状態遷移図より）
    case "END_DRAGGING":
      return { ...state, status: "ready" };

    // 【RESET_ERROR処理】: エラーリセット → errorMessage を null にクリア
    // 🟡 TC-010対応: エラーメッセージをユーザーが確認後にクリアする
    case "RESET_ERROR":
      return { ...state, errorMessage: null };

    // 【デフォルト処理】: 未定義のアクションタイプ → 現在の状態をそのまま返す
    // 🔵 TC-021対応: 防御的プログラミング（未知のアクションで状態を破壊しない）
    default:
      return state;
  }
}

// ============================================================
// Rust load_image コマンドの戻り値型
// ============================================================

/**
 * 【型定義】: Rust側 load_image コマンドの返却値インターフェース
 * 【注意】: Rust側のフィールド名は `base64` であり、AppState の `imageData` とは異なる
 * 🔵 信頼性レベル: src-tauri/src/commands.rs の ImageMetadata 構造体より確認済み
 */
interface ImageMetadata {
  base64: string; // 【フィールド】: Base64エンコード済み画像データ
  width: number; // 【フィールド】: 画像の幅（px）
  height: number; // 【フィールド】: 画像の高さ（px）
  format: string; // 【フィールド】: 画像形式（"png", "jpeg"など）
}

// ============================================================
// ダイアログフィルタ定数（DRY原則）
// ============================================================

/**
 * 【設定定数】: ファイルを開くダイアログのフィルタ設定
 * 【改善内容】: Greenフェーズのインライン定義を定数として切り出してDRY原則を適用
 * 【設計方針】: 対応画像形式（PNG/JPG/JPEG）をまとめて管理。将来の形式追加も1箇所の変更で済む
 * 🔵 信頼性レベル: テストケース定義書TC-005仕様・要件定義書REQ-001（PNG/JPEG対応）より
 */
const OPEN_DIALOG_FILTERS = [
  {
    name: "Images", // 【フィルタ名】: TC-005仕様: "Images"（複数形）
    extensions: ["png", "jpg", "jpeg"], // 【対応拡張子】: PNG・JPEG の全パターンを網羅
  },
];

/**
 * 【設定定数】: ファイル保存ダイアログのフィルタ設定
 * 【改善内容】: Greenフェーズのインライン定義を定数として切り出してDRY原則を適用
 * 【設計方針】: PNG/JPEG を別フィルタとして提供。ユーザーが保存形式を明示的に選択できる
 * 🔵 信頼性レベル: テストケース定義書TC-006仕様・要件定義書REQ-003（同一形式で保存）より
 */
const SAVE_DIALOG_FILTERS = [
  {
    name: "PNG", // 【フィルタ名】: TC-006仕様: "PNG" フィルタ
    extensions: ["png"], // 【PNG拡張子】: PNG形式での保存
  },
  {
    name: "JPEG", // 【フィルタ名】: TC-006仕様: JPEG フィルタ
    extensions: ["jpg", "jpeg"], // 【JPEG拡張子】: JPEG形式での保存（両拡張子に対応）
  },
];

// ============================================================
// エラーメッセージ生成ヘルパー（DRY原則・単一責任）
// ============================================================

/**
 * 【ヘルパー関数】: unknown 型のエラーを日本語プレフィックス付きメッセージ文字列に変換する
 * 【改善内容】: Greenフェーズの rawMessage → errorMessage の2段階変換を1関数に集約
 * 【再利用性】: handleLoadImage / handleSaveImage の両方で同パターンが必要なため共通化
 * 【単一責任】: エラー変換の責務をこの関数に集約し、ハンドラ内の処理をシンプルに保つ
 * 🔵 信頼性レベル: テストケース定義書TC-008/TC-009の仕様より
 * @param error - catch で捕捉した unknown 型エラー
 * @param prefix - エラーメッセージに付与する日本語プレフィックス（例: "画像読み込みエラー: "）
 * @returns プレフィックス付きエラーメッセージ文字列
 */
function formatErrorMessage(error: unknown, prefix: string): string {
  // 【エラー型変換】: Error インスタンスからはメッセージを、それ以外は文字列変換して取得
  const rawMessage = error instanceof Error ? error.message : String(error);
  // 【プレフィックス付与】: ユーザーがエラー種別を判別できるよう日本語プレフィックスを付与
  return `${prefix}${rawMessage}`;
}

// ============================================================
// App コンポーネント（default export）
// ============================================================

/**
 * 【機能概要】: imgX-Clip アプリのルートコンポーネント
 * 【設計方針】: useReducer で状態管理し、Toolbar・ImageCanvas・PreviewPanel に props を配信
 *   - handleLoadImage: Tauriファイルダイアログ→ load_image IPC → LOAD_SUCCESS/LOAD_ERROR
 *   - handleSaveImage: Tauriファイル保存ダイアログ→ clip_and_save IPC → SAVE_SUCCESS/SAVE_ERROR
 *   - handleClipRegionChange: ImageCanvas からのドラッグ結果を UPDATE_CLIP_REGION で処理
 * 🔵 信頼性レベル: architecture.md のコンポーネント構成・dataflow.md のデータフローより
 */
function App() {
  // 【状態管理初期化】: useReducer で AppState を集中管理
  // 【実装理由】: 複数の状態項目（画像情報・クリップ範囲・UI状態）を一元管理するためuseReducerを採用
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ============================================================
  // イベントハンドラ（useCallback でメモ化）
  // ============================================================

  /**
   * 【機能概要】: 「ファイルを開く」ボタンのクリックハンドラ
   * 【設計方針】: LOAD_START → open ダイアログ → load_image IPC → LOAD_SUCCESS/LOAD_ERROR
   * 【パフォーマンス】: useCallback で依存なし（dispatch は安定した参照）
   * 🔵 信頼性レベル: 要件定義書4.1・note.md「Tauri IPC 連携パターン」より
   */
  const handleLoadImage = useCallback(async () => {
    // 【LOAD_START】: ボタンを無効化して読み込み中状態に遷移
    dispatch({ type: "LOAD_START" });

    try {
      // 【ファイルダイアログ】: PNG/JPG のみ選択可能なダイアログを表示
      // 🔵 note.md「Tauri ファイルダイアログ」より: @tauri-apps/plugin-dialog の open を使用
      // 🔵 フィルタ設定: OPEN_DIALOG_FILTERS 定数を参照（TC-005仕様: "Images" フィルタ名）
      const selectedPath = await open({
        filters: OPEN_DIALOG_FILTERS,
      });

      // 【キャンセル処理】: ダイアログでキャンセルされた場合は状態を loading から戻す
      // 🟡 要件定義書4.3「ファイルダイアログキャンセル時は何もしない」より
      // 【実装注意】: RESET_ERROR は errorMessage を null にクリアするだけで status は変更しない
      //              現行アクションに loading → idle への直接遷移手段がないため、
      //              LOAD_ERROR（空メッセージ）+ RESET_ERROR のシーケンスで idle 相当に戻す
      if (!selectedPath) {
        dispatch({ type: "LOAD_ERROR", payload: "" }); // 【状態遷移】: loading → error（空メッセージ）
        dispatch({ type: "RESET_ERROR" }); // 【エラークリア】: errorMessage を null に戻す
        return;
      }

      // 【IPC呼び出し】: Rust側に画像読み込みを依頼
      // 🔵 note.md「IPC連携パターン」・要件定義書2.4「load_image コマンド」より
      const metadata = await invoke<ImageMetadata>("load_image", {
        path: selectedPath,
      });

      // 【LOAD_SUCCESS】: 画像情報をstateに保存して 'ready' 状態に遷移
      // 🔵 要件定義書4.1ステップ6: LOAD_SUCCESS でクリップ範囲も初期化される
      dispatch({
        type: "LOAD_SUCCESS",
        payload: {
          imagePath: selectedPath,
          imageData: `data:image/${metadata.format};base64,${metadata.base64}`, // 【フィールドマッピング】: Rust の base64 → Data URI 形式に変換
          imageWidth: metadata.width,
          imageHeight: metadata.height,
          imageFormat: metadata.format,
        },
      });
    } catch (error) {
      // 【LOAD_ERROR処理】: IPC呼び出し失敗時にエラーメッセージを設定して 'error' 状態に遷移
      // 【エラー変換】: unknown 型のエラーを文字列に変換してユーザーに表示
      // 【エラーメッセージ整形】: formatErrorMessage ヘルパーでプレフィックス付きメッセージを生成
      // 🔵 TC-008仕様: "画像読み込みエラー: 対応していない画像形式です" 形式を期待
      dispatch({
        type: "LOAD_ERROR",
        payload: formatErrorMessage(error, "画像読み込みエラー: "),
      });
    }
  }, []); // 【依存配列】: dispatch は安定した参照のため依存なし（useReducer から返される）

  /**
   * 【機能概要】: 「保存」ボタンのクリックハンドラ
   * 【設計方針】: SAVE_START → save ダイアログ → clip_and_save IPC → SAVE_SUCCESS/SAVE_ERROR
   * 【パフォーマンス】: useCallback で state の必要な部分のみ依存（imagePath, clipTopY, clipBottomY）
   * 🔵 信頼性レベル: 要件定義書4.2・note.md「Tauri IPC 連携パターン」より
   */
  const handleSaveImage = useCallback(async () => {
    // 【前提条件チェック】: 画像が読み込まれていない場合は何もしない（防御的実装）
    // 🔵 Toolbar の isImageLoaded 制御でも防いでいるが二重チェックで安全性を確保
    if (!state.imagePath) return;

    // 【SAVE_START】: ボタンを無効化して保存中状態に遷移
    dispatch({ type: "SAVE_START" });

    try {
      // 【保存先決定】: config.saveMode に応じて保存フローを分岐
      const fileName = state.imagePath.split(/[/\\]/).pop() ?? "clipped.png";

      let destPath: string | null;

      if (config.saveMode === "overwrite") {
        // 【overwrite モード】: ダイアログなし、元パスに直接上書き保存
        destPath = state.imagePath;
      } else {
        // 【clipped モード】: ダイアログ表示、{元名}_clipped.{元拡張子} をデフォルトパスに
        const dotIdx = fileName.lastIndexOf(".");
        const defaultPath = dotIdx > 0
          ? `${fileName.slice(0, dotIdx)}_clipped${fileName.slice(dotIdx)}`
          : `${fileName}_clipped.png`;

        destPath = await save({
          defaultPath,
          filters: SAVE_DIALOG_FILTERS,
        });

        // 【キャンセル処理】: ダイアログでキャンセルされた場合は 'ready' 状態に戻す
        if (!destPath) {
          dispatch({ type: "SAVE_SUCCESS" }); // 【状態復元】: saving → ready に戻す
          return;
        }
      }

      // 【IPC呼び出し】: Rust側にクリップ・保存を依頼
      // 🔵 note.md「IPC連携パターン」・要件定義書2.4「clip_and_save コマンド」より
      // 🔵 TC-003対応: Rust側IPCコマンドはsnake_case引数（src_path, top_y, bottom_y, dest_path）を期待
      await invoke("clip_and_save", {
        srcPath: state.imagePath, // 【引数名】: Tauri v2はsnake_case→camelCase自動変換
        topY: Math.round(state.clipTopY),
        bottomY: Math.round(state.clipBottomY),
        destPath: destPath,
      });

      // 【SAVE_SUCCESS】: 保存完了で 'ready' 状態に遷移
      dispatch({ type: "SAVE_SUCCESS" });
    } catch (error) {
      // 【SAVE_ERROR処理】: IPC呼び出し失敗時にエラーメッセージを設定して 'error' 状態に遷移
      // 【エラーメッセージ整形】: formatErrorMessage ヘルパーでプレフィックス付きメッセージを生成
      // 🔵 TC-009仕様: "クリップ・保存エラー: 保存先に書き込み権限がありません" 形式を期待
      dispatch({
        type: "SAVE_ERROR",
        payload: formatErrorMessage(error, "クリップ・保存エラー: "),
      });
    }
  }, [state.imagePath, state.clipTopY, state.clipBottomY]); // 【依存配列】: IPC 呼び出しで使用する state フィールドのみ依存

  /**
   * 【機能概要】: ImageCanvas のドラッグ操作で変更されたクリップ範囲を受け取るコールバック
   * 【設計方針】: UPDATE_CLIP_REGION アクションで clipTopY/clipBottomY を更新
   * 【パフォーマンス】: useCallback で依存なし（dispatch は安定した参照）
   * 🔵 信頼性レベル: note.md「既存の共通型定義」・要件定義書2.2より
   */
  const handleClipRegionChange = useCallback(
    (topY: number, bottomY: number) => {
      dispatch({
        type: "UPDATE_CLIP_REGION",
        payload: { topY, bottomY },
      });
    },
    []
  ); // 【依存配列】: dispatch は安定した参照のため依存なし

  /**
   * 【機能概要】: エラーバーの「閉じる」ボタンクリックハンドラ
   * 【設計方針】: RESET_ERROR アクションで errorMessage を null にクリア
   * 🟡 信頼性レベル: 要件定義書4.4/4.5のエラーケースからエラーリセットUI を妥当に推測
   */
  const handleResetError = useCallback(() => {
    dispatch({ type: "RESET_ERROR" });
  }, []);

  // ============================================================
  // 派生状態（state から計算）
  // ============================================================

  // 【派生状態】: Toolbar の isLoading props に渡す値
  // 🔵 note.md「Toolbar コンポーネント構成」より: status が 'loading' の場合に true
  const isLoading = state.status === "loading";

  // 【派生状態】: Toolbar の isSaving props に渡す値
  // 🔵 note.md「Toolbar コンポーネント構成」より: status が 'saving' の場合に true
  const isSaving = state.status === "saving";

  // 【派生状態】: Toolbar の isImageLoaded props に渡す値
  // 🔵 note.md「useReducer の初期状態」より: imageData が null でない場合に true
  const isImageLoaded = state.imageData !== null;

  // ============================================================
  // レンダリング
  // ============================================================

  return (
    <main className="app-container">
      {/* 【Toolbar配置】: 画面上部にファイル操作ボタンを配置 */}
      {/* 🔵 architecture.md「コンポーネント構成」より: Toolbar上部配置 */}
      <Toolbar
        isLoading={isLoading}
        isSaving={isSaving}
        isImageLoaded={isImageLoaded}
        onLoadImage={handleLoadImage}
        onSaveImage={handleSaveImage}
      />

      {/* 【エラー表示】: エラー状態の場合にエラーバーを表示 */}
      {/* 🟡 要件定義書4.4/4.5のエラーケースから妥当に推測した UI */}
      {state.errorMessage && (
        <div className="error-bar" role="alert">
          <span className="error-message">{state.errorMessage}</span>
          {/* 【閉じるボタン】: RESET_ERROR でエラーメッセージをクリア */}
          <button className="error-close-button" onClick={handleResetError}>
            ✕
          </button>
        </div>
      )}

      {/* 【メインコンテンツエリア】: ImageCanvas（左）と PreviewPanel（右）を横並びに配置 */}
      {/* 🔵 architecture.md「コンポーネント構成」より: ImageCanvas左側・PreviewPanel右側 */}
      <div className="content-area">
        {/* 【ImageCanvas配置】: 画像表示とドラッグ操作 */}
        <ImageCanvas
          imageData={state.imageData}
          imageWidth={state.imageWidth}
          imageHeight={state.imageHeight}
          topY={state.clipTopY}
          bottomY={state.clipBottomY}
          onClipRegionChange={handleClipRegionChange}
        />

        {/* 【PreviewPanel配置】: 選択範囲のリアルタイム拡大プレビュー */}
        <PreviewPanel
          imageData={state.imageData}
          imageWidth={state.imageWidth}
          imageHeight={state.imageHeight}
          topY={state.clipTopY}
          bottomY={state.clipBottomY}
        />
      </div>
    </main>
  );
}

export default App;
