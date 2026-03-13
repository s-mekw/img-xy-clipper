# TASK-0006 Refactorフェーズ記録: Toolbar・App統合・状態管理

**タスクID**: TASK-0006
**機能名**: imgx-clip
**フェーズ**: Refactor（品質改善）
**実施日**: 2026-03-13

---

## 1. リファクタリング概要

Greenフェーズで実装した最小実装コードに対して以下の品質改善を実施した。

| 改善項目 | 優先度 | 信頼性 | 状態 |
|---------|--------|--------|------|
| App.tsx: Toolbar・ImageCanvas・PreviewPanel 統合 + IPC 実装 | 高 | 🔵 | ✅ 完了 |
| App.tsx: handleLoadImage / handleSaveImage（Tauri dialog + invoke） | 高 | 🔵 | ✅ 完了 |
| App.tsx: エラー表示 UI 改善（エラーバー + 閉じるボタン） | 中 | 🟡 | ✅ 完了 |
| App.tsx: useCallback によるパフォーマンス最適化 | 低 | 🟡 | ✅ 完了 |
| setup.ts: `@tauri-apps/plugin-dialog` モック追加 | 高 | 🔵 | ✅ 完了 |
| setup.ts: `vitest/globals` 型参照追加（TypeScript チェック対応） | 中 | 🔵 | ✅ 完了 |
| package.json: `@tauri-apps/plugin-dialog` インストール | 高 | 🔵 | ✅ 完了 |

---

## 2. セキュリティレビュー結果

🔵 **青信号（問題なし）**

| 確認項目 | 結果 | 詳細 |
|---------|------|------|
| 入力値検証（appReducer） | ✅ | アクション型は TypeScript で型安全。ペイロードも型定義済み |
| XSS リスク | ✅ | `imageData`（Base64）を Canvas に描画するのみ。innerHTML 未使用 |
| IPC 呼び出し | ✅ | 引数は型定義済み（`ImageMetadata` インターフェース）で型安全 |
| ファイルアクセス | ✅ | Tauri Capability 設定に委譲（フロントエンド側の問題なし） |
| エラーメッセージ露出 | ✅ | Rust 側のエラーをユーザーに表示する設計は仕様通り |
| 二重操作防止 | ✅ | ボタン無効化 + App 側での前提条件チェック（二重防御） |

---

## 3. パフォーマンスレビュー結果

🟡 **改善適用済み**

| 確認項目 | 改善前 | 改善後 |
|---------|--------|--------|
| 子コンポーネント再レンダリング | コールバックが毎回新関数生成 | useCallback でメモ化（依存配列最小化） |
| 状態遷移計算量 | O(1) switch 文 | 変更なし（既に最適） |
| IPC 非同期処理 | 仮実装（invoke なし） | async/await で非同期実装（UIブロックなし） |

**useCallback 依存配列の設計** 🟡:
- `handleLoadImage`: 依存なし（dispatch は安定した参照）
- `handleSaveImage`: `state.imagePath`, `state.clipTopY`, `state.clipBottomY`（IPC で使用するフィールドのみ）
- `handleClipRegionChange`: 依存なし（dispatch は安定した参照）
- `handleResetError`: 依存なし（dispatch は安定した参照）

---

## 4. 改善されたコード（主要部分）

### 4.1 App.tsx の改善ポイント

#### 改善前（Greenフェーズ仮実装）
```typescript
function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <main className="container">
      <p>Status: {state.status}</p>
      {state.errorMessage && (
        <p className="error-message">Error: {state.errorMessage}</p>
      )}
      <div className="toolbar-area">
        <button onClick={() => dispatch({ type: "LOAD_START" })}
          disabled={state.status === "loading"}>
          ファイルを開く（仮）
        </button>
        <button onClick={() => dispatch({ type: "SAVE_START" })}
          disabled={state.imageData === null || state.status === "saving"}>
          保存（仮）
        </button>
      </div>
    </main>
  );
}
```

#### 改善後（Refactorフェーズ本番実装）
```typescript
function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // useCallback でメモ化されたハンドラ
  const handleLoadImage = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const selectedPath = await open({
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!selectedPath) {
        dispatch({ type: "LOAD_ERROR", payload: "" });
        dispatch({ type: "RESET_ERROR" });
        return;
      }
      const metadata = await invoke<ImageMetadata>("load_image", { path: selectedPath });
      dispatch({
        type: "LOAD_SUCCESS",
        payload: {
          imagePath: selectedPath,
          imageData: metadata.base64,
          imageWidth: metadata.width,
          imageHeight: metadata.height,
          imageFormat: metadata.format,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: "LOAD_ERROR", payload: errorMessage });
    }
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (!state.imagePath) return;
    dispatch({ type: "SAVE_START" });
    try {
      const destPath = await save({
        defaultPath: "clipped.png",
        filters: [{ name: "Image", extensions: ["png", "jpg"] }],
      });
      if (!destPath) {
        dispatch({ type: "SAVE_SUCCESS" });
        return;
      }
      await invoke("clip_and_save", {
        srcPath: state.imagePath,
        topY: state.clipTopY,
        bottomY: state.clipBottomY,
        destPath,
      });
      dispatch({ type: "SAVE_SUCCESS" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: "SAVE_ERROR", payload: errorMessage });
    }
  }, [state.imagePath, state.clipTopY, state.clipBottomY]);

  return (
    <main className="app-container">
      <Toolbar
        isLoading={isLoading}
        isSaving={isSaving}
        isImageLoaded={isImageLoaded}
        onLoadImage={handleLoadImage}
        onSaveImage={handleSaveImage}
      />
      {state.errorMessage && (
        <div className="error-bar" role="alert">
          <span className="error-message">{state.errorMessage}</span>
          <button className="error-close-button" onClick={handleResetError}>✕</button>
        </div>
      )}
      <div className="content-area">
        <ImageCanvas ... />
        <PreviewPanel ... />
      </div>
    </main>
  );
}
```

### 4.2 setup.ts の改善ポイント

#### 追加1: `@tauri-apps/plugin-dialog` モック 🔵
```typescript
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
```
**理由**: App.tsx が `@tauri-apps/plugin-dialog` を使用するようになったため、テスト環境でモックが必要

#### 追加2: `vitest/globals` 型参照 🔵
```typescript
/// <reference types="vitest/globals" />
```
**理由**: `vi` グローバルの TypeScript 型定義を提供し、`tsc --noEmit` チェックを通過させるため

---

## 5. テスト実行結果

### リファクタリング前
```
5 test files | 60 tests | 60 passed
Duration: 1.48s
```

### リファクタリング後
```
5 test files | 60 tests | 60 passed
Duration: 1.46s
```

全テストが継続して通過。実行時間も同等（1.46s）。

---

## 6. コメント改善内容

### App.tsx のコメント強化（主要箇所）

- **handleLoadImage**: 6ステップの処理フロー・useCallback の設計意図・依存配列の説明を追加 🔵
- **handleSaveImage**: キャンセル時の状態遷移・IPC 引数マッピングの説明を追加 🔵
- **handleClipRegionChange**: 単一責任・設計方針を記述 🔵
- **handleResetError**: エラーリセット UI の根拠（要件定義4.4/4.5）を追記 🟡
- **派生状態コメント**: isLoading/isSaving/isImageLoaded の算出根拠を記述 🔵
- **JSX コメント**: 各コンポーネント配置の設計根拠（architecture.md）を記述 🔵

### setup.ts のコメント強化

- **plugin-dialog モック**: 追加理由（TASK-0006の App.tsx 実装に対応）を記述 🔵
- **vitest/globals 参照**: TypeScript チェック対応のための追加であることを記述 🔵

---

## 7. ファイルサイズ

| ファイル | Greenフェーズ | Refactorフェーズ | 500行制限 |
|---------|--------------|----------------|-----------|
| `src/App.tsx` | 167行 | 455行 | ✅ 以内 |
| `src/components/Toolbar.tsx` | 84行 | 83行（変更なし） | ✅ 以内 |
| `src/test/setup.ts` | 85行 | 93行 | ✅ 以内 |

---

## 8. 品質評価

```
✅ 高品質:
- テスト結果: 60件全て継続成功（Taskツールによる実行確認）
- セキュリティ: 重大な脆弱性なし（入力値型安全・XSS リスクなし）
- パフォーマンス: useCallback でコールバックメモ化済み、IPC は非同期処理
- リファクタ品質: 仮実装UI を本番実装に完全置き換え、IPC 統合完了
- コード品質: TypeScript チェック通過、ファイルサイズ制限内
- ドキュメント: Refactorフェーズファイル・メモファイル更新完了
```

---

**最終更新**: 2026-03-13
**生成者**: tsumiki:tdd-refactor スキル
