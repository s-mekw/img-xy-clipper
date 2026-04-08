/**
 * 【機能概要】: ファイル読み込み・保存ボタンを提供するToolbarコンポーネント
 * 【実装方針】: props 経由で状態を受け取り、ボタンの有効/無効制御とコールバック呼び出しを行う
 * 【テスト対応】: TC-011〜TC-014, TC-016〜TC-020, TC-024 のUIテストケース
 * 🔵 信頼性レベル: note.md のコーディング規約・要件定義書2.1 Toolbar Props 定義より
 */
import React from "react";

// ============================================================
// Props インターフェース
// ============================================================

/**
 * 【型定義】: Toolbar コンポーネントの Props インターフェース
 * 【実装方針】: 全ての状態制御と操作コールバックを親コンポーネントから受け取る
 * 🔵 信頼性レベル: 要件定義書2.1 IToolbarProps インターフェース定義より
 */
interface IToolbarProps {
  /** 【prop】: ファイル読み込み中フラグ（trueの場合「ファイルを開く」ボタンを無効化） */
  isLoading: boolean;
  /** 【prop】: 保存中フラグ（trueの場合「保存」ボタンを無効化） */
  isSaving: boolean;
  /** 【prop】: 画像読み込み済みフラグ（falseの場合「保存」ボタンを無効化） */
  isImageLoaded: boolean;
  /** 【prop】: 「ファイルを開く」ボタンクリック時のコールバック */
  onLoadImage: () => void;
  /** 【prop】: 「保存」ボタンクリック時のコールバック */
  onSaveImage: () => void;
  /** 【prop】: 「別名で保存」ボタンクリック時のコールバック */
  onSaveAsImage: () => void;
}

// ============================================================
// Toolbar コンポーネント（named export）
// ============================================================

/**
 * 【機能概要】: ファイル読み込み・保存ボタンUIコンポーネント
 * 【実装方針】: 状態に応じたボタン有効/無効制御を行い、親コンポーネントのコールバックを呼び出す
 * 【テスト対応】:
 *   - TC-011: 「ファイルを開く」ボタン表示確認
 *   - TC-012: 「保存」ボタン表示確認
 *   - TC-013: 「ファイルを開く」クリックでonLoadImage呼び出し
 *   - TC-014: 「保存」クリックでonSaveImage呼び出し
 *   - TC-016: isLoading時の「ファイルを開く」無効化
 *   - TC-017: isImageLoaded=false時の「保存」無効化
 *   - TC-018: isSaving=true時の「保存」無効化
 *   - TC-019: isLoading時のクリック抑制
 *   - TC-020: isImageLoaded=false時のクリック抑制
 *   - TC-024: 通常状態での両ボタン有効
 * 🔵 信頼性レベル: 要件定義書2.1・note.md コーディング規約より
 */
export const Toolbar: React.FC<IToolbarProps> = ({
  isLoading,
  isSaving,
  isImageLoaded,
  onLoadImage,
  onSaveImage,
  onSaveAsImage,
}) => {
  return (
    <div className="toolbar">
      {/* 【ファイルを開くボタン】: ファイル読み込み操作のトリガー */}
      {/* 【有効条件】: isLoading=false の場合のみ有効（二重読み込み防止） */}
      {/* 🔵 TC-011, TC-013, TC-016, TC-019対応 */}
      <button
        onClick={onLoadImage}
        disabled={isLoading} // 【無効化制御】: 読み込み中は操作不可
      >
        ファイルを開く
      </button>

      {/* 【保存ボタン】: クリップ・保存操作のトリガー */}
      {/* 【有効条件】: isImageLoaded=true かつ isSaving=false かつ isLoading=false の場合のみ有効 */}
      {/* 🔵 TC-012, TC-014, TC-015, TC-017, TC-018, TC-020対応 */}
      <button
        onClick={onSaveImage}
        disabled={!isImageLoaded || isSaving || isLoading} // 【無効化制御】: 画像未読込・保存中・読込中は操作不可 TC-015対応
      >
        {/* 【ボタンテキスト】: TC-017対応: 保存中は「保存中...」、通常は「保存」 */}
        {isSaving ? "保存中..." : "保存"}
      </button>

      {/* 【別名で保存ボタン】: 常にダイアログを表示して任意の名前・場所に保存 */}
      <button
        onClick={onSaveAsImage}
        disabled={!isImageLoaded || isSaving || isLoading}
      >
        {isSaving ? "保存中..." : "別名で保存"}
      </button>
    </div>
  );
};

export default Toolbar;
