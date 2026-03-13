# TASK-0005 TDD開発ノート：PreviewPanelコンポーネント実装

**生成日**: 2026-03-13
**タスクID**: TASK-0005
**要件名**: imgx-clip
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **フロントエンドフレームワーク**: React 19 + TypeScript + Vite
- **Canvas API**: HTML5 Canvas（拡大描画・リアルタイム更新）
- **状態管理**: React useState/useCallback/useEffect
- **Tauri連携**: `@tauri-apps/api` でIPCコマンド呼び出し
- **パフォーマンス最適化**: `requestAnimationFrame` で描画フレーム制限

### アーキテクチャパターン

- **コンポーネント責務**: 選択範囲（topY～bottomY）のみを拡大描画
- **データフロー**: 親コンポーネント（ImageCanvasまたはApp）から画像メタデータとクリップ範囲を props で受け取り
- **リアルタイム更新**: useClipRegion の状態変更に連動してCanvas再描画
- **描画最適化**: `requestAnimationFrame`でCanvas再描画を最適化し60fps維持
- **キャッシング**: 元画像を Image オブジェクトにキャッシュして再ロード回数を最小化

### Canvas描画戦略

- **拡大率計算**: プレビューキャンバスサイズ ÷ クリップ高さ（bottomY - topY）
- **ソース範囲指定**: Canvas `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` でソース範囲を指定
  - sx=0, sy=topY（開始Y座標）
  - sw=imageWidth, sh=(bottomY - topY)（クリップ高さ）
  - dx=0, dy=0, dw=プレビューサイズ.width, dh=プレビューサイズ.height（描画先）
- **レイヤー構成**: 拡大描画のみ（背景・オーバーレイなし）

### 参照元

- `src/components/PreviewPanel.tsx` - 実装ファイル
- `src/components/ImageCanvas.tsx` - 親コンポーネント（TASK-0004で実装済み）
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック
- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ
- `docs/spec/imgx-clip/requirements.md` - 要件定義（REQ-004）

---

## 2. 開発ルール

### プロジェクト固有ルール

- React 19 + TypeScript の型安全開発
- コンポーネントは関数コンポーネント（`React.FC<Props>` 形式）
- TypeScript では型定義を明示的に記述
- Canvas API使用時はブラウザ互換性を確認（Windows 11環境・WebView2）

### コーディング規約

- **React/TypeScript**:
  - インターフェース名: `I<ComponentName>Props` 形式
  - CSS クラス: ケバブケース（kebab-case）
  - Canvas メソッド: `ctx.<method>()` で描画コンテキスト操作
  - イベントハンドラ: `handle<EventName>` 形式

- **コンポーネント構成**:
  ```typescript
  interface IPreviewPanelProps {
    imageData: string | null;    // Base64画像
    imageWidth: number;
    imageHeight: number;
    topY: number;                // クリップ上端Y座標
    bottomY: number;             // クリップ下端Y座標
  }

  export const PreviewPanel: React.FC<IPreviewPanelProps> = (props) => {
    // 実装
  };
  ```

### Tauri IPCコマンド連携

- `load_image(path: string)` で画像メタデータ + Base64データ を取得（既に実装済み）
- プレビューは Canvas API で直接描画（IPCコマンドは不要）

### Canvas API使用パターン

- **拡大描画**: `ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` で部分描画
- **キャンバスクリア**: `ctx.clearRect(0, 0, width, height)` で再描画前に初期化
- **画像描画**: Base64 データを `Image` 要素に設定して Canvas に描画

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計
- `docs/implements/imgx-clip/TASK-0004/note.md` - ImageCanvas実装パターン

---

## 3. 関連実装

### 既存の関連実装

TASK-0002～0004 で既に以下が実装済み：

- `src-tauri/src/commands.rs` - `load_image`, `clip_and_save` IPC コマンド
- `src-tauri/src/image_processor.rs` - 画像処理ロジック
- `src/components/ImageCanvas.tsx` - 画像表示・ドラッグ操作コンポーネント（TASK-0004で実装）
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック
- `src/App.tsx` - メインコンポーネント
- `src/test/setup.ts` - テスト環境設定（Canvas モック含む）

### PreviewPanelコンポーネント（現在のスケルトン）

```typescript
// src/components/PreviewPanel.tsx
// TODO: TASK-0003 で実装予定
// 選択範囲のリアルタイム拡大プレビュー表示コンポーネント

export default function PreviewPanel() {
  return <canvas id="preview-canvas" />;
}
```

**現状**: スケルトン実装のみ。Canvas描画・props 受け取り・リアルタイム更新は未実装。

### ImageCanvasコンポーネント設計（参考）

```typescript
interface IImageCanvasProps {
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  onClipRegionChange: (topY: number, bottomY: number) => void;
}

export const ImageCanvas: React.FC<IImageCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ... 実装済み（TASK-0004）
};
```

### 関連ファイル構成

```
src/
├── components/
│   ├── ImageCanvas.tsx         # 画像表示・ドラッグ操作（TASK-0004実装済み）
│   ├── PreviewPanel.tsx        # TASK-0005 で実装（ここ）
│   ├── __tests__/
│   │   └── ImageCanvas.test.tsx # TASK-0004 テスト実装済み
│   └── Toolbar.tsx
├── hooks/
│   ├── useClipRegion.ts        # ドラッグ状態管理フック（TASK-0004で実装）
│   └── __tests__/
│       └── useClipRegion.test.ts # TASK-0004 テスト実装済み
├── App.tsx
└── main.tsx
```

### PreviewPanelコンポーネント設計（予想）

```typescript
interface IPreviewPanelProps {
  imageData: string | null;       // Base64データ
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
}

export const PreviewPanel: React.FC<IPreviewPanelProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Canvas描画ロジック（拡大描画）
  useEffect(() => {
    if (canvasRef.current && props.imageData) {
      const ctx = canvasRef.current.getContext('2d');
      // 1. Base64画像をImageオブジェクトにロード
      // 2. Canvas サイズ設定
      // 3. drawImage でソース範囲指定して拡大描画
    }
  }, [props.imageData, props.topY, props.bottomY]);

  return <canvas ref={canvasRef} className="preview-panel" />;
};
```

### 参照元

- `src/hooks/useClipRegion.ts` - ドラッグ状態管理フック
- `src/components/ImageCanvas.tsx` - Canvas描画パターン参考
- `docs/design/imgx-clip/dataflow.md` - 機能4：プレビュー更新データフロー
- `docs/tasks/imgx-clip/TASK-0005.md` - 実装項目詳細
- `src/App.tsx` - 親コンポーネント（state 保持）

---

## 4. 設計文書

### アーキテクチャ・UI仕様

#### PreviewPanelコンポーネント Props

```typescript
interface IPreviewPanelProps {
  // 画像メタデータ
  imageData: string | null;       // Base64エンコード済み画像
  imageWidth: number;             // 画像幅（ピクセル）
  imageHeight: number;            // 画像高さ（ピクセル）

  // クリップ範囲
  topY: number;                   // クリップ上端Y座標
  bottomY: number;                // クリップ下端Y座標
}
```

#### Canvas描画仕様

1. **キャンバスサイズ設定**
   - 固定サイズ: 200px × 300px（プレビュー表示用）
   - または動的計算: アスペクト比を保持して計算

2. **拡大率計算**
   - クリップ高さ = bottomY - topY
   - 拡大率 = キャンバス高さ ÷ クリップ高さ

3. **ソース範囲指定描画**
   ```
   drawImage(
     image,           // Image要素
     0,               // sx（ソース X）
     topY,            // sy（ソース Y = クリップ開始位置）
     imageWidth,      // sw（ソース幅 = 元画像幅）
     bottomY - topY,  // sh（ソース高さ = クリップ高さ）
     0,               // dx（描画先 X）
     0,               // dy（描画先 Y）
     canvasWidth,     // dw（描画先幅）
     canvasHeight     // dh（描画先高さ）
   );
   ```

#### リアルタイム更新仕様

- **更新トリガー**: topY または bottomY が変更される度に描画更新
- **性能最適化**: `requestAnimationFrame` で描画フレームを制限
- **変更検出**: useEffect で topY/bottomY の依存関係を指定

#### パフォーマンス要件

- **フレームレート**: ドラッグ中に60fps維持（requestAnimationFrame使用）
- **応答性**: topY/bottomY 変更後 16ms 以内に Canvas再描画
- **メモリ**: 大規模画像（4000x3000px）でも効率的に処理

### データモデル

#### Canvas描画フロー

```
useEffect([imageData, topY, bottomY]) {
  1. Base64 を Image要素にロード（1回のみ、キャッシュ）
  2. Canvas サイズ設定
  3. Canvas クリア
  4. drawImage でソース範囲指定して拡大描画
}
```

#### Base64画像ロード処理

```
1. imageData（Base64文字列）が変更された
2. Image要素を作成
3. img.src = "data:image/png;base64,..." を設定
4. Image.onload イベント待機
5. Canvas に描画（Image ロード完了後）
```

### システムデータフロー

**図1：親コンポーネントからの props フロー**

```
App コンポーネント:
  ├── imageData (Base64)
  ├── imageWidth, imageHeight
  ├── topY, bottomY
  └── PreviewPanel に props 渡す

PreviewPanel コンポーネント:
  ├── props 受け取り
  ├── useEffect でCanvas描画
  ├── topY/bottomY 変更に追従して再描画
  └── Canvas に拡大プレビュー表示
```

**図2：ドラッグ操作とプレビュー更新フロー**

```
1. ユーザーが ImageCanvas で水平線をドラッグ
   → handleMouseMove() で onClipRegionChange() コール

2. App コンポーネント で topY/bottomY 更新
   → state 変更

3. PreviewPanel の useEffect トリガー
   → topY/bottomY が依存関係に含まれているため再実行

4. Canvas 再描画（拡大プレビュー更新）
```

### 参照元

- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ・コンポーネント構成
- `docs/design/imgx-clip/dataflow.md` - 機能4のデータフロー・シーケンス図
- `docs/spec/imgx-clip/requirements.md` - REQ-004（リアルタイムプレビュー）
- `docs/tasks/imgx-clip/TASK-0005.md` - 実装項目・完了条件

---

## 5. テスト関連情報

### テストフレームワーク・設定

**フロントエンド（React）**: Vitest + @testing-library/react

- **テスト実行コマンド**: `npm test`
- **テストフレームワーク**: Vitest（Jest互換）
- **テスト対象コンポーネント**: PreviewPanel コンポーネント
- **UI テスト**: @testing-library/react で Canvas 描画を検証

**現在の状態**: テストフレームワークが package.json に登録済み（TASK-0004で設定）

### テストの構成・命名パターン

#### ユニットテスト（PreviewPanel コンポーネント）

- **テストファイル配置**: `src/components/__tests__/PreviewPanel.test.tsx`
- **テスト関数命名**: `test('<説明>')`（またはVitest の `describe`/`it` ブロック）
- **テスト対象**:
  - PreviewPanel コンポーネント：props 受け取り
  - Canvas 描画ロジック：topY/bottomY 変更時の再描画
  - Base64画像ロード：Image オブジェクトへの設定
  - ソース範囲指定：drawImage の呼び出しパラメータ

#### テスト実行コマンド

```bash
# フロントエンド（テストフレームワーク設定後）
npm test

# 特定テストのみ実行
npm test PreviewPanel

# ウォッチモード
npm run test:watch
```

### テスト関連の主要パターン

#### PreviewPanel コンポーネント テスト例

```typescript
describe('PreviewPanel', () => {
  // 正常系: Canvas が描画される
  test('should render canvas element', () => {
    // GIVEN: PreviewPanel がマウントされた
    // WHEN: コンポーネントをレンダリング
    // THEN: canvas 要素が存在する
  });

  // 正常系: 初期レンダリング時に描画される
  test('should draw image on initial mount', () => {
    // GIVEN: imageData, imageWidth, imageHeight, topY, bottomY props
    // WHEN: コンポーネントがマウント
    // THEN: ctx.drawImage が呼ばれて Image が描画される
  });

  // 正常系: topY/bottomY 変更で再描画
  test('should redraw preview when topY changes', () => {
    // GIVEN: PreviewPanel がマウント済み
    // WHEN: topY prop が 50 から 100 に変更
    // THEN: ctx.clearRect と ctx.drawImage が再度呼ばれる
  });

  // 正常系: bottomY 変更で再描画
  test('should redraw preview when bottomY changes', () => {
    // GIVEN: PreviewPanel がマウント済み
    // WHEN: bottomY prop が 250 から 200 に変更
    // THEN: Canvas が再描画される（拡大率が変更）
  });

  // 正常系: Base64 画像データのロード
  test('should load image from Base64 data', () => {
    // GIVEN: Base64エンコード済み imageData
    // WHEN: コンポーネントがマウント
    // THEN: Image.src = "data:image/png;base64,..." が設定される
  });

  // 正常系: ソース範囲指定での描画
  test('should call drawImage with correct source range', () => {
    // GIVEN: topY=50, bottomY=150, imageWidth=200, imageHeight=300
    // WHEN: Canvas 描画実行
    // THEN: drawImage(image, 0, 50, 200, 100, 0, 0, canvasWidth, canvasHeight)
    //       が呼ばれる（sy=topY, sh=bottomY-topY）
  });

  // 異常系: imageData が null の場合
  test('should not draw when imageData is null', () => {
    // GIVEN: imageData=null
    // WHEN: コンポーネントがマウント
    // THEN: ctx.drawImage が呼ばれない
  });

  // 異常系: クリップ高さが 0 の場合
  test('should handle case when clip height is 0', () => {
    // GIVEN: topY=100, bottomY=100 (高さ0)
    // WHEN: Canvas 描画実行
    // THEN: エラーなく処理される（空の Canvas）
  });
});
```

### テスト用モック設定

#### Canvas コンテキスト モック（既に src/test/setup.ts で設定済み）

```typescript
const mockCanvasContext = {
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  // ... その他のメソッド
};

HTMLCanvasElement.prototype.getContext = vi.fn()
  .mockReturnValue(mockCanvasContext);
```

#### Base64 テスト画像データ

```typescript
// テスト用の小さなPNG Base64文字列
const testImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
```

#### requestAnimationFrame モック（既に設定済み）

```typescript
// 同期実行モック
globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  callback(performance.now());
  return 0;
};
```

### テスト実行フロー（TASK-0005での想定テスト）

#### 正常系: リアルタイム描画

```
1. PreviewPanel コンポーネント テスト
   - imageData, topY, bottomY を props で渡す
   - Canvas が描画されるか確認
   - ctx.drawImage のパラメータが正しいか検証

2. ドラッグ操作連動テスト
   - ImageCanvas で topY を 50 から 100 に変更
   - PreviewPanel が自動的に再描画されるか確認
```

#### 異常系: 境界値処理

```
1. クリップ高さが 0 の場合
   - topY=100, bottomY=100
   - Canvas が描画されるか（エラーなく）

2. Base64 ロード失敗
   - imageData が null
   - ctx.drawImage が呼ばれないこと
```

### テストデータ・モック

- **テスト画像**: Base64文字列で実装（ファイル不要）
  - サイズ: 200x300 px 想定
  - 形式: PNG
  - データ: 実際の小さいPNG Base64

- **Canvas テスト**: Vitest のモックで Canvas メソッドを検証
  - drawImage の呼び出し回数
  - clearRect の呼び出し
  - 各パラメータの値

### 参照元

- `docs/tasks/imgx-clip/TASK-0005.md` - テスト要件
- `src/components/__tests__/ImageCanvas.test.tsx` - TASK-0004 テスト実装（参考）
- `src/hooks/__tests__/useClipRegion.test.ts` - フック テスト実装（参考）
- `src/test/setup.ts` - テスト環境設定
- `docs/design/imgx-clip/dataflow.md` - テストケース参考

---

## 6. 注意事項

### 技術的制約

- **Canvas API 互換性**: HTML5 Canvas API は WebView2（Edge）で 100% 対応
  - Tauri v2 は WebView2 を使用するため、標準的な Canvas メソッドが全て利用可能
  - `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` の 9引数形式対応

- **Base64 画像処理**: Canvas には `img.src = "data:image/png;base64,..."` で直接ロード可能
  - 大規模画像（10MB+）でもメモリ効率的

- **Image ロード**: 非同期処理（onload イベント待機が必要）
  - Canvas 描画は Image ロード完了後に実行

- **フレームレート**: requestAnimationFrame で 60fps 取得可能（ブラウザ依存）

### セキュリティ・パフォーマンス要件

- **ファイルアクセス**: PreviewPanel はIPCコマンドを使用しない（Canvas APIのみ）
  - セキュリティ権限は不要

- **Canvas メモリ**: プレビューサイズは固定小（200x300 など）
  - 大規模画像でもメモリ効率的

- **描画パフォーマンス**: requestAnimationFrame で 16ms（60fps）以内に描画完了を目指す

### 実装上の注意点

1. **Canvas サイズ設定**: 描画開始前に `canvas.width` と `canvas.height` を明示的に設定
   - CSS での サイズ指定では Canvas 描画は歪む可能性あり

2. **Base64 画像ロード**: `Image` 要素に `src` を設定後、`onload` イベントで Canvas描画
   - 非同期処理のため、Image ロード完了を待つ必要あり
   - 同一 Base64 の重複ロード回避（キャッシュ推奨）

3. **ソース範囲指定**: drawImage の 9引数形式は sy（開始Y）, sh（高さ）を正確に指定
   - sy = topY, sh = (bottomY - topY)
   - 範囲外アクセスは Canvas に描画されない

4. **依存関係指定**: useEffect の依存配列に topY, bottomY を含める
   - 依存関係がないと、props 変更時に再描画されない

5. **メモリリーク防止**: useEffect クリーンアップで Image.onload リスナーをクリア
   - アンマウント時に不要なリソースを解放

6. **requestAnimationFrame**: 毎フレーム Canvas 再描画を実行するため、最適化が重要
   - 不要な計算を避ける
   - canvas.width/height の毎回設定は避ける（変更時のみ）

### 参照元

- `docs/design/imgx-clip/architecture.md` - パフォーマンス設計
- `docs/tasks/imgx-clip/TASK-0005.md` - 完了条件・注意事項
- `src-tauri/capabilities/default.json` - セキュリティ権限設定
- MDN Canvas API ドキュメント: Canvas 仕様

---

## 7. 実装進捗・参考資料

### 関連文書マップ

| 文書 | パス | 用途 |
|------|------|------|
| タスク定義 | `docs/tasks/imgx-clip/TASK-0005.md` | タスク概要・完了条件 |
| 要件定義 | `docs/spec/imgx-clip/requirements.md` | REQ-004の確認 |
| アーキテクチャ | `docs/design/imgx-clip/architecture.md` | コンポーネント構成 |
| データフロー | `docs/design/imgx-clip/dataflow.md` | 機能4の詳細フロー |
| 前タスク実装 | `docs/implements/imgx-clip/TASK-0004/note.md` | TDD パターン・Canvas API参考 |
| React コンポーネント | `src/components/PreviewPanel.tsx` | 実装ファイル |
| 親コンポーネント | `src/components/ImageCanvas.tsx` | Canvas描画パターン参考 |
| テスト設定 | `src/test/setup.ts` | Canvas モック設定 |
| 設定 | `vite.config.ts`, `tsconfig.json` | ビルド・型チェック |

### 実装ファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| `src/components/PreviewPanel.tsx` | 拡大プレビュー表示（TASK-0005） | ⏳ 未実装 |
| `src/components/__tests__/PreviewPanel.test.tsx` | PreviewPanel テスト | ⏳ 未実装 |
| `src/components/ImageCanvas.tsx` | 画像表示・ドラッグ操作 | ✅ TASK-0004 完成済み |
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理フック | ✅ TASK-0004 完成済み |
| `src/App.tsx` | メインコンポーネント | ⚠️ 統合必要 |
| `src/test/setup.ts` | テスト環境設定 | ✅ 完成済み |

### TDD開発フロー

1. **要件定義フェーズ** (`/tsumiki:tdd-requirements`)
   - TASK-0005 の詳細要件を展開
   - PreviewPanel コンポーネントの仕様定義

2. **テストケース設計** (`/tsumiki:tdd-testcases`)
   - PreviewPanel コンポーネントテスト（Canvas描画・リアルタイム更新）
   - ドラッグ操作連動テスト

3. **RED フェーズ** (`/tsumiki:tdd-red`)
   - テストを実装（失敗することを確認）
   - `npm test` で失敗確認

4. **GREEN フェーズ** (`/tsumiki:tdd-green`)
   - テストが通るように最小実装
   - PreviewPanel コンポーネント実装（Canvas描画・props受け取り）

5. **REFACTOR フェーズ** (`/tsumiki:tdd-refactor`)
   - コード品質向上（Canvas描画ロジック最適化）
   - Base64 ロードの効率化（キャッシュ）
   - エラーハンドリング改善

6. **検証フェーズ** (`/tsumiki:tdd-verify-complete`)
   - 完了条件チェックリスト確認
   - マニュアルテスト（ドラッグ操作とリアルタイム更新確認）
   - Tauri実行確認（npm run tauri dev）

### フロントエンドテスト環境

テストフレームワークは既に package.json に登録済み（TASK-0004で設定）：

```bash
# テスト実行（既に設定済み）
npm test

# ウォッチモード
npm run test:watch
```

### 次ステップ

- `/tsumiki:tdd-requirements imgx-clip TASK-0005` - 詳細要件定義
- `/tsumiki:tdd-testcases imgx-clip TASK-0005` - テストケース生成
- `/tsumiki:tdd-red imgx-clip TASK-0005` - テスト実装（RED）
- `/tsumiki:tdd-green imgx-clip TASK-0005` - 最小実装（GREEN）
- `/tsumiki:tdd-refactor imgx-clip TASK-0005` - リファクタリング

### 開発コマンド

```bash
# フロントエンド開発サーバー
npm run dev

# Tauri + React フル起動
npm run tauri dev

# TypeScript 型チェック
npx tsc --noEmit --skipLibCheck

# テスト実行
npm test

# フロントエンドビルド
npm run build
```

---

**ノート完成日**: 2026-03-13
