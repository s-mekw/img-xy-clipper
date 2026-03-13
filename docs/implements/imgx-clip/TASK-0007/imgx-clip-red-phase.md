# TASK-0007 Redフェーズ記録：フロントエンド・バックエンド統合

**タスクID**: TASK-0007
**機能名**: フロントエンド・バックエンド統合
**作成日**: 2026-03-13
**フェーズ**: Red（失敗するテスト作成）

---

## 1. 作成したテストケース一覧

| テストID | テスト名 | 状態 |
|---------|---------|------|
| TC-001 | load_image呼び出し後にimageDataがstateに設定されcanvas要素が表示される | ✅ 成功（既実装） |
| TC-002 | 画像読み込み完了後にローディング状態がクリアされボタンが有効化される | ✅ 成功（既実装） |
| TC-003 | clip_and_saveがsrc_path/top_y/bottom_y/dest_pathのsnake_case引数で呼ばれる | ❌ 失敗（未実装） |
| TC-004 | 保存成功時にエラーバーが表示されない | ✅ 成功（既実装） |
| TC-005 | 「ファイルを開く」クリックでopen()が画像フィルタ付きで呼ばれる | ❌ 失敗（未実装） |
| TC-006 | 「保存」クリックでsave()がデフォルト名clipped.pngとPNG/JPEGフィルタで呼ばれる | ❌ 失敗（要確認） |
| TC-007 | 画像読み込み成功後にImageCanvasとPreviewPanelのcanvas要素が表示される | ✅ 成功（既実装） |
| TC-008 | load_image失敗時に「画像読み込みエラー:」プレフィックス付きエラーが表示される | ❌ 失敗（未実装） |
| TC-009 | clip_and_save失敗時に「クリップ・保存エラー:」プレフィックス付きエラーが表示される | ❌ 失敗（未実装） |
| TC-010 | ファイルダイアログキャンセル時にinvokeが呼ばれずstateに変更なし | ✅ 成功（既実装） |
| TC-011 | 保存ダイアログキャンセル時にclip_and_saveが呼ばれずisSavingがfalseに戻る | ✅ 成功（既実装） |
| TC-012 | 初期状態（画像未読込）で保存ボタンがdisabledでクリック不可 | ✅ 成功（既実装） |
| TC-013 | エラー後に再度「ファイルを開く」をクリックすると正常に読み込めエラーがクリアされる | ✅ 成功（既実装） |
| TC-014 | 初期状態で「保存」ボタンのdisabled属性がtrueである | ✅ 成功（既実装） |
| TC-015 | ローディング中に「ファイルを開く」と「保存」の両ボタンが無効化される | ❌ 失敗（未実装） |
| TC-016 | clipRegion初期値（topY=0, bottomY=imageHeight）でclip_and_saveが呼ばれる（TC-003の仕様で） | ❌ 失敗（未実装） |
| TC-017 | 保存中にボタンテキストが「保存中...」に変わりdisabledになる | ❌ 失敗（未実装） |
| TC-018 | エラーバーが表示され「閉じる」ボタンでクリアされる | ✅ 成功（既実装） |

**合計**: 18件（失敗 8件、成功 10件）

---

## 2. テストファイル

```
src/components/__tests__/App.integration.test.tsx
```

---

## 3. テストコードの概要

### テスト構成
- **テストフレームワーク**: Vitest + React Testing Library + userEvent
- **モック対象**: `@tauri-apps/api/core` の `invoke`, `@tauri-apps/plugin-dialog` の `open`, `save`
- **テスト対象**: `src/App.tsx` のコンポーネント統合テスト

### 主要なテストパターン
1. **IPC連携テスト**: `invoke` の呼び出し引数・戻り値のstate反映を検証
2. **UI状態テスト**: ローディング・エラー・保存中のボタン状態変化を検証
3. **エラーハンドリングテスト**: エラーメッセージのUI表示・クリアフローを検証
4. **ダイアログキャンセルテスト**: キャンセル時の適切な状態管理を検証

---

## 4. 期待される失敗内容

### TC-003, TC-016: clip_and_save の引数名が snake_case でない

**失敗理由**: テストケース定義書では `src_path`, `top_y`, `bottom_y`, `dest_path`（snake_case）を期待しているが、現在の `App.tsx` 実装では `srcPath`, `topY`, `bottomY`, `destPath`（camelCase）を使用している。

**期待するエラー**:
```
AssertionError: expected "vi.fn()" to be called with arguments: [ 'clip_and_save', { ... } ]
Received:
  "clip_and_save", { bottomY: 200, destPath: "...", srcPath: "...", topY: 0 }
Expected:
  "clip_and_save", { bottom_y: 200, dest_path: "...", src_path: "...", top_y: 0 }
```

**Greenフェーズで実装すること**: `App.tsx` の `handleSaveImage` 内の `invoke` 呼び出し引数を snake_case に変更する

---

### TC-005: open() のフィルタ名が "Image" でなく "Images"（複数形）

**失敗理由**: テストケース定義書では `name: "Images"` を期待しているが、現在の実装では `name: "Image"` を使用している。

**期待するエラー**:
```
AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{ filters: [...] } ]
Received: open({ filters: [{ name: "Image", extensions: [...] }] })
Expected: open({ filters: [{ name: "Images", extensions: [...] }] })
```

**Greenフェーズで実装すること**: `App.tsx` の `handleLoadImage` 内の open フィルタ名を `"Images"` に変更する

---

### TC-006: save() のフィルタ確認

**失敗理由**: save() の呼び出し引数のフィルタが `{ name: "PNG" }` を含むことを期待しているが、現在の実装フィルタ名を確認が必要。

**Greenフェーズで実装すること**: `App.tsx` の `handleSaveImage` 内の save フィルタ名を確認・修正する

---

### TC-008: エラーメッセージに「画像読み込みエラー:」プレフィックスがない

**失敗理由**: テストケース定義書では `"画像読み込みエラー: 対応していない画像形式です"` が表示されることを期待しているが、現在の実装ではプレフィックスなしでエラーメッセージのみを表示する。

**期待するエラー**:
```
Unable to find an element with the text: 画像読み込みエラー: 対応していない画像形式です
```

**Greenフェーズで実装すること**: `App.tsx` の `handleLoadImage` のcatchブロックで `"画像読み込みエラー: " + errorMessage` の形式でエラーメッセージを設定する

---

### TC-009: エラーメッセージに「クリップ・保存エラー:」プレフィックスがない

**失敗理由**: テストケース定義書では `"クリップ・保存エラー: 保存先に書き込み権限がありません"` が表示されることを期待しているが、現在の実装ではプレフィックスなしでエラーメッセージのみを表示する。

**Greenフェーズで実装すること**: `App.tsx` の `handleSaveImage` のcatchブロックで `"クリップ・保存エラー: " + errorMessage` の形式でエラーメッセージを設定する

---

### TC-015: ローディング中に「保存」ボタンも disabled にならない

**失敗理由**: テストケース定義書では `isLoading=true` 時に「保存」ボタンも disabled になることを期待しているが、現在の `Toolbar.tsx` 実装では `!isImageLoaded || isSaving` でのみ「保存」ボタンを制御しており、`isLoading` による制御が行われていない。

**Greenフェーズで実装すること**: `Toolbar.tsx` の「保存」ボタンの disabled 条件に `isLoading` を追加する（`!isImageLoaded || isSaving || isLoading`）

---

### TC-017: 保存中にボタンテキストが「保存中...」に変わらない

**失敗理由**: テストケース定義書では `isSaving=true` 時にボタンテキストが `"保存中..."` に変わることを期待しているが、現在の `Toolbar.tsx` 実装ではテキストが常に `"保存"` 固定であり、三項演算子によるテキスト切り替えが実装されていない。

**Greenフェーズで実装すること**: `Toolbar.tsx` の「保存」ボタンのテキストを `{isSaving ? '保存中...' : '保存'}` に変更する

---

## 5. Greenフェーズで実装すべき内容

### 5.1 `src/App.tsx` の修正

1. **`handleLoadImage` の open フィルタ名変更**:
   ```typescript
   // 変更前
   { name: "Image", extensions: ["png", "jpg", "jpeg"] }
   // 変更後
   { name: "Images", extensions: ["png", "jpg", "jpeg"] }
   ```

2. **`handleLoadImage` のエラーメッセージにプレフィックス追加**:
   ```typescript
   // 変更前
   dispatch({ type: "LOAD_ERROR", payload: errorMessage });
   // 変更後
   dispatch({ type: "LOAD_ERROR", payload: `画像読み込みエラー: ${errorMessage}` });
   ```

3. **`handleSaveImage` の invoke 引数を snake_case に変更**:
   ```typescript
   // 変更前
   await invoke("clip_and_save", { srcPath, topY, bottomY, destPath });
   // 変更後
   await invoke("clip_and_save", { src_path, top_y, bottom_y, dest_path });
   ```

4. **`handleSaveImage` のエラーメッセージにプレフィックス追加**:
   ```typescript
   // 変更前
   dispatch({ type: "SAVE_ERROR", payload: errorMessage });
   // 変更後
   dispatch({ type: "SAVE_ERROR", payload: `クリップ・保存エラー: ${errorMessage}` });
   ```

### 5.2 `src/components/Toolbar.tsx` の修正

1. **「保存」ボタンの disabled 条件に isLoading を追加**:
   ```tsx
   // 変更前
   disabled={!isImageLoaded || isSaving}
   // 変更後
   disabled={!isImageLoaded || isSaving || isLoading}
   ```

2. **保存中のボタンテキストを「保存中...」に変更**:
   ```tsx
   // 変更前
   保存
   // 変更後
   {isSaving ? '保存中...' : '保存'}
   ```

---

## 6. 信頼性レベルサマリー

| レベル | テスト数 | 内容 |
|--------|---------|------|
| 🔵 青信号 | 15件 | テストケース定義書・App.tsx実装コードに基づく |
| 🟡 黄信号 | 3件 | TC-013, TC-016の一部（妥当な推測） |
| 🔴 赤信号 | 0件 | - |

**品質評価**: ✅ 高品質（8件失敗・10件成功、失敗内容が明確でGreenフェーズの実装方針が明確）
