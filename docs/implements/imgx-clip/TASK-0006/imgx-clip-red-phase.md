# TASK-0006 Redフェーズ記録: Toolbar・App統合・状態管理

**タスクID**: TASK-0006
**機能名**: imgx-clip
**フェーズ**: Red（失敗するテスト作成）
**作成日**: 2026-03-13

---

## 1. 作成したテストケース一覧

### appReducer テスト (`src/components/__tests__/App.test.tsx`)

| TC | カテゴリ | テスト名 | 信頼性 |
|----|---------|---------|--------|
| TC-001 | 正常系 | LOAD_START で status が 'loading' に遷移 | 🔵 |
| TC-002 | 正常系 | LOAD_SUCCESS で画像情報と status が正しく設定される | 🔵 |
| TC-003 | 正常系 | LOAD_ERROR で 'error' 状態に遷移しエラーメッセージが設定される | 🔵 |
| TC-004 | 正常系 | UPDATE_CLIP_REGION でクリップ範囲が更新される | 🔵 |
| TC-005 | 正常系 | SAVE_START で status が 'saving' に遷移 | 🔵 |
| TC-006 | 正常系 | SAVE_SUCCESS で status が 'ready' に戻る | 🔵 |
| TC-007 | 正常系 | SAVE_ERROR で 'error' 状態に遷移する | 🔵 |
| TC-008 | 正常系 | START_DRAGGING で status が 'dragging' に遷移 | 🟡 |
| TC-009 | 正常系 | END_DRAGGING で status が 'ready' に戻る | 🟡 |
| TC-010 | 正常系 | RESET_ERROR で errorMessage が null にリセット | 🟡 |
| TC-015 | 正常系 | 別画像読み込みでクリップ範囲が新画像サイズにリセット | 🔵 |
| TC-021 | 異常系 | 未定義アクションタイプで状態が変更されない | 🔵 |
| TC-022 | 境界値 | initialState の正確性（全プロパティ検証） | 🔵 |
| TC-023 | 境界値 | エラー状態から LOAD_SUCCESS で正常復帰する | 🔵 |
| TC-025 | 境界値 | LOAD_SUCCESS 後のクリップ範囲初期値が画像全体を選択 | 🔵 |
| TC-026 | 境界値 | loading 状態での重複 LOAD_START 安全性 | 🟡 |

**合計**: 16テストケース

### Toolbar コンポーネントテスト (`src/components/__tests__/Toolbar.test.tsx`)

| TC | カテゴリ | テスト名 | 信頼性 |
|----|---------|---------|--------|
| TC-011 | 正常系 | Toolbar に「ファイルを開く」ボタンが表示される | 🔵 |
| TC-012 | 正常系 | Toolbar に「保存」ボタンが表示される | 🔵 |
| TC-013 | 正常系 | 「ファイルを開く」クリックで onLoadImage が呼ばれる | 🔵 |
| TC-014 | 正常系 | 「保存」クリックで onSaveImage が呼ばれる | 🔵 |
| TC-016 | 異常系 | isLoading 時に「ファイルを開く」ボタンが無効化される | 🔵 |
| TC-017 | 異常系 | 画像未読込時に「保存」ボタンが無効化される | 🔵 |
| TC-018 | 異常系 | 保存中に「保存」ボタンが無効化される | 🔵 |
| TC-019 | 異常系 | isLoading 時クリックで onLoadImage が呼ばれない | 🟡 |
| TC-020 | 異常系 | 画像未読込時クリックで onSaveImage が呼ばれない | 🟡 |
| TC-024 | 境界値 | 通常状態で両ボタンが有効である | 🔵 |

**合計**: 10テストケース

### 信頼性レベルサマリー（全テスト）

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 20 | 77% |
| 🟡 黄信号 | 6 | 23% |
| 🔴 赤信号 | 0 | 0% |

**合計**: 26テストケース

---

## 2. テストファイルの場所

- `src/components/__tests__/App.test.tsx` - appReducer の単体テスト（16件）
- `src/components/__tests__/Toolbar.test.tsx` - Toolbar コンポーネントのUIテスト（10件）

---

## 3. テスト実行結果

### App.test.tsx

```
16 tests | 16 failed
```

**失敗の理由**: `appReducer` と `initialState` が `src/App.tsx` から named export されていない。

```
TypeError: Cannot read properties of undefined (reading 'imagePath')
TypeError: appReducer is not a function
```

### Toolbar.test.tsx

```
10 tests | 10 failed
```

**失敗の理由**: `Toolbar` コンポーネントが `src/components/Toolbar.tsx` から named export されていない。

```
Error: Element type is invalid: expected a string but got: undefined
```

---

## 4. 期待される失敗内容

### App.test.tsx の失敗

- `initialState` が undefined → `TypeError: Cannot read properties of undefined`
- `appReducer` が関数でない → `TypeError: appReducer is not a function`
- 根本原因: `src/App.tsx` に `appReducer`, `initialState`, `AppState` 型の named export がない

### Toolbar.test.tsx の失敗

- `Toolbar` が undefined → `Error: Element type is invalid: expected a string but got: undefined`
- 根本原因: `src/components/Toolbar.tsx` に `Toolbar` の named export がない（またはファイルが未実装）

---

## 5. Greenフェーズで実装すべき内容

### `src/App.tsx` への実装

以下を named export として実装・エクスポートする必要がある：

```typescript
// 1. AppState インターフェース（型定義）
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

// 2. AppAction 型定義
export type AppAction =
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

// 3. 初期状態
export const initialState: AppState = {
  imagePath: null,
  imageData: null,
  imageWidth: 0,
  imageHeight: 0,
  imageFormat: '',
  clipTopY: 0,
  clipBottomY: 0,
  status: 'idle',
  errorMessage: null,
};

// 4. Reducer 関数
export function appReducer(state: AppState, action: AppAction): AppState {
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
    case 'SAVE_START':
      return { ...state, status: 'saving' };
    case 'SAVE_SUCCESS':
      return { ...state, status: 'ready' };
    case 'SAVE_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload };
    case 'UPDATE_CLIP_REGION':
      return { ...state, clipTopY: action.payload.topY, clipBottomY: action.payload.bottomY };
    case 'START_DRAGGING':
      return { ...state, status: 'dragging' };
    case 'END_DRAGGING':
      return { ...state, status: 'ready' };
    case 'RESET_ERROR':
      return { ...state, errorMessage: null };
    default:
      return state;
  }
}
```

### `src/components/Toolbar.tsx` への実装

以下を実装する必要がある：

```typescript
// IToolbarProps インターフェース
interface IToolbarProps {
  isLoading: boolean;
  isSaving: boolean;
  isImageLoaded: boolean;
  onLoadImage: () => void;
  onSaveImage: () => void;
}

// Toolbar コンポーネント（named export）
export const Toolbar: React.FC<IToolbarProps> = ({
  isLoading, isSaving, isImageLoaded, onLoadImage, onSaveImage
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

## 6. 品質評価

| 項目 | 評価 |
|------|------|
| テスト実行可否 | ✅ 実行可能で全テスト失敗を確認 |
| 期待値の明確性 | ✅ 明確で具体的 |
| アサーションの適切性 | ✅ 適切（toBe, toBeNull, toBeDisabled, not.toHaveBeenCalled 等）|
| 実装方針の明確性 | ✅ 明確（named export が必要） |
| 信頼性レベル | ✅ 🔵（青信号）が77%と多い |

**総合判定**: ✅ 高品質
