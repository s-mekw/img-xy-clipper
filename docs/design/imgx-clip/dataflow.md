# imgX-Clip データフロー図

**作成日**: 2026-03-11
**関連アーキテクチャ**: [architecture.md](architecture.md)
**関連要件定義**: [requirements.md](../../spec/imgx-clip/requirements.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: EARS要件定義書・ユーザヒアリングを参考にした確実なフロー
- 🟡 **黄信号**: EARS要件定義書・ユーザヒアリングから妥当な推測によるフロー
- 🔴 **赤信号**: EARS要件定義書・ユーザヒアリングにない推測によるフロー

---

## システム全体のデータフロー 🔵

**信頼性**: 🔵 *要件定義・ユーザーストーリーより*

```mermaid
flowchart LR
    A[画像ファイル] --> B[Rust: load_image]
    B --> C[Base64 + メタデータ]
    C --> D[React: ImageCanvas]
    D --> E[ユーザー: ドラッグ操作]
    E --> F[React: PreviewPanel]
    E --> G[クリップ範囲確定]
    G --> H[Rust: clip_and_save]
    H --> I[保存された画像ファイル]
```

## 主要機能のデータフロー

### 機能1: 画像読み込み 🔵

**信頼性**: 🔵 *要件定義REQ-001・受け入れ基準より*

**関連要件**: REQ-001

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant TB as Toolbar
    participant CMD as Tauri Commands
    participant IMG as image crate
    participant FS as File System
    participant IC as ImageCanvas

    U->>TB: ファイル選択ボタンクリック
    TB->>CMD: open_dialog()
    CMD-->>TB: ファイルパス
    TB->>CMD: load_image(path)
    CMD->>FS: ファイル読み込み
    FS-->>CMD: バイトデータ
    CMD->>IMG: decode(bytes)
    IMG-->>CMD: DynamicImage
    CMD->>CMD: Base64エンコード + メタデータ抽出
    CMD-->>TB: {base64, width, height, format}
    TB->>IC: 画像データをセット
    IC->>IC: Canvas に画像を描画
    IC-->>U: 画像表示完了
```

**詳細ステップ**:
1. ユーザーがToolbarの「ファイルを開く」ボタンをクリック
2. Tauriのファイルダイアログが開き、画像ファイルを選択
3. Rust側でファイルを読み込み、image crateでデコード
4. 画像をBase64エンコードし、幅・高さ・形式のメタデータとともにフロントエンドに返却
5. ImageCanvasがCanvas上に画像を描画、初期状態で2本の水平線を上端・下端に配置

### 機能2: ドラッグ操作とリアルタイムプレビュー 🔵

**信頼性**: 🔵 *要件定義REQ-002, REQ-004・ユーザヒアリングより*

**関連要件**: REQ-002, REQ-004

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant IC as ImageCanvas
    participant Hook as useClipRegion
    participant PP as PreviewPanel

    U->>IC: 水平線をマウスダウン
    IC->>Hook: startDrag(lineId, y)
    loop ドラッグ中（mousemove）
        U->>IC: マウス移動
        IC->>Hook: updateDrag(y)
        Hook->>Hook: Y座標をクランプ（0〜画像高さ）
        Hook-->>IC: {topY, bottomY}
        IC->>IC: Canvas再描画（オーバーレイ更新）
        Hook-->>PP: {topY, bottomY}
        PP->>PP: 選択範囲を拡大描画
    end
    U->>IC: マウスアップ
    IC->>Hook: endDrag()
    Hook-->>IC: 最終 {topY, bottomY}
```

**詳細ステップ**:
1. ユーザーが上端または下端の水平線をマウスダウン
2. `useClipRegion`フックがドラッグ状態を管理
3. mousemoveイベントごとにY座標を更新（画像範囲内にクランプ）
4. ImageCanvasが選択範囲をオーバーレイで描画（選択外を半透明マスク）
5. PreviewPanelが選択範囲のみを拡大してリアルタイム描画
6. マウスアップでドラッグ終了、範囲確定

### 機能3: クリップと保存 🔵

**信頼性**: 🔵 *要件定義REQ-003・ユーザヒアリングより*

**関連要件**: REQ-003

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant TB as Toolbar
    participant CMD as Tauri Commands
    participant IMG as image crate
    participant FS as File System

    U->>TB: 保存ボタンクリック
    TB->>CMD: save_dialog()
    CMD-->>TB: 保存先パス
    TB->>CMD: clip_and_save(srcPath, topY, bottomY, destPath)
    CMD->>FS: 元画像読み込み
    FS-->>CMD: バイトデータ
    CMD->>IMG: decode + crop(topY, bottomY)
    IMG-->>CMD: クリップ済み画像
    CMD->>IMG: encode(元の形式)
    IMG-->>CMD: エンコード済みバイトデータ
    CMD->>FS: ファイル書き込み
    FS-->>CMD: 成功
    CMD-->>TB: 保存完了通知
    TB-->>U: 保存完了メッセージ
```

**詳細ステップ**:
1. ユーザーがToolbarの「保存」ボタンをクリック
2. Tauriの保存ダイアログで保存先を選択
3. Rust側で元画像を再読み込みし、指定Y範囲でクロップ
4. 入力と同じ形式（PNG/JPG）でエンコード・保存
5. フロントエンドに完了通知を返却

## 状態管理フロー

### フロントエンド状態管理 🟡

**信頼性**: 🟡 *アプリ設計から妥当な推測*

```mermaid
stateDiagram-v2
    [*] --> 画像未読込
    画像未読込 --> 読込中: ファイル選択
    読込中 --> 画像表示中: 読込成功
    読込中 --> エラー: 読込失敗
    エラー --> 画像未読込: リセット
    画像表示中 --> ドラッグ中: 水平線をマウスダウン
    ドラッグ中 --> 画像表示中: マウスアップ
    画像表示中 --> 保存中: 保存ボタン
    保存中 --> 画像表示中: 保存成功
    保存中 --> エラー: 保存失敗
```

**アプリ状態（useReducer）**:

```typescript
interface AppState {
  // 画像状態
  imagePath: string | null;
  imageData: string | null;      // Base64
  imageWidth: number;
  imageHeight: number;
  imageFormat: string;

  // クリップ範囲
  clipTopY: number;
  clipBottomY: number;

  // UI状態
  status: 'idle' | 'loading' | 'ready' | 'dragging' | 'saving' | 'error';
  errorMessage: string | null;
}
```

**信頼性**: 🟡 *要件から妥当な推測。実装時に調整の可能性あり*

## エラーハンドリングフロー 🟡

**信頼性**: 🟡 *要件の異常系テストケースから妥当な推測*

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}
    B -->|非対応画像形式| C[エラーメッセージ表示]
    B -->|ファイル読み込み失敗| C
    B -->|保存先書き込み不可| C
    B -->|ドラッグ範囲不正| D[境界値にクランプ]

    C --> E[画像未読込 or 画像表示中に戻る]
    D --> F[操作継続]
```

## 関連文書

- **アーキテクチャ**: [architecture.md](architecture.md)
- **要件定義**: [requirements.md](../../spec/imgx-clip/requirements.md)
- **ヒアリング記録**: [design-interview.md](design-interview.md)

## 信頼性レベルサマリー

- 🔵 青信号: 6件 (75%)
- 🟡 黄信号: 2件 (25%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: ✅ 高品質
