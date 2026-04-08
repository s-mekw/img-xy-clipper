// 画像表示・2本の水平線ドラッグ操作・オーバーレイ描画コンポーネント
// 【機能概要】: Base64画像をCanvasに描画し、topY/bottomYの水平線をドラッグ操作できるコンポーネント
// 🔵 信頼性レベル: タスクノート・要件定義のImageCanvasコンポーネント設計仕様より

import React, { useRef, useEffect, useState } from "react";
import type { DraggingLine } from "../types/clip";
import { clampTopY, clampBottomY, clampTrimTopY, clampTrimBottomY, clampFillRightX } from "../utils/clipMath";

// 【インターフェース定義】: ImageCanvasコンポーネントのPropsを定義 🔵
interface IImageCanvasProps {
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  trimTopY: number;
  trimBottomY: number;
  fillRightX: number;
  onClipRegionChange: (topY: number, bottomY: number) => void;
  onTrimRegionChange: (trimTopY: number, trimBottomY: number) => void;
  onFillRightXChange: (fillRightX: number) => void;
}

// 【定数定義】: 水平線のドラッグ可能範囲（線の上下 ±DRAG_THRESHOLD px 以内） 🔵
// 【理由】: 要件定義のインタラクティブ層仕様「±5pxをドラッグ対象」より
const DRAG_THRESHOLD = 5;

// 【定数定義】: オーバーレイ（選択範囲外マスク）の色設定 🔵
// 【調整可能性】: 将来的にテーマ変更が必要な場合はここを修正
const OVERLAY_COLOR = "rgba(0,0,0,0.5)";

// 【定数定義】: 水平線の色・太さ設定 🔵
const LINE_COLOR = "#FF0000";
const LINE_WIDTH = 2;

const FILL_COLOR = "#fffdea";
const VERTICAL_LINE_COLOR = "#0000FF";

// ------------------------------------------------------------
// Canvas描画ヘルパー関数（onloadコールバックの分割）
// ------------------------------------------------------------

/**
 * 【ヘルパー関数】: Canvas 全体をクリアして背景画像を描画する
 * 【単一責任】: 画像描画のみを担当
 * 🔵 信頼性レベル: タスクノートのCanvas描画フロー「1. 背景画像層」より
 */
function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement
): void {
  // 【背景画像描画】: Canvasサイズに合わせて画像を描画 🔵
  ctx.drawImage(image, 0, 0);
}

/**
 * 【ヘルパー関数】: 除去範囲（中央部分）を半透明マスクで描画する
 * 【単一責任】: オーバーレイ描画のみを担当（中央の除去範囲のみ）
 * 🔵 信頼性レベル: タスクノートのCanvas描画フロー「2. オーバーレイ層」より
 */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  trimTopY: number,
  clipTopY: number,
  clipBottomY: number,
  trimBottomY: number
): void {
  ctx.fillStyle = OVERLAY_COLOR;

  // 上トリム領域: 0..trimTopY
  if (trimTopY > 0) {
    ctx.fillRect(0, 0, imageWidth, trimTopY);
  }
  // クリップ除去領域: clipTopY..clipBottomY
  const clipHeight = clipBottomY - clipTopY;
  if (clipHeight > 0) {
    ctx.fillRect(0, clipTopY, imageWidth, clipHeight);
  }
  // 下トリム領域: trimBottomY..imageHeight
  if (trimBottomY < imageHeight) {
    ctx.fillRect(0, trimBottomY, imageWidth, imageHeight - trimBottomY);
  }
}

/**
 * 【ヘルパー関数】: topY/bottomY 位置に赤色の水平線を描画する
 * 【単一責任】: 水平線描画のみを担当（上端線・下端線の2本）
 * 🔵 信頼性レベル: タスクノートのCanvas描画フロー「3. 水平線層」より
 */
function drawAllLines(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  trimTopY: number,
  clipTopY: number,
  clipBottomY: number,
  trimBottomY: number
): void {
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = LINE_WIDTH;

  for (const y of [trimTopY, clipTopY, clipBottomY, trimBottomY]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(imageWidth, y);
    ctx.stroke();
  }
}

/**
 * 【ヘルパー関数】: fillRightX より右側を #fffdea で不透明塗りつぶし
 */
function drawFillOverlay(
  ctx: CanvasRenderingContext2D,
  fillRightX: number,
  imageWidth: number,
  imageHeight: number
): void {
  if (fillRightX >= imageWidth) return;
  ctx.fillStyle = FILL_COLOR;
  ctx.fillRect(fillRightX, 0, imageWidth - fillRightX, imageHeight);
}

/**
 * 【ヘルパー関数】: fillRightX 位置に青色の垂直線を描画する
 */
function drawVerticalLine(
  ctx: CanvasRenderingContext2D,
  fillRightX: number,
  imageHeight: number
): void {
  ctx.strokeStyle = VERTICAL_LINE_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(fillRightX, 0);
  ctx.lineTo(fillRightX, imageHeight);
  ctx.stroke();
}

// ------------------------------------------------------------
// ImageCanvas コンポーネント
// ------------------------------------------------------------

/**
 * 【機能概要】: Canvas上に画像を描画し、topY/bottomYの2本の水平線をドラッグ操作できるコンポーネント
 * 【改善内容】:
 *   - Canvas描画ロジックを drawBackgroundImage/drawOverlay/drawClipLines に分割
 *   - DraggingLine 型を共有型定義 (src/types/clip.ts) から参照
 *   - クランプロジックを共通ユーティリティ (src/utils/clipMath.ts) に委譲
 *   - requestAnimationFrame でドラッグ中の Canvas更新を60fps に最適化
 * 【設計方針】:
 *   1. props.imageData が設定されたら Canvas に Base64画像を描画
 *   2. topY/bottomY 位置に赤色の水平線を描画
 *   3. マウスイベントで水平線をドラッグしてonClipRegionChangeを呼び出す
 * 【テスト対応】: TC-008（imageData=nullで空Canvas）、TC-009（canvasサイズ）、TC-010（ドラッグコールバック）、TC-016（範囲外クリック無視）
 * 🔵 信頼性レベル: 要件定義のCanvas描画レイヤー・イベント処理フローより
 */
const ImageCanvas: React.FC<IImageCanvasProps> = ({
  imageData,
  imageWidth,
  imageHeight,
  topY,
  bottomY,
  trimTopY,
  trimBottomY,
  fillRightX,
  onClipRegionChange,
  onTrimRegionChange,
  onFillRightXChange,
}) => {
  // 【Ref定義】: Canvas要素への参照（Canvas API操作のために使用） 🔵
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 【状態定義】: ドラッグ中かどうかのフラグ 🔵
  const [isDragging, setIsDragging] = useState(false);

  // 【状態定義】: 現在ドラッグ中の水平線（DraggingLine 型は共有型定義から参照） 🔵
  const [draggingLine, setDraggingLine] = useState<DraggingLine>(null);

  // 【Ref定義】: requestAnimationFrame のID（クリーンアップ用） 🔵
  // 【理由】: useRef で保持することで stale closure 問題を回避
  const rafIdRef = useRef<number | null>(null);

  // ------------------------------------------------------------
  // Canvas描画エフェクト
  // ------------------------------------------------------------

  useEffect(() => {
    // 【描画対象確認】: Canvas要素とimageDataが存在する場合のみ描画処理を実行 🔵
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 【Canvas取得】: 2Dコンテキストを取得して描画操作を実行 🔵
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!imageData) {
      // 【空Canvas処理】: imageData=nullの場合は何も描画しない（エラー防止） 🔵
      return;
    }

    // 【Base64画像ロード】: Image要素にBase64データを設定し、onloadで Canvas描画を実行 🔵
    // 【理由】: Image.srcの設定は非同期のため、onloadイベント内でCanvasに描画する必要がある
    const image = new Image();
    image.onload = () => {
      drawBackgroundImage(ctx, image);
      drawFillOverlay(ctx, fillRightX, imageWidth, imageHeight);
      drawOverlay(ctx, imageWidth, imageHeight, trimTopY, topY, bottomY, trimBottomY);
      drawAllLines(ctx, imageWidth, trimTopY, topY, bottomY, trimBottomY);
      drawVerticalLine(ctx, fillRightX, imageHeight);
    };
    image.src = imageData;
  }, [imageData, imageWidth, imageHeight, topY, bottomY, trimTopY, trimBottomY, fillRightX]);

  // ------------------------------------------------------------
  // マウスイベントハンドラ
  // ------------------------------------------------------------

  /**
   * 【機能概要】: マウスダウン時に水平線のドラッグを開始する
   * 【実装方針】: クリック位置が水平線の ±DRAG_THRESHOLD px 以内なら draggingLine を設定
   * 【テスト対応】: TC-010（上端線でドラッグ開始）、TC-016（範囲外クリック無視）
   * 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseDown）より
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // 4本の線をヒットテスト（外側のトリム線を優先）
    // 線が重なっている場合、外側のトリム線を掴む方が自然な操作になる
    // 外側のトリム線を優先: trimTop > top, trimBottom > bottom
    const lines: { y: number; line: NonNullable<DraggingLine> }[] = [
      { y: trimTopY, line: "trimTop" },
      { y: topY, line: "top" },
      { y: trimBottomY, line: "trimBottom" },
      { y: bottomY, line: "bottom" },
    ];

    for (const { y, line } of lines) {
      if (Math.abs(mouseY - y) <= DRAG_THRESHOLD) {
        setDraggingLine(line);
        setIsDragging(true);
        return;
      }
    }

    // 垂直線（fillRightX）のヒットテスト
    const mouseX = e.clientX - rect.left;
    if (Math.abs(mouseX - fillRightX) <= DRAG_THRESHOLD) {
      setDraggingLine("fillRightX");
      setIsDragging(true);
      return;
    }
  };

  /**
   * 【機能概要】: マウスムーブ時にドラッグ中の水平線のY座標を更新する
   * 【改善内容】: requestAnimationFrame でコールバック呼び出しを60fps に最適化
   * 【実装方針】:
   *   1. isDragging=falseなら無視
   *   2. 前のフレームのrAFをキャンセルして重複実行を防止
   *   3. rAF内でY座標クランプ処理を実行
   *   4. onClipRegionChange を呼んで親コンポーネントへ通知
   * 【パフォーマンス】: rAFにより16ms（60fps）以内の更新頻度に制限 🔵
   * 【テスト対応】: TC-010（onClipRegionChangeが呼ばれる）
   * 🔵 信頼性レベル: タスクノートのパフォーマンス最適化設計・要件定義のイベント処理フローより
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 【ガード処理】: ドラッグ中でない場合は無視 🔵
    if (!isDragging || draggingLine === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 【Canvas座標変換】: クライアント座標をCanvas上の座標に変換 🔵
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const mouseX = e.clientX - rect.left;

    // 【rAF重複防止】: 前のフレームが未実行の場合はキャンセルして最新の座標のみを処理 🔵
    // 【理由】: mousemoveは60fps以上の頻度で発火するため、rAFで描画フレームに同期させる
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (draggingLine === "trimTop") {
        const newTrimTopY = clampTrimTopY(mouseY, topY);
        onTrimRegionChange(newTrimTopY, trimBottomY);
      } else if (draggingLine === "top") {
        const newTopY = clampTopY(mouseY, trimTopY, bottomY);
        onClipRegionChange(newTopY, bottomY);
      } else if (draggingLine === "bottom") {
        const newBottomY = clampBottomY(mouseY, topY, trimBottomY);
        onClipRegionChange(topY, newBottomY);
      } else if (draggingLine === "trimBottom") {
        const newTrimBottomY = clampTrimBottomY(mouseY, bottomY, imageHeight);
        onTrimRegionChange(trimTopY, newTrimBottomY);
      } else if (draggingLine === "fillRightX") {
        const newFillRightX = clampFillRightX(mouseX, imageWidth);
        onFillRightXChange(newFillRightX);
      }
    });
  };

  /**
   * 【機能概要】: マウスアップ時にドラッグ操作を終了する
   * 【改善内容】: 保留中の rAF をキャンセルしてからドラッグ状態をリセット
   * 【実装方針】: isDragging/draggingLine をリセットしてドラッグ状態を解除
   * 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseUp）より
   */
  const handleMouseUp = () => {
    // 【rAFクリーンアップ】: ドラッグ終了時に保留中のフレームをキャンセル 🔵
    // 【理由】: マウスアップ後に遅延したrAFが実行されると意図しないコールバックが呼ばれる可能性がある
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 【ドラッグ終了処理】: ドラッグ状態をリセット 🔵
    setIsDragging(false);
    setDraggingLine(null);
  };

  // 【レンダリング】: Canvas要素を描画 🔵
  // 【属性設定】: width/height はCanvas描画座標の基準として imageWidth/imageHeight を設定
  return (
    <canvas
      ref={canvasRef}
      id="image-canvas"
      width={imageWidth}
      height={imageHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default ImageCanvas;
