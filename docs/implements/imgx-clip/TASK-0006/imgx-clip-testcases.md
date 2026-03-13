# TASK-0006 テストケース定義書: Toolbar・App統合・状態管理

**タスクID**: TASK-0006
**機能名**: imgx-clip
**要件名**: imgx-clip
**作成日**: 2026-03-13

---

## テスト対象

| テスト対象 | ファイル | テストファイル |
|-----------|----------|--------------|
| appReducer（状態管理） | `src/App.tsx` | `src/components/__tests__/App.test.tsx` |
| Toolbarコンポーネント | `src/components/Toolbar.tsx` | `src/components/__tests__/Toolbar.test.tsx` |

---

## 1. 正常系テストケース（基本的な動作）

### TC-001: appReducer - LOAD_START アクションで status が 'loading' に遷移する

- **テスト名**: LOAD_STARTアクションでstatus がloadingに遷移する
  - **何をテストするか**: LOAD_START アクションをディスパッチした際の状態遷移
  - **期待される動作**: status が 'idle' から 'loading' に変わる
- **入力値**: `initialState`（status: 'idle'）に `{ type: 'LOAD_START' }` アクション
  - **入力データの意味**: アプリ起動直後の初期状態からファイル読み込み開始操作
- **期待される結果**: `{ ...initialState, status: 'loading' }`
  - **期待結果の理由**: dataflow.md の状態遷移図で idle → LOAD_START → loading と定義されている
- **テストの目的**: 読み込み開始時の状態遷移の正確性を確認
  - **確認ポイント**: status のみが変更され、他のプロパティは不変であること
- 🔵 要件定義書4.1「LOAD_START アクションで status を 'loading' に遷移」、note.md の Reducer 状態遷移パターンより

### TC-002: appReducer - LOAD_SUCCESS アクションで画像情報が正しく設定される

- **テスト名**: LOAD_SUCCESSアクションで画像情報とstatusが正しく設定される
  - **何をテストするか**: LOAD_SUCCESS アクションで画像メタデータ・Base64データ・クリップ範囲初期値が設定されること
  - **期待される動作**: status が 'ready' に遷移し、画像情報が保存され、clipTopY=0, clipBottomY=imageHeight に初期化される
- **入力値**: `{ status: 'loading', ... }` に `{ type: 'LOAD_SUCCESS', payload: { imagePath: '/test/image.png', imageData: 'base64...', imageWidth: 800, imageHeight: 600, imageFormat: 'png' } }`
  - **入力データの意味**: Rust側 load_image コマンドの成功レスポンスを表現
- **期待される結果**:
  ```
  {
    status: 'ready',
    imagePath: '/test/image.png',
    imageData: 'base64...',
    imageWidth: 800,
    imageHeight: 600,
    imageFormat: 'png',
    clipTopY: 0,
    clipBottomY: 600,
    errorMessage: null
  }
  ```
  - **期待結果の理由**: 要件定義書4.1 ステップ6「clipTopY=0, clipBottomY=imageHeight に初期化」、note.md の Reducer パターンより
- **テストの目的**: 画像読み込み成功時の状態設定の網羅性を確認
  - **確認ポイント**: 画像情報5項目 + クリップ範囲初期化 + status + errorMessage のリセット
- 🔵 要件定義書4.1、note.md のReducer実装パターンより

### TC-003: appReducer - LOAD_ERROR アクションで status が 'error' に遷移しエラーメッセージが設定される

- **テスト名**: LOAD_ERRORアクションでerror状態に遷移しエラーメッセージが設定される
  - **何をテストするか**: LOAD_ERROR アクションで status が 'error' に遷移し errorMessage が設定されること
  - **期待される動作**: status='error', errorMessage にエラー文字列が設定される
- **入力値**: `{ status: 'loading', ... }` に `{ type: 'LOAD_ERROR', payload: '非対応の画像形式です' }`
  - **入力データの意味**: Rust側 load_image コマンドのエラーレスポンスを表現
- **期待される結果**: `{ ...state, status: 'error', errorMessage: '非対応の画像形式です' }`
  - **期待結果の理由**: 要件定義書4.4 エラーケースの定義より
- **テストの目的**: 読み込みエラー時の状態遷移を確認
  - **確認ポイント**: errorMessage に適切なエラー文字列が設定されること
- 🔵 要件定義書4.4、note.md のReducer実装パターンより

### TC-004: appReducer - UPDATE_CLIP_REGION アクションでクリップ範囲が更新される

- **テスト名**: UPDATE_CLIP_REGIONアクションでクリップ範囲が更新される
  - **何をテストするか**: UPDATE_CLIP_REGION アクションで clipTopY, clipBottomY が更新されること
  - **期待される動作**: クリップ範囲のY座標が指定された値に更新される
- **入力値**: `{ status: 'ready', clipTopY: 0, clipBottomY: 600, ... }` に `{ type: 'UPDATE_CLIP_REGION', payload: { topY: 100, bottomY: 500 } }`
  - **入力データの意味**: ユーザーがImageCanvas上でドラッグ操作を行った結果
- **期待される結果**: `{ ...state, clipTopY: 100, clipBottomY: 500 }`
  - **期待結果の理由**: note.md のReducer パターンで UPDATE_CLIP_REGION は clipTopY/clipBottomY のみ更新と定義
- **テストの目的**: ドラッグ操作によるクリップ範囲更新の正確性を確認
  - **確認ポイント**: status は変更されないこと、clipTopY/clipBottomY のみが変更されること
- 🔵 note.md のReducer実装パターン、要件定義書4.6状態遷移図より

### TC-005: appReducer - SAVE_START アクションで status が 'saving' に遷移する

- **テスト名**: SAVE_STARTアクションでstatusがsavingに遷移する
  - **何をテストするか**: SAVE_START アクションで status が 'saving' に遷移すること
  - **期待される動作**: status が 'ready' から 'saving' に変わる
- **入力値**: `{ status: 'ready', ... }` に `{ type: 'SAVE_START' }`
  - **入力データの意味**: 保存ボタン押下後、IPC呼び出し前の状態遷移
- **期待される結果**: `{ ...state, status: 'saving' }`
  - **期待結果の理由**: 要件定義書4.2 ステップ5「SAVE_START アクションで status を 'saving' に遷移」
- **テストの目的**: 保存開始時の状態遷移の正確性を確認
  - **確認ポイント**: status のみが変更されること
- 🔵 要件定義書4.2、note.md のReducer実装パターンより

### TC-006: appReducer - SAVE_SUCCESS アクションで status が 'ready' に戻る

- **テスト名**: SAVE_SUCCESSアクションでstatusがreadyに戻る
  - **何をテストするか**: SAVE_SUCCESS アクションで status が 'ready' に戻ること
  - **期待される動作**: status が 'saving' から 'ready' に変わる
- **入力値**: `{ status: 'saving', ... }` に `{ type: 'SAVE_SUCCESS' }`
  - **入力データの意味**: Rust側 clip_and_save コマンドの成功レスポンス
- **期待される結果**: `{ ...state, status: 'ready' }`
  - **期待結果の理由**: 要件定義書4.2 ステップ7「SAVE_SUCCESS アクションで status を 'ready' に遷移」
- **テストの目的**: 保存成功時の状態遷移の正確性を確認
  - **確認ポイント**: 画像情報・クリップ範囲は保持されたまま status のみ変更されること
- 🔵 要件定義書4.2、note.md のReducer実装パターンより

### TC-007: appReducer - SAVE_ERROR アクションで status が 'error' に遷移する

- **テスト名**: SAVE_ERRORアクションでerror状態に遷移する
  - **何をテストするか**: SAVE_ERROR アクションで status が 'error' に遷移し errorMessage が設定されること
  - **期待される動作**: status='error', errorMessage にエラー文字列が設定される
- **入力値**: `{ status: 'saving', ... }` に `{ type: 'SAVE_ERROR', payload: '書き込み権限がありません' }`
  - **入力データの意味**: Rust側 clip_and_save コマンドのエラーレスポンス
- **期待される結果**: `{ ...state, status: 'error', errorMessage: '書き込み権限がありません' }`
  - **期待結果の理由**: 要件定義書4.5 エラーケースの定義より
- **テストの目的**: 保存エラー時の状態遷移を確認
  - **確認ポイント**: errorMessage に適切なエラー文字列が設定されること
- 🔵 要件定義書4.5、note.md のReducer実装パターンより

### TC-008: appReducer - START_DRAGGING アクションで status が 'dragging' に遷移する

- **テスト名**: START_DRAGGINGアクションでstatusがdraggingに遷移する
  - **何をテストするか**: START_DRAGGING アクションで status が 'dragging' に遷移すること
  - **期待される動作**: status が 'ready' から 'dragging' に変わる
- **入力値**: `{ status: 'ready', ... }` に `{ type: 'START_DRAGGING' }`
  - **入力データの意味**: ユーザーが水平線のドラッグを開始した操作
- **期待される結果**: `{ ...state, status: 'dragging' }`
  - **期待結果の理由**: 要件定義書4.6 状態遷移図 ready → START_DRAGGING → dragging
- **テストの目的**: ドラッグ開始時の状態遷移を確認
  - **確認ポイント**: status のみが変更されること
- 🟡 要件定義書4.6の状態遷移図から妥当な推測

### TC-009: appReducer - END_DRAGGING アクションで status が 'ready' に戻る

- **テスト名**: END_DRAGGINGアクションでstatusがreadyに戻る
  - **何をテストするか**: END_DRAGGING アクションで status が 'ready' に戻ること
  - **期待される動作**: status が 'dragging' から 'ready' に変わる
- **入力値**: `{ status: 'dragging', ... }` に `{ type: 'END_DRAGGING' }`
  - **入力データの意味**: ユーザーがドラッグを終了した（マウスアップ）操作
- **期待される結果**: `{ ...state, status: 'ready' }`
  - **期待結果の理由**: 要件定義書4.6 状態遷移図 dragging → END_DRAGGING → ready
- **テストの目的**: ドラッグ終了時の状態遷移を確認
  - **確認ポイント**: クリップ範囲はドラッグ中に更新済みのため変更なし
- 🟡 要件定義書4.6の状態遷移図から妥当な推測

### TC-010: appReducer - RESET_ERROR アクションで errorMessage が null にリセットされる

- **テスト名**: RESET_ERRORアクションでerrorMessageがnullにリセットされる
  - **何をテストするか**: RESET_ERROR アクションで errorMessage が null になること
  - **期待される動作**: errorMessage がクリアされる
- **入力値**: `{ status: 'error', errorMessage: 'エラー内容', ... }` に `{ type: 'RESET_ERROR' }`
  - **入力データの意味**: ユーザーがエラーメッセージを確認後、エラー状態を解除する操作
- **期待される結果**: `{ ...state, errorMessage: null }`
  - **期待結果の理由**: note.md のReducer実装パターンで RESET_ERROR は errorMessage を null に設定
- **テストの目的**: エラー状態のリセット動作を確認
  - **確認ポイント**: errorMessage が null になること
- 🟡 note.md のReducer実装パターンから妥当な推測（RESET_ERROR 後の status 遷移先の詳細は要件定義書4.6で「直前のstatus or idle」と曖昧）

### TC-011: Toolbar - 「ファイルを開く」ボタンが表示される

- **テスト名**: Toolbarに「ファイルを開く」ボタンが表示される
  - **何をテストするか**: Toolbar コンポーネントに「ファイルを開く」ボタンが存在すること
  - **期待される動作**: ボタンがDOM上にレンダリングされる
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: false, onLoadImage: vi.fn(), onSaveImage: vi.fn() }`
  - **入力データの意味**: 初期状態のToolbar props
- **期待される結果**: 「ファイルを開く」テキストのボタンが存在する
  - **期待結果の理由**: タスク完了条件「Toolbarに『ファイルを開く』『保存』ボタンがある」
- **テストの目的**: Toolbar の基本UI構造を確認
  - **確認ポイント**: ボタンのテキストが正しいこと
- 🔵 TASK-0006 完了条件より

### TC-012: Toolbar - 「保存」ボタンが表示される

- **テスト名**: Toolbarに「保存」ボタンが表示される
  - **何をテストするか**: Toolbar コンポーネントに「保存」ボタンが存在すること
  - **期待される動作**: ボタンがDOM上にレンダリングされる
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: true, onLoadImage: vi.fn(), onSaveImage: vi.fn() }`
  - **入力データの意味**: 画像読み込み済みのToolbar props
- **期待される結果**: 「保存」テキストのボタンが存在する
  - **期待結果の理由**: タスク完了条件「Toolbarに『ファイルを開く』『保存』ボタンがある」
- **テストの目的**: Toolbar の基本UI構造を確認
  - **確認ポイント**: ボタンのテキストが正しいこと
- 🔵 TASK-0006 完了条件より

### TC-013: Toolbar - 「ファイルを開く」ボタンクリックで onLoadImage が呼ばれる

- **テスト名**: 「ファイルを開く」ボタンクリックでonLoadImageが呼ばれる
  - **何をテストするか**: ボタンクリック時に親から渡された onLoadImage コールバックが呼ばれること
  - **期待される動作**: onLoadImage が1回呼ばれる
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: false, onLoadImage: vi.fn(), onSaveImage: vi.fn() }`
  - **入力データの意味**: 読み込み可能な初期状態
- **期待される結果**: `onLoadImage` が1回呼び出される
  - **期待結果の理由**: 要件定義書2.1 IToolbarProps の onLoadImage コールバック定義
- **テストの目的**: ボタンクリックとコールバックの連携を確認
  - **確認ポイント**: onLoadImage が正確に1回呼ばれること
- 🔵 要件定義書2.1 Toolbar Props 定義より

### TC-014: Toolbar - 「保存」ボタンクリックで onSaveImage が呼ばれる

- **テスト名**: 「保存」ボタンクリックでonSaveImageが呼ばれる
  - **何をテストするか**: 画像読み込み済み状態で保存ボタンクリック時に onSaveImage が呼ばれること
  - **期待される動作**: onSaveImage が1回呼ばれる
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: true, onLoadImage: vi.fn(), onSaveImage: vi.fn() }`
  - **入力データの意味**: 画像読み込み済みで保存可能な状態
- **期待される結果**: `onSaveImage` が1回呼び出される
  - **期待結果の理由**: 要件定義書2.1 IToolbarProps の onSaveImage コールバック定義
- **テストの目的**: 保存ボタンクリックとコールバックの連携を確認
  - **確認ポイント**: onSaveImage が正確に1回呼ばれること
- 🔵 要件定義書2.1 Toolbar Props 定義より

### TC-015: appReducer - 別画像読み込み時にクリップ範囲がリセットされる

- **テスト名**: 別画像をLOAD_SUCCESSで読み込むとクリップ範囲が新画像のサイズにリセットされる
  - **何をテストするか**: 画像が既に読み込まれた状態から別画像をLOAD_SUCCESSした場合、clipTopY=0, clipBottomY=新imageHeight にリセットされること
  - **期待される動作**: 前の画像のクリップ範囲が破棄され、新画像の全高さが設定される
- **入力値**: `{ status: 'ready', imageHeight: 600, clipTopY: 100, clipBottomY: 500, ... }` に `{ type: 'LOAD_SUCCESS', payload: { ..., imageHeight: 400 } }`
  - **入力データの意味**: 別画像を読み込んだ場合の状態遷移
- **期待される結果**: `{ clipTopY: 0, clipBottomY: 400, imageHeight: 400, ... }`
  - **期待結果の理由**: 要件定義書4.1 ステップ6 および note.md Reducer パターンで「clipBottomY: action.payload.imageHeight」
- **テストの目的**: 別画像読み込み時のクリップ範囲リセットの正確性を確認
  - **確認ポイント**: 前の画像のクリップ範囲情報が残らないこと
- 🔵 要件定義書4.1、note.md Reducerパターンより

---

## 2. 異常系テストケース（エラーハンドリング）

### TC-016: Toolbar - isLoading=true の場合「ファイルを開く」ボタンが無効化される

- **テスト名**: isLoading時に「ファイルを開く」ボタンが無効化される
  - **エラーケースの概要**: ファイル読み込み中に再度読み込み操作を防止する
  - **エラー処理の重要性**: 二重読み込みによる状態不整合を防止
- **入力値**: `{ isLoading: true, isSaving: false, isImageLoaded: false, ... }`
  - **不正な理由**: 読み込み中に再読み込みは不正操作
  - **実際の発生シナリオ**: 大きな画像ファイルの読み込み中にユーザーが再度ボタンを押す
- **期待される結果**: ボタンの `disabled` 属性が `true`
  - **エラーメッセージの内容**: N/A（ボタンが無効化されるだけ）
  - **システムの安全性**: 二重読み込みを物理的にブロック
- **テストの目的**: ボタン無効化による操作制御を確認
  - **品質保証の観点**: UIの状態制御が仕様通り動作すること
- 🔵 要件定義書2.1 ボタン有効/無効制御ルール表より

### TC-017: Toolbar - isImageLoaded=false の場合「保存」ボタンが無効化される

- **テスト名**: 画像未読込時に「保存」ボタンが無効化される
  - **エラーケースの概要**: 画像が読み込まれていない状態で保存操作を防止する
  - **エラー処理の重要性**: 保存対象がない状態でのIPC呼び出しを防止
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: false, ... }`
  - **不正な理由**: 保存対象の画像がない
  - **実際の発生シナリオ**: アプリ起動直後にユーザーが保存ボタンを押す
- **期待される結果**: 「保存」ボタンの `disabled` 属性が `true`
  - **エラーメッセージの内容**: N/A（ボタンが無効化されるだけ）
  - **システムの安全性**: 無効なIPC呼び出しをブロック
- **テストの目的**: 画像未読込時の保存ボタン無効化を確認
  - **品質保証の観点**: 不正操作の防止
- 🔵 要件定義書2.1 ボタン有効/無効制御ルール表より

### TC-018: Toolbar - isSaving=true の場合「保存」ボタンが無効化される

- **テスト名**: 保存中に「保存」ボタンが無効化される
  - **エラーケースの概要**: 保存処理中に再度保存操作を防止する
  - **エラー処理の重要性**: 二重保存による競合を防止
- **入力値**: `{ isLoading: false, isSaving: true, isImageLoaded: true, ... }`
  - **不正な理由**: 保存中に再保存は不正操作
  - **実際の発生シナリオ**: 大きな画像ファイルの保存中にユーザーが再度保存ボタンを押す
- **期待される結果**: 「保存」ボタンの `disabled` 属性が `true`
  - **エラーメッセージの内容**: N/A（ボタンが無効化されるだけ）
  - **システムの安全性**: 二重保存を物理的にブロック
- **テストの目的**: 保存中のボタン無効化を確認
  - **品質保証の観点**: 並行操作の防止
- 🔵 要件定義書2.1 ボタン有効/無効制御ルール表より

### TC-019: Toolbar - isLoading=true の場合「ファイルを開く」ボタンをクリックしても onLoadImage が呼ばれない

- **テスト名**: isLoading時にボタンクリックしてもonLoadImageが呼ばれない
  - **エラーケースの概要**: 無効化されたボタンのクリックイベントが無視されること
  - **エラー処理の重要性**: disabled 属性によりイベントが発火しないことを確認
- **入力値**: `{ isLoading: true, ... }` でボタンをクリック
  - **不正な理由**: disabled ボタンのクリック
  - **実際の発生シナリオ**: プログラム的にクリックイベントが発火された場合
- **期待される結果**: `onLoadImage` が呼ばれない（0回）
  - **エラーメッセージの内容**: N/A
  - **システムの安全性**: disabled 属性により操作がブロックされる
- **テストの目的**: disabled ボタンのイベント抑制を確認
  - **品質保証の観点**: UIの防御的プログラミング
- 🟡 要件定義書2.1から妥当な推測（disabled時のクリック動作の明示的記載はないが、HTMLの標準動作）

### TC-020: Toolbar - isImageLoaded=false かつ保存ボタンクリック時に onSaveImage が呼ばれない

- **テスト名**: 画像未読込時に保存ボタンをクリックしてもonSaveImageが呼ばれない
  - **エラーケースの概要**: 画像未読込の無効化された保存ボタンのクリックが無視されること
  - **エラー処理の重要性**: 不正なIPC呼び出しの防止
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: false, ... }` で保存ボタンをクリック
  - **不正な理由**: 保存対象がない状態
  - **実際の発生シナリオ**: UIの不具合でボタンが有効化された場合の防御
- **期待される結果**: `onSaveImage` が呼ばれない（0回）
  - **エラーメッセージの内容**: N/A
  - **システムの安全性**: 不正なIPC呼び出しを防止
- **テストの目的**: 画像未読込時の保存操作抑制を確認
  - **品質保証の観点**: 不正操作の二重防御
- 🟡 要件定義書2.1から妥当な推測

### TC-021: appReducer - 未定義のアクションタイプで現在の状態が維持される

- **テスト名**: 未定義のアクションタイプで状態が変更されない
  - **エラーケースの概要**: Reducer が未知のアクションを受け取った場合の安全性
  - **エラー処理の重要性**: 予期しないアクションによる状態破壊を防止
- **入力値**: `initialState` に `{ type: 'UNKNOWN_ACTION' }` （as any でキャスト）
  - **不正な理由**: 定義されていないアクションタイプ
  - **実際の発生シナリオ**: プログラムのバグや将来の拡張で未定義アクションがディスパッチされた場合
- **期待される結果**: 入力と同じ `initialState` がそのまま返される
  - **エラーメッセージの内容**: N/A（サイレントに無視）
  - **システムの安全性**: 状態が破壊されない
- **テストの目的**: Reducer の default ケースの堅牢性を確認
  - **品質保証の観点**: 防御的プログラミング
- 🔵 note.md のReducer実装パターン（default: return state）より

---

## 3. 境界値テストケース（最小値、最大値、null等）

### TC-022: appReducer - initialState の正確性（画像未読込の初期状態）

- **テスト名**: 初期状態が正しく定義されている
  - **境界値の意味**: アプリ起動直後の「何も読み込まれていない」状態が正確であること
  - **境界値での動作保証**: 初期状態が不正だと全ての状態遷移が壊れる
- **入力値**: N/A（initialState 定数そのもの）
  - **境界値選択の根拠**: 状態管理の出発点
  - **実際の使用場面**: アプリ起動直後
- **期待される結果**:
  ```
  {
    imagePath: null,
    imageData: null,
    imageWidth: 0,
    imageHeight: 0,
    imageFormat: '',
    clipTopY: 0,
    clipBottomY: 0,
    status: 'idle',
    errorMessage: null
  }
  ```
  - **境界での正確性**: 全プロパティがnull/0/空文字/idleであること
  - **一貫した動作**: この初期状態からの各アクション遷移が正しく動作すること
- **テストの目的**: 初期状態の定義の正確性を確認
  - **堅牢性の確認**: 初期状態が全ての状態遷移の基盤であること
- 🔵 要件定義書2.2 initialState 定義より

### TC-023: appReducer - LOAD_SUCCESS で errorMessage が null にリセットされる（エラー状態からの復帰）

- **テスト名**: エラー状態からLOAD_SUCCESSで正常に復帰する
  - **境界値の意味**: エラー状態から正常状態への遷移が確実に行われること
  - **境界値での動作保証**: エラー状態のまま放置されないこと
- **入力値**: `{ status: 'error', errorMessage: '前回のエラー', ... }` → `LOAD_START` → `LOAD_SUCCESS`
  - **境界値選択の根拠**: 要件定義書4.6 状態遷移図 error → LOAD_START → loading
  - **実際の使用場面**: 画像読み込み失敗後にユーザーが別画像で再試行
- **期待される結果**: `{ status: 'ready', errorMessage: null, ... }`
  - **境界での正確性**: errorMessage が確実にクリアされること
  - **一貫した動作**: エラー状態からの復帰が正常状態と同等であること
- **テストの目的**: エラー状態からの復帰経路を確認
  - **堅牢性の確認**: エラー状態が永続化しないこと
- 🔵 要件定義書4.6 状態遷移図、note.md Reducer パターンより

### TC-024: Toolbar - isLoading=false かつ isImageLoaded=true の場合、両ボタンが有効である

- **テスト名**: 通常状態で両ボタンが有効である
  - **境界値の意味**: 全てのフラグが「正常」な場合のボタン状態
  - **境界値での動作保証**: 両ボタンがユーザー操作可能であること
- **入力値**: `{ isLoading: false, isSaving: false, isImageLoaded: true, ... }`
  - **境界値選択の根拠**: 全フラグが有効条件を満たす状態
  - **実際の使用場面**: 画像読み込み完了後の通常操作時
- **期待される結果**: 「ファイルを開く」ボタンと「保存」ボタンの両方が `disabled=false`
  - **境界での正確性**: 有効条件が正しく評価されること
  - **一貫した動作**: isImageLoaded が true の場合に保存ボタンが常に有効であること
- **テストの目的**: 通常状態でのボタン制御を確認
  - **堅牢性の確認**: 有効/無効の条件ロジックが正確であること
- 🔵 要件定義書2.1 ボタン有効/無効制御ルール表より

### TC-025: appReducer - LOAD_SUCCESS 後に clipTopY=0, clipBottomY=imageHeight であること

- **テスト名**: LOAD_SUCCESS後のクリップ範囲初期値が画像全体を選択している
  - **境界値の意味**: クリップ範囲の初期値が画像の先頭（0）から末尾（imageHeight）までであること
  - **境界値での動作保証**: 画像全体がデフォルトで選択されていること
- **入力値**: LOAD_SUCCESS payload の imageHeight が 1000 の場合
  - **境界値選択の根拠**: クリップ範囲の初期値は画像全体（topY=0, bottomY=imageHeight）
  - **実際の使用場面**: 画像読み込み直後のデフォルトクリップ範囲
- **期待される結果**: `{ clipTopY: 0, clipBottomY: 1000 }`
  - **境界での正確性**: clipBottomY が imageHeight と一致すること
  - **一貫した動作**: 任意の imageHeight に対して初期化が正しいこと
- **テストの目的**: クリップ範囲の初期値設定の正確性を確認
  - **堅牢性の確認**: 画像サイズに依存した初期値が正しく計算されること
- 🔵 要件定義書4.1 ステップ6、note.md Reducer パターンより

### TC-026: appReducer - loading 状態から LOAD_START を受けた場合でも status は 'loading' のまま

- **テスト名**: loading状態でLOAD_STARTを受けてもstatusはloadingのまま
  - **境界値の意味**: 同じ状態への重複遷移が安全であること
  - **境界値での動作保証**: 二重操作時の状態破壊を防止
- **入力値**: `{ status: 'loading', ... }` に `{ type: 'LOAD_START' }`
  - **境界値選択の根拠**: 状態の冪等性を確認
  - **実際の使用場面**: 何らかの理由で LOAD_START が二重にディスパッチされた場合
- **期待される結果**: `{ ...state, status: 'loading' }`
  - **境界での正確性**: 状態が破壊されないこと
  - **一貫した動作**: Reducer は純粋関数であり、同じ入力に対して同じ出力
- **テストの目的**: 重複アクションに対する堅牢性を確認
  - **堅牢性の確認**: Reducer の冪等性
- 🟡 note.md Reducer パターンから妥当な推測（明示的な記載はないが Reducer の一般的性質）

---

## 4. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: プロジェクト技術スタック（React 19 + TypeScript + Vite）に準拠
  - **テストに適した機能**: 静的型チェックにより型安全なテストが書ける。インターフェースによるprops検証が可能
- **テストフレームワーク**: Vitest 4.1.0 + @testing-library/react
  - **フレームワーク選択の理由**: プロジェクトで既に採用済み（package.json, vite.config.ts で設定済み）。既存テスト（TASK-0004, TASK-0005）との一貫性
  - **テスト実行環境**: jsdom（ブラウザ環境シミュレーション）、setup.ts でCanvas API・Tauri API モック済み
- 🔵 note.md テスト関連情報、既存テストパターンより

---

## 5. テストケース実装時の日本語コメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: appReducer の LOAD_START アクションで status が 'loading' に遷移することを確認
// 【テスト内容】: initialState に LOAD_START をディスパッチした結果の状態を検証
// 【期待される動作】: status が 'idle' から 'loading' に変わり、他のプロパティは不変
// 🔵 要件定義書4.1、note.md Reducer パターンより
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: アプリ初期状態（idle）を Reducer の入力として使用
// 【初期条件設定】: status='idle', imageData=null の未読込状態
// 【前提条件確認】: initialState が正しく定義されていること
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: appReducer に LOAD_START アクションをディスパッチ
// 【処理内容】: 読み込み開始の状態遷移を Reducer 関数に実行させる
// 【実行タイミング】: ユーザーが「ファイルを開く」ボタンを押した直後
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: 返された状態の status フィールドが 'loading' であること
// 【期待値確認】: 状態遷移図 idle → LOAD_START → loading に従った結果
// 【品質保証】: 正しい UI 制御（ボタン無効化等）の前提となる状態遷移の正確性
```

### 各expectステートメントのコメント

```typescript
// 【検証項目】: status フィールドの値
// 🔵 要件定義書4.1の状態遷移定義より
expect(result.status).toBe('loading'); // 【確認内容】: status が 'loading' に遷移していること

// 【検証項目】: imageData が変更されていないこと
// 🔵 LOAD_START は status のみ変更する
expect(result.imageData).toBeNull(); // 【確認内容】: 画像データは未設定のまま
```

### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: モックのリセット
  // 【環境初期化】: 前のテストのモック呼び出し記録をクリアする
  vi.clearAllMocks();
});

afterEach(() => {
  // 【テスト後処理】: モック状態の復元
  // 【状態復元】: 次のテストに影響しないようモック実装を元に戻す
  vi.restoreAllMocks();
});
```

---

## 6. 要件定義との対応関係

### 参照した機能概要

- 要件定義書 1.1「何をする機能か」: Toolbar コンポーネントと App 状態管理の概要
- 要件定義書 1.2「どのような問題を解決するか」: ファイル操作の導線提供・状態一元管理

### 参照した入力・出力仕様

- 要件定義書 2.1「Toolbar コンポーネント Props」: IToolbarProps インターフェース・ボタン有効/無効制御ルール
- 要件定義書 2.2「AppState インターフェース」: 状態型定義・初期状態
- 要件定義書 2.3「AppAction 型定義」: 全アクション型定義
- 要件定義書 2.4「IPC コマンド入出力」: load_image, clip_and_save の入出力仕様

### 参照した制約条件

- 要件定義書 3.1「アーキテクチャ制約」: React 19 + TypeScript、useReducer、IPC連携方式
- 要件定義書 3.2「コーディング規約」: 命名規則
- 要件定義書 3.3「既存コンポーネントとの統合制約」: ImageCanvas, PreviewPanel の props インターフェース

### 参照した使用例

- 要件定義書 4.1「基本的な使用パターン: 画像読み込み」: 読み込みフローの各ステップ
- 要件定義書 4.2「基本的な使用パターン: クリップ・保存」: 保存フローの各ステップ
- 要件定義書 4.3「ファイルダイアログキャンセル」: キャンセル時の動作
- 要件定義書 4.4「エラーケース: 画像読み込み失敗」
- 要件定義書 4.5「エラーケース: 保存失敗」
- 要件定義書 4.6「状態遷移図」: 全状態遷移の定義

---

## 7. テストケースサマリー

### テストケース一覧

| ID | カテゴリ | テスト対象 | テスト名 | 信頼性 |
|----|---------|-----------|---------|--------|
| TC-001 | 正常系 | appReducer | LOAD_START で loading に遷移 | 🔵 |
| TC-002 | 正常系 | appReducer | LOAD_SUCCESS で画像情報設定 | 🔵 |
| TC-003 | 正常系 | appReducer | LOAD_ERROR で error に遷移 | 🔵 |
| TC-004 | 正常系 | appReducer | UPDATE_CLIP_REGION でクリップ範囲更新 | 🔵 |
| TC-005 | 正常系 | appReducer | SAVE_START で saving に遷移 | 🔵 |
| TC-006 | 正常系 | appReducer | SAVE_SUCCESS で ready に戻る | 🔵 |
| TC-007 | 正常系 | appReducer | SAVE_ERROR で error に遷移 | 🔵 |
| TC-008 | 正常系 | appReducer | START_DRAGGING で dragging に遷移 | 🟡 |
| TC-009 | 正常系 | appReducer | END_DRAGGING で ready に戻る | 🟡 |
| TC-010 | 正常系 | appReducer | RESET_ERROR で errorMessage リセット | 🟡 |
| TC-011 | 正常系 | Toolbar | 「ファイルを開く」ボタン表示 | 🔵 |
| TC-012 | 正常系 | Toolbar | 「保存」ボタン表示 | 🔵 |
| TC-013 | 正常系 | Toolbar | 「ファイルを開く」クリックで onLoadImage 呼出 | 🔵 |
| TC-014 | 正常系 | Toolbar | 「保存」クリックで onSaveImage 呼出 | 🔵 |
| TC-015 | 正常系 | appReducer | 別画像読み込みでクリップ範囲リセット | 🔵 |
| TC-016 | 異常系 | Toolbar | isLoading 時「ファイルを開く」無効化 | 🔵 |
| TC-017 | 異常系 | Toolbar | 画像未読込時「保存」無効化 | 🔵 |
| TC-018 | 異常系 | Toolbar | 保存中「保存」無効化 | 🔵 |
| TC-019 | 異常系 | Toolbar | isLoading 時クリックで onLoadImage 未呼出 | 🟡 |
| TC-020 | 異常系 | Toolbar | 画像未読込時クリックで onSaveImage 未呼出 | 🟡 |
| TC-021 | 異常系 | appReducer | 未定義アクションで状態維持 | 🔵 |
| TC-022 | 境界値 | appReducer | initialState の正確性 | 🔵 |
| TC-023 | 境界値 | appReducer | エラー状態からの復帰 | 🔵 |
| TC-024 | 境界値 | Toolbar | 通常状態で両ボタン有効 | 🔵 |
| TC-025 | 境界値 | appReducer | クリップ範囲初期値の正確性 | 🔵 |
| TC-026 | 境界値 | appReducer | loading 状態での重複 LOAD_START | 🟡 |

### 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 20 | 77% |
| 🟡 黄信号 | 6 | 23% |
| 🔴 赤信号 | 0 | 0% |

**合計**: 26テストケース

---

**最終更新**: 2026-03-13
**生成者**: tsumiki:tdd-testcases スキル
