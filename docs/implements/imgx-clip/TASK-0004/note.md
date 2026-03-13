# TASK-0004 TDD開発ノート：ImageCanvasコンポーネント実装

**生成日**: 2026-03-13
**タスクID**: TASK-0004
**要件名**: imgx-clip
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **フロントエンドフレームワーク**: React 19 + TypeScript + Vite
- **Canvas API**: HTML5 Canvas（画像描画・ドラッグ操作・オーバーレイ）
- **状態管理**: React useState/useCallback
- **Tauri連携**: `@tauri-apps/api` でIPCコマンド呼び出し
- **UI操作**: マウスイベント（mousedown/mousemove/mouseup）

### アーキテクチャパターン

- **コンポーネント責務**: 画像表示・水平線ドラッグ操作・オーバーレイ描画を一体管理
- **ドラッグ状態管理**: `useClipRegion`カスタムフックで topY/bottomY を管理
- **描画最適化**: `requestAnimationFrame`で Canvas再描画を最適化し60fps維持
- **イベントハンドリング**: マウスイベントでドラッグ状態を更新
- **データフロー**: 親コンポーネント（App）から画像メタデータを props で受け取り

### Canvas描画戦略

- **レイヤー構成**:
  1. 背景：Base64画像をCanvas上に描画
  2. オーバーレイ：選択範囲外を半透明マスク（rgba(0,0,0,0.5)）で描画
  3. 水平線：topY・bottomY位置に赤色（#FF0000）の線を描画
  4. インタラクティブエリア：マウスイベント対象領域

### パフォーマンス最適化

- **requestAnimationFrame**: ドラッグ中のCanvas再描画を60fps に最適化
- **差分更新**: 必要な部分のみ再描画（全体再描画を避ける）
- **イベントデバウンス**: mousemoveイベント の過剰発火を抑制

### 参照元

- `src/components/ImageCanvas.tsx` - 実装ファイル
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック
- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ
- `docs/spec/imgx-clip/requirements.md` - 要件定義（REQ-002, REQ-004）

---

## 2. 開発ルール

### プロジェクト固有ルール

- React 19 + TypeScript の型安全開発
- コンポーネントは関数コンポーネント（`React.FC<Props>` 形式）
- TypeScript では型定義を明示的に記述
- Canvas API使用時はブラウザ互換性を確認（Windows 11環境）

### コーディング規約

- **React/TypeScript**:
  - インターフェース名: `I<ComponentName>Props` 形式
  - カスタムフック: `use<HookName>` 形式
  - CSS クラス: ケバブケース（kebab-case）
  - Canvas メソッド: `ctx.<method>()` で描画コンテキスト操作
  - イベントハンドラ: `handle<EventName>` 形式

- **コンポーネント構成**:
  ```typescript
  interface IImageCanvasProps {
    imageData: string | null;    // Base64画像
    imageWidth: number;
    imageHeight: number;
    topY: number;
    bottomY: number;
    onClipRegionChange: (topY: number, bottomY: number) => void;
  }

  export const ImageCanvas: React.FC<IImageCanvasProps> = (props) => {
    // 実装
  };
  ```

### Tauri IPCコマンド連携

- `load_image(path: string)` で画像メタデータ + Base64データ を取得
- フロントエンドでは Tauri の `invoke()` 関数で呼び出し

### Canvas API使用パターン

- **画像描画**: `ctx.drawImage(image, 0, 0)`
- **矩形塗りつぶし**: `ctx.fillRect(x, y, w, h)`
- **線描画**: `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.beginPath()`, `ctx.moveTo()`, `ctx.lineTo()`, `ctx.stroke()`
- **透明度設定**: `ctx.globalAlpha`, `ctx.fillStyle = "rgba(r,g,b,a)"`
- **テキスト描画**: `ctx.fillText()`, `ctx.font`

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計
- `src/components/Toolbar.tsx` - 関連コンポーネント（ファイル読み込み）

---

## 3. 関連実装

### 既存の関連実装

TASK-0001・0002 で既に以下が実装済み：

- `src-tauri/src/commands.rs` - `load_image`, `clip_and_save` IPC コマンド
- `src-tauri/src/image_processor.rs` - 画像処理ロジック
- `src/main.tsx` - React エントリーポイント
- `src/App.tsx` - アプリメインコンポーネント（現在はテンプレート状態）
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック（スケルトン実装済み）

### useClipRegionフック（既存スケルトン）

```typescript
// src/hooks/useClipRegion.ts
export interface ClipRegion {
  topY: number;
  bottomY: number;
}

export function useClipRegion(imageHeight: number) {
  const [region, setRegion] = useState<ClipRegion>({
    topY: 0,
    bottomY: imageHeight,
  });

  return { region, setRegion };
}
```

**現状**: 基本的な状態管理のみ。ドラッグ操作ロジック（startDrag, updateDrag, endDrag）は未実装。

### 関連ファイル構成

```
src/
├── components/
│   ├── ImageCanvas.tsx         # TASK-0004 で実装（ここ）
│   ├── PreviewPanel.tsx        # TASK-0005 で実装（後続）
│   └── Toolbar.tsx             # ファイル操作UI（既存・参考用）
├── hooks/
│   └── useClipRegion.ts        # ドラッグ状態管理フック（拡張予定）
├── App.tsx                     # メインコンポーネント
└── main.tsx                    # React エントリーポイント
```

### ImageCanvas コンポーネント設計（予想）

```typescript
interface IImageCanvasProps {
  imageData: string | null;       // Base64データ
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  onClipRegionChange: (topY: number, bottomY: number) => void;
}

export const ImageCanvas: React.FC<IImageCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingLine, setDraggingLine] = useState<'top' | 'bottom' | null>(null);

  // Canvas描画ロジック
  useEffect(() => {
    if (canvasRef.current && props.imageData) {
      const ctx = canvasRef.current.getContext('2d');
      // 画像描画 → オーバーレイ描画 → 水平線描画
    }
  }, [props.imageData, props.topY, props.bottomY]);

  // イベントハンドラ
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => { /* ... */ };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => { /* ... */ };
  const handleMouseUp = () => { /* ... */ };

  return <canvas ref={canvasRef} onMouseDown={handleMouseDown} /* ... */ />;
};
```

### 参照元

- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック
- `docs/design/imgx-clip/dataflow.md` - 機能2：ドラッグ操作データフロー
- `docs/tasks/imgx-clip/TASK-0004.md` - 実装項目詳細
- `src/App.tsx` - 親コンポーネント（state 保持予定）

---

## 4. 設計文書

### アーキテクチャ・UI仕様

#### ImageCanvasコンポーネント Props

```typescript
interface IImageCanvasProps {
  // 画像メタデータ
  imageData: string | null;       // Base64エンコード済み画像
  imageWidth: number;             // 画像幅（ピクセル）
  imageHeight: number;            // 画像高さ（ピクセル）

  // クリップ範囲
  topY: number;                   // クリップ上端Y座標
  bottomY: number;                // クリップ下端Y座標

  // コールバック
  onClipRegionChange: (topY: number, bottomY: number) => void;
}
```

#### Canvas描画レイヤー

1. **背景画像層**
   - Base64画像をCanvasサイズに合わせて描画
   - Canvas サイズ: 画像幅 × 画像高さ

2. **オーバーレイ層**
   - 選択範囲外を半透明マスク（rgba(0,0,0,0.5)）で描画
   - 上部: y=0 から y=topY まで
   - 下部: y=bottomY から y=imageHeight まで

3. **水平線層**
   - 上端線: y=topY 位置に赤色線（#FF0000, lineWidth=2）を描画
   - 下端線: y=bottomY 位置に赤色線を描画
   - カーソルホバー時は線を太く表示（lineWidth=4）でドラッグ可能を示唆

4. **インタラクティブ層**
   - マウスイベント検出領域（線の上下 ±5px をドラッグ対象）

#### ドラッグ操作の UX

- **マウスダウン**: 水平線上でマウスダウン → ドラッグ開始
- **マウスムーブ**: Y座標を画像範囲内にクランプして更新
- **マウスアップ**: ドラッグ終了、範囲確定
- **制約**: topY < bottomY、0 <= topY < imageHeight、0 < bottomY <= imageHeight

#### パフォーマンス要件

- **フレームレート**: ドラッグ中に60fps維持（requestAnimationFrame使用）
- **応答性**: マウス移動後 16ms 以内に Canvas再描画

### データモデル

#### Canvas描画フロー

```
useEffect([imageData, topY, bottomY]) {
  1. Canvas サイズ設定 (width=imageWidth, height=imageHeight)
  2. Base64画像をImage要素にロード
  3. Canvasに画像を描画
  4. オーバーレイ（上部・下部）を描画
  5. 水平線（上端・下端）を描画
}
```

#### イベント処理フロー

```
handleMouseDown(e) {
  1. マウス位置を取得
  2. クリック位置がいずれかの水平線 ±5px に含まれるか判定
  3. 含まれる場合 → draggingLine = 'top' or 'bottom' をセット
  4. setIsDragging(true)
}

handleMouseMove(e) {
  if (isDragging && draggingLine !== null) {
    1. マウスY座標を取得
    2. Y座標を 0 ～ imageHeight でクランプ
    3. topY < bottomY を保持（線の交差を防止）
    4. onClipRegionChange(newTopY, newBottomY) をコール
    5. Canvas再描画（useEffect が自動実行）
  }
}

handleMouseUp() {
  1. setIsDragging(false)
  2. setDraggingLine(null)
}
```

### システムデータフロー

**図1：画像読み込みから表示まで**

```
1. App コンポーネント:
   - load_image(imagePath) IPC呼び出し
   - ImageMetadata 取得（base64, width, height）

2. ImageCanvas コンポーネント:
   - props.imageData (Base64) を受け取り
   - Canvas に画像描画
   - useClipRegion フックで topY, bottomY を管理

3. 初期状態:
   - topY = 0
   - bottomY = imageHeight
   - 全体画像を選択範囲として表示
```

**図2：ドラッグ操作フロー**

```
ユーザー操作:
  1. 水平線をマウスダウン
     → handleMouseDown() → draggingLine = 'top' or 'bottom'

  2. マウスムーブ（ドラッグ中）
     → handleMouseMove()
     → Y座標をクランプ
     → onClipRegionChange() コール
     → App でstate更新
     → Canvas再描画（useEffect）

  3. マウスアップ
     → handleMouseUp()
     → draggingLine = null
     → ドラッグ終了
```

### 参照元

- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ・コンポーネント構成
- `docs/design/imgx-clip/dataflow.md` - 機能2・機能3のデータフロー・シーケンス図
- `docs/spec/imgx-clip/requirements.md` - REQ-002（ドラッグ操作）、REQ-004（プレビュー）
- `docs/tasks/imgx-clip/TASK-0004.md` - 実装項目・完了条件

---

## 5. テスト関連情報

### テストフレームワーク・設定

**フロントエンド（React）**: テストフレームワーク未設定の為、簡易テストから開始

- **テスト実行環境**: Vitest または Jest（後で設定予定）
- **テスト対象**: `useClipRegion` フックのドラッグ状態管理ロジック
- **UI テスト**: Playwrightなど E2Eテスト（TASK-0007で実装予定）

**現在の状態**: テストフレームワークが package.json に未登録のため、最小限のユニットテストから開始。

### テストの構成・命名パターン

#### ユニットテスト（useClipRegionフック）

- **テストファイル配置**: `src/hooks/__tests__/useClipRegion.test.ts`
- **テスト関数命名**: `test('<説明>')`（またはJestの `describe`/`it` ブロック）
- **テスト対象**:
  - useClipRegion フック：topY/bottomY の状態管理
  - ドラッグ操作：startDrag, updateDrag, endDrag メソッド
  - 境界値クランプ：Y座標の 0～imageHeight 範囲内制約

#### テスト実行コマンド

```bash
# フロントエンド（テストフレームワーク設定後）
npm test

# 特定テストのみ実行
npm test useClipRegion

# ウォッチモード
npm test -- --watch
```

### テスト関連の主要パターン

#### useClipRegionフック テスト例

```typescript
describe('useClipRegion', () => {
  // 正常系: ドラッグ初期状態
  test('should initialize with topY=0, bottomY=imageHeight', () => {
    // GIVEN: imageHeight=300
    // WHEN: useClipRegion を呼び出す
    // THEN: topY=0, bottomY=300
  });

  // 正常系: topY を更新
  test('should update topY when startDrag and updateDrag called', () => {
    // GIVEN: useClipRegion(300) の状態
    // WHEN: startDrag('top', 50) → updateDrag(100)
    // THEN: topY=100
  });

  // 異常系: Y座標が画像範囲外
  test('should clamp topY to image bounds', () => {
    // GIVEN: imageHeight=300
    // WHEN: updateDrag(-50) (画像範囲外)
    // THEN: topY=0 (クランプ)
  });

  // 異常系: topY >= bottomY (線の交差防止)
  test('should prevent topY from exceeding bottomY', () => {
    // GIVEN: topY=100, bottomY=200
    // WHEN: updateDrag(250) with draggingLine='top'
    // THEN: topY=199 (bottomY-1 にクランプ)
  });
});
```

#### ImageCanvasコンポーネント テスト（後続で実装予定）

```typescript
describe('ImageCanvas', () => {
  // 正常系: 画像を描画できる
  test('should render image on canvas', () => {
    // GIVEN: imageData (Base64), imageWidth=200, imageHeight=300
    // WHEN: コンポーネントをマウント
    // THEN: Canvas に画像が描画される
  });

  // 正常系: 水平線が表示される
  test('should display horizontal lines', () => {
    // GIVEN: topY=50, bottomY=250
    // WHEN: コンポーネントをマウント
    // THEN: y=50 と y=250 に赤線が描画される
  });

  // 正常系: ドラッグで線が移動
  test('should move line on mouse drag', () => {
    // GIVEN: ユーザーが top 線をドラッグ
    // WHEN: マウスムーブイベント発火（y=100）
    // THEN: topY=100 に更新、Canvas再描画
  });

  // 異常系: Y座標クランプ
  test('should clamp Y coordinate within image bounds', () => {
    // GIVEN: imageHeight=300
    // WHEN: マウスムーブイベント（y=-50, 画像範囲外）
    // THEN: topY=0 にクランプ
  });
});
```

### E2E テスト（TASK-0007で実装予定）

```typescript
// Playwright E2E テスト例
test('should allow user to drag and clip image', async ({ page }) => {
  // 1. 画像ファイルを読み込む
  // 2. ImageCanvas が描画される
  // 3. 水平線をドラッグ
  // 4. PreviewPanel が拡大表示される
  // 5. 保存ボタンをクリック
  // 6. クリップ済み画像が保存される
});
```

### テスト実行フロー（TASK-0004での想定テスト）

#### 正常系: ドラッグで線が移動

```
1. useClipRegion フック単体テスト
   - startDrag('top', 50) で ドラッグ開始
   - updateDrag(100) で topY=100 更新
   - 線が正しく移動しているか確認

2. ImageCanvas コンポーネント テスト
   - topY/bottomY の変更が Canvas に反映
   - マウスイベントで線が移動
```

#### 異常系: 境界値処理

```
1. クランプ処理テスト
   - Y座標が -10 （画像範囲外上）
     → topY=0 にクランプ
   - Y座標が 350 （画像範囲外下、imageHeight=300）
     → bottomY=300 にクランプ

2. 線交差防止テスト
   - topY=100, bottomY=200 の状態で
   - topY をドラッグして 250 に移動
     → topY=199 にクランプ（bottomY-1）
```

### テストデータ・モック

- **テスト画像**: 実ファイルの代わりに Base64 を模擬テストデータとして使用
  - サイズ: 200x300 px
  - 形式: PNG or JPG

- **キャンバステスト**: `HTMLCanvasElement` のモック
  - Jest/Vitest で Canvas API をモック可能
  - または jsdom のネイティブ Canvas 実装を利用

### 参照元

- `docs/tasks/imgx-clip/TASK-0004.md` - テスト要件
- `src/hooks/useClipRegion.ts` - テスト対象（フック）
- `src/components/ImageCanvas.tsx` - テスト対象（コンポーネント）
- `docs/design/imgx-clip/dataflow.md` - テストケース参考

---

## 6. 注意事項

### 技術的制約

- **Canvas API 互換性**: HTML5 Canvas API は WebView2（Edge）で 100% 対応
  - Tauri v2 は WebView2 を使用するため、標準的な Canvas メソッド（drawImage, fillRect, strokeStyle 等）が全て利用可能

- **Base64 画像処理**: Canvas には `img.src = "data:image/png;base64,..."` で直接ロード可能
  - 大規模画像（10MB+）でもメモリ効率的

- **マウスイベント**: Canvas は native マウスイベントをサポート（react のイベントラッパーを使用）

- **フレームレート**: requestAnimationFrame で 60fps 取得可能（ブラウザ依存）

### セキュリティ・パフォーマンス要件

- **ファイルアクセス**: 画像ファイルは Tauri v2 Capability で制限済み
  - 参照: `src-tauri/capabilities/default.json`

- **Canvas メモリ**: 大規模画像（4000x3000px+）で メモリ使用量が増加
  - 最適化: Canvas サイズを実装で調整（スケーリング検討）

- **描画パフォーマンス**: requestAnimationFrame で 16ms（60fps）以内に描画完了を目指す

### 実装上の注意点

1. **Canvas サイズ設定**: 描画開始前に `canvas.width` と `canvas.height` を明示的に設定
   - CSS での サイズ指定では Canvas 描画は歪む可能性あり

2. **Base64 画像ロード**: `Image` 要素に `src` を設定後、`onload` イベントで Canvas描画
   - 非同期処理のため、Image ロード完了を待つ必要あり

3. **マウスイベント座標**: Canvas 上のマウス座標を正確に取得
   - `canvas.getBoundingClientRect()` で Canvas の位置・サイズを取得
   - マウスイベント座標から Canvas 座標に変換

4. **requestAnimationFrame**: マウスムーブイベント毎に Canvas 再描画すると過剰描画
   - `requestAnimationFrame` で描画フレームを制限（重要）

5. **メモリリーク防止**: useEffect クリーンアップで イベントリスナーを削除
   - アンマウント時に `canvas.removeEventListener()`

### 参照元

- `docs/design/imgx-clip/architecture.md` - パフォーマンス設計
- `docs/tasks/imgx-clip/TASK-0004.md` - 完了条件・注意事項
- `src-tauri/capabilities/default.json` - セキュリティ権限設定
- MDN Canvas API ドキュメント: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

## 7. 実装進捗・参考資料

### 関連文書マップ

| 文書 | パス | 用途 |
|------|------|------|
| タスク定義 | `docs/tasks/imgx-clip/TASK-0004.md` | タスク概要・完了条件 |
| 要件定義 | `docs/spec/imgx-clip/requirements.md` | REQ-002, REQ-004の確認 |
| アーキテクチャ | `docs/design/imgx-clip/architecture.md` | コンポーネント構成 |
| データフロー | `docs/design/imgx-clip/dataflow.md` | 機能2・3の詳細フロー |
| 前タスク実装 | `docs/implements/imgx-clip/TASK-0002/note.md` | TDD パターン参考 |
| React コンポーネント | `src/components/ImageCanvas.tsx` | 実装ファイル |
| フック | `src/hooks/useClipRegion.ts` | ドラッグ状態管理 |
| 設定 | `vite.config.ts`, `tsconfig.json` | ビルド・型チェック |

### 実装ファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| `src/components/ImageCanvas.tsx` | Canvas 画像表示・ドラッグ操作（TASK-0004） | ⏳ 未実装 |
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理フック | ⚠️ スケルトン |
| `src/App.tsx` | メインコンポーネント | ⚠️ テンプレート状態 |
| `src/main.tsx` | React エントリーポイント | ✅ 完成済み |
| `src/components/Toolbar.tsx` | ツールバー（参考） | ⏳ 未実装 |
| `src/components/PreviewPanel.tsx` | プレビューパネル（参考） | ⏳ TASK-0005 |

### TDD開発フロー

1. **要件定義フェーズ** (`/tsumiki:tdd-requirements`)
   - TASK-0004 の詳細要件を展開
   - useClipRegion フック、ImageCanvas コンポーネントの仕様定義

2. **テストケース設計** (`/tsumiki:tdd-testcases`)
   - useClipRegion フック単体テスト（ドラッグ状態管理）
   - ImageCanvas コンポーネントテスト（Canvas描画・イベント処理）

3. **RED フェーズ** (`/tsumiki:tdd-red`)
   - テストを実装（失敗することを確認）
   - `npm test` で失敗確認

4. **GREEN フェーズ** (`/tsumiki:tdd-green`)
   - テストが通るように最小実装
   - useClipRegion フック実装（startDrag, updateDrag, endDrag）
   - ImageCanvas コンポーネント実装（Canvas描画・イベントハンドリング）

5. **REFACTOR フェーズ** (`/tsumiki:tdd-refactor`)
   - コード品質向上（キャメルケース、型定義改善）
   - Canvas描画ロジック最適化
   - エラーハンドリング改善

6. **検証フェーズ** (`/tsumiki:tdd-verify-complete`)
   - 完了条件チェックリスト確認
   - マニュアルテスト（ドラッグ操作・60fps確認）
   - Tauri実行確認（npm run tauri dev）

### フロントエンドテスト環境セットアップ（必要に応じて）

```bash
# Vitest の追加（推奨）
npm install -D vitest @testing-library/react @testing-library/user-event

# または Jest
npm install -D jest @testing-library/react ts-jest @types/jest
```

### 次ステップ

- `/tsumiki:tdd-requirements imgx-clip TASK-0004` - 詳細要件定義
- `/tsumiki:tdd-testcases imgx-clip TASK-0004` - テストケース生成
- `/tsumiki:tdd-red imgx-clip TASK-0004` - テスト実装（RED）
- `/tsumiki:tdd-green imgx-clip TASK-0004` - 最小実装（GREEN）
- `/tsumiki:tdd-refactor imgx-clip TASK-0004` - リファクタリング

### 開発コマンド

```bash
# フロントエンド開発サーバー
npm run dev

# Tauri + React フル起動
npm run tauri dev

# TypeScript 型チェック
npx tsc --noEmit --skipLibCheck

# フロントエンドビルド
npm run build
```

---

**ノート完成日**: 2026-03-13
