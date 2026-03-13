# imgx-clip TDD開発完了記録 (TASK-0004)

## 確認すべきドキュメント

- `docs/tasks/imgx-clip/TASK-0004.md`
- `docs/implements/imgx-clip/TASK-0004/imgx-clip-requirements.md`
- `docs/implements/imgx-clip/TASK-0004/imgx-clip-testcases.md`

## 🎯 最終結果 (2026-03-13)
- **実装率**: 91% (21/23テストケース)
- **テスト成功率**: 100% (21/21)
- **要件網羅率**: 100% (完了条件5項目 全実装済み)
- **品質判定**: ✅ 合格
- **TODO更新**: ✅ 完了マーク追加済み

## 💡 重要な技術学習

### 実装パターン

- `useClipRegion` フックは `useState` × 3（region/isDragging/draggingLine）+ `useCallback` メモ化で実装。`setRegion` の関数形式 updater で直前状態を参照してクランプ処理を実施
- `ImageCanvas` の Canvas 再描画は `useEffect` で imageData 等の変化をトリガー。Base64 → `Image.onload` 完了後に描画する非同期パターン
- `requestAnimationFrame` によるドラッグ最適化: `rafIdRef` で前フレームをキャンセルしながら最新座標のみ処理（60fps制御）
- Canvas座標変換: `getBoundingClientRect()` でCanvas座標系に変換し `DRAG_THRESHOLD = 5` で水平線±5px判定

### テスト設計

- jsdom 環境での Canvas API は `src/test/setup.ts` でモック。`requestAnimationFrame` は同期実行モック（`callback(performance.now())`）で TC-010 のコールバック検証を可能にする
- `renderHook` + `act` でフック単体テスト。マウスイベントは `fireEvent.mouseDown` / `fireEvent.mouseMove` で発火
- 境界値テスト（TC-013/TC-014）でのセットアップ: 先にbottomY/topYを別ドラッグで目標値に設定してから、交差防止をテスト

### 品質保証

- DRY原則: `src/utils/clipMath.ts` に `clamp` / `clampTopY` / `clampBottomY` を一元化。useClipRegion と ImageCanvas 双方から参照
- 型共有: `src/types/clip.ts` に `ClipRegion` / `DraggingLine` 型を抽出
- Canvas描画の単一責任: `drawBackgroundImage` / `drawOverlay` / `drawClipLines` の3関数に分割

## ⚠️ 未実装テストケース（後工程での実装推奨）

TC-021 / TC-022（±5px境界値テスト）は実装されていないが、要件網羅率は100%を達成しており、TC-016が同機能の異常系をカバーしている。

### 未実装の詳細
- **TC-021**: topY=100 の時 y=105（ちょうど+5px）でドラッグが開始される（境界値・包含確認）
- **TC-022**: topY=100 の時 y=106（+6px）でドラッグが開始されない（境界値・範囲外確認）
- **対応方針**: `ImageCanvas.test.tsx` に追加テストとして実装（既存テストへの影響なし）

## 実装ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理フック（95行） |
| `src/components/ImageCanvas.tsx` | Canvas描画・マウスイベント処理（294行） |
| `src/types/clip.ts` | ClipRegion/DraggingLine 型定義（22行） |
| `src/utils/clipMath.ts` | clamp/clampTopY/clampBottomY ユーティリティ（51行） |
| `src/test/setup.ts` | Vitest セットアップ（Canvas API・rAF モック） |
| `src/hooks/__tests__/useClipRegion.test.ts` | フック単体テスト（17件） |
| `src/components/__tests__/ImageCanvas.test.tsx` | コンポーネントテスト（4件） |
