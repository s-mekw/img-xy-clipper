# TASK-0006 要件定義書: Toolbar・App統合・状態管理

**タスクID**: TASK-0006
**機能名**: imgx-clip
**要件名**: imgx-clip
**作成日**: 2026-03-13

---

## 1. 機能の概要

### 1.1 何をする機能か 🔵

**信頼性**: 🔵 *要件定義書REQ-001, REQ-003・dataflow.mdの機能1,3・architecture.mdのコンポーネント構成より*

Toolbarコンポーネントとapp全体の状態管理（useReducer）を実装する。具体的には:

- **Toolbarコンポーネント**: 「ファイルを開く」「保存」ボタンを提供し、Tauriファイルダイアログ経由でIPCコマンド（`load_image`, `clip_and_save`）を呼び出す
- **App状態管理**: useReducerによる集中状態管理で、画像情報・クリップ範囲・UI状態を一元管理し、子コンポーネント（Toolbar, ImageCanvas, PreviewPanel）にpropsで配信する
- **レイアウト統合**: Toolbar上部、ImageCanvas左側、PreviewPanel右側のレイアウトでApp内に各コンポーネントを配置する

### 1.2 どのような問題を解決するか 🔵

**信頼性**: 🔵 *要件定義書ストーリー1「画像を読み込み、Y軸方向の不要な範囲をドラッグで選択して切り取りたい」より*

- ユーザーがファイルダイアログから画像を選択し、アプリに読み込む導線を提供する
- クリップ後の画像をファイルダイアログから保存先を指定して保存する導線を提供する
- 複数のUI状態（idle, loading, ready, saving, error）を一元管理し、状態に応じたUI制御を実現する

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *要件定義書ストーリー1のAs aより*

- 画像のY軸方向をクリップしたいユーザー

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.mdのシステム構成図・コンポーネント構成表より*

- **App**: アプリ全体のルートコンポーネント。useReducerで状態管理し、Toolbar・ImageCanvas・PreviewPanelにpropsを配信
- **Toolbar**: ファイル読み込み・保存操作のUIを提供するコンポーネント。Tauriダイアログ・IPCコマンドとの橋渡し役
- **依存関係**: TASK-0004（ImageCanvas）、TASK-0005（PreviewPanel）で実装済みのコンポーネントを統合

**参照したEARS要件**: REQ-001, REQ-003, REQ-401
**参照した設計文書**: architecture.md「コンポーネント構成」「システム構成図」、dataflow.md「機能1: 画像読み込み」「機能3: クリップと保存」

---

## 2. 入力・出力の仕様

### 2.1 Toolbar コンポーネント Props 🟡

**信頼性**: 🟡 *note.mdのコーディング規約・architecture.mdのコンポーネント構成から妥当な推測*

```typescript
interface IToolbarProps {
  /** ファイル読み込み中フラグ（trueの場合「ファイルを開く」ボタンを無効化） */
  isLoading: boolean;
  /** 保存中フラグ（trueの場合「保存」ボタンを無効化） */
  isSaving: boolean;
  /** 画像読み込み済みフラグ（falseの場合「保存」ボタンを無効化） */
  isImageLoaded: boolean;
  /** ファイルを開くボタンクリック時のコールバック */
  onLoadImage: () => void;
  /** 保存ボタンクリック時のコールバック */
  onSaveImage: () => void;
}
```

**ボタン有効/無効制御ルール**:

| ボタン | 有効条件 | 無効条件 |
|--------|----------|----------|
| ファイルを開く | `!isLoading` | `isLoading === true` |
| 保存 | `isImageLoaded && !isSaving` | `!isImageLoaded \|\| isSaving` |

### 2.2 AppState インターフェース 🟡

**信頼性**: 🟡 *dataflow.mdの状態管理フロー・note.mdの状態定義から妥当な推測*

```typescript
interface AppState {
  // 画像情報
  imagePath: string | null;       // 読み込んだ画像のファイルパス
  imageData: string | null;       // Base64エンコード済み画像データ
  imageWidth: number;             // 画像の幅（px）
  imageHeight: number;            // 画像の高さ（px）
  imageFormat: string;            // 画像形式（"png", "jpeg" など）

  // クリップ範囲
  clipTopY: number;               // クリップ上端のY座標
  clipBottomY: number;            // クリップ下端のY座標

  // UI状態
  status: 'idle' | 'loading' | 'ready' | 'dragging' | 'saving' | 'error';
  errorMessage: string | null;    // エラーメッセージ（エラー状態時のみ）
}
```

**初期状態**:

```typescript
const initialState: AppState = {
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
```

### 2.3 AppAction 型定義 🟡

**信頼性**: 🟡 *dataflow.mdの状態遷移図・note.mdのアクション定義から妥当な推測*

```typescript
type AppAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: {
      imagePath: string;
      imageData: string;
      imageWidth: number;
      imageHeight: number;
      imageFormat: string;
    }}
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; payload: string }
  | { type: 'UPDATE_CLIP_REGION'; payload: { topY: number; bottomY: number } }
  | { type: 'START_DRAGGING' }
  | { type: 'END_DRAGGING' }
  | { type: 'RESET_ERROR' };
```

### 2.4 IPC コマンド入出力（Rust側は実装済み） 🔵

**信頼性**: 🔵 *src-tauri/src/commands.rsの実装コードより確認済み*

#### `load_image` コマンド

- **入力**: `{ path: string }` - 画像ファイルの絶対パス
- **出力**: `ImageMetadata` - `{ base64: string, width: number, height: number, format: string }`
- **エラー**: ファイル読み込み失敗時にエラー文字列を返却

#### `clip_and_save` コマンド

- **入力**: `{ srcPath: string, topY: number, bottomY: number, destPath: string }`
- **出力**: `void`（成功時）
- **エラー**: クリップ/保存失敗時にエラー文字列を返却

**注意**: Rust側の`ImageMetadata`のフィールド名は`base64`であり、note.mdの`imageData`とは異なる。フロントエンド側でマッピングが必要。

**参照したEARS要件**: REQ-001, REQ-003
**参照した設計文書**: dataflow.md「状態管理フロー」、note.md「状態定義」「IPC連携パターン」、`src-tauri/src/commands.rs`

---

## 3. 制約条件

### 3.1 アーキテクチャ制約 🔵

**信頼性**: 🔵 *architecture.md「アーキテクチャパターン」・要件定義REQ-401より*

- React 19 + TypeScript で実装すること
- コンポーネントは関数コンポーネント形式（`React.FC<Props>`）で実装すること
- 状態管理は `useReducer` を使用すること（複数の状態項目の一元管理のため）
- IPC通信は `@tauri-apps/api/core` の `invoke` を使用すること
- ファイルダイアログは `@tauri-apps/plugin-dialog` の `open`/`save` を使用すること

### 3.2 コーディング規約 🔵

**信頼性**: 🔵 *note.md「コーディング規約」・既存実装（ImageCanvas, PreviewPanel）のパターンより*

- インターフェース名: `I<ComponentName>Props` 形式（例: `IToolbarProps`）
- イベントハンドラ: `handle<EventName>` 形式（例: `handleLoadImage`）
- CSSクラス: ケバブケース（kebab-case）
- Reducer関数: `appReducer(state, action)` 形式

### 3.3 既存コンポーネントとの統合制約 🔵

**信頼性**: 🔵 *TASK-0004, TASK-0005の実装コードより確認済み*

ImageCanvas と PreviewPanel は以下のpropsインターフェースで実装済みであり、App側はこのインターフェースに合わせてpropsを渡す必要がある:

- **ImageCanvas**: `imageData`, `imageWidth`, `imageHeight`, `topY`, `bottomY`, `onClipRegionChange`
- **PreviewPanel**: `imageData`, `imageWidth`, `imageHeight`, `topY`, `bottomY`

### 3.4 パフォーマンス要件 🟡

**信頼性**: 🟡 *architecture.md「パフォーマンス」・要件定義NFR「ドラッグ操作中の60fps維持」から妥当な推測*

- 状態更新時に不要な再描画を避ける（React.memo, useCallback の活用を検討）
- IPC通信（load_image, clip_and_save）は非同期処理で実行し、UIをブロックしない

### 3.5 セキュリティ制約 🟡

**信頼性**: 🟡 *architecture.md「セキュリティ」から妥当な推測*

- Tauri v2 の Capability 設定で必要最小限のファイルアクセスのみ許可
- IPC コマンドは TypeScript 型定義で引数チェック

**参照したEARS要件**: REQ-401, REQ-402
**参照した設計文書**: architecture.md「非機能要件の実現方法」「技術的制約」、note.md「注意事項」

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン: 画像読み込み 🔵

**信頼性**: 🔵 *dataflow.md「機能1: 画像読み込み」のシーケンス図より*

1. ユーザーが「ファイルを開く」ボタンをクリック
2. Tauriファイルダイアログが開く（拡張子フィルタ: png, jpg, jpeg）
3. ユーザーが画像ファイルを選択
4. `LOAD_START` アクションで status を 'loading' に遷移
5. `invoke('load_image', { path })` でRust側に画像読み込みを依頼
6. 成功時: `LOAD_SUCCESS` アクションで画像データ・メタデータを state に保存、status を 'ready' に遷移、clipTopY=0, clipBottomY=imageHeight に初期化
7. ImageCanvas と PreviewPanel に props が配信され、画像が表示される

### 4.2 基本的な使用パターン: クリップ・保存 🔵

**信頼性**: 🔵 *dataflow.md「機能3: クリップと保存」のシーケンス図より*

1. ユーザーが画像上でドラッグしてクリップ範囲を指定（TASK-0004で実装済み）
2. ユーザーが「保存」ボタンをクリック
3. Tauri保存ダイアログが開く（デフォルトファイル名付き、拡張子フィルタ: png, jpg）
4. ユーザーが保存先を選択
5. `SAVE_START` アクションで status を 'saving' に遷移
6. `invoke('clip_and_save', { srcPath, topY, bottomY, destPath })` でRust側にクリップ・保存を依頼
7. 成功時: `SAVE_SUCCESS` アクションで status を 'ready' に遷移

### 4.3 エッジケース: ファイルダイアログキャンセル 🟡

**信頼性**: 🟡 *dataflow.mdのフローから妥当な推測*

- ファイルダイアログでキャンセルした場合、何もせず現在の状態を維持する
- `open()` / `save()` が `null` を返した場合に対応

### 4.4 エラーケース: 画像読み込み失敗 🔵

**信頼性**: 🔵 *dataflow.md「エラーハンドリングフロー」・要件定義REQ-001テストケースより*

- 非対応画像形式の場合: `LOAD_ERROR` アクションで status を 'error' に遷移し、errorMessage にエラー内容を設定
- ファイル読み込み失敗の場合: 同上

### 4.5 エラーケース: 保存失敗 🔵

**信頼性**: 🔵 *dataflow.md「エラーハンドリングフロー」・要件定義REQ-003テストケースより*

- 保存先に書き込み権限がない場合: `SAVE_ERROR` アクションで status を 'error' に遷移し、errorMessage にエラー内容を設定

### 4.6 状態遷移図 🟡

**信頼性**: 🟡 *dataflow.md「フロントエンド状態管理」の状態遷移図から妥当な推測*

```
[idle] --LOAD_START--> [loading] --LOAD_SUCCESS--> [ready]
                                  --LOAD_ERROR--> [error]

[ready] --UPDATE_CLIP_REGION--> [ready]
[ready] --START_DRAGGING--> [dragging] --END_DRAGGING--> [ready]
[ready] --SAVE_START--> [saving] --SAVE_SUCCESS--> [ready]
                                 --SAVE_ERROR--> [error]
[ready] --LOAD_START--> [loading]  （別画像の読み込み）

[error] --RESET_ERROR--> 直前のstatus  or  [idle]
[error] --LOAD_START--> [loading]  （再読み込み）
```

**参照したEARS要件**: REQ-001, REQ-003
**参照した設計文書**: dataflow.md「機能1」「機能3」「エラーハンドリングフロー」「状態管理フロー」

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー1**: 画像の読み込みとクリップ（REQ-001, REQ-002, REQ-003）
- **ストーリー2**: リアルタイムプレビューで確認（REQ-004）

### 参照した機能要件

- **REQ-001**: ユーザーは画像ファイルを読み込めなければならない 🔵
- **REQ-003**: システムは指定されたY軸範囲で画像を切り取り、結果を入力と同じ形式で保存しなければならない 🔵

### 参照した非機能要件

- **パフォーマンス**: ドラッグ操作中のプレビュー更新は60fps程度を維持する 🟡
- **ユーザビリティ**: 画像の読み込みからクリップ・保存まで3ステップ以内で完了できる 🟡

### 参照した受け入れ基準

- REQ-001: PNG/JPG画像を読み込み表示できる、非対応形式の場合エラー表示
- REQ-003: 切り取り後の画像が正しいサイズ・形式で保存される、書き込み権限なしでエラー表示

### 参照した設計文書

- **アーキテクチャ**: `docs/design/imgx-clip/architecture.md` - コンポーネント構成、IPCコマンド定義、非機能要件の実現方法
- **データフロー**: `docs/design/imgx-clip/dataflow.md` - 画像読み込みフロー、クリップ・保存フロー、状態管理フロー、エラーハンドリングフロー
- **型定義**: `src/types/clip.ts` - ClipRegion, DraggingLine 型
- **既存実装**: `src/components/ImageCanvas.tsx`, `src/components/PreviewPanel.tsx`, `src/hooks/useClipRegion.ts`
- **Rustコマンド**: `src-tauri/src/commands.rs` - load_image, clip_and_save のシグネチャ

---

## 6. 実装対象ファイル

| ファイル | 内容 | 状態 |
|----------|------|------|
| `src/App.tsx` | App状態管理（useReducer）・レイアウト | 既存（テンプレートから書き換え） |
| `src/components/Toolbar.tsx` | ファイル読み込み・保存ボタンUI | 既存（スタブから実装） |
| `src/styles/index.css` | レイアウトCSS | 既存（追記） |

---

## 7. 信頼性レベルサマリー

| セクション | 🔵 青 | 🟡 黄 | 🔴 赤 |
|-----------|-------|-------|-------|
| 1. 機能の概要 | 4 | 0 | 0 |
| 2. 入力・出力の仕様 | 1 | 3 | 0 |
| 3. 制約条件 | 3 | 2 | 0 |
| 4. 想定される使用例 | 4 | 2 | 0 |
| **合計** | **12** | **7** | **0** |

- 🔵 **青信号**: 12項目 (63%)
- 🟡 **黄信号**: 7項目 (37%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: ✅ 高品質（黄信号はすべてdataflow.md・note.mdから妥当に推測されたもの。赤信号なし）
