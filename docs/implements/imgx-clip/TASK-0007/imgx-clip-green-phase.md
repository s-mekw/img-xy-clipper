# TASK-0007 Greenフェーズ記録：フロントエンド・バックエンド統合

**タスクID**: TASK-0007
**機能名**: フロントエンド・バックエンド統合
**作成日**: 2026-03-13
**フェーズ**: Green（テストを通す最小実装）

---

## 1. 実装方針

Redフェーズで特定された8件の失敗テストを通すため、以下の最小限の変更を実施した：

1. **`src/App.tsx`**: IPC引数のsnake_case変換・エラーメッセージプレフィックス・フィルタ名の修正
2. **`src/components/Toolbar.tsx`**: ローディング中の「保存」ボタン無効化・保存中テキスト変更
3. **`src/components/__tests__/App.integration.test.tsx`**: TC-013の既存テストをプレフィックス変更に合わせて修正・未使用Reactインポート削除

---

## 2. 実装内容

### 2.1 `src/App.tsx` の修正内容

#### TC-005対応: ファイルダイアログフィルタ名の変更

```typescript
// 変更前
{ name: "Image", extensions: ["png", "jpg", "jpeg"] }

// 変更後
{ name: "Images", // 【フィルタ名】: TC-005仕様: "Images"（複数形）
  extensions: ["png", "jpg", "jpeg"] }
```

**信頼性**: 🔵 テストケース定義書TC-005仕様より

#### TC-008対応: 画像読み込みエラーメッセージにプレフィックス追加

```typescript
// 変更前
const errorMessage = error instanceof Error ? error.message : String(error);
dispatch({ type: "LOAD_ERROR", payload: errorMessage });

// 変更後
const rawMessage = error instanceof Error ? error.message : String(error);
const errorMessage = `画像読み込みエラー: ${rawMessage}`;
dispatch({ type: "LOAD_ERROR", payload: errorMessage });
```

**信頼性**: 🔵 テストケース定義書TC-008より

#### TC-006対応: 保存ダイアログフィルタ名の変更

```typescript
// 変更前
{ name: "Image", extensions: ["png", "jpg"] }

// 変更後
{ name: "PNG", extensions: ["png"] },
{ name: "JPEG", extensions: ["jpg", "jpeg"] }
```

**信頼性**: 🔵 テストケース定義書TC-006仕様より

#### TC-003, TC-016対応: IPC引数をsnake_caseに変更

```typescript
// 変更前
await invoke("clip_and_save", {
  srcPath: state.imagePath,
  topY: state.clipTopY,
  bottomY: state.clipBottomY,
  destPath,
});

// 変更後
await invoke("clip_and_save", {
  src_path: state.imagePath,
  top_y: state.clipTopY,
  bottom_y: state.clipBottomY,
  dest_path: destPath,
});
```

**信頼性**: 🔵 テストケース定義書TC-003・要件定義書セクション2「clip_and_save IPC引数」より

#### TC-009対応: 保存エラーメッセージにプレフィックス追加

```typescript
// 変更前
const errorMessage = error instanceof Error ? error.message : String(error);
dispatch({ type: "SAVE_ERROR", payload: errorMessage });

// 変更後
const rawMessage = error instanceof Error ? error.message : String(error);
const errorMessage = `クリップ・保存エラー: ${rawMessage}`;
dispatch({ type: "SAVE_ERROR", payload: errorMessage });
```

**信頼性**: 🔵 テストケース定義書TC-009より

---

### 2.2 `src/components/Toolbar.tsx` の修正内容

#### TC-015対応: 「保存」ボタンの無効化条件に isLoading を追加

```tsx
// 変更前
disabled={!isImageLoaded || isSaving}

// 変更後
disabled={!isImageLoaded || isSaving || isLoading}
```

**信頼性**: 🔵 テストケース定義書TC-015より

#### TC-017対応: 保存中のボタンテキスト変更

```tsx
// 変更前
保存

// 変更後
{isSaving ? "保存中..." : "保存"}
```

**信頼性**: 🔵 テストケース定義書TC-017より

---

### 2.3 `src/components/__tests__/App.integration.test.tsx` の修正内容

Redフェーズで既に成功していた TC-013 のテストがプレフィックス変更の影響を受けたため修正した。

```typescript
// 変更前
expect(screen.getByText("非対応形式エラー")).toBeInTheDocument();

// 変更後
expect(screen.getByText("画像読み込みエラー: 非対応形式エラー")).toBeInTheDocument();
```

また、未使用の `React` インポートによる TypeScript エラーも修正した。

---

## 3. テスト実行結果

```
Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  21:18:53
   Duration  2.97s
```

| テストID | テスト名 | 状態 |
|---------|---------|------|
| TC-001 | load_image呼び出し後にimageDataがstateに設定されcanvas要素が表示される | ✅ 成功 |
| TC-002 | 画像読み込み完了後にローディング状態がクリアされボタンが有効化される | ✅ 成功 |
| TC-003 | clip_and_saveがsrc_path/top_y/bottom_y/dest_pathのsnake_case引数で呼ばれる | ✅ 成功（修正） |
| TC-004 | 保存成功時にエラーバーが表示されない | ✅ 成功 |
| TC-005 | 「ファイルを開く」クリックでopen()が画像フィルタ付きで呼ばれる | ✅ 成功（修正） |
| TC-006 | 「保存」クリックでsave()がデフォルト名clipped.pngとPNG/JPEGフィルタで呼ばれる | ✅ 成功（修正） |
| TC-007 | 画像読み込み成功後にImageCanvasとPreviewPanelのcanvas要素が表示される | ✅ 成功 |
| TC-008 | load_image失敗時に「画像読み込みエラー:」プレフィックス付きエラーが表示される | ✅ 成功（修正） |
| TC-009 | clip_and_save失敗時に「クリップ・保存エラー:」プレフィックス付きエラーが表示される | ✅ 成功（修正） |
| TC-010 | ファイルダイアログキャンセル時にinvokeが呼ばれずstateに変更なし | ✅ 成功 |
| TC-011 | 保存ダイアログキャンセル時にclip_and_saveが呼ばれずisSavingがfalseに戻る | ✅ 成功 |
| TC-012 | 初期状態（画像未読込）で保存ボタンがdisabledでクリック不可 | ✅ 成功 |
| TC-013 | エラー後に再度「ファイルを開く」をクリックすると正常に読み込めエラーがクリアされる | ✅ 成功（修正） |
| TC-014 | 初期状態で「保存」ボタンのdisabled属性がtrueである | ✅ 成功 |
| TC-015 | ローディング中に「ファイルを開く」と「保存」の両ボタンが無効化される | ✅ 成功（修正） |
| TC-016 | clipRegion初期値（topY=0, bottomY=imageHeight）でclip_and_saveが呼ばれる | ✅ 成功（修正） |
| TC-017 | 保存中にボタンテキストが「保存中...」に変わりdisabledになる | ✅ 成功（修正） |
| TC-018 | エラーバーが表示され「閉じる」ボタンでクリアされる | ✅ 成功 |

**合計**: 18件 全て成功

---

## 4. 品質判定

```
✅ 高品質:
- テスト結果: 18件/18件 全て成功
- 実装品質: シンプルかつ最小限の変更（最大6行の変更）
- リファクタ箇所: 明確に特定可能（下記参照）
- 機能的問題: なし
- コンパイルエラー: なし（npx tsc --noEmit --skipLibCheck でエラーなし）
- ファイルサイズ: App.tsx ~460行、Toolbar.tsx ~84行（どちらも800行以下）
- モック使用: 実装コードにモック・スタブが含まれていない
```

---

## 5. リファクタリング候補（Refactorフェーズへ）

1. **エラーメッセージ生成ロジックの分離**: `画像読み込みエラー: ` / `クリップ・保存エラー: ` プレフィックス付与ロジックを定数またはユーティリティ関数として分離
2. **フィルタ定義の定数化**: `open()` / `save()` のフィルタ設定を定数として切り出すと可読性が向上する
3. **TC-013のテスト記述改善**: エラーメッセージのテキストが実装詳細に依存しているため、`expect.stringContaining()` を使う方が堅牢

---

## 6. 信頼性レベルサマリー

| レベル | 修正箇所数 | 内容 |
|--------|-----------|------|
| 🔵 青信号 | 7箇所 | テストケース定義書・要件定義書の仕様に基づく |
| 🟡 黄信号 | 0箇所 | - |
| 🔴 赤信号 | 0箇所 | - |

**品質評価**: ✅ 高品質（全テスト成功・TypeScriptエラーなし）
