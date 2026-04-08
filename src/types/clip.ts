// 【共有型定義】: imgx-clip アプリ全体で使用するクリップ操作関連の型定義
// 【設計方針】: useClipRegion・ImageCanvas の両ファイルで参照される型を一元管理
// 🔵 信頼性レベル: Greenフェーズの課題5「DraggingLine型を共通型定義ファイルへ移動」より

/**
 * 【型定義】: クリップ範囲を表すインターフェース
 * 【用途】: useClipRegion フックの状態・ImageCanvas の props で使用
 * 🔵
 */
export interface ClipRegion {
  /** クリップ上端のY座標（px）。0 <= topY < bottomY の制約あり */
  topY: number;
  /** クリップ下端のY座標（px）。topY < bottomY <= imageHeight の制約あり */
  bottomY: number;
}

/**
 * 【型定義】: ドラッグ対象の水平線を識別するリテラル型
 * 【用途】: useClipRegion フック・ImageCanvas コンポーネントで共有
 * 🔵
 */
export type DraggingLine = "top" | "bottom" | "trimTop" | "trimBottom" | "fillRightX" | null;
