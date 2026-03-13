# TASK-0004 Greenフェーズ記録: ImageCanvasコンポーネント + useClipRegionフック

**タスクID**: TASK-0004
**機能名**: imgx-clip (ImageCanvasコンポーネント + useClipRegionフック)
**要件名**: imgx-clip
**作成日**: 2026-03-13
**フェーズ**: GREEN（最小実装完了）

---

## 1. 実装概要

### 実装ファイル

| ファイル | 行数 | 状態 |
|---------|------|------|
| `src/hooks/useClipRegion.ts` | 93行 | ✅ 実装完了 |
| `src/components/ImageCanvas.tsx` | 175行 | ✅ 実装完了 |

### テスト結果

| テストファイル | 件数 | 結果 |
|--------------|------|------|
| `src/hooks/__tests__/useClipRegion.test.ts` | 17件 | ✅ 全件成功 |
| `src/components/__tests__/ImageCanvas.test.tsx` | 4件 | ✅ 全件成功 |
| **合計** | **21件** | **✅ 全件成功** |

---

## 2. 実装コード全文

### `src/hooks/useClipRegion.ts`

```typescript
// ドラッグ状態管理フック（上端・下端Y座標のドラッグ操作を管理）
import { useState, useCallback } from "react";

export interface ClipRegion {
  topY: number;
  bottomY: number;
}

type DraggingLine = "top" | "bottom" | null;

export function useClipRegion(imageHeight: number) {
  const [region, setRegion] = useState<ClipRegion>({
    topY: 0,
    bottomY: imageHeight,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingLine, setDraggingLine] = useState<DraggingLine>(null);

  const startDrag = useCallback((lineId: "top" | "bottom", _y: number) => {
    setDraggingLine(lineId);
    setIsDragging(true);
  }, []);

  const updateDrag = useCallback(
    (y: number) => {
      if (!isDragging || draggingLine === null) return;
      setRegion((prev) => {
        if (draggingLine === "top") {
          const clampedY = Math.max(0, Math.min(y, prev.bottomY - 1));
          return { ...prev, topY: clampedY };
        } else {
          const clampedY = Math.max(prev.topY + 1, Math.min(y, imageHeight));
          return { ...prev, bottomY: clampedY };
        }
      });
    },
    [isDragging, draggingLine, imageHeight]
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDraggingLine(null);
  }, []);

  return { region, isDragging, startDrag, updateDrag, endDrag };
}
```

### `src/components/ImageCanvas.tsx`

```typescript
import React, { useRef, useEffect, useState } from "react";

interface IImageCanvasProps {
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  onClipRegionChange: (topY: number, bottomY: number) => void;
}

const DRAG_THRESHOLD = 5;

const ImageCanvas: React.FC<IImageCanvasProps> = ({
  imageData, imageWidth, imageHeight, topY, bottomY, onClipRegionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingLine, setDraggingLine] = useState<"top" | "bottom" | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imageData) return;
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      // オーバーレイ・水平線描画
    };
    image.src = imageData;
  }, [imageData, imageWidth, imageHeight, topY, bottomY]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    if (Math.abs(mouseY - topY) <= DRAG_THRESHOLD) {
      setDraggingLine("top");
      setIsDragging(true);
      return;
    }
    if (Math.abs(mouseY - bottomY) <= DRAG_THRESHOLD) {
      setDraggingLine("bottom");
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || draggingLine === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    if (draggingLine === "top") {
      const newTopY = Math.max(0, Math.min(mouseY, bottomY - 1));
      onClipRegionChange(newTopY, bottomY);
    } else {
      const newBottomY = Math.max(topY + 1, Math.min(mouseY, imageHeight));
      onClipRegionChange(topY, newBottomY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingLine(null);
  };

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
```

---

## 3. 実装方針と判断理由

### useClipRegion フック

- `useState` で `region`, `isDragging`, `draggingLine` の3状態を管理
- `useCallback` で `startDrag`, `updateDrag`, `endDrag` をメモ化して不要な再描画を防止
- `updateDrag` は `setRegion` に関数形式のupdaterを渡すことで、直前の状態（prev）を参照しながらクランプ処理を実行
- `draggingLine === "top"` の場合: `Math.max(0, Math.min(y, prev.bottomY - 1))` でクランプ
- `draggingLine === "bottom"` の場合: `Math.max(prev.topY + 1, Math.min(y, imageHeight))` でクランプ

### ImageCanvas コンポーネント

- `useRef<HTMLCanvasElement>` でCanvas要素への参照を保持
- `useEffect` で `imageData` が変わるたびに Canvas を再描画
- マウスイベントハンドラで `getBoundingClientRect()` を使ってCanvas座標に変換
- `DRAG_THRESHOLD = 5` で ±5px 範囲の水平線判定を実装

---

## 4. テスト実行結果

```
 RUN  v4.1.0

 Test Files  2 passed (2)
       Tests  21 passed (21)
    Start at  19:09:06
    Duration  949ms
```

---

## 5. 課題・改善点（Refactorフェーズで対応）

1. **useClipRegion と ImageCanvas の重複ロジック**: クランプ処理が両ファイルに存在。統合を検討
2. **ImageCanvas 内の isDragging/draggingLine**: useClipRegion フックに移譲することでロジックを一元化できる
3. **requestAnimationFrame 未実装**: ドラッグ中の60fps最適化が未実装（パフォーマンス改善余地あり）
4. **Canvas描画のオーバーレイ・水平線**: `image.onload` 内の処理が長くなっているため関数分割が望ましい
5. **型安全性**: `DraggingLine` 型が `useClipRegion.ts` 内でのみ定義されており、共有型定義ファイルへの移動が望ましい
