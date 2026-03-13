# TASK-0004 Redフェーズ記録: ImageCanvasコンポーネント + useClipRegionフック

**タスクID**: TASK-0004
**機能名**: imgx-clip (ImageCanvasコンポーネント + useClipRegionフック)
**要件名**: imgx-clip
**作成日**: 2026-03-13
**フェーズ**: RED（失敗するテスト作成完了）

---

## 1. 作成したテストケース一覧

### useClipRegionフックテスト（`src/hooks/__tests__/useClipRegion.test.ts`）

| ID | テスト名 | カテゴリ | 信頼性 | 状態 |
|---|---|---|---|---|
| TC-001 | 初期状態でtopY=0、bottomY=imageHeightが設定される | 正常系 | 🔵 | ✅ 成功（初期状態は実装済み） |
| TC-002 | startDragでドラッグ状態に遷移する | 正常系 | 🔵 | ❌ **失敗（RED）** |
| TC-003 | updateDragでtopYが更新される | 正常系 | 🔵 | ❌ **失敗（RED）** |
| TC-004 | updateDragでbottomYが更新される | 正常系 | 🔵 | ❌ **失敗（RED）** |
| TC-005 | endDragでドラッグ状態が解除される | 正常系 | 🔵 | ❌ **失敗（RED）** |
| TC-006 | endDrag後にupdateDragを呼んでも座標が変わらない | 正常系 | 🟡 | ❌ **失敗（RED）** |
| TC-007 | 連続ドラッグ操作（start→update→end→start→update→end） | 正常系 | 🟡 | ❌ **失敗（RED）** |
| TC-011 | topYが負の値にならない（上方向クランプ） | 異常系 | 🔵 | ❌ **失敗（RED）** |
| TC-012 | bottomYがimageHeightを超えない（下方向クランプ） | 異常系 | 🔵 | ❌ **失敗（RED）** |
| TC-013 | topYがbottomYを超えない（線の交差防止 - top側） | 異常系 | 🔵 | ❌ **失敗（RED）** |
| TC-014 | bottomYがtopYを下回らない（線の交差防止 - bottom側） | 異常系 | 🟡 | ❌ **失敗（RED）** |
| TC-015 | ドラッグ未開始状態でupdateDragを呼んでも無視される | 異常系 | 🟡 | ❌ **失敗（RED）** |
| TC-017 | imageHeight=1の場合の初期化 | 境界値 | 🟡 | ✅ 成功（初期状態は実装済み） |
| TC-018 | topY=0にクランプされる境界（ちょうど0をドラッグ） | 境界値 | 🔵 | ❌ **失敗（RED）** |
| TC-019 | bottomY=imageHeightにクランプされる境界 | 境界値 | 🔵 | ❌ **失敗（RED）** |
| TC-020 | topYとbottomYが隣接する最小間隔（差が1） | 境界値 | 🟡 | ❌ **失敗（RED）** |
| TC-023 | imageHeight=0の場合の安全な動作 | 境界値 | 🟡 | ✅ 成功（初期状態は実装済み） |

**合計**: 17件（3成功・14失敗）

### ImageCanvasコンポーネントテスト（`src/components/__tests__/ImageCanvas.test.tsx`）

| ID | テスト名 | カテゴリ | 信頼性 | 状態 |
|---|---|---|---|---|
| TC-008 | imageDataがnullの場合、空のCanvasが表示される | 正常系 | 🔵 | ✅ 成功（canvas要素は存在する） |
| TC-009 | imageDataが設定された場合、canvas要素が正しいサイズでレンダリングされる | 正常系 | 🟡 | ❌ **失敗（RED）** |
| TC-010 | 上端線をドラッグするとonClipRegionChangeが呼ばれる | 正常系 | 🔵 | ❌ **失敗（RED）** |
| TC-016 | 水平線以外の場所をクリックしてもonClipRegionChangeが呼ばれない | 異常系 | 🔵 | ✅ 成功（ドラッグ未実装のため） |

**合計**: 4件（2成功・2失敗）

---

## 2. テストファイルパス

- `src/hooks/__tests__/useClipRegion.test.ts`
- `src/components/__tests__/ImageCanvas.test.tsx`
- `src/test/setup.ts` （テスト環境セットアップ）

### 実行コマンド

```bash
# useClipRegionフックのテストのみ実行
npm test -- src/hooks/__tests__/useClipRegion.test.ts

# ImageCanvasコンポーネントのテストのみ実行
npm test -- src/components/__tests__/ImageCanvas.test.tsx

# 全テスト実行
npm test
```

---

## 3. 期待される失敗内容

### useClipRegion失敗の根本原因

現在の `src/hooks/useClipRegion.ts` はスケルトン実装のみで、以下のメソッドが未実装：

```
TypeError: result.current.startDrag is not a function
TypeError: result.current.updateDrag is not a function
TypeError: result.current.endDrag is not a function
```

現在の実装（スケルトン）:
```typescript
export function useClipRegion(imageHeight: number) {
  const [region, setRegion] = useState<ClipRegion>({
    topY: 0,
    bottomY: imageHeight,
  });
  return { region, setRegion }; // startDrag, updateDrag, endDrag, isDragging が未実装
}
```

### ImageCanvas失敗の根本原因

現在の `src/components/ImageCanvas.tsx` はスケルトン実装のみで、Propsを受け取らず：
- `canvas.width` / `canvas.height` 属性の設定なし（TC-009失敗）
- マウスイベントハンドラなし → `onClipRegionChange` が呼ばれない（TC-010失敗）

---

## 4. テスト環境セットアップ

### 追加されたパッケージ

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom @vitest/coverage-v8
```

### 設定変更ファイル

- `vite.config.ts` - Vitest設定を追加（test.globals, test.environment, test.setupFiles）
- `package.json` - "test", "test:watch" スクリプトを追加
- `tsconfig.json` - "src/test/**/*.ts" をincludeに追加

---

## 5. Greenフェーズで実装すべき内容

### useClipRegion フック (`src/hooks/useClipRegion.ts`)

実装が必要なメソッド・プロパティ:

1. **`isDragging: boolean`** - ドラッグ中かどうかのフラグ
2. **`startDrag(lineId: 'top' | 'bottom', y: number) => void`** - ドラッグ開始
   - `isDragging = true`
   - `draggingLine = lineId` を保存
3. **`updateDrag(y: number) => void`** - ドラッグ中のY座標更新
   - `isDragging` でないなら無視
   - Y座標を `0 〜 imageHeight` にクランプ
   - `topY < bottomY` を維持（線の交差防止）
4. **`endDrag() => void`** - ドラッグ終了
   - `isDragging = false`
   - `draggingLine = null`

### ImageCanvas コンポーネント (`src/components/ImageCanvas.tsx`)

実装が必要な機能:

1. **Props受け取り** - `IImageCanvasProps` インターフェースに準拠
2. **Canvas width/height 設定** - 画像サイズに合わせてCanvas属性を設定
3. **マウスイベントハンドラ**:
   - `handleMouseDown` - 水平線±5pxの範囲判定でドラッグ開始
   - `handleMouseMove` - ドラッグ中のY座標更新 + `onClipRegionChange` 呼び出し
   - `handleMouseUp` - ドラッグ終了
4. **Canvas描画** - 背景画像 → オーバーレイ → 水平線のレイヤー描画

---

## 信頼性レベルサマリー

- **総テスト数**: 21件
- 🔵 **青信号**: 13件 (62%) - 要件定義・タスクノートに基づくテストケース
- 🟡 **黄信号**: 8件 (38%) - 要件定義から妥当な推測に基づくテストケース
- 🔴 **赤信号**: 0件 (0%)

**品質評価**: ✅ 高品質
