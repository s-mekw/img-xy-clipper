# TASK-0005 要件定義書: PreviewPanelコンポーネント実装

**タスクID**: TASK-0005
**機能名**: imgx-clip
**要件名**: PreviewPanelコンポーネント実装
**作成日**: 2026-03-13
**フェーズ**: Phase 2 - フロントエンド・統合

---

## 1. 機能の概要

### 何をする機能か 🔵

**信頼性**: 🔵 *要件定義REQ-004・ユーザーストーリー2より*

ドラッグ操作中にY軸の選択範囲（topY〜bottomY）をリアルタイムで拡大プレビュー表示するコンポーネント。Canvas APIの`drawImage`ソース範囲指定を使って、選択範囲のみを別のCanvasに拡大描画する。

### どのような問題を解決するか 🔵

**信頼性**: 🔵 *ユーザーストーリー2「正確な範囲指定を視覚的に確認しながら操作できる」より*

- ユーザーがクリップ範囲を確定する前に、切り取り後の画像イメージをリアルタイムで確認できるようにする
- 元画像のImageCanvas上では小さく見える範囲も、拡大プレビューで詳細を確認可能にする

### 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザーストーリー2「私はユーザーとして」より*

- 画像のY軸方向をクリップしたいユーザー（デスクトップアプリケーション使用者）

### システム内での位置づけ 🔵

**信頼性**: 🔵 *architecture.mdのシステム構成図・コンポーネント構成表より*

- Appコンポーネントの子コンポーネントとして配置
- ImageCanvasコンポーネントと並列に配置され、同じ`imageData`/`topY`/`bottomY`のpropsを共有
- IPCコマンドは使用しない（Canvas APIによるフロントエンド側の描画のみ）
- TASK-0004（ImageCanvas）で実装済みのpropsインターフェースパターンを踏襲

**参照したEARS要件**: REQ-004
**参照した設計文書**: architecture.md「コンポーネント構成」セクション、dataflow.md「機能2: ドラッグ操作とリアルタイムプレビュー」

---

## 2. 入力・出力の仕様

### 入力パラメータ（Props） 🔵

**信頼性**: 🔵 *architecture.mdのPreviewPanel設計・note.mdのインターフェース定義より*

```typescript
interface IPreviewPanelProps {
  /** Base64エンコード済み画像データ（nullの場合はプレビューなし） */
  imageData: string | null;
  /** 画像の幅（px） */
  imageWidth: number;
  /** 画像の高さ（px） */
  imageHeight: number;
  /** クリップ上端のY座標（px）。0 <= topY < bottomY */
  topY: number;
  /** クリップ下端のY座標（px）。topY < bottomY <= imageHeight */
  bottomY: number;
}
```

| パラメータ | 型 | 制約 | 説明 |
|-----------|---|------|------|
| `imageData` | `string \| null` | Base64文字列またはnull | 表示対象の画像データ |
| `imageWidth` | `number` | > 0 | 元画像の幅（ピクセル） |
| `imageHeight` | `number` | > 0 | 元画像の高さ（ピクセル） |
| `topY` | `number` | 0 <= topY < bottomY | クリップ上端Y座標 |
| `bottomY` | `number` | topY < bottomY <= imageHeight | クリップ下端Y座標 |

### 出力（描画結果） 🔵

**信頼性**: 🔵 *note.mdのCanvas描画戦略・architecture.mdの描画仕様より*

- Canvas要素に、選択範囲（topY〜bottomY）の拡大プレビューを描画
- DOM出力: `<canvas>` 要素（`id="preview-canvas"`、`ref`による参照）

### 入出力の関係性 🔵

**信頼性**: 🔵 *dataflow.mdの機能2シーケンス図より*

```
入力: imageData + topY + bottomY
  ↓ Base64 → Image要素にロード（キャッシュ）
  ↓ drawImage(image, 0, topY, imageWidth, bottomY-topY, 0, 0, canvasWidth, canvasHeight)
出力: Canvas上に拡大プレビュー表示
```

### データフロー 🔵

**信頼性**: 🔵 *dataflow.mdの機能2「ドラッグ操作とリアルタイムプレビュー」より*

```
1. ユーザーがImageCanvasで水平線をドラッグ
   → onClipRegionChange() で App の state 更新
2. App コンポーネントが topY/bottomY を PreviewPanel に props として渡す
3. PreviewPanel の useEffect がトリガー（topY/bottomY が依存配列に含まれる）
4. Canvas クリア → drawImage でソース範囲指定して拡大描画
```

**参照したEARS要件**: REQ-004
**参照した設計文書**: note.md「Canvas描画戦略」、dataflow.md「機能2」シーケンス図

---

## 3. 制約条件

### パフォーマンス要件 🟡

**信頼性**: 🟡 *非機能要件「ドラッグ操作中のプレビュー更新は60fps程度を維持」から妥当な推測*

- ドラッグ中のプレビュー更新は60fps（16ms以内）を目指す
- topY/bottomY変更時のみCanvas再描画を実行（不要な再描画を避ける）
- Base64画像のImage要素へのロードは初回のみ実行し、以降はキャッシュを使用
- useEffectの依存配列で変更検出を行い、不要な描画を防止

### Canvas描画制約 🔵

**信頼性**: 🔵 *note.mdのCanvas描画戦略・architecture.mdの描画仕様より*

- `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` の9引数形式を使用
  - sx=0, sy=topY, sw=imageWidth, sh=(bottomY - topY)
  - dx=0, dy=0, dw=canvasWidth, dh=canvasHeight
- Canvas描画前に`clearRect`で初期化すること
- `canvas.width`/`canvas.height`属性で描画座標系を設定すること（CSSサイズではなく）

### プレビューキャンバスサイズ 🟡

**信頼性**: 🟡 *note.md「固定サイズ: 200px x 300px」から妥当な推測*

- プレビュー用Canvasのサイズは固定値または動的計算で決定
- アスペクト比の扱い: 選択範囲のアスペクト比に合わせてCanvasサイズを動的に調整、または固定サイズで描画
- 大規模画像（4000x3000px等）でも効率的にプレビュー表示可能であること

### アーキテクチャ制約 🔵

**信頼性**: 🔵 *architecture.mdのコンポーネント構成・Tauri v2標準パターンより*

- React関数コンポーネントとして実装（`React.FC<IPreviewPanelProps>`形式）
- IPCコマンドは使用しない（Canvas APIのみでフロントエンド側完結）
- 既存のImageCanvasコンポーネントの設計パターン（useRef + useEffect）を踏襲
- TypeScript型安全（明示的な型定義）

### 互換性要件 🔵

**信頼性**: 🔵 *architecture.mdの技術的制約より*

- Windows 11 + WebView2（Edge）環境で動作すること
- Canvas `drawImage` 9引数形式はWebView2で100%対応済み

**参照したEARS要件**: REQ-004, REQ-401, REQ-402
**参照した設計文書**: architecture.md「非機能要件の実現方法」「技術的制約」、note.md「Canvas描画戦略」

---

## 4. 想定される使用例

### 基本的な使用パターン

#### 4.1 初期表示（画像読み込み後） 🔵

**信頼性**: 🔵 *REQ-004の受け入れ基準・dataflow.mdの機能2より*

- **前提条件**: 画像がload_imageで読み込まれ、imageData/imageWidth/imageHeightがセットされている
- **操作**: 初期状態ではtopY=0、bottomY=imageHeight（全範囲選択）
- **結果**: 元画像全体がプレビューCanvasに縮小・拡大表示される

#### 4.2 ドラッグ中のリアルタイム更新 🔵

**信頼性**: 🔵 *REQ-004の受け入れ基準「ドラッグ範囲変更に追従して拡大表示が更新される」より*

- **前提条件**: ユーザーがImageCanvas上で水平線をドラッグ操作中
- **操作**: topYまたはbottomYが変更される（mousemoveイベントごと）
- **結果**: PreviewPanelのCanvasが即座に再描画され、新しい選択範囲が拡大表示される

#### 4.3 クリップ範囲の確定 🔵

**信頼性**: 🔵 *dataflow.md「マウスアップでドラッグ終了、範囲確定」より*

- **前提条件**: ドラッグ操作が終了（mouseup）
- **操作**: topY/bottomYが最終値に確定
- **結果**: 最終的なクリップ範囲の拡大プレビューが表示されたまま維持される

### エッジケース

#### 4.4 imageDataがnullの場合 🟡

**信頼性**: 🟡 *ImageCanvasの既存実装パターン（imageData=null時の処理）から妥当な推測*

- **前提条件**: 画像が未読込（imageData=null）
- **操作**: PreviewPanelがマウントされる
- **結果**: Canvas描画は実行されない（空のCanvas要素のみ表示）

#### 4.5 クリップ高さが0の場合（topY === bottomY） 🟡

**信頼性**: 🟡 *境界値テストとして妥当な推測*

- **前提条件**: topYとbottomYが同じ値
- **操作**: PreviewPanelに topY=100, bottomY=100 が渡される
- **結果**: エラーなく処理される（空のCanvasまたは描画スキップ）

#### 4.6 imageDataの変更（画像切り替え） 🟡

**信頼性**: 🟡 *複数画像読み込みシナリオとして妥当な推測*

- **前提条件**: 既にプレビューが表示されている状態で新しい画像が読み込まれる
- **操作**: imageDataが新しいBase64文字列に変更される
- **結果**: 新しい画像でプレビューが再描画される（Imageキャッシュが更新される）

### エラーケース

#### 4.7 Canvas 2Dコンテキスト取得失敗 🔴

**信頼性**: 🔴 *防御的プログラミングとしての推測（実運用では発生しにくい）*

- **前提条件**: ブラウザが2Dコンテキストを返さない
- **操作**: `getContext('2d')` がnullを返す
- **結果**: 描画処理をスキップ（エラーなし）

**参照したEARS要件**: REQ-004
**参照した設計文書**: dataflow.md「機能2」シーケンス図、note.md「テスト関連情報」

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **ストーリー2**: リアルタイムプレビューで確認
  - 「ドラッグ操作中にクリップ後の画像をリアルタイムで拡大プレビューしたい」
  - 「正確な範囲指定を視覚的に確認しながら操作できる」

### 参照した機能要件

- **REQ-004**: システムはドラッグ操作中に選択範囲をリアルタイムで拡大プレビュー表示しなければならない 🔵

### 参照した非機能要件

- **パフォーマンス**: ドラッグ操作中のプレビュー更新は60fps程度を維持する 🟡

### 参照した受け入れ基準

- **REQ-004 受け入れ基準**:
  - Given: 画像が読み込まれている
  - When: ユーザーがドラッグ操作中
  - Then: 選択範囲の拡大プレビューがリアルタイムで表示される
  - テストケース1: ドラッグ中に選択範囲が拡大表示される
  - テストケース2: ドラッグ範囲変更に追従して拡大表示が更新される

### 参照した設計文書

- **アーキテクチャ**: `docs/design/imgx-clip/architecture.md`
  - コンポーネント構成表（PreviewPanel: 選択範囲のリアルタイム拡大プレビュー表示）
  - システム構成図（App → PreviewPanel の props フロー）
  - 非機能要件の実現方法（Canvas再描画をrequestAnimationFrameで最適化）
- **データフロー**: `docs/design/imgx-clip/dataflow.md`
  - 機能2「ドラッグ操作とリアルタイムプレビュー」シーケンス図
  - フロントエンド状態管理フロー
- **型定義**: `src/types/clip.ts`（ClipRegion, DraggingLine）
- **既存実装パターン**: `src/components/ImageCanvas.tsx`（Canvas描画・useRef+useEffect パターン）

---

## 6. 実装ファイル一覧

| ファイル | 説明 | 状態 |
|---------|------|------|
| `src/components/PreviewPanel.tsx` | PreviewPanelコンポーネント本体 | 実装対象 |
| `src/components/__tests__/PreviewPanel.test.tsx` | PreviewPanelテスト | 実装対象 |

### 依存ファイル（既存・参照のみ）

| ファイル | 説明 |
|---------|------|
| `src/components/ImageCanvas.tsx` | Canvas描画パターンの参考（TASK-0004実装済み） |
| `src/hooks/useClipRegion.ts` | ドラッグ状態管理フック（TASK-0004実装済み） |
| `src/types/clip.ts` | ClipRegion/DraggingLine 型定義（TASK-0004実装済み） |
| `src/test/setup.ts` | テスト環境設定（Canvas/rAFモック含む、TASK-0004設定済み） |

---

## 信頼性レベルサマリー

| レベル | 項目数 | 割合 | 該当箇所 |
|--------|--------|------|----------|
| 🔵 青信号 | 16項目 | 70% | 機能概要、Props定義、描画仕様、データフロー、Canvas制約、基本使用パターン |
| 🟡 黄信号 | 6項目 | 26% | パフォーマンス要件、キャンバスサイズ、エッジケース（null/高さ0/画像切替） |
| 🔴 赤信号 | 1項目 | 4% | Canvas 2Dコンテキスト取得失敗 |

**品質評価**: ✅ 高品質
- 要件の曖昧さ: なし（REQ-004の受け入れ基準が明確）
- 入出力定義: 完全（Props型定義・drawImageパラメータが明確）
- 制約条件: 明確（Canvas描画制約・パフォーマンス目標が定義済み）
- 実装可能性: 確実（ImageCanvasの既存パターンを踏襲可能）
