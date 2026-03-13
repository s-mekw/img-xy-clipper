# TASK-0004 TDD要件定義書：ImageCanvasコンポーネント実装

**生成日**: 2026-03-13
**タスクID**: TASK-0004
**要件名**: imgx-clip
**機能名**: ImageCanvasコンポーネント + useClipRegionフック
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 機能の概要

### 何をする機能か 🔵

**信頼性**: 🔵 *要件定義REQ-002・アーキテクチャ設計のコンポーネント構成より*

画像をHTML Canvas上に表示し、2本の水平線（上端・下端）をドラッグ操作でY軸方向に移動させることで、クリップ範囲を視覚的に指定する機能。選択範囲外は半透明マスクで覆い、ユーザーがクリップ対象領域を直感的に把握できるようにする。

### どのような問題を解決するか 🔵

**信頼性**: 🔵 *ユーザーストーリー1「画像の読み込みとクリップ」より*

ユーザーが画像のY軸方向の不要な範囲をドラッグで選択して切り取りたいという要求に対し、GUIによる直感的な範囲指定UIを提供する。数値入力ではなくドラッグ操作で範囲を指定できることで、素早く正確な範囲指定が可能になる。

### 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザーストーリー1のAs aより*

画像のY軸方向をクリップしたいユーザー。

### システム内での位置づけ 🔵

**信頼性**: 🔵 *アーキテクチャ設計のシステム構成図・コンポーネント構成より*

- **ImageCanvas**はフロントエンドの中核コンポーネントで、Appコンポーネントから画像データ（Base64）とクリップ範囲（topY/bottomY）をpropsで受け取る
- **useClipRegion**フックはドラッグ操作の状態管理を担い、ImageCanvasおよびPreviewPanel（TASK-0005）で共有される
- 前段のTASK-0002（`load_image` IPCコマンド）で取得したBase64画像データを表示する
- 後続のTASK-0005（PreviewPanel）、TASK-0006（Toolbar・App統合）、TASK-0007（統合テスト）に接続する

**参照した要件**: REQ-002, REQ-004
**参照した設計文書**: `docs/design/imgx-clip/architecture.md` - コンポーネント構成・システム構成図

---

## 2. 入力・出力の仕様

### ImageCanvasコンポーネント Props 🔵

**信頼性**: 🔵 *アーキテクチャ設計・タスクノートのインターフェース定義より*

#### 入力パラメータ

| パラメータ | 型 | 説明 | 制約 |
|---|---|---|---|
| `imageData` | `string \| null` | Base64エンコード済み画像データ | nullの場合は画像未読込状態 |
| `imageWidth` | `number` | 画像幅（ピクセル） | 正の整数 |
| `imageHeight` | `number` | 画像高さ（ピクセル） | 正の整数 |
| `topY` | `number` | クリップ上端Y座標 | 0 <= topY < bottomY |
| `bottomY` | `number` | クリップ下端Y座標 | topY < bottomY <= imageHeight |
| `onClipRegionChange` | `(topY: number, bottomY: number) => void` | クリップ範囲変更時のコールバック | - |

```typescript
interface IImageCanvasProps {
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  onClipRegionChange: (topY: number, bottomY: number) => void;
}
```

#### 出力（Canvas描画）

- Canvas上に画像を描画
- 2本の赤色水平線（topY、bottomY位置）を描画
- 選択範囲外を半透明マスク（rgba(0,0,0,0.5)）で描画
- ドラッグ操作時に`onClipRegionChange`コールバックで新しいtopY/bottomYを親コンポーネントに通知

### useClipRegionフック 🔵

**信頼性**: 🔵 *データフロー図・タスクノートのフック設計より*

#### 入力パラメータ

| パラメータ | 型 | 説明 | 制約 |
|---|---|---|---|
| `imageHeight` | `number` | 画像の高さ（ピクセル） | 正の整数 |

#### 出力（戻り値）

| プロパティ | 型 | 説明 |
|---|---|---|
| `region` | `ClipRegion` | 現在のクリップ範囲（topY, bottomY） |
| `startDrag` | `(lineId: 'top' \| 'bottom', y: number) => void` | ドラッグ開始 |
| `updateDrag` | `(y: number) => void` | ドラッグ中のY座標更新 |
| `endDrag` | `() => void` | ドラッグ終了 |
| `isDragging` | `boolean` | ドラッグ中かどうか |

```typescript
interface ClipRegion {
  topY: number;
  bottomY: number;
}

interface UseClipRegionReturn {
  region: ClipRegion;
  startDrag: (lineId: 'top' | 'bottom', y: number) => void;
  updateDrag: (y: number) => void;
  endDrag: () => void;
  isDragging: boolean;
}
```

#### 入出力の関係性

```
imageHeight → useClipRegion → { region, startDrag, updateDrag, endDrag, isDragging }
                                    ↓
                              topY, bottomY は 0〜imageHeight にクランプ
                              topY < bottomY を常に維持
```

**参照した要件**: REQ-002（ドラッグ操作）
**参照した設計文書**: `docs/design/imgx-clip/dataflow.md` - 機能2：ドラッグ操作とリアルタイムプレビュー

---

## 3. 制約条件

### パフォーマンス要件 🟡

**信頼性**: 🟡 *非機能要件「ドラッグ操作中のプレビュー更新は60fps程度を維持する」から妥当な推測*

- ドラッグ中のCanvas再描画は`requestAnimationFrame`で最適化し60fps維持
- マウス移動後16ms以内にCanvas再描画が完了すること
- mousemoveイベントの過剰発火をrequestAnimationFrameで制御

### 座標制約 🔵

**信頼性**: 🔵 *タスク定義の完了条件・データフロー図より*

- **Y座標クランプ**: `0 <= topY` かつ `bottomY <= imageHeight`
- **線の交差防止**: `topY < bottomY` を常に維持
- **ドラッグ対象判定**: 水平線の上下±5pxの範囲をドラッグ検出領域とする

### Canvas描画制約 🔵

**信頼性**: 🔵 *タスクノート・アーキテクチャ設計より*

- Canvas要素の`width`/`height`属性を画像サイズに合わせて設定（CSSサイズではなくCanvas属性で設定）
- Base64画像は`Image`要素にロード後、`onload`イベント完了後にCanvas描画
- レイヤー描画順序: 背景画像 → オーバーレイ → 水平線

### 互換性制約 🔵

**信頼性**: 🔵 *要件定義REQ-402・技術的制約より*

- Windows 11上のTauri v2（WebView2 / Edge）で動作すること
- HTML5 Canvas API標準メソッドのみ使用（WebView2で100%対応）

### 水平線の描画仕様 🟡

**信頼性**: 🟡 *タスクノートの描画仕様から妥当な推測*

- 線の色: 赤色（#FF0000）
- 線の太さ: 通常時 lineWidth=2、ホバー時 lineWidth=4
- オーバーレイ色: rgba(0, 0, 0, 0.5)

**参照した要件**: REQ-002, REQ-402
**参照した設計文書**: `docs/design/imgx-clip/architecture.md` - パフォーマンス・技術的制約

---

## 4. 想定される使用例

### 基本的な使用パターン 🔵

**信頼性**: 🔵 *要件定義REQ-002受け入れ基準・データフロー図機能2より*

#### パターン1: 画像表示

1. 親コンポーネント（App）が`load_image` IPCで取得したBase64画像データをpropsで渡す
2. ImageCanvasがCanvasに画像を描画
3. 初期状態: topY=0、bottomY=imageHeight（全体が選択範囲）
4. 2本の水平線が上端・下端に表示される

#### パターン2: 水平線のドラッグ移動

1. ユーザーが上端の水平線（topY位置）付近をマウスダウン
2. `startDrag('top', y)`が呼ばれ、ドラッグ状態に遷移
3. マウスムーブで`updateDrag(y)`が呼ばれ、topYがリアルタイム更新
4. Canvas再描画: オーバーレイ・水平線が更新される
5. マウスアップで`endDrag()`が呼ばれ、ドラッグ終了

#### パターン3: 下端線のドラッグ

1. ユーザーが下端の水平線（bottomY位置）付近をマウスダウン
2. `startDrag('bottom', y)`が呼ばれる
3. マウスムーブでbottomYがリアルタイム更新
4. マウスアップでドラッグ終了

### エッジケース 🟡

**信頼性**: 🟡 *要件定義REQ-002の異常系テストケース・データフロー図から妥当な推測*

#### エッジケース1: 画像範囲外へのドラッグ

- **条件**: ドラッグ中にマウスがCanvas（画像）の外に移動
- **期待動作**: Y座標が画像範囲（0〜imageHeight）にクランプされる
  - 上方向にはみ出し → topY = 0
  - 下方向にはみ出し → bottomY = imageHeight

#### エッジケース2: 線の交差（topYがbottomYを超える）

- **条件**: topY線をドラッグしてbottomYの位置を超えようとする
- **期待動作**: topYはbottomY - 1にクランプされ、線が交差しない
- 逆パターン（bottomYがtopYを下回る）も同様にクランプ

#### エッジケース3: 画像データがnull

- **条件**: `imageData`がnullの場合（画像未読込状態）
- **期待動作**: Canvasは空の状態を表示、ドラッグ操作は無効

#### エッジケース4: 水平線以外の場所をクリック

- **条件**: 水平線の±5px範囲外をクリック
- **期待動作**: ドラッグは開始されない

### エラーケース 🟡

**信頼性**: 🟡 *エラーハンドリングフローから妥当な推測*

#### エラー1: Base64画像のロード失敗

- **条件**: 不正なBase64文字列が渡された場合
- **期待動作**: Image要素のonerrorイベントで検出、エラー状態を通知

#### エラー2: Canvas 2Dコンテキスト取得失敗

- **条件**: `canvas.getContext('2d')`がnullを返す場合
- **期待動作**: 描画処理をスキップ（エラーログ出力）

**参照した要件**: REQ-002の受け入れ基準（異常系）
**参照した設計文書**: `docs/design/imgx-clip/dataflow.md` - 機能2・エラーハンドリングフロー

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザーストーリー

- **ストーリー1**: 画像の読み込みとクリップ（REQ-001, REQ-002, REQ-003）
- **ストーリー2**: リアルタイムプレビューで確認（REQ-004）

### 参照した機能要件

- **REQ-002**: ユーザーはGUI上で画像をドラッグ操作してY軸方向の切り取り範囲を動的に指定できなければならない 🔵
- **REQ-004**: システムはドラッグ操作中に選択範囲をリアルタイムで拡大プレビュー表示しなければならない 🔵（プレビュー表示はTASK-0005で実装、本タスクではクリップ範囲変更のコールバック提供まで）

### 参照した非機能要件

- **パフォーマンス**: ドラッグ操作中のプレビュー更新は60fps程度を維持する 🟡

### 参照した受け入れ基準

- **REQ-002**: ドラッグでY軸範囲を選択できる（正常系）
- **REQ-002**: 画像範囲外へのドラッグは境界でクランプされる（異常系）

### 参照した設計文書

- **アーキテクチャ**: `docs/design/imgx-clip/architecture.md` - コンポーネント構成、フロントエンド状態管理、パフォーマンス設計
- **データフロー**: `docs/design/imgx-clip/dataflow.md` - 機能2（ドラッグ操作とリアルタイムプレビュー）のシーケンス図・状態管理フロー
- **要件定義**: `docs/spec/imgx-clip/requirements.md` - REQ-002, REQ-004, 受け入れ基準
- **タスク定義**: `docs/tasks/imgx-clip/TASK-0004.md` - 完了条件・実装項目

---

## 6. 実装対象ファイル一覧

| ファイルパス | 説明 | 状態 |
|---|---|---|
| `src/components/ImageCanvas.tsx` | Canvas画像表示・ドラッグ操作コンポーネント | スケルトン → 実装 |
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理カスタムフック | スケルトン → 拡張実装 |
| `src/hooks/__tests__/useClipRegion.test.ts` | useClipRegionフック単体テスト | 新規作成 |

---

## 7. 完了条件との対応

| 完了条件 | 対応する要件セクション |
|---|---|
| Canvas上に画像を表示できる | 2. 入出力仕様 - ImageCanvas Props / 4. パターン1 |
| 2本の水平線が表示され、ドラッグで移動できる | 2. 入出力仕様 - Canvas描画 / 4. パターン2, 3 |
| 選択範囲外が半透明マスクで表示される | 3. 制約条件 - Canvas描画制約 |
| ドラッグ中のY座標が画像範囲内にクランプされる | 3. 制約条件 - 座標制約 / 4. エッジケース1, 2 |
| useClipRegionフックが正しく状態管理する | 2. 入出力仕様 - useClipRegionフック |

---

## 信頼性レベルサマリー

- **総項目数**: 14項目
- 🔵 **青信号**: 10項目 (71%)
- 🟡 **黄信号**: 4項目 (29%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: ✅ 高品質
