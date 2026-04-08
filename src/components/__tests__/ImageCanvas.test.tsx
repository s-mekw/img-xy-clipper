// テストファイル: src/components/__tests__/ImageCanvas.test.tsx
// 【テスト対象】: ImageCanvasコンポーネント（Canvas画像表示・ドラッグ操作）
// 【テスト目的】: TC-008〜TC-010、TC-016 のテストケースを実装
// 【テストフレームワーク】: Vitest + @testing-library/react

import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import ImageCanvas from "../ImageCanvas";

// 【テスト用最小PNGデータ】: 1x1ピクセルの透明PNG（Base64エンコード）
// 【選択理由】: 実際の画像ファイルを使わずにBase64画像データをテストするための最小サイズ
const MINIMAL_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ============================================================
// ImageCanvasコンポーネントのテストスイート
// ============================================================
describe("ImageCanvas", () => {
  // 【テスト前準備】: Canvas 2D APIのモック設定
  // 【環境初期化】: jsdom環境でCanvas getContext('2d')をモック（実際のCanvas描画を無効化）
  beforeEach(() => {
    // 【初期条件設定】: setup.tsでモック済みのCanvas APIをリセット
    vi.clearAllMocks();
  });

  // 【テスト後処理】: モック状態のリセット
  // 【状態復元】: 次のテストに影響しないようモックを復元
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // TC-008: imageDataがnullの場合の表示確認
  // ============================================================
  test("TC-008: imageDataがnullの場合、空のCanvasが表示される", () => {
    // 【テスト目的】: imageDataがnullの場合、canvas要素が描画されるがエラーが発生しないこと
    // 【テスト内容】: 画像未読込状態（imageData=null）でのコンポーネントレンダリングを検証
    // 【期待される動作】: 画像未読込状態でもコンポーネントがクラッシュせずレンダリングされる
    // 🔵 信頼性レベル: 要件定義のエッジケース3「画像データがnull」より

    // 【テストデータ準備】: 画像未読込状態のpropsを設定
    // 【初期条件設定】: imageData=null、各サイズ=0のprops
    const props = {
      imageData: null,
      imageWidth: 0,
      imageHeight: 0,
      topY: 0,
      bottomY: 0,
      trimTopY: 0,
      trimBottomY: 0,
      onClipRegionChange: vi.fn(),
      onTrimRegionChange: vi.fn(),
      fillRightX: 200,
      onFillRightXChange: vi.fn(),
    };

    // 【実際の処理実行】: 画像なし状態でコンポーネントをレンダリング
    // 【処理内容】: imageData=nullのpropsでImageCanvasをレンダリング
    const { container } = render(<ImageCanvas {...props} />);

    // 【結果検証】: canvas要素が存在すること
    // 【期待値確認】: 画像未読込は正常な状態遷移であり、canvas要素は存在すべき
    expect(container.querySelector("canvas")).not.toBeNull(); // 【確認内容】: canvas要素がDOMに存在する 🔵
  });

  // ============================================================
  // TC-009: imageDataが設定された場合のCanvas表示確認
  // ============================================================
  test("TC-009: imageDataが設定された場合、canvas要素が正しいサイズでレンダリングされる", () => {
    // 【テスト目的】: Base64画像データが渡された場合、canvas要素が正しいサイズでレンダリングされること
    // 【テスト内容】: 200x300pxの画像データを渡した場合のCanvasのwidth/height属性を検証
    // 【期待される動作】: Canvas要素のwidth/height属性が画像サイズに合わせて設定される
    // 🟡 信頼性レベル: 要件定義の制約条件・Canvas描画制約から妥当な推測

    // 【テストデータ準備】: 200x300pxの画像データを想定したpropsを設定
    // 【初期条件設定】: Base64エンコード済みの最小PNGと画像サイズを指定
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 0,
      bottomY: 300,
      trimTopY: 0,
      trimBottomY: 300,
      onClipRegionChange: vi.fn(),
      onTrimRegionChange: vi.fn(),
      fillRightX: 200,
      onFillRightXChange: vi.fn(),
    };

    // 【実際の処理実行】: 画像データありでコンポーネントをレンダリング
    // 【処理内容】: imageData付きのpropsでImageCanvasをレンダリング
    const { container } = render(<ImageCanvas {...props} />);

    // 【結果検証】: canvas要素が正しいサイズを持つこと
    // 【期待値確認】: Canvas描画制約によりCanvas属性で画像サイズを設定する必要がある
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull(); // 【確認内容】: canvas要素がDOMに存在する 🟡
    expect(canvas?.getAttribute("width")).toBe("200"); // 【確認内容】: canvasのwidth属性が200に設定される 🟡
    expect(canvas?.getAttribute("height")).toBe("300"); // 【確認内容】: canvasのheight属性が300に設定される 🟡
  });

  // ============================================================
  // TC-010: onClipRegionChangeコールバックの呼び出し確認
  // ============================================================
  test("TC-010: 上端線をドラッグするとonClipRegionChangeが呼ばれる", () => {
    // 【テスト目的】: 上端線付近をマウスダウンしてmousemoveした際にonClipRegionChangeが呼ばれること
    // 【テスト内容】: topY=50の水平線（±5px範囲内）でマウスダウン→mousemoveイベントを発火
    // 【期待される動作】: 親コンポーネントにクリップ範囲の変更が通知される
    // 🔵 信頼性レベル: 要件定義のシステムデータフロー・使用パターン2より

    // 【テストデータ準備】: topY=50、bottomY=250の状態のpropsを設定
    // 【初期条件設定】: 水平線がtopY=50の位置に配置される
    const mockOnClipRegionChange = vi.fn();
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      onClipRegionChange: mockOnClipRegionChange,
      onTrimRegionChange: vi.fn(),
      fillRightX: 200,
      onFillRightXChange: vi.fn(),
    };

    // 【実際の処理実行】: コンポーネントをレンダリングしてマウスイベントを発火
    // 【処理内容】: topY=50の水平線上（y=50、±5px範囲内）でマウスダウン → y=100にmousemove
    const { container } = render(<ImageCanvas {...props} />);
    const canvas = container.querySelector("canvas");

    // 水平線（topY=50）の±5px範囲内（y=52）でマウスダウン
    fireEvent.mouseDown(canvas!, {
      clientX: 100,
      clientY: 52,
      currentTarget: canvas,
    });

    // y=100にマウスムーブ
    fireEvent.mouseMove(canvas!, {
      clientX: 100,
      clientY: 100,
    });

    // 【結果検証】: onClipRegionChangeが呼ばれること
    // 【期待値確認】: 親コンポーネントへのクリップ範囲変更通知が必須
    expect(mockOnClipRegionChange).toHaveBeenCalled(); // 【確認内容】: onClipRegionChangeが少なくとも1回呼ばれる 🔵
  });

  // ============================================================
  // TC-016: 水平線以外の場所をクリックしてもドラッグが開始されない
  // ============================================================
  test("TC-016: 水平線以外の場所をクリックしてもonClipRegionChangeが呼ばれない", () => {
    // 【テスト目的】: 水平線の±5px範囲外でマウスダウンした場合にドラッグが開始されないこと
    // 【テスト内容】: topY=0、bottomY=300の状態でy=150（水平線から離れた位置）でマウスダウン
    // 【期待される動作】: 水平線以外の場所ではドラッグが開始されない
    // 🔵 信頼性レベル: 要件定義のエッジケース4「水平線の±5px範囲外をクリック」より

    // 【テストデータ準備】: topY=0、bottomY=300の状態のpropsを設定
    // 【初期条件設定】: 水平線がtopY=0とbottomY=300の位置に配置される
    const mockOnClipRegionChange = vi.fn();
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 0,
      bottomY: 300,
      trimTopY: 0,
      trimBottomY: 300,
      onClipRegionChange: mockOnClipRegionChange,
      onTrimRegionChange: vi.fn(),
      fillRightX: 200,
      onFillRightXChange: vi.fn(),
    };

    const { container } = render(<ImageCanvas {...props} />);
    const canvas = container.querySelector("canvas");

    // 水平線（topY=0, bottomY=300）から離れたy=150でマウスダウン
    fireEvent.mouseDown(canvas!, {
      clientX: 100,
      clientY: 150,
    });

    // マウスムーブ（ドラッグが始まっていない場合は何も起きないはず）
    fireEvent.mouseMove(canvas!, {
      clientX: 100,
      clientY: 200,
    });

    // 【結果検証】: onClipRegionChangeが呼ばれないこと
    // 【期待値確認】: 水平線以外の場所でのクリックはドラッグ操作に繋がらない
    expect(mockOnClipRegionChange).not.toHaveBeenCalled(); // 【確認内容】: 水平線範囲外ではonClipRegionChangeが呼ばれない 🔵
  });

  // ============================================================
  // TC-016b: 重なり時にbottomYを掴めること
  // ============================================================
  test("TC-016b: topY=0, bottomY=0, trimTopY=0（重なり状態）でクリックするとtrimTopがドラッグされる", () => {
    // 【テスト目的】: 全線が重なっている初期状態でクリックした場合、最外側のtrimTop線が掴まれること
    // 【テスト内容】: 全線がy=0で重なる状態でy=0付近をクリック→trimTopが優先的に掴まれる

    const mockOnClipRegionChange = vi.fn();
    const mockOnTrimRegionChange = vi.fn();
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 0,
      bottomY: 0,
      trimTopY: 0,
      trimBottomY: 300,
      onClipRegionChange: mockOnClipRegionChange,
      onTrimRegionChange: mockOnTrimRegionChange,
      fillRightX: 200,
      onFillRightXChange: vi.fn(),
    };

    const { container } = render(<ImageCanvas {...props} />);
    const canvas = container.querySelector("canvas");

    // 重なり位置（y=0）付近でマウスダウン → trimTopが最初にマッチ
    fireEvent.mouseDown(canvas!, {
      clientX: 100,
      clientY: 2,
    });

    fireEvent.mouseMove(canvas!, {
      clientX: 100,
      clientY: 100,
    });

    // trimTop線が優先的に掴まれるため、onTrimRegionChangeが呼ばれる
    expect(mockOnTrimRegionChange).toHaveBeenCalled();
    expect(mockOnClipRegionChange).not.toHaveBeenCalled();
  });
});
