# TASK-0004 Refactorフェーズ記録: ImageCanvasコンポーネント + useClipRegionフック

**タスクID**: TASK-0004
**機能名**: imgx-clip (ImageCanvasコンポーネント + useClipRegionフック)
**要件名**: imgx-clip
**作成日**: 2026-03-13
**フェーズ**: REFACTOR（品質改善完了）

---

## 1. 改善概要

### 改善ファイル

| ファイル | 変更種別 | 行数 | 状態 |
|---------|---------|------|------|
| `src/types/clip.ts` | 新規作成 | 22行 | ✅ 共有型定義 |
| `src/utils/clipMath.ts` | 新規作成 | 51行 | ✅ 共通ユーティリティ |
| `src/hooks/useClipRegion.ts` | リファクタ | 95行 | ✅ 改善完了 |
| `src/components/ImageCanvas.tsx` | リファクタ | 294行 | ✅ 改善完了 |
| `src/test/setup.ts` | 追記 | 44行 | ✅ rAFモック追加 |

### テスト結果

| テストファイル | 件数 | 結果 |
|--------------|------|------|
| `src/hooks/__tests__/useClipRegion.test.ts` | 17件 | ✅ 全件成功 |
| `src/components/__tests__/ImageCanvas.test.tsx` | 4件 | ✅ 全件成功 |
| **合計** | **21件** | **✅ 全件成功** |

---

## 2. 改善内容の詳細

### 改善1: 共有型定義の抽出（DRY原則・型共有）🔵

**問題**: `DraggingLine` 型が `useClipRegion.ts` 内でのみ定義されており、`ImageCanvas.tsx` では同一の `"top" | "bottom" | null` を独立定義していた。

**対応**: `src/types/clip.ts` を新規作成し、`ClipRegion` と `DraggingLine` 型を一元管理。

```typescript
// src/types/clip.ts
export interface ClipRegion {
  topY: number;
  bottomY: number;
}
export type DraggingLine = "top" | "bottom" | null;
```

### 改善2: クランプロジックの共通化（DRY原則）🔵

**問題**: `useClipRegion.ts` と `ImageCanvas.tsx` の両ファイルに以下の同一クランプロジックが存在していた。

```typescript
// 重複コード（Greenフェーズ）
const clampedY = Math.max(0, Math.min(y, prev.bottomY - 1)); // topY用
const clampedY = Math.max(prev.topY + 1, Math.min(y, imageHeight)); // bottomY用
```

**対応**: `src/utils/clipMath.ts` を新規作成し、`clamp`, `clampTopY`, `clampBottomY` ヘルパー関数を定義。両ファイルからこれを参照するように変更。

```typescript
// src/utils/clipMath.ts
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
export function clampTopY(y: number, bottomY: number): number {
  return clamp(y, 0, bottomY - 1);
}
export function clampBottomY(y: number, topY: number, imageHeight: number): number {
  return clamp(y, topY + 1, imageHeight);
}
```

### 改善3: Canvas描画ロジックの関数分割（単一責任原則）🔵

**問題**: `image.onload` コールバック内に背景画像・オーバーレイ・水平線の描画処理が一塊で記述されており、可読性が低かった。

**対応**: 3つのヘルパー関数に分割。

- `drawBackgroundImage(ctx, image)` - 背景画像描画のみ
- `drawOverlay(ctx, imageWidth, imageHeight, topY, bottomY)` - 半透明マスク描画のみ
- `drawClipLines(ctx, imageWidth, topY, bottomY)` - 水平線描画のみ

```typescript
// onloadコールバックが簡潔になった
image.onload = () => {
  drawBackgroundImage(ctx, image);
  drawOverlay(ctx, imageWidth, imageHeight, topY, bottomY);
  drawClipLines(ctx, imageWidth, topY, bottomY);
};
```

### 改善4: requestAnimationFrame によるドラッグ最適化（パフォーマンス）🔵

**問題**: `handleMouseMove` が `mousemove` イベント発火の度に同期的に `onClipRegionChange` を呼び出しており、60fps を超過した更新が発生していた。

**対応**: `rafIdRef` で前フレームのrAFをキャンセルしながら最新座標のみを処理。

```typescript
const rafIdRef = useRef<number | null>(null);

const handleMouseMove = (e) => {
  // ...座標取得...
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current); // 前フレームをキャンセル
  }
  rafIdRef.current = requestAnimationFrame(() => {
    rafIdRef.current = null;
    // clampTopY/clampBottomY でクランプして通知
    onClipRegionChange(newY, bottomY);
  });
};
```

また `handleMouseUp` でドラッグ終了時に保留中rAFをキャンセルする処理も追加。

### 改善5: テストセットアップ - requestAnimationFrame モック追加🔵

**問題**: `requestAnimationFrame` の追加により TC-010 テストが失敗。jsdom 環境では rAF が非同期マクロタスクとして扱われるため、アサーション実行前にコールバックが呼ばれなかった。

**対応**: `src/test/setup.ts` に同期実行モックを追加。

```typescript
globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  callback(performance.now()); // 即座に同期実行
  return 0;
};
globalThis.cancelAnimationFrame = (_id: number): void => {};
```

---

## 3. セキュリティレビュー結果

| 項目 | 結果 | 詳細 |
|------|------|------|
| 入力値検証 | ✅ 問題なし | topY/bottomY のクランプ処理は clampTopY/clampBottomY で適切に実施 |
| XSS対策 | ✅ 問題なし | Base64データは Canvas API 経由で処理。innerHTML 未使用 |
| 不正な imageData | ✅ 許容範囲 | Base64形式の検証なし。Canvas描画失敗は静かに無視されるため実害なし |
| イベントハンドラ | ✅ 問題なし | React SyntheticEvent を使用。直接DOMイベントリスナーは不使用 |

---

## 4. パフォーマンスレビュー結果

| 項目 | 状態 | 詳細 |
|------|------|------|
| requestAnimationFrame | ✅ 実装済み | mousemove の過剰発火を rAF で60fps に制限 |
| Canvas再描画 | ✅ 改善済み | drawBackground/drawOverlay/drawClipLines に分割して可読性向上 |
| useCallback依存配列 | ✅ 問題なし | updateDrag の依存配列（isDragging, draggingLine, imageHeight）は適切 |
| クランプ重複 | ✅ 解消済み | clipMath.ts に一元化 |

---

## 5. 改善後のファイル全文

### `src/types/clip.ts`（新規作成）

```typescript
export interface ClipRegion {
  topY: number;
  bottomY: number;
}
export type DraggingLine = "top" | "bottom" | null;
```

### `src/utils/clipMath.ts`（新規作成）

```typescript
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
export function clampTopY(y: number, bottomY: number): number {
  return clamp(y, 0, bottomY - 1);
}
export function clampBottomY(y: number, topY: number, imageHeight: number): number {
  return clamp(y, topY + 1, imageHeight);
}
```

---

## 6. テスト実行結果（Refactorフェーズ後）

```
 Test Files  2 passed (2)
       Tests  21 passed (21)
    Start at  19:25:01
    Duration  963ms (transform 109ms, setup 60ms, import 315ms, tests 58ms, environment 1.22s)
```

---

## 7. コメント改善内容

- 全ての新規ヘルパー関数（`clamp`, `clampTopY`, `clampBottomY`, `drawBackgroundImage`, `drawOverlay`, `drawClipLines`）に `【ヘルパー関数】`, `【単一責任】`, `【再利用性】` コメントを付与
- `requestAnimationFrame` 関連コードに `【rAF重複防止】`, `【rAFスケジュール】`, `【rAFクリーンアップ】` コメントを付与
- 新規定数（`OVERLAY_COLOR`, `LINE_COLOR`, `LINE_WIDTH`）に `【定数定義】`, `【調整可能性】` コメントを付与
- 全改善箇所に `🔵🟡🔴` 信頼性レベルを明記
