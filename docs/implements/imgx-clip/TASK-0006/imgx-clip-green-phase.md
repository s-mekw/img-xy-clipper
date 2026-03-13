# TASK-0006 Greenフェーズ記録: Toolbar・App統合・状態管理

**タスクID**: TASK-0006
**機能名**: imgx-clip
**フェーズ**: Green（テストを通す最小実装）
**実装日**: 2026-03-13

---

## 1. 実装内容

### 実装ファイル一覧

| ファイル | 変更内容 |
|----------|---------|
| `src/App.tsx` | AppState, AppAction, initialState, appReducer を named export として実装 |
| `src/components/Toolbar.tsx` | IToolbarProps, Toolbar コンポーネントを named export として実装 |
| `src/test/setup.ts` | `@testing-library/jest-dom` のインポートを追加（toBeInTheDocument等のマッチャー有効化） |
| `package.json` | `@testing-library/jest-dom` を devDependencies に追加 |

---

## 2. 実装方針と判断理由

### `src/App.tsx` の実装方針

- **appReducer を named export**: テストが `import { appReducer, initialState } from "../../App"` で参照するため
- **initialState を named export**: 同上。テストでは `initialState` を直接参照して Reducer に渡す
- **AppState インターフェースを named export**: テストファイルで型として使用するため
- **AppAction 型を named export**: 今後の拡張性のため（Redフェーズ指定通り）
- **App コンポーネントの UI**: Greenフェーズでは最小限実装（仮ボタン）のみ。Refactorフェーズで本番UIに置き換え

### `src/components/Toolbar.tsx` の実装方針

- **named export に変更**: テストが `import { Toolbar } from "../Toolbar"` で参照するため
- **IToolbarProps インターフェース**: 要件定義書2.1の Props 定義に準拠
- **ボタン有効/無効制御**:
  - 「ファイルを開く」: `disabled={isLoading}`
  - 「保存」: `disabled={!isImageLoaded || isSaving}`
- **コールバック呼び出し**: ボタン `onClick` で直接 props のコールバックを呼び出す

### `src/test/setup.ts` の修正

- **問題**: `toBeInTheDocument`, `toBeDisabled` が Vitest に未登録でエラー
- **原因**: `@testing-library/jest-dom` のカスタムマッチャーが setup.ts に追加されていなかった
- **対応**: `import "@testing-library/jest-dom"` を追加し、パッケージをインストール
- **判断**: Red フェーズのテストコードが `toBeInTheDocument` 等を使用しており、テストを仕様通り通すために setup.ts への追加は必要な修正

---

## 3. 実装コード（主要部分）

### `src/App.tsx` - appReducer（主要部分）

```typescript
export interface AppState {
  imagePath: string | null;
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  imageFormat: string;
  clipTopY: number;
  clipBottomY: number;
  status: 'idle' | 'loading' | 'ready' | 'dragging' | 'saving' | 'error';
  errorMessage: string | null;
}

export const initialState: AppState = {
  imagePath: null, imageData: null, imageWidth: 0, imageHeight: 0,
  imageFormat: '', clipTopY: 0, clipBottomY: 0, status: 'idle', errorMessage: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, status: 'loading' };
    case 'LOAD_SUCCESS': return {
      ...state, status: 'ready',
      imagePath: action.payload.imagePath, imageData: action.payload.imageData,
      imageWidth: action.payload.imageWidth, imageHeight: action.payload.imageHeight,
      imageFormat: action.payload.imageFormat,
      clipTopY: 0, clipBottomY: action.payload.imageHeight, errorMessage: null,
    };
    case 'LOAD_ERROR': return { ...state, status: 'error', errorMessage: action.payload };
    case 'SAVE_START': return { ...state, status: 'saving' };
    case 'SAVE_SUCCESS': return { ...state, status: 'ready' };
    case 'SAVE_ERROR': return { ...state, status: 'error', errorMessage: action.payload };
    case 'UPDATE_CLIP_REGION': return { ...state, clipTopY: action.payload.topY, clipBottomY: action.payload.bottomY };
    case 'START_DRAGGING': return { ...state, status: 'dragging' };
    case 'END_DRAGGING': return { ...state, status: 'ready' };
    case 'RESET_ERROR': return { ...state, errorMessage: null };
    default: return state;
  }
}
```

### `src/components/Toolbar.tsx`

```typescript
interface IToolbarProps {
  isLoading: boolean;
  isSaving: boolean;
  isImageLoaded: boolean;
  onLoadImage: () => void;
  onSaveImage: () => void;
}

export const Toolbar: React.FC<IToolbarProps> = ({
  isLoading, isSaving, isImageLoaded, onLoadImage, onSaveImage,
}) => {
  return (
    <div className="toolbar">
      <button onClick={onLoadImage} disabled={isLoading}>
        ファイルを開く
      </button>
      <button onClick={onSaveImage} disabled={!isImageLoaded || isSaving}>
        保存
      </button>
    </div>
  );
};
```

---

## 4. テスト実行結果

### App.test.tsx（appReducer テスト）

```
16 tests | 16 passed
```

- TC-001〜TC-010: 全10アクション正常系テスト ✅
- TC-015: 別画像読み込み時クリップ範囲リセット ✅
- TC-021: 未定義アクションタイプでの状態維持 ✅
- TC-022: initialState の正確性 ✅
- TC-023: エラー状態からの復帰シーケンス ✅
- TC-025: LOAD_SUCCESS 後のクリップ範囲初期値 ✅
- TC-026: loading 状態での重複 LOAD_START 冪等性 ✅

### Toolbar.test.tsx（Toolbar UIテスト）

```
10 tests | 10 passed
```

- TC-011〜TC-012: ボタン表示確認 ✅
- TC-013〜TC-014: クリックコールバック呼び出し確認 ✅
- TC-016〜TC-018: ボタン無効化制御 ✅
- TC-019〜TC-020: 無効ボタンクリック抑制 ✅
- TC-024: 通常状態での両ボタン有効 ✅

### 全テスト実行結果

```
5 test files | 60 tests | 60 passed
```

（既存テスト: useClipRegion 13件、ImageCanvas 4件、PreviewPanel 13件 も全て継続して通過）

---

## 5. 品質評価

| 項目 | 評価 |
|------|------|
| テスト結果 | ✅ 26件（TASK-0006）全成功、全60件成功 |
| 実装シンプルさ | ✅ シンプル。Reducer は switch 文で全アクションを処理 |
| リファクタ箇所 | 以下を参照 |
| 機能的問題 | ✅ なし |
| ファイルサイズ | ✅ App.tsx 167行 / Toolbar.tsx 84行（800行以下） |
| モック使用 | ✅ 実装コードにモック・スタブなし |

**総合判定: ✅ 高品質**

---

## 6. Refactorフェーズで対応すべき課題

1. **App.tsx の UI 部分**:
   - 現状: 仮実装ボタン（テスト通過のみを目的）
   - 改善: Toolbar コンポーネントを使ったレイアウト統合、ImageCanvas・PreviewPanel の配置
   - 優先度: 高（TASK-0006 の完成に必要）

2. **App.tsx の IPC 呼び出し実装**:
   - 現状: dispatch 直接呼び出しのみ（実際の `invoke` なし）
   - 改善: `handleLoadImage`, `handleSaveImage` を実装し、Tauri dialog + invoke を統合
   - 優先度: 高

3. **エラー表示 UI**:
   - 現状: 最小限の `<p>` タグ
   - 改善: 適切なエラーモーダルまたはトーストUIの実装
   - 優先度: 中

4. **useCallback / React.memo の活用**:
   - 現状: 最適化なし
   - 改善: 子コンポーネントへの props コールバックを useCallback でメモ化
   - 優先度: 低（パフォーマンス改善）
