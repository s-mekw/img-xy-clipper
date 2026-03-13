# TASK-0007 Refactorフェーズ記録：フロントエンド・バックエンド統合

**タスクID**: TASK-0007
**機能名**: フロントエンド・バックエンド統合
**作成日**: 2026-03-13
**フェーズ**: Refactor（品質改善）

---

## 1. リファクタリング方針

Greenフェーズで特定した以下の3つの改善候補を実施した：

1. **ダイアログフィルタ定義の定数化**（DRY原則）
2. **エラーメッセージ生成のヘルパー関数化**（DRY原則・単一責任）
3. **TC-013テストの堅牢化**（保守性向上）

---

## 2. セキュリティレビュー結果

- **ファイルパスの入力検証**: Tauri v2 Capability（`dialog:allow-open`, `dialog:allow-save`）でファイルシステムアクセスを制御済み。フロントエンドからは直接パス文字列を操作できない設計
- **IPC通信保護**: Tauri v2 の型安全なコマンド定義（`#[tauri::command]`）でインジェクション攻撃を防止
- **XSS対策**: React の JSX レンダリングが自動的にエスケープ処理を行う
- **重大な脆弱性**: なし ✅

---

## 3. パフォーマンスレビュー結果

- **`useCallback` メモ化**: `handleLoadImage`, `handleSaveImage`, `handleClipRegionChange`, `handleResetError` すべてメモ化済み。不要な子コンポーネント再レンダリングを防止
- **エラーメッセージ生成**: `formatErrorMessage` ヘルパーは O(1) の単純な文字列連結。パフォーマンス上の問題なし
- **ダイアログフィルタ定数**: モジュールレベルで一度だけ生成され、関数呼び出し毎の配列再生成コストがなくなった（微小な改善）
- **重大な性能課題**: なし ✅

---

## 4. 実施したリファクタリング内容

### 4.1 ダイアログフィルタ定義の定数化（`src/App.tsx`）

**改善前**: `open()` と `save()` の呼び出し箇所にフィルタをインライン定義
**改善後**: `OPEN_DIALOG_FILTERS` / `SAVE_DIALOG_FILTERS` 定数として切り出し

```typescript
// 【設定定数】: ファイルを開くダイアログのフィルタ設定
// 🔵 テストケース定義書TC-005仕様・要件定義書REQ-001（PNG/JPEG対応）より
const OPEN_DIALOG_FILTERS = [
  {
    name: "Images",
    extensions: ["png", "jpg", "jpeg"],
  },
];

// 【設定定数】: ファイル保存ダイアログのフィルタ設定
// 🔵 テストケース定義書TC-006仕様・要件定義書REQ-003（同一形式で保存）より
const SAVE_DIALOG_FILTERS = [
  { name: "PNG", extensions: ["png"] },
  { name: "JPEG", extensions: ["jpg", "jpeg"] },
];
```

**効果**:
- 対応形式の変更が1箇所で済む（保守性向上）
- 関数実行毎の配列再生成コストが不要（微小なパフォーマンス改善）
- 信頼性: 🔵 テストケース定義書TC-005/TC-006仕様より

---

### 4.2 エラーメッセージ生成のヘルパー関数化（`src/App.tsx`）

**改善前**: `handleLoadImage` と `handleSaveImage` の両方に `rawMessage → errorMessage` の2段階変換が重複
**改善後**: `formatErrorMessage(error, prefix)` ヘルパー関数として共通化

```typescript
/**
 * 【ヘルパー関数】: unknown 型のエラーを日本語プレフィックス付きメッセージ文字列に変換する
 * 【再利用性】: handleLoadImage / handleSaveImage の両方で同パターンが必要なため共通化
 * 【単一責任】: エラー変換の責務をこの関数に集約し、ハンドラ内の処理をシンプルに保つ
 * 🔵 テストケース定義書TC-008/TC-009の仕様より
 */
function formatErrorMessage(error: unknown, prefix: string): string {
  // 【エラー型変換】: Error インスタンスからはメッセージを、それ以外は文字列変換して取得
  const rawMessage = error instanceof Error ? error.message : String(error);
  // 【プレフィックス付与】: ユーザーがエラー種別を判別できるよう日本語プレフィックスを付与
  return `${prefix}${rawMessage}`;
}
```

**使用箇所**:

```typescript
// handleLoadImage の catch ブロック
dispatch({
  type: "LOAD_ERROR",
  payload: formatErrorMessage(error, "画像読み込みエラー: "),
});

// handleSaveImage の catch ブロック
dispatch({
  type: "SAVE_ERROR",
  payload: formatErrorMessage(error, "クリップ・保存エラー: "),
});
```

**効果**:
- エラーメッセージ変換ロジックの重複排除（DRY原則）
- 将来のエラーメッセージ形式変更が1箇所の修正で済む
- 信頼性: 🔵 テストケース定義書TC-008/TC-009仕様より

---

### 4.3 TC-013テストの堅牢化（`src/components/__tests__/App.integration.test.tsx`）

**改善前**: エラーメッセージのフルテキスト `"画像読み込みエラー: 非対応形式エラー"` で完全一致検索
**改善後**: 正規表現 `/非対応形式エラー/` でエラー本文のみを検索

```typescript
// 変更前
expect(screen.getByText("画像読み込みエラー: 非対応形式エラー")).toBeInTheDocument();

// 変更後（正規表現によるエラー本文マッチ）
expect(
  screen.getByText(/非対応形式エラー/) // 【確認内容】: エラー本文が表示されている（プレフィックス変更に耐性あり）
).toBeInTheDocument();
```

**効果**:
- エラーメッセージプレフィックスの変更（例: 将来的な文言変更）があってもテストが壊れない
- TC-013 の本質的なテスト目的（エラーが表示される）に焦点を当てた検証
- 信頼性: 🟡 テスト堅牢性の観点から妥当な改善

---

### 4.4 ファイルヘッダーコメントの整理（`src/App.tsx`）

- 過去のフェーズ（Greenフェーズ）への言及を削除し、現在の設計方針の記述に更新
- 重複する `【改善内容】` リストを簡潔化
- **ファイルサイズ**: 509行 → 487行（500行制限内に収める）

---

### 4.5 TC-018テストの正確な実装検証（`src/components/__tests__/Toolbar.test.tsx`）

**追加改善日**: 2026-03-13（Refactorフェーズ再実行）

**改善前**: `isSaving=true` 時にボタンテキストが「保存中...」に変わるにも関わらず、`getByText("保存")` でボタンを検索していたためテストが実行時エラーで失敗していた

**改善後**: `isSaving=true` の状態では実際のボタンテキストである「保存中...」で検索するよう修正

```typescript
// 変更前（誤り: 実装と不整合）
expect(screen.getByText("保存")).toBeDisabled();

// 変更後（正確: isSaving=true 時の実際のテキストを検証）
expect(screen.getByText("保存中...")).toBeDisabled(); // 【確認内容】: 「保存」ボタンが「保存中...」テキストで無効化されている 🔵
```

**効果**:
- テストが実際の Toolbar 実装（`{isSaving ? "保存中..." : "保存"}`）と整合するようになった
- `isSaving=true` 時のボタン無効化の両方（テキスト変更 + disabled 属性）を正しく検証
- 信頼性: 🔵 `src/components/Toolbar.tsx` の `{isSaving ? "保存中..." : "保存"}` 実装より

---

## 5. テスト実行結果

### 初回 Refactor（2026-03-13 22:16:41）

```
Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  2.73s
```

### 追加改善後（2026-03-13 TC-018修正）

```
Test Files  6 passed (6)
      Tests  78 passed (78)
   Start at  23:13:26
   Duration  3.01s
```

| テストスイート | 状態 |
|---------|------|
| App.integration.test.tsx: TC-001〜TC-018 全18件 | ✅ 成功（リファクタ後も継続） |
| Toolbar.test.tsx: TC-011〜TC-024 全10件（TC-018修正済み） | ✅ 成功 |
| その他テストスイート 50件 | ✅ 成功 |

---

## 6. 品質判定

```
✅ 高品質:
- テスト結果: 78件/78件 全成功（TC-018テスト修正後）
- セキュリティ: 重大な脆弱性なし
- パフォーマンス: 重大な性能課題なし（useCallback メモ化・定数化による微小改善）
- リファクタ品質: 4つの目標を全て達成
  - ダイアログフィルタの定数化（DRY原則）
  - エラーメッセージヘルパー関数化（DRY原則・単一責任）
  - TC-013テストの堅牢化（正規表現マッチ）
  - TC-018テストの正確な実装検証（isSaving=true 時のテキスト対応）
- コード品質: DRY原則適用・単一責任・可読性向上・テストと実装の整合性確保
- ファイルサイズ: App.tsx 487行（500行以内）、Toolbar.tsx 84行
- TypeScriptエラー: なし（npx tsc --noEmit --skipLibCheck 確認済み）
```

---

## 7. 信頼性レベルサマリー

| レベル | 改善箇所数 | 内容 |
|--------|-----------|------|
| 🔵 青信号 | 3箇所 | 定数化・ヘルパー関数化・TC-018テスト修正（実装との整合性） |
| 🟡 黄信号 | 1箇所 | TC-013テスト堅牢化（テスト保守性観点から妥当な改善） |
| 🔴 赤信号 | 0箇所 | - |

**品質評価**: ✅ 高品質（全78テスト成功・TypeScriptエラーなし・ファイルサイズ500行以内）
