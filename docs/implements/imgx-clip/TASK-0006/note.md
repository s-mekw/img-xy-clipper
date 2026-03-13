# TASK-0006 TDD開発ノート：Toolbar・App統合・状態管理

**生成日**: 2026-03-13
**タスクID**: TASK-0006
**要件名**: imgx-clip
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **フロントエンドフレームワーク**: React 19 + TypeScript + Vite
- **状態管理**: React useReducer（App全体の複雑な状態管理）
- **Tauri連携**: `@tauri-apps/api` でIPCコマンド呼び出し（load_image, clip_and_save）
- **ファイルダイアログ**: `@tauri-apps/api/dialog` で open/save ダイアログ
- **UI操作**: ボタンクリックイベントハンドリング

### アーキテクチャパターン

- **状態管理パターン**: useReducer による集中管理
  - AppState インターフェース: 画像情報・クリップ範囲・UI状態を統一管理
  - AppAction 型: 状態遷移を明示的に定義
  - Reducer 関数: 現在状態とアクションから次状態を計算

- **コンポーネント責務**:
  - App: 全体レイアウト・状態管理・子コンポーネントへの props 配信
  - Toolbar: ファイル読み込み・保存ボタン・状態に応じた有効/無効制御
  - ImageCanvas, PreviewPanel: TASK-0004, TASK-0005で実装済み

- **データフロー**:
  - App → Toolbar, ImageCanvas, PreviewPanel（props 経由）
  - Toolbar, ImageCanvas → App（dispatch 経由で状態更新）
  - IPC通信: Toolbar と Rust Backend（load_image, clip_and_save）

### 状態定義

```typescript
interface AppState {
  // 画像情報
  imagePath: string | null;
  imageData: string | null;      // Base64エンコード済み
  imageWidth: number;
  imageHeight: number;
  imageFormat: string;            // "png", "jpeg" など

  // クリップ範囲
  clipTopY: number;
  clipBottomY: number;

  // UI状態
  status: 'idle' | 'loading' | 'ready' | 'dragging' | 'saving' | 'error';
  errorMessage: string | null;
}

type AppAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: { imagePath: string; imageData: string; imageWidth: number; imageHeight: number; imageFormat: string } }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; payload: string }
  | { type: 'UPDATE_CLIP_REGION'; payload: { topY: number; bottomY: number } }
  | { type: 'START_DRAGGING' }
  | { type: 'END_DRAGGING' }
  | { type: 'RESET_ERROR' };
```

### 参照元

- `src/App.tsx` - 実装ファイル（状態管理・レイアウト）
- `src/components/Toolbar.tsx` - ファイル操作UI
- `src/components/ImageCanvas.tsx` - 画像表示・ドラッグ操作（TASK-0004で実装済み）
- `src/components/PreviewPanel.tsx` - 拡大プレビュー（TASK-0005で実装済み）
- `docs/design/imgx-clip/dataflow.md` - 状態管理フロー・データフロー図
- `docs/spec/imgx-clip/requirements.md` - 要件定義（REQ-001, REQ-003）

---

## 2. 開発ルール

### プロジェクト固有ルール

- React 19 + TypeScript の型安全開発
- コンポーネントは関数コンポーネント（`React.FC<Props>` 形式）
- TypeScript では型定義を明示的に記述
- useReducer を使用した集中管理で複雑な状態遷移を明確に

### コーディング規約

- **React/TypeScript**:
  - インターフェース名: `I<ComponentName>Props` 形式
  - 状態型: `AppState`, `AppAction` のような名前で統一
  - CSS クラス: ケバブケース（kebab-case）
  - イベントハンドラ: `handle<EventName>` 形式
  - Reducer 関数: `appReducer(state, action)` 形式

- **Toolbar コンポーネント構成**:
  ```typescript
  interface IToolbarProps {
    isLoading: boolean;       // ファイル読み込み中フラグ
    isSaving: boolean;        // 保存中フラグ
    isImageLoaded: boolean;   // 画像読み込み済みフラグ
    onLoadImage: (path: string) => void;
    onSaveImage: (srcPath: string, topY: number, bottomY: number) => void;
  }

  export const Toolbar: React.FC<IToolbarProps> = (props) => {
    // 実装
  };
  ```

- **App コンポーネント構成**:
  ```typescript
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 状態に応じた子コンポーネント制御
  ```

### Tauri IPC 連携パターン

```typescript
// ファイル読み込み
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

async function handleLoadImage() {
  const path = await open({ filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg'] }] });
  if (path) {
    const result = await invoke('load_image', { path });
    dispatch({ type: 'LOAD_SUCCESS', payload: result });
  }
}

// クリップ・保存
import { save } from '@tauri-apps/plugin-dialog';

async function handleSaveImage(srcPath: string, topY: number, bottomY: number) {
  const destPath = await save({ defaultPath: 'clipped.png', filters: [{ name: 'Image', extensions: ['png', 'jpg'] }] });
  if (destPath) {
    await invoke('clip_and_save', { srcPath, topY, bottomY, destPath });
    dispatch({ type: 'SAVE_SUCCESS' });
  }
}
```

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計
- `docs/implements/imgx-clip/TASK-0004/note.md` - ImageCanvas実装パターン
- `docs/implements/imgx-clip/TASK-0005/note.md` - PreviewPanel実装パターン

---

## 3. 関連実装

### 既存の関連実装

#### TASK-0004: ImageCanvasコンポーネント
- 画像表示・水平線ドラッグ操作・オーバーレイ描画
- `useClipRegion` フックでドラッグ状態を管理
- props: `imageData`, `imageWidth`, `imageHeight`, `topY`, `bottomY`, `onClipRegionChange`
- 参照: `src/components/ImageCanvas.tsx`

#### TASK-0005: PreviewPanelコンポーネント
- 選択範囲のリアルタイム拡大プレビュー表示
- props: `imageData`, `imageWidth`, `imageHeight`, `topY`, `bottomY`
- 参照: `src/components/PreviewPanel.tsx`

#### useClipRegion フック
- ドラッグ状態管理（上端・下端の水平線の Y座標）
- 状態: `topY`, `bottomY`, `draggingLine`
- イベントハンドラ: `startDrag`, `updateDrag`, `endDrag`
- 参照: `src/hooks/useClipRegion.ts`

### 既存の共通型定義
- `ClipRegion`: クリップ上下端のY座標を定義
- `DraggingLine`: ドラッグ対象の水平線を識別（"top" | "bottom" | null）
- 参照: `src/types/clip.ts`

### 実装パターン

#### 1. Toolbar のボタン有効/無効制御パターン

```typescript
// 読み込みボタン: 常に有効
<button onClick={handleLoadImage} disabled={isLoading}>
  ファイルを開く
</button>

// 保存ボタン: 画像読み込み済みかつ保存中でない場合に有効
<button onClick={handleSaveImage} disabled={!isImageLoaded || isSaving}>
  保存
</button>
```

#### 2. Reducer の状態遷移パターン

```typescript
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading' };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        status: 'ready',
        imagePath: action.payload.imagePath,
        imageData: action.payload.imageData,
        imageWidth: action.payload.imageWidth,
        imageHeight: action.payload.imageHeight,
        imageFormat: action.payload.imageFormat,
        clipTopY: 0,
        clipBottomY: action.payload.imageHeight,
        errorMessage: null,
      };

    case 'LOAD_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload };

    case 'UPDATE_CLIP_REGION':
      return { ...state, clipTopY: action.payload.topY, clipBottomY: action.payload.bottomY };

    case 'SAVE_START':
      return { ...state, status: 'saving' };

    case 'SAVE_SUCCESS':
      return { ...state, status: 'ready' };

    case 'SAVE_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload };

    case 'RESET_ERROR':
      return { ...state, errorMessage: null };

    default:
      return state;
  }
}
```

#### 3. IPC 呼び出しパターン

```typescript
// load_image コマンド
const result: ImageMetadata = await invoke('load_image', { path });
// 戻り値: { imageData: string, imageWidth: number, imageHeight: number, imageFormat: string }

// clip_and_save コマンド
await invoke('clip_and_save', { srcPath, topY, bottomY, destPath });
// 成功時は void、エラーは例外送出
```

---

## 4. 設計文書

### システムアーキテクチャ
- **ファイル**: `docs/design/imgx-clip/architecture.md`
- **内容**: 全体システム構成・コンポーネント構成・IPC コマンド定義
- **参照箇所**: フロントエンド（React + TypeScript）・バックエンド（Rust / Tauri）
- **対応要件**: REQ-401（Tauri v2 + React 構築）

### データフロー・状態管理フロー
- **ファイル**: `docs/design/imgx-clip/dataflow.md`
- **内容**: 画像読み込み・ドラッグ操作・クリップ保存の詳細フロー、状態管理フロー
- **参照箇所**: AppState インターフェース定義、状態遷移図
- **対応要件**: REQ-001, REQ-002, REQ-003, REQ-004

### 要件定義書
- **ファイル**: `docs/spec/imgx-clip/requirements.md`
- **参照要件**:
  - REQ-001: 画像ファイル読み込み機能
  - REQ-003: 指定Y軸範囲でのクリップ・保存
  - 受け入れ基準: ファイル選択 → 画像表示 → ドラッグ → 保存

---

## 5. テスト関連情報

### テストフレームワーク・設定
- **テストフレームワーク**: Vitest 4.1.0
- **テスト環境**: jsdom（ブラウザ環境シミュレーション）
- **設定ファイル**: `vite.config.ts`（test セクション）
  - globals: true（describe/it/expect 等をグローバルに）
  - environment: "jsdom"
  - setupFiles: `./src/test/setup.ts`

### テスト設定ファイルのセットアップ
- **パス**: `src/test/setup.ts`
- **内容**:
  - Canvas 2D Context のモック（jsdom 非対応のため）
  - requestAnimationFrame の同期モック
  - Image オブジェクトの onload 同期モック
  - `@tauri-apps/api/core` の invoke モック
- **重要**: テスト実行前に自動的に読み込まれ、Canvas API と Tauri API を使用可能にする

### 既存テストのディレクトリ構成
- **テストファイル配置**: `src/components/__tests__/` と `src/hooks/__tests__/`
- **命名パターン**: `<ComponentName>.test.tsx` または `<HookName>.test.ts`
- **既存テスト**:
  - `src/components/__tests__/ImageCanvas.test.tsx` - ImageCanvas コンポーネントテスト
  - `src/components/__tests__/PreviewPanel.test.tsx` - PreviewPanel コンポーネントテスト
  - `src/hooks/__tests__/useClipRegion.test.ts` - useClipRegion フックテスト

### テスト対象ファイル（TASK-0006で実装）
- `src/App.tsx` - 状態管理テスト: useReducer アクションの正しい状態遷移
- `src/components/Toolbar.tsx` - UI テスト: ボタン有効/無効制御、IPC呼び出し

### テストユーティリティ・パターン
- **@testing-library/react**: render, screen, userEvent を使用
- **モック invoke**: `vi.mock('@tauri-apps/api/core')` で Tauri IPC をモック
- **ステートレスコンポーネントテスト**: Toolbar は props 経由の制御なため、props を変更して動作確認

### IPC モック例
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

beforeEach(() => {
  vi.clearAllMocks();
});

it('should call load_image when clicking load button', async () => {
  (invoke as any).mockResolvedValue({
    imageData: 'base64...',
    imageWidth: 100,
    imageHeight: 200,
    imageFormat: 'png',
  });

  // テスト実装
});
```

### 参照元
- `vite.config.ts` - Vitest 設定
- `tsconfig.json` - TypeScript 設定
- `package.json` - 依存パッケージ（vitest, @testing-library/react）
- `src/test/setup.ts` - テスト環境初期化

---

## 6. 注意事項

### 技術的制約

1. **Canvas API 互換性**
   - Windows 11 環境・Tauri WebView2（Edge）で動作確認
   - jsdom でのテストでは Canvas API を完全にモック化（setup.ts 参照）

2. **Tauri ファイルダイアログ**
   - `@tauri-apps/plugin-dialog` を使用（v2では plugin化）
   - open/save ダイアログは Promise 返却（async/await で処理）

3. **IPC コマンド**
   - `load_image`: ファイル読み込み → Base64 エンコード → 返却（大画像でも Rust側で高速処理）
   - `clip_and_save`: 元画像を Rust側で再読み込み・クロップ・保存（フロントエンド側は非同期待機のみ）

4. **useReducer の初期状態**
   - 画像未読込状態: imageData は null, imageWidth/imageHeight は 0
   - ボタン有効/無効制御: status と imageData をチェック

### セキュリティ・パフォーマンス要件

1. **セキュリティ**
   - Tauri v2 の Capability 設定で必要最小限のファイルアクセスのみ許可
   - IPC コマンドは型安全（TypeScript 型定義で引数チェック）

2. **パフォーマンス**
   - 状態更新時に不要な再描画を避ける（memo, useCallback の活用）
   - ドラッグ操作中の Canvas 再描画: requestAnimationFrame で最適化（TASK-0004 で実装済み）
   - 大画像対応: Rust側で処理、フロントエンドは Base64 データ受け取りのみ

3. **状態管理の複雑性**
   - 複数の状態項目（画像情報・クリップ範囲・UI状態）を一元管理するため useReducer を採用
   - 状態遷移を明示的に定義し、予期しない状態遷移を防止

### 参照元

- `CLAUDE.md` - プロジェクト基本情報・技術スタック
- `docs/spec/imgx-clip/requirements.md` - 要件定義書（セキュリティ・パフォーマンス要件）
- `docs/design/imgx-clip/architecture.md` - セキュリティ・パフォーマンス実現方法

---

## 7. 実装前チェックリスト

- [ ] `docs/design/imgx-clip/architecture.md` - Toolbar コンポーネント・App 状態管理の詳細設計を確認
- [ ] `docs/design/imgx-clip/dataflow.md` - 状態遷移図・データフロー図を確認
- [ ] `src/test/setup.ts` - Canvas API とTauri API のモック設定を確認
- [ ] `src/components/__tests__/ImageCanvas.test.tsx` - テストパターンを確認
- [ ] `package.json` - `@tauri-apps/plugin-dialog` が依存に含まれているか確認
- [ ] `src-tauri/src/commands.rs` - `load_image`, `clip_and_save` コマンドの引数・戻り値を確認

---

**最終更新**: 2026-03-13
**生成者**: tsumiki:tdd-tasknote スキル
