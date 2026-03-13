// 【共通ユーティリティ】: imgx-clip のクリップ操作で使用する数値計算ヘルパー関数
// 【設計方針】: useClipRegion・ImageCanvas の両ファイルに重複していたクランプロジックを一元化
// 🔵 信頼性レベル: Greenフェーズの課題1「重複クランプロジックの統合」より

/**
 * 【ヘルパー関数】: 数値を指定範囲内に収める汎用クランプ処理
 * 【再利用性】: topY/bottomY どちらのクランプ処理にも使用できる
 * 【単一責任】: 数値の範囲制限のみを担当
 * 🔵
 * @param value - クランプ対象の数値
 * @param min - 最小値（この値以上になる）
 * @param max - 最大値（この値以下になる）
 * @returns クランプ後の数値（min <= result <= max）
 */
export function clamp(value: number, min: number, max: number): number {
  // 【処理効率化】: Math.max/Math.min の入れ子で1式にまとめ可読性と効率を両立 🔵
  return Math.max(min, Math.min(value, max));
}

/**
 * 【ヘルパー関数】: topY ドラッグ時のY座標クランプ
 * 【制約】:
 *   - 0 <= topY（画像上端）
 *   - topY < bottomY（下端線との交差防止）
 * 【再利用性】: useClipRegion.updateDrag と ImageCanvas.handleMouseMove の両方で使用
 * 🔵 信頼性レベル: 要件定義の座標制約・Greenフェーズの重複ロジックより
 * @param y - ドラッグ中のY座標
 * @param bottomY - 現在の下端Y座標（クランプ上限として使用）
 * @returns クランプ後のtopY（0 <= result <= bottomY - 1）
 */
export function clampTopY(y: number, bottomY: number): number {
  // 【クランプ上限】: topY <= bottomY を許可（topY === bottomY は除去なし = 元画像そのまま） 🔵
  return clamp(y, 0, bottomY);
}

/**
 * 【ヘルパー関数】: bottomY ドラッグ時のY座標クランプ
 * 【制約】:
 *   - bottomY <= imageHeight（画像下端）
 *   - topY < bottomY（上端線との交差防止）
 * 【再利用性】: useClipRegion.updateDrag と ImageCanvas.handleMouseMove の両方で使用
 * 🔵 信頼性レベル: 要件定義の座標制約・Greenフェーズの重複ロジックより
 * @param y - ドラッグ中のY座標
 * @param topY - 現在の上端Y座標（クランプ下限として使用）
 * @param imageHeight - 画像の高さ（クランプ上限として使用）
 * @returns クランプ後のbottomY（topY + 1 <= result <= imageHeight）
 */
export function clampBottomY(y: number, topY: number, imageHeight: number): number {
  // 【クランプ下限】: topY <= bottomY を許可（topY === bottomY は除去なし = 元画像そのまま） 🔵
  return clamp(y, topY, imageHeight);
}
