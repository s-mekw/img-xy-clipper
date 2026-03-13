// ドラッグ状態管理フック（上端・下端Y座標のドラッグ操作を管理）
// 【機能概要】: ImageCanvas のクリップ範囲（topY/bottomY）をドラッグで操作するためのカスタムフック
// 🔵 信頼性レベル: タスクノート・要件定義のuseClipRegion設計仕様より

import { useState, useCallback } from "react";
import type { ClipRegion, DraggingLine } from "../types/clip";
import { clampTopY, clampBottomY } from "../utils/clipMath";

// 【再エクスポート】: 後方互換性のためClipRegion型をここからもexport 🔵
export type { ClipRegion } from "../types/clip";

/**
 * 【機能概要】: 画像クリップ範囲のドラッグ操作状態を管理するカスタムフック
 * 【改善内容】:
 *   - ClipRegion/DraggingLine 型を共有型定義 (src/types/clip.ts) から参照
 *   - クランプロジックを共通ユーティリティ (src/utils/clipMath.ts) に委譲
 * 【設計方針】: useState でtopY/bottomY/isDragging/draggingLineを管理し、3つの操作メソッドを提供
 * 【テスト対応】: TC-001〜TC-007, TC-011〜TC-015, TC-017〜TC-020, TC-023 を通すための実装
 * 🔵 信頼性レベル: 要件定義のuseClipRegion出力仕様・タスクノートの設計より
 * @param imageHeight - 対象画像の高さ（px）。クランプ処理の上限値として使用
 */
export function useClipRegion(imageHeight: number) {
  // 【状態定義】: クリップ範囲の上端・下端Y座標を管理 🔵
  const [region, setRegion] = useState<ClipRegion>({
    topY: 0,
    bottomY: imageHeight,
  });

  // 【状態定義】: ドラッグ中かどうかのフラグ（isDragging=true の間のみ updateDrag が有効） 🔵
  const [isDragging, setIsDragging] = useState(false);

  // 【状態定義】: 現在ドラッグ中の水平線（'top' または 'bottom'、未操作時は null） 🔵
  const [draggingLine, setDraggingLine] = useState<DraggingLine>(null);

  /**
   * 【機能概要】: ドラッグ操作を開始する
   * 【実装方針】: lineId でドラッグ対象の線を記録し、isDraggingをtrueに変更
   * 【テスト対応】: TC-002（startDragでドラッグ状態に遷移）
   * 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseDown）より
   * @param lineId - ドラッグ対象の水平線 ('top' または 'bottom')
   * @param _y - マウスダウン時のY座標（現在は未使用、将来の拡張用）
   */
  const startDrag = useCallback((lineId: "top" | "bottom", _y: number) => {
    // 【ドラッグ開始処理】: ドラッグ対象の線を記録してドラッグ状態をアクティブに変更 🔵
    setDraggingLine(lineId);
    setIsDragging(true);
  }, []);

  /**
   * 【機能概要】: ドラッグ中のY座標を更新する
   * 【改善内容】: clampTopY/clampBottomY ヘルパー関数を使用してクランプ処理を共通化
   * 【実装方針】:
   *   1. isDragging=falseの場合は早期リターン（無視）
   *   2. Y座標を 0〜imageHeight にクランプ（clampTopY/clampBottomY に委譲）
   *   3. topY < bottomY の不変条件を維持（線の交差防止）
   * 【テスト対応】: TC-003〜TC-006, TC-011〜TC-015, TC-018〜TC-020
   * 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseMove）・座標制約より
   * @param y - 更新後のY座標（クランプ処理後に有効範囲に収まる）
   */
  const updateDrag = useCallback(
    (y: number) => {
      // 【ガード処理】: ドラッグ中でない場合は座標更新を無視する 🟡
      // 【理由】: マウスイベントの遅延等でドラッグ終了後にupdateDragが呼ばれるケースに対応
      if (!isDragging || draggingLine === null) {
        return;
      }

      setRegion((prev) => {
        if (draggingLine === "top") {
          // 【topY更新処理】: clampTopY で 0〜(bottomY-1) の範囲にクランプ 🔵
          return { ...prev, topY: clampTopY(y, prev.bottomY) };
        } else {
          // 【bottomY更新処理】: clampBottomY で (topY+1)〜imageHeight の範囲にクランプ 🔵
          return { ...prev, bottomY: clampBottomY(y, prev.topY, imageHeight) };
        }
      });
    },
    [isDragging, draggingLine, imageHeight]
  );

  /**
   * 【機能概要】: ドラッグ操作を終了する
   * 【実装方針】: isDraggingをfalseにリセットし、draggingLineをnullに戻す
   * 【テスト対応】: TC-005（endDragでドラッグ状態が解除される）
   * 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseUp）より
   */
  const endDrag = useCallback(() => {
    // 【ドラッグ終了処理】: ドラッグ状態をリセットして次の操作に備える 🔵
    setIsDragging(false);
    setDraggingLine(null);
  }, []);

  // 【返却値】: 外部から使用するstate・操作メソッドを返却 🔵
  return { region, isDragging, startDrag, updateDrag, endDrag };
}
