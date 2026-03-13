# TASK-0007 TDD開発ノート：フロントエンド・バックエンド統合

**生成日**: 2026-03-13
**タスクID**: TASK-0007
**要件名**: imgx-clip
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 技術スタック

### 使用技術・フレームワーク

- **フロントエンド言語**: TypeScript (React 19)
- **フレームワーク**: React + Vite
- **状態管理**: React useState/useContext (App.tsx中心)
- **IPC通信**: `@tauri-apps/api` v2
- **ダイアログ**: `@tauri-apps/plugin-dialog` v2
- **キャンバス描画**: HTML5 Canvas API
- **テスト**: Vitest (フロントエンドユニットテスト)

### バックエンド（連携）

- **言語**: Rust (Edition 2021)
- **フレームワーク**: Tauri v2
- **IPC公開コマンド**: `load_image`, `clip_and_save`
  - TASK-0002で実装の `load_image` コマンド
  - TASK-0003で実装の `clip_and_save` コマンド

### アーキテクチャパターン

- **IPC通信**: フロントエンド React → Tauri API → Rust バックエンド（型安全）
- **状態管理**: App.tsx で全体状態を管理
- **コンポーネント連携**:
  - Toolbar（ファイル選択・保存）→ App → ImageCanvas, PreviewPanel
  - ImageCanvas（画像表示・線ドラッグ）→ App → PreviewPanel
  - PreviewPanel（プレビュー表示）← App ← useClipRegion
- **エラーハンドリング**: Rust側エラー → フロントエンド → UI通知

### 参照元

- `src/App.tsx` - 全体アーキテクチャ・状態管理
- `src/components/Toolbar.tsx` - IPC呼び出し実装
- `src/components/ImageCanvas.tsx` - Canvas描画・線ドラッグ
- `src/components/PreviewPanel.tsx` - プレビュー表示
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理
- `package.json` - フロントエンド依存関係
- `docs/design/imgx-clip/architecture.md` - システムアーキテクチャ

---

## 2. 開発ルール

### プロジェクト固有ルール

- **IPC通信の型安全性**: Tauri v2の型定義を活用
- **エラーハンドリング**: Rust側のエラーメッセージ（日本語）をUI表示
- **状態管理**: Props Drilling回避のためContextやコンポーネント単位での状態分割
- **コンポーネント責務分離**:
  - Toolbar: IPC呼び出し・ダイアログ操作
  - ImageCanvas: 画像表示・ドラッグ検出
  - PreviewPanel: 拡大表示
  - App: 全体状態・IPC連携

### コーディング規約

- **TypeScript/React**:
  - 型定義は明示的に記述（`as const` 使用）
  - Props は型定義で受け取り
  - Hook は `use<Name>` 命名規約
  - イベントハンドラは `handle<Event>` 命名規約

- **Tauri IPC呼び出し**:
  - `invoke<T>("command_name", args)` で呼び出し
  - エラーハンドリング: `try/catch` でキャッチ
  - ローディング状態を明示

### IPC通信の型定義

```typescript
// Rust側から受け取る型
interface ImageMetadata {
  base64: string;    // Base64エンコード済み画像
  width: number;
  height: number;
  format: "png" | "jpeg";
}

// IPC呼び出し引数型
interface LoadImageArgs {
  path: string;
}

interface ClipAndSaveArgs {
  src_path: string;
  top_y: number;
  bottom_y: number;
  dest_path: string;
}
```

### 参照元

- `docs/spec/imgx-clip/note.md` - プロジェクトコンテキスト
- `docs/design/imgx-clip/architecture.md` - アーキテクチャ設計
- `docs/design/imgx-clip/dataflow.md` - E2Eデータフロー

---

## 3. 関連実装

### 既存実装の構造

TASK-0004, TASK-0005, TASK-0006 で既に以下が実装済み：

- `src/App.tsx` - アプリケーション本体・状態管理（一部実装）
- `src/components/ImageCanvas.tsx` - Canvas描画・ドラッグ操作
- `src/components/PreviewPanel.tsx` - クリップ範囲プレビュー表示
- `src/components/Toolbar.tsx` - ツールバーUI（IPC呼び出しロジックは未実装）
- `src/hooks/useClipRegion.ts` - ドラッグ状態管理
- `src-tauri/src/commands.rs` - `load_image`, `clip_and_save` コマンド実装済み
- `src-tauri/src/image_processor.rs` - 画像処理ロジック実装済み

### 現在の実装状況（TASK-0007の基盤）

#### `src/App.tsx` - 全体状態・IPC連携（部分実装）

```typescript
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Toolbar from './components/Toolbar';
import ImageCanvas from './components/ImageCanvas';
import PreviewPanel from './components/PreviewPanel';

interface ImageData {
  base64: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  originalPath?: string;
}

interface ClipRegion {
  topY: number;
  bottomY: number;
}

export default function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [clipRegion, setClipRegion] = useState<ClipRegion>({ topY: 0, bottomY: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画像読み込み処理（IPC呼び出し）
  const handleLoadImage = async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await invoke('load_image', { path });
      setImageData({
        ...metadata as ImageData,
        originalPath: path,
      });
    } catch (err) {
      setError(`画像読み込みエラー: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // クリップ・保存処理（IPC呼び出し）
  const handleClipAndSave = async (savePath: string) => {
    if (!imageData?.originalPath) return;
    setIsLoading(true);
    setError(null);
    try {
      await invoke('clip_and_save', {
        src_path: imageData.originalPath,
        top_y: clipRegion.topY,
        bottom_y: clipRegion.bottomY,
        dest_path: savePath,
      });
      setError(null); // 成功時
    } catch (err) {
      setError(`クリップ・保存エラー: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Toolbar
        onLoadImage={handleLoadImage}
        onClipAndSave={handleClipAndSave}
        isLoading={isLoading}
        disabled={!imageData}
      />
      {error && <div className="error-message">{error}</div>}
      <div className="canvas-container">
        {imageData && (
          <>
            <ImageCanvas
              imageData={imageData}
              clipRegion={clipRegion}
              onClipRegionChange={setClipRegion}
            />
            <PreviewPanel
              imageData={imageData}
              clipRegion={clipRegion}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

**現状**: 基本構造実装済み。IPC呼び出しロジックは Toolbar 側での完成を待つ

#### `src/components/Toolbar.tsx` - IPC呼び出し実装予定

```typescript
import React, { useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';

interface ToolbarProps {
  onLoadImage: (path: string) => Promise<void>;
  onClipAndSave: (savePath: string) => Promise<void>;
  isLoading: boolean;
  disabled: boolean;
}

export default function Toolbar({
  onLoadImage,
  onClipAndSave,
  isLoading,
  disabled,
}: ToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);

  // ファイルダイアログで画像読み込み
  const handleOpenImage = async () => {
    const path = await open({
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    if (path) {
      await onLoadImage(path as string);
    }
  };

  // ファイルダイアログで保存
  const handleSaveImage = async () => {
    setIsSaving(true);
    const savePath = await save({
      filters: [
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      ],
      defaultPath: 'clipped.png',
    });
    if (savePath) {
      await onClipAndSave(savePath as string);
    }
    setIsSaving(false);
  };

  return (
    <div className="toolbar">
      <button onClick={handleOpenImage} disabled={isLoading}>
        画像を開く
      </button>
      <button
        onClick={handleSaveImage}
        disabled={disabled || isLoading || isSaving}
      >
        {isSaving ? '保存中...' : 'クリップして保存'}
      </button>
    </div>
  );
}
```

**現状**: ダイアログロジックのみ実装。フロントエンド側IPC呼び出しは完成

#### `src/components/ImageCanvas.tsx` - Canvas描画・ドラッグ検出（完成）

```typescript
// 実装済み（TASK-0004）
// - Base64画像の描画
// - 2本の水平線（上端・下端）の描画
// - ドラッグでY座標変更
// - リアルタイムプレビュー通知
```

#### `src/components/PreviewPanel.tsx` - プレビュー表示（完成）

```typescript
// 実装済み（TASK-0005）
// - クリップ範囲の拡大プレビュー表示
// - 画像データ+clipRegion から該当部分を抽出・描画
```

#### `src-tauri/src/commands.rs` - IPC コマンド定義（完成）

```rust
#[tauri::command]
pub fn load_image(path: String) -> Result<ImageMetadata, String> {
    image_processor::load_image(&path)
}

#[tauri::command]
pub fn clip_and_save(
    src_path: String,
    top_y: u32,
    bottom_y: u32,
    dest_path: String,
) -> Result<(), String> {
    image_processor::clip_and_save(&src_path, top_y, bottom_y, &dest_path)
}
```

**現状**: Rust側コマンド完成（TASK-0002, TASK-0003）

### 参照パターン

- **IPC呼び出し**: `invoke<T>("command", args)` で型安全に呼び出し
- **エラーハンドリング**: `try/catch` でエラーをキャッチ、UI に表示
- **ローディング状態**: `isLoading` フラグで UI 制御
- **ファイルダイアログ**: `@tauri-apps/plugin-dialog` の `open()`, `save()`

### 参照元

- `src/App.tsx` - 全体状態管理・IPC呼び出し
- `src/components/Toolbar.tsx` - ダイアログ・IPC トリガー
- `src/components/ImageCanvas.tsx` - Canvas描画・ドラッグ状態
- `src/components/PreviewPanel.tsx` - プレビュー表示
- `src/hooks/useClipRegion.ts` - ドラッグ座標管理
- `src-tauri/src/commands.rs` - Rust IPCコマンド
- `src-tauri/src/image_processor.rs` - Rust画像処理ロジック
- `docs/design/imgx-clip/dataflow.md` - E2Eデータフロー

---

## 4. 設計文書

### アーキテクチャ・E2Eフロー

#### E2E フロー 1: 画像読み込み → ドラッグ → プレビュー

```
1. ユーザー「画像を開く」クリック
   ↓
2. Toolbar → ダイアログで画像選択
   ↓
3. Toolbar → App.handleLoadImage(path) 呼び出し
   ↓
4. App → invoke('load_image', { path })
   ↓
5. Rust image_processor → Base64 + メタデータ返却
   ↓
6. App → ImageCanvas へ imageData, clipRegion 受け渡し
   ↓
7. ImageCanvas → Canvas に Base64画像 + 2本の水平線を描画
   ↓
8. ユーザー 2本の線をドラッグ
   ↓
9. ImageCanvas → useClipRegion で Y座標を追跡
   ↓
10. App → clipRegion 更新
    ↓
11. PreviewPanel → リアルタイムプレビュー更新
```

#### E2E フロー 2: クリップ・保存

```
1. ユーザー「クリップして保存」クリック
   ↓
2. Toolbar → ダイアログで保存先を指定
   ↓
3. Toolbar → App.handleClipAndSave(savePath) 呼び出し
   ↓
4. App → invoke('clip_and_save', {
     src_path,      // 元画像パス
     top_y,         // useClipRegion で取得
     bottom_y,      // useClipRegion で取得
     dest_path      // ダイアログで指定
   })
   ↓
5. Rust image_processor → 画像クリップ・保存実行
   ↓
6. Rust → Ok(()) または Err(String) 返却
   ↓
7. フロントエンド → 成功: メッセージ表示
              失敗: エラーメッセージ表示
```

### データモデル

```typescript
// 画像メタデータ（Rust から受け取り）
interface ImageMetadata {
  base64: string;      // Base64エンコード済み画像
  width: number;       // 画像幅（ピクセル）
  height: number;      // 画像高さ（ピクセル）
  format: 'png' | 'jpeg';
  originalPath?: string; // アプリ側で記録（IPC後）
}

// クリップ範囲
interface ClipRegion {
  topY: number;        // クリップ上端Y座標
  bottomY: number;     // クリップ下端Y座標
}

// エラーハンドリング
interface AppState {
  imageData: ImageMetadata | null;
  clipRegion: ClipRegion;
  isLoading: boolean;
  error: string | null;
}
```

### システムデータフロー

```
ファイル選択（Toolbar）
  → invoke('load_image', { path })
  ← ImageMetadata { base64, width, height, format }
  → App.setImageData()
  → ImageCanvas: Canvas 描画
  → PreviewPanel: プレビュー更新

ドラッグ操作（ImageCanvas）
  → useClipRegion: Y座標を追跡
  → App.setClipRegion()
  → PreviewPanel: リアルタイム拡大表示

保存操作（Toolbar）
  → invoke('clip_and_save', { src_path, top_y, bottom_y, dest_path })
  ← Ok(()) または Err(String)
  → App.setError() でUI表示
```

### 参照元

- `docs/design/imgx-clip/architecture.md` - システム全体設計
- `docs/design/imgx-clip/dataflow.md` - 詳細E2Eフロー・シーケンス図
- `docs/tasks/imgx-clip/TASK-0007.md` - タスク定義

---

## 5. テスト関連情報

### テストフレームワーク・設定

**フロントエンド**: Vitest + React Testing Library

- テストファイル: `src/components/__tests__/`, `src/hooks/__tests__/`
- テスト実行: `npm test`
- モック: Vitest の `vi.mock()` で Tauri API モック

**バックエンド**: (TASK-0002, TASK-0003 で実装済み)

- テスト実行: `cargo test` (src-tauri/)

### テストの構成・命名パターン

#### フロントエンド 統合テスト

- **テストモジュール配置**: `src/<component>/__tests__/<component>.test.tsx`
- **テスト関数命名**: `test <コンポーネント> <シナリオ>` 形式
  - 例: `test App loads image via IPC`
  - 例: `test ImageCanvas responds to drag`
- **テスト対象**: コンポーネント・フック（E2E機能検証）

#### E2E手動テスト

- **実行方法**: `npm run tauri dev` でアプリ起動し手動テスト
- **検証項目**: 画像読み込み→ドラッグ→プレビュー→保存 の一連フロー

### テスト関連の主要パターン

#### テストデータの配置

- **テスト画像**: `src/test/fixtures/sample.png`, `src/test/fixtures/sample.jpg`
  - 小さいサイズ（100x100px程度）を推奨
  - クリップテスト用は高さ200px以上を推奨

#### モック・ユーティリティ

```typescript
// Tauri API モック例
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
    .mockResolvedValueOnce({
      base64: 'iVBORw0KGgo...',
      width: 100,
      height: 100,
      format: 'png',
    })
}));

// ダイアログモック例
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValueOnce('C:\\path\\to\\image.png'),
  save: vi.fn().mockResolvedValueOnce('C:\\path\\to\\output.png'),
}));
```

### テスト実行フロー（TASK-0007での想定テスト）

#### E2E統合テスト: 画像読み込み

```typescript
test('App loads image via IPC and displays on Canvas', async () => {
  // GIVEN: Tauri API が ImageMetadata を返す
  // WHEN: ユーザーが「画像を開く」をクリック
  // THEN: Canvas に Base64画像が描画される
  //      2本の水平線が表示される
});
```

#### E2E統合テスト: ドラッグ操作

```typescript
test('ImageCanvas responds to drag and updates ClipRegion', async () => {
  // GIVEN: 画像が Canvas に描画されている
  // WHEN: ユーザーが上端の線をドラッグ
  // THEN: clipRegion.topY が更新される
  //      PreviewPanel がリアルタイム更新される
});
```

#### E2E統合テスト: クリップ・保存

```typescript
test('App calls clip_and_save and handles result', async () => {
  // GIVEN: 画像が読み込まれ、クリップ範囲が選択されている
  // WHEN: ユーザーが「クリップして保存」をクリック
  // THEN: invoke('clip_and_save', {...}) が呼び出される
  //      成功時: エラーメッセージは表示されない
  //      失敗時: エラーメッセージが表示される
});
```

#### E2E手動テスト チェックリスト

```
□ 画像読み込み
  □ 「画像を開く」ボタンをクリック
  □ ファイルダイアログで PNG を選択
  □ Canvas に画像が表示される
  □ 2本の水平線が描画される

□ ドラッグ操作
  □ 上端の線をドラッグ
  □ 下端の線をドラッグ
  □ PreviewPanel がリアルタイム更新される

□ クリップ・保存
  □ 「クリップして保存」ボタンをクリック
  □ ファイル保存ダイアログが出現
  □ 保存先を指定して保存
  □ 保存ファイルが存在する
  □ 保存ファイルのサイズが正しい（クリップ高さに応じた）

□ エラーハンドリング
  □ 存在しないファイルパスを指定
  □ エラーメッセージが表示される
  □ 非対応形式（GIF等）を指定
  □ エラーメッセージが表示される
```

### テスト実行コマンド

```bash
# フロントエンド ユニットテスト
npm test

# フロントエンド テスト（ウォッチモード）
npm test -- --watch

# バックエンド Rust テスト
cd src-tauri
cargo test

# E2E 手動テスト（アプリ起動）
npm run tauri dev
```

### 参照元

- `docs/tasks/imgx-clip/TASK-0007.md` - テスト要件
- `src/components/__tests__/` - テスト実装例
- `docs/design/imgx-clip/dataflow.md` - E2Eフロー参考

---

## 6. 注意事項

### 技術的制約

- **ファイル形式**: PNG, JPG/JPEG のみ対応（Rust側で非対応形式はエラー）
- **Windows 11環境前提**: Tauri v2 WebView2（Edge）使用
- **IPC通信**: Tauri v2の型安全性を活用
- **ファイルパス**: 絶対パスのみ対応（相対パスは未検証）

### セキュリティ・パフォーマンス要件

- **ファイルアクセス権限**: Tauri v2 Capability で必要最小限に制限
  - 設定: `src-tauri/capabilities/default.json`
  - 権限: `dialog:allow-open`, `dialog:allow-save`

- **大規模画像対応**:
  - Base64エンコードはRust側で高速処理
  - フロントエンド Canvas は大規模画像で負荷増大（制限なし）

- **IPC型安全性**: Tauri v2の型定義で インジェクション防止

### 実装上の注意点

1. **IPC呼び出しエラーハンドリング**: `try/catch` で必ずキャッチ
2. **ローディング状態**: IPC呼び出し中はUI操作を無効化
3. **ファイルダイアログ戻り値**: `null` の可能性を考慮（キャンセル時）
4. **Base64画像表示**: `<img src={`data:image/png;base64,${base64}`} />` または Canvas描画
5. **メモリ効率**: 大規模Base64文字列のState管理

### 実装上の危険箇所

1. **IPC呼び出しの待機忘れ**: `async/await` または `.then()` で確認
2. **ファイルパス型チェック**: TypeScript で `string | null` を処理
3. **クリップ範囲の妥当性**: Rust側で チェック（topY < bottomY, bottomY <= height）
4. **エラーメッセージの文字列化**: `String(error)` で必ず変換

### 参照元

- `docs/design/imgx-clip/architecture.md` - セキュリティ設計
- `src-tauri/capabilities/default.json` - ファイルアクセス権限
- `docs/tasks/imgx-clip/TASK-0007.md` - 完了条件・注意事項

---

## 7. 実装進捗・参考資料

### 関連文書マップ

| 文書 | パス | 用途 |
|------|------|------|
| タスク定義 | `docs/tasks/imgx-clip/TASK-0007.md` | タスク概要・完了条件 |
| 要件定義 | `docs/spec/imgx-clip/requirements.md` | REQ-001~REQ-004の要件確認 |
| アーキテクチャ | `docs/design/imgx-clip/architecture.md` | システム全体設計 |
| データフロー | `docs/design/imgx-clip/dataflow.md` | E2E詳細フロー・シーケンス |
| TASK-0004実装報告 | `docs/implements/imgx-clip/TASK-0004/` | ImageCanvas実装参考 |
| TASK-0005実装報告 | `docs/implements/imgx-clip/TASK-0005/` | PreviewPanel実装参考 |
| TASK-0006実装報告 | `docs/implements/imgx-clip/TASK-0006/` | Toolbar・App実装参考 |
| package.json | `package.json` | フロントエンド依存関係 |
| tsconfig.json | `tsconfig.json` | TypeScript設定 |

### 実装ファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| `src/App.tsx` | 全体状態管理・IPC連携 | ⚠️ 部分実装 |
| `src/components/Toolbar.tsx` | ツールバー・ダイアログ | ✅ 完成済み |
| `src/components/ImageCanvas.tsx` | Canvas描画・ドラッグ | ✅ 完成済み |
| `src/components/PreviewPanel.tsx` | プレビュー表示 | ✅ 完成済み |
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理 | ✅ 完成済み |
| `src-tauri/src/commands.rs` | Rust IPCコマンド | ✅ 完成済み |
| `src-tauri/src/image_processor.rs` | Rust画像処理 | ✅ 完成済み |
| `package.json` | フロントエンド依存 | ✅ 完成済み |

### 実装の主要フォーカス領域

1. **App.tsx の IPC連携完成**
   - `handleLoadImage()` のロジック完成
   - `handleClipAndSave()` のロジック完成
   - エラーハンドリング UI 実装

2. **Toolbar.tsx の ダイアログ完成**
   - `handleOpenImage()` でダイアログ表示→パス取得
   - `handleSaveImage()` でダイアログ表示→保存パス取得
   - IPC呼び出しトリガー（既に App.tsx に委譲）

3. **E2E 統合テスト**
   - 画像読み込み→ドラッグ→プレビュー→保存 の一連フロー
   - エラーケースの UI 表示確認
   - 手動テストで各シナリオを検証

### TDD開発フロー

1. **要件定義フェーズ** (`/tsumiki:tdd-requirements`)
   - TASK-0007の詳細要件を展開
   - E2E フロー・テストケースを定義

2. **テストケース設計** (`/tsumiki:tdd-testcases`)
   - フロントエンド統合テスト設計
   - E2E手動テスト チェックリスト作成

3. **RED フェーズ** (`/tsumiki:tdd-red`)
   - テストを実装（失敗することを確認）
   - `npm test` で失敗確認

4. **GREEN フェーズ** (`/tsumiki:tdd-green`)
   - App.tsx, Toolbar.tsx の IPC呼び出し実装
   - テストが通るように最小実装
   - `npm test` で成功確認

5. **REFACTOR フェーズ** (`/tsumiki:tdd-refactor`)
   - コード品質向上
   - エラーハンドリング改善
   - UI/UX ブラッシュアップ
   - `npm run lint`, `npm run format` 実行

6. **検証フェーズ** (`/tsumiki:tdd-verify-complete`)
   - 完了条件チェックリスト確認
   - E2E手動テスト実行
   - `npm run tauri dev` で動作確認
   - ドキュメント更新

### 次ステップ

- `/tsumiki:tdd-requirements imgx-clip TASK-0007` - 詳細要件定義
- `/tsumiki:tdd-testcases imgx-clip TASK-0007` - テストケース生成
- `/tsumiki:tdd-red imgx-clip TASK-0007` - テスト実装（RED）
- `/tsumiki:tdd-green imgx-clip TASK-0007` - 最小実装（GREEN）

---

**ノート完成日**: 2026-03-13

