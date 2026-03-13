# TASK-0005 Redフェーズ記録: PreviewPanelコンポーネント実装

**作成日**: 2026-03-13
**タスクID**: TASK-0005
**機能名**: imgx-clip
**フェーズ**: Red（失敗するテスト作成）
**テストファイル**: `src/components/__tests__/PreviewPanel.test.tsx`

---

## 1. 作成したテストケースの一覧

| テストID | 分類 | テスト名 | 信頼性 | 結果 |
|----------|------|----------|--------|------|
| TC-001 | 正常系 | Canvas要素がレンダリングされる | 🔵 | ✅ 通過（スケルトンに`<canvas>`あり） |
| TC-002 | 正常系 | 初期マウント時にdrawImageが呼ばれる | 🔵 | ❌ 失敗（未実装） |
| TC-003 | 正常系 | drawImageに正しいソース範囲パラメータが渡される | 🔵 | ❌ 失敗（未実装） |
| TC-004 | 正常系 | topY変更時にCanvasが再描画される | 🔵 | ❌ 失敗（未実装） |
| TC-005 | 正常系 | bottomY変更時にCanvasが再描画される | 🔵 | ❌ 失敗（未実装） |
| TC-006 | 正常系 | 再描画前にclearRectでCanvasがクリアされる | 🔵 | ❌ 失敗（未実装） |
| TC-007 | 正常系 | imageData変更時にプレビューが新しい画像で再描画される | 🟡 | ❌ 失敗（未実装） |
| TC-008 | 異常系 | imageDataがnullの場合にdrawImageが呼ばれない | 🔵 | ✅ 通過（スケルトンはdrawImageを呼ばない） |
| TC-009 | 異常系 | getContext('2d')がnullを返す場合にエラーが発生しない | 🔴 | ✅ 通過（スケルトンはContext操作をしない） |
| TC-010 | 境界値 | topYとbottomYが同じ値の場合にエラーが発生しない | 🟡 | ✅ 通過（スケルトンはエラーを投げない） |
| TC-011 | 境界値 | クリップ高さが1pxの場合にプレビューが描画される | 🟡 | ❌ 失敗（未実装） |
| TC-012 | 境界値 | 画像全体が選択された場合に全体がプレビュー表示される | 🔵 | ❌ 失敗（未実装） |
| TC-013 | 境界値 | 大規模画像でもプレビューが正常に描画される | 🟡 | ❌ 失敗（未実装） |

**テスト実行結果**: 13テスト中 9失敗 / 4通過

---

## 2. テストコードの全文

テストコードは `src/components/__tests__/PreviewPanel.test.tsx` に保存済み。

### 主要なテストパターン

#### Canvas描画呼び出しの検証
```typescript
const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
  drawImage: ReturnType<typeof vi.fn>;
};
expect(mockCtx.drawImage).toHaveBeenCalledWith(
  expect.anything(), // image
  0,                  // sx
  50,                 // sy = topY
  200,                // sw = imageWidth
  200,                // sh = bottomY - topY
  0, 0,               // dx, dy
  expect.any(Number), // dw
  expect.any(Number), // dh
);
```

#### 再描画確認パターン
```typescript
const initialCallCount = mockCtx.drawImage.mock.calls.length;
rerender(<PreviewPanel topY={100} ... />);
expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThan(initialCallCount);
```

---

## 3. 期待される失敗内容

### TC-002, TC-003: drawImage呼び出し未実装
```
AssertionError: expected "vi.fn()" to be called at least once
```
現在のスケルトン実装は `useEffect` を持たず、Canvas描画ロジックが全くないため。

### TC-004, TC-005, TC-007: props変更時の再描画未実装
```
AssertionError: expected 0 to be greater than 0
```
`useEffect` の依存配列が存在しないため、props変更が再描画をトリガーしない。

### TC-006: clearRect未実装
```
AssertionError: expected "vi.fn()" to be called at least once
```
Canvas再描画の前処理（クリア）が実装されていないため。

### TC-011: 最小クリップ描画未実装
```
AssertionError: expected "vi.fn()" to be called at least once
```
TC-002と同様、Canvas描画ロジックが未実装のため。

### TC-012, TC-013: drawImageパラメータ検証
```
AssertionError: expected "vi.fn()" to be called with arguments: [ Array(9) ]
Number of calls: 0
```
drawImage自体が呼ばれていないため。

---

## 4. Greenフェーズで実装すべき内容

### 実装が必要なファイル

- **`src/components/PreviewPanel.tsx`**: 現在スケルトン実装のみ

### 実装すべき機能

#### 1. Props インターフェース定義
```typescript
interface IPreviewPanelProps {
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
}
```

#### 2. Canvas描画ロジック（useEffect）
```typescript
useEffect(() => {
  // 1. imageData が null なら描画スキップ
  if (!imageData) return;

  // 2. Canvas コンテキスト取得
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;  // TC-009: null チェック

  // 3. クリップ高さが0なら描画スキップ（TC-010: ゼロ除算回避）
  const clipHeight = bottomY - topY;
  if (clipHeight <= 0) return;

  // 4. Image オブジェクトにロード
  const img = new Image();
  img.onload = () => {
    // 5. Canvas クリア（TC-006）
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 6. ソース範囲指定で描画（TC-003）
    ctx.drawImage(img, 0, topY, imageWidth, clipHeight, 0, 0, canvas.width, canvas.height);
  };
  img.src = imageData;
}, [imageData, imageWidth, topY, bottomY]);  // TC-004, TC-005, TC-007: 依存配列
```

#### 3. Canvas要素のレンダリング
```typescript
return <canvas ref={canvasRef} className="preview-panel" width={200} height={300} />;
```

### 実装優先度

1. **必須（TC-002, TC-003）**: drawImage呼び出しの基本実装
2. **必須（TC-004, TC-005, TC-007）**: useEffectの依存配列設定
3. **必須（TC-006）**: clearRectの実装
4. **必須（TC-008）**: imageData nullチェック
5. **必須（TC-009）**: getContext nullチェック
6. **必須（TC-010, TC-011）**: clipHeight <= 0 のスキップロジック
7. **確認（TC-012, TC-013）**: パラメータが正確であることの確認

---

## 5. 品質評価

- **テスト実行**: ✅ 実行可能で9件が正しく失敗することを確認済み
- **期待値**: ✅ 明確で具体的（drawImageの9引数が全て検証済み）
- **アサーション**: ✅ 適切（toHaveBeenCalled / toHaveBeenCalledWith / toBeGreaterThan）
- **実装方針**: ✅ 明確（useEffect + Image.onload + drawImageの実装が必要）
- **信頼性レベル分布**: 🔵青信号 8項目(62%) / 🟡黄信号 4項目(31%) / 🔴赤信号 1項目(7%)

**品質判定**: ✅ 高品質
