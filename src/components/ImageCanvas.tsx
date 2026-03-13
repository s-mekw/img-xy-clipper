// 画像表示・2本の水平線ドラッグ操作・オーバーレイ描画コンポーネント
// 【機能概要】: Base64画像をCanvasに描画し、topY/bottomYの水平線をドラッグ操作できるコンポーネント
// 🔵 信頼性レベル: タスクノート・要件定義のImageCanvasコンポーネント設計仕様より

import React, { useRef, useEffect, useState } from "react";
import type { DraggingLine } from "../types/clip";
import { clampTopY, clampBottomY } from "../utils/clipMath";

// 【インターフェース定義】: ImageCanvasコンポーネントのPropsを定義 🔵
interface IImageCanvasProps {
  /** Base64エンコード済み画像データ（nullの場合は空Canvas表示） */
  imageData: string | null;
  /** 画像の幅（px） */
  imageWidth: number;
  /** 画像の高さ（px） */
  imageHeight: number;
  /** クリップ上端のY座標（px） */
  topY: number;
  /** クリップ下端のY座標（px） */
  bottomY: number;
  /** クリップ範囲変更時のコールバック（topY, bottomYを引数に親コンポーネントへ通知） */
  onClipRegionChange: (topY: number, bottomY: number) => void;
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
  _imageHeight: number,
  topY: number,
  bottomY: number
): void {
  ctx.fillStyle = OVERLAY_COLOR;

  // 【中央マスク】: y=topY から y=bottomY まで半透明で塗りつぶし（除去される範囲） 🔵
  const middleHeight = bottomY - topY;
  if (middleHeight > 0) {
    ctx.fillRect(0, topY, imageWidth, middleHeight);
  }
}

/**
 * 【ヘルパー関数】: topY/bottomY 位置に赤色の水平線を描画する
 * 【単一責任】: 水平線描画のみを担当（上端線・下端線の2本）
 * 🔵 信頼性レベル: タスクノートのCanvas描画フロー「3. 水平線層」より
 */
function drawClipLines(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  topY: number,
  bottomY: number
): void {
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = LINE_WIDTH;

  // 【上端線描画】: topY 位置に水平線を描画 🔵
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(imageWidth, topY);
  ctx.stroke();

  // 【下端線描画】: bottomY 位置に水平線を描画 🔵
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  ctx.lineTo(imageWidth, bottomY);
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
  onClipRegionChange,
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
      // 【段階的描画】: 描画ヘルパー関数を呼び出して各レイヤーを順番に描画 🔵
      // 1. 背景画像 → 2. オーバーレイ → 3. 水平線 の順で描画
      drawBackgroundImage(ctx, image);
      drawOverlay(ctx, imageWidth, imageHeight, topY, bottomY);
      drawClipLines(ctx, imageWidth, topY, bottomY);
    };
    image.src = imageData;
  }, [imageData, imageWidth, imageHeight, topY, bottomY]);

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

    // 【Canvas座標変換】: クライアント座標をCanvas上のY座標に変換 🔵
    // 【理由】: Canvas要素のDOMオフセットを考慮してマウス位置を正確に取得する
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    if (topY === bottomY) {
      // 【重なり時】: 両線が同じ位置 → クリック方向で判定 🔵
      // 線が画像上端(0)にある場合やマウスが線位置以上なら bottomY を掴む（下に広げる操作が自然）
      if (Math.abs(mouseY - topY) <= DRAG_THRESHOLD) {
        const line = (topY === 0 || mouseY >= topY) ? "bottom" : "top";
        setDraggingLine(line);
        setIsDragging(true);
        return;
      }
    } else {
      // 【通常時】: 既存ロジック（近い方を掴む） 🔵
      if (Math.abs(mouseY - topY) <= DRAG_THRESHOLD) {
        setDraggingLine("top");
        setIsDragging(true);
        return;
      }

      if (Math.abs(mouseY - bottomY) <= DRAG_THRESHOLD) {
        setDraggingLine("bottom");
        setIsDragging(true);
        return;
      }
    }

    // 【範囲外処理】: 水平線から離れた場所のクリックは何もしない（ドラッグ開始しない） 🔵
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

    // 【Canvas座標変換】: クライアント座標をCanvas上のY座標に変換 🔵
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // 【rAF重複防止】: 前のフレームが未実行の場合はキャンセルして最新の座標のみを処理 🔵
    // 【理由】: mousemoveは60fps以上の頻度で発火するため、rAFで描画フレームに同期させる
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // 【rAFスケジュール】: 次の描画フレームでクリップ範囲を更新 🔵
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (draggingLine === "top") {
        // 【topY更新処理】: clampTopY で 0〜(bottomY-1) の範囲にクランプして通知 🔵
        const newTopY = clampTopY(mouseY, bottomY);
        onClipRegionChange(newTopY, bottomY);
      } else {
        // 【bottomY更新処理】: clampBottomY で (topY+1)〜imageHeight の範囲にクランプして通知 🔵
        const newBottomY = clampBottomY(mouseY, topY, imageHeight);
        onClipRegionChange(topY, newBottomY);
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
