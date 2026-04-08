# Issue: Undo/Redo機能の追加

## 概要

ライン位置の変更操作に対してUndo/Redo機能を提供し、誤操作からの復帰を可能にする。

## 背景・動機

現状、ドラッグでライン位置を変更した後に元に戻す手段がない。特に微調整を繰り返す作業フローでは、直前の状態に戻せないことがストレスになる。

## 要件

### 必須

- ライン位置（clipTopY, clipBottomY, trimTopY, trimBottomY, fillRightX）の変更をUndoスタックに記録
- Undo操作で直前のライン状態に戻る
- Redo操作でUndoした変更を再適用する
- Undoスタックの上限を設ける（例: 50件）

### 任意

- ツールバーにUndo/Redoボタンを表示（状態に応じてdisabled制御）
- スタック残数の表示

## 技術的な考慮事項

- `appReducer`に`undoStack`と`redoStack`を追加するアプローチが自然
- ドラッグ中は毎フレーム記録せず、ドラッグ終了時（`END_DRAGGING`）にスナップショットを保存
- 新しい変更が入ったらRedoスタックをクリア
- `Ctrl+Z` / `Ctrl+Y`のキーボードショートカットは別issueで対応

## 影響範囲

- `src/App.tsx` — reducerにUndo/Redoロジック追加
- `src/components/Toolbar.tsx` — Undo/Redoボタン追加
- `src/components/ImageCanvas.tsx` — ドラッグ終了時のスナップショット記録
