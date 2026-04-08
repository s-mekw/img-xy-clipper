# Issue: 数値入力での座標指定

## 概要

ドラッグ操作に加えて、テキストボックスにpx値を直接入力してライン位置を精密に指定できるようにする。

## 背景・動機

ドラッグ操作だけでは正確なピクセル位置への配置が難しい。特に「Y=200pxちょうどに合わせたい」といった場合、数値入力があれば一発で指定できる。

## 要件

### 必須

- 各ライン（trimTopY, clipTopY, clipBottomY, trimBottomY, fillRightX）にそれぞれ数値入力フィールドを用意
- 入力値を変更するとリアルタイムでキャンバス上のラインとプレビューに反映
- 画像の範囲外の値はバリデーションで制限（0〜imageHeight / 0〜imageWidth）
- ライン順序の制約を維持（trimTopY ≤ clipTopY ≤ clipBottomY ≤ trimBottomY）

### 任意

- ドラッグ操作中に入力フィールドの値もリアルタイム連動
- Enter確定 / Escape取消
- 上下矢印キーで±1px調整（フィールドフォーカス時）

## UI配置案

ツールバーまたはサイドパネルに配置：

```
Trim Top:    [  100 ] px
Clip Top:    [  250 ] px
Clip Bottom: [  500 ] px
Trim Bottom: [  700 ] px
Fill Right:  [  800 ] px
```

## 技術的な考慮事項

- 入力中（onChange）は即反映 vs 確定時（onBlur/Enter）に反映 → UX検討が必要
- 不正な値（非数値、範囲外）のハンドリング
- ドラッグとの双方向同期：reducer経由で状態を一元管理しているため自然に同期される
- 入力フィールドにフォーカスがある間はキーボードショートカットを無効化

## 影響範囲

- `src/components/Toolbar.tsx` または新規 `src/components/CoordinateInputs.tsx` — 数値入力UI
- `src/App.tsx` — 入力変更時のdispatch
- CSSレイアウト調整
