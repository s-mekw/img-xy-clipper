// テストファイル: src/components/__tests__/PreviewPanel.test.tsx
// 【テスト対象】: PreviewPanelコンポーネント（選択範囲のリアルタイム拡大プレビュー表示）
// 【テスト目的】: TC-001〜TC-013 のテストケースを実装
// 【テストフレームワーク】: Vitest + @testing-library/react

import { render } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import PreviewPanel from "../PreviewPanel";

// 【テスト用最小PNGデータ】: 1x1ピクセルの透明PNG（Base64エンコード）
// 【選択理由】: 実際の画像ファイルを使わずにBase64画像データをテストするための最小サイズ
const MINIMAL_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ============================================================
// PreviewPanelコンポーネントのテストスイート
// ============================================================
describe("PreviewPanel", () => {
  // 【テスト前準備】: Canvas 2D APIのモック設定
  // 【環境初期化】: 前のテストのdrawImage呼び出し履歴をクリアし、クリーンな状態にする
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
  // TC-001: Canvas要素がレンダリングされる
  // ============================================================
  test("TC-001: Canvas要素がレンダリングされる", () => {
    // 【テスト目的】: PreviewPanelコンポーネントがマウントされた際に、canvas要素がDOMに存在すること
    // 【テスト内容】: 有効なpropsでコンポーネントをレンダリングしてcanvas要素の存在を確認
    // 【期待される動作】: コンポーネントが正常にレンダリングされ、canvas要素が生成される
    // 🔵 信頼性レベル: note.mdのPreviewPanel設計・既存ImageCanvas.test.tsxのパターンより

    // 【テストデータ準備】: 画像が読み込まれた状態の標準的なpropsを設定
    // 【初期条件設定】: imageData=Base64文字列, imageWidth=200, imageHeight=300, topY=0, bottomY=300
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 0,
      bottomY: 300,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: PreviewPanelコンポーネントをレンダリング
    // 【処理内容】: 有効なpropsでPreviewPanelをレンダリングする
    const { container } = render(<PreviewPanel {...props} />);

    // 【結果検証】: canvas要素が存在すること
    // 【期待値確認】: PreviewPanelはCanvas APIで描画するため、canvas要素が必須
    expect(container.querySelector("canvas")).not.toBeNull(); // 【確認内容】: canvas要素がDOMに存在する 🔵
  });

  // ============================================================
  // TC-002: 初期マウント時にCanvas描画が実行される
  // ============================================================
  test("TC-002: 初期マウント時にdrawImageが呼ばれる", async () => {
    // 【テスト目的】: 有効なpropsでコンポーネントがマウントされた際に、Canvas 2DコンテキストのdrawImageが呼ばれること
    // 【テスト内容】: Base64画像データとクリップ範囲を渡してdrawImageが呼ばれるか検証
    // 【期待される動作】: useEffect内でBase64画像がロードされ、drawImageでソース範囲指定描画が実行される
    // 🔵 信頼性レベル: note.mdのCanvas描画フロー・要件定義REQ-004の受け入れ基準より

    // 【テストデータ準備】: Base64エンコード済みの最小PNGとクリップ範囲を設定
    // 【初期条件設定】: imageData=有効なBase64, topY=50, bottomY=250の状態
    // 【前提条件確認】: Canvas 2Dコンテキストのモックがsetup.tsで設定済み
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: PreviewPanelコンポーネントをレンダリング
    // 【処理内容】: useEffect内でBase64→Image→drawImageの描画フローが実行される
    // 【実行タイミング】: マウント時にuseEffectが発火し、Canvas描画が実行される
    render(<PreviewPanel {...props} />);

    // 【結果検証】: drawImageが呼ばれること
    // 【期待値確認】: 有効な画像データとクリップ範囲が渡されれば描画が実行されるべき
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    // 【確認内容】: drawImageが少なくとも1回呼ばれる 🔵
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  // ============================================================
  // TC-003: drawImageに正しいソース範囲パラメータが渡される（上下結合描画）
  // ============================================================
  test("TC-003: drawImageに上部と下部の正しいソース範囲パラメータが渡される", () => {
    // 【テスト目的】: 中央除去後の上部+下部がそれぞれ正しいソース範囲でdrawImageされること
    // 【テスト内容】: topY=50, bottomY=250, imageHeight=300 → 上部50px + 下部50px の2回描画
    // 🔵 信頼性レベル: note.mdのCanvas描画戦略・要件定義の入出力仕様より

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    render(<PreviewPanel {...props} />);

    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    // 【確認内容】: drawImageが2回呼ばれる（上部+下部） 🔵
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);

    // 【上部描画確認】: 上部(0..50)が描画先の先頭に描画される
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      expect.anything(), // image
      0, 0, 200, 50,     // sx, sy, sw, sh（上部: 0..topY）
      0, 0,              // dx, dy
      expect.any(Number), expect.any(Number), // dw, dh
    );

    // 【下部描画確認】: 下部(250..300)が描画先の上部の下に描画される
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      expect.anything(), // image
      0, 250, 200, 50,   // sx, sy, sw, sh（下部: bottomY..height）
      0, expect.any(Number), // dx, dy（dy = topCanvasH）
      expect.any(Number), expect.any(Number), // dw, dh
    );
  });

  // ============================================================
  // TC-004: topY変更時にCanvasが再描画される
  // ============================================================
  test("TC-004: topY変更時にCanvasが再描画される", () => {
    // 【テスト目的】: topY propsが変更された際に、clearRectとdrawImageが再度呼ばれること
    // 【テスト内容】: topYを50から100に変更して再描画が起きるか確認
    // 【期待される動作】: useEffectの依存配列にtopYが含まれており、変更時にCanvas再描画がトリガーされる
    // 🔵 信頼性レベル: 要件定義REQ-004「ドラッグ範囲変更に追従して拡大表示が更新される」より

    // 【テストデータ準備】: 初期状態でtopY=50, bottomY=250の状態のpropsを設定
    // 【初期条件設定】: ユーザーが上端線をドラッグするシナリオを再現
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: 初期レンダリング後にtopYを変更してrerender
    // 【処理内容】: 初期描画→topY変更→再描画のフローを検証
    const { rerender } = render(<PreviewPanel {...props} />);

    // 【状態確認】: 初期描画でのdrawImage呼び出し回数を記録
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
      clearRect: ReturnType<typeof vi.fn>;
    };
    const initialCallCount = mockCtx.drawImage.mock.calls.length;

    // topYを50から100に変更してrerender
    rerender(
      <PreviewPanel
        imageData={MINIMAL_PNG_BASE64}
        imageWidth={200}
        imageHeight={300}
        topY={100}
        bottomY={250}
        trimTopY={0}
        trimBottomY={300}
        fillRightX={200}
      />
    );

    // 【結果検証】: drawImageが再度呼ばれること（合計呼び出し回数が増加）
    // 【期待値確認】: topY変更はプレビュー範囲の変更を意味し、再描画が必須
    expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThan(initialCallCount); // 【確認内容】: rerender後にdrawImageが追加で呼ばれる 🔵
  });

  // ============================================================
  // TC-005: bottomY変更時にCanvasが再描画される
  // ============================================================
  test("TC-005: bottomY変更時にCanvasが再描画される", () => {
    // 【テスト目的】: bottomY propsが変更された際に、Canvasが再描画されること
    // 【テスト内容】: bottomYを250から200に変更して再描画が起きるか確認
    // 【期待される動作】: useEffectの依存配列にbottomYが含まれており、変更時にCanvas再描画がトリガーされる
    // 🔵 信頼性レベル: 要件定義REQ-004の受け入れ基準より

    // 【テストデータ準備】: 初期状態でtopY=50, bottomY=250の状態のpropsを設定
    // 【初期条件設定】: ユーザーが下端線をドラッグするシナリオを再現
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: 初期レンダリング後にbottomYを変更してrerender
    // 【処理内容】: 初期描画→bottomY変更→再描画のフローを検証
    const { rerender } = render(<PreviewPanel {...props} />);

    // 【状態確認】: 初期描画でのdrawImage呼び出し回数を記録
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    const initialCallCount = mockCtx.drawImage.mock.calls.length;

    // bottomYを250から200に変更してrerender
    rerender(
      <PreviewPanel
        imageData={MINIMAL_PNG_BASE64}
        imageWidth={200}
        imageHeight={300}
        topY={50}
        bottomY={200}
        trimTopY={0}
        trimBottomY={300}
        fillRightX={200}
      />
    );

    // 【結果検証】: drawImageが再度呼ばれること
    // 【期待値確認】: bottomY変更はクリップ高さの変更を意味し、拡大率も変わるため再描画が必須
    expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThan(initialCallCount); // 【確認内容】: rerender後にdrawImageが追加で呼ばれる 🔵
  });

  // ============================================================
  // TC-006: 再描画前にclearRectが呼ばれる
  // ============================================================
  test("TC-006: 再描画前にclearRectでCanvasがクリアされる", () => {
    // 【テスト目的】: Canvas描画の前にclearRectが呼ばれ、前回の描画内容がクリアされること
    // 【テスト内容】: 有効なpropsでレンダリングして、clearRectが呼ばれるか確認
    // 【期待される動作】: drawImageの前にclearRect(0, 0, canvasWidth, canvasHeight)が呼ばれる
    // 🔵 信頼性レベル: note.mdのCanvas描画仕様「Canvas描画前にclearRectで初期化すること」より

    // 【テストデータ準備】: 描画が実行される標準的な状態のpropsを設定
    // 【初期条件設定】: imageData=Base64文字列, topY=50, bottomY=250の有効な状態
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: PreviewPanelコンポーネントをレンダリング
    // 【処理内容】: Canvas描画フロー（clearRect→drawImage）が実行される
    render(<PreviewPanel {...props} />);

    // 【結果検証】: clearRectが呼ばれること
    // 【期待値確認】: Canvas再描画時に前回の描画内容が残ると表示が崩れるため、クリアが必須
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      clearRect: ReturnType<typeof vi.fn>;
    };
    expect(mockCtx.clearRect).toHaveBeenCalled(); // 【確認内容】: clearRectが少なくとも1回呼ばれる 🔵
  });

  // ============================================================
  // TC-007: imageData変更時にImageキャッシュが更新される
  // ============================================================
  test("TC-007: imageData変更時にプレビューが新しい画像で再描画される", () => {
    // 【テスト目的】: imageData propsが変更された際に、新しい画像データでCanvas描画が更新されること
    // 【テスト内容】: imageDataを変更してrerender後にdrawImageが再度呼ばれるか確認
    // 【期待される動作】: 新しいBase64データがImageオブジェクトにロードされ、drawImageが再実行される
    // 🟡 信頼性レベル: 要件定義の使用例4.6「imageDataの変更（画像切り替え）」から妥当な推測

    // 【テストデータ準備】: 初期のBase64画像データを設定
    // 【初期条件設定】: ユーザーが別の画像を読み込むシナリオを再現
    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: 初期レンダリング後にimageDataを変更してrerender
    // 【処理内容】: 初期描画→imageData変更→画像再ロード→再描画のフローを検証
    const { rerender } = render(<PreviewPanel {...props} />);

    // 【状態確認】: 初期描画でのdrawImage呼び出し回数を記録
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    const initialCallCount = mockCtx.drawImage.mock.calls.length;

    // 別の画像データに変更（実際には同じBase64を使うが、変更を通知するためにsuffixを変えた文字列）
    // 注意: jsdomのImageモックではsrcの変更は検知できないため、有効なBase64を再設定
    const newImageData =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==";
    rerender(
      <PreviewPanel
        imageData={newImageData}
        imageWidth={200}
        imageHeight={300}
        topY={50}
        bottomY={250}
        trimTopY={0}
        trimBottomY={300}
        fillRightX={200}
      />
    );

    // 【結果検証】: drawImageが再度呼ばれること
    // 【期待値確認】: imageData変更はuseEffectの依存配列に含まれ、Imageキャッシュ更新と再描画が必須
    expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThan(initialCallCount); // 【確認内容】: rerender後にdrawImageが追加で呼ばれる 🟡
  });

  // ============================================================
  // TC-008: imageDataがnullの場合に描画が実行されない
  // ============================================================
  test("TC-008: imageDataがnullの場合にdrawImageが呼ばれない", () => {
    // 【テスト目的】: 画像が未読込（imageData=null）の状態でコンポーネントがマウントされる場合の動作確認
    // 【テスト内容】: imageData=nullでレンダリングしてdrawImageが呼ばれないことを確認
    // 【期待される動作】: drawImageが呼ばれない。canvas要素自体は存在する
    // 🔵 信頼性レベル: 要件定義の使用例4.4「imageDataがnullの場合」・ImageCanvasのTC-008パターンより

    // 【テストデータ準備】: 画像データが存在しない状態のpropsを設定
    // 【初期条件設定】: アプリ起動直後で画像がまだ読み込まれていない初期状態
    const props = {
      imageData: null,
      imageWidth: 0,
      imageHeight: 0,
      topY: 0,
      bottomY: 0,
      trimTopY: 0,
      trimBottomY: 0,
      fillRightX: 0,
    };

    // 【実際の処理実行】: 画像なし状態でコンポーネントをレンダリング
    // 【処理内容】: imageData=nullのpropsでPreviewPanelをレンダリング
    const { container } = render(<PreviewPanel {...props} />);

    // 【結果検証】: canvas要素は存在するがdrawImageは呼ばれないこと
    // 【期待値確認】: 画像データなしの状態では描画が実行されるべきでない
    expect(container.querySelector("canvas")).not.toBeNull(); // 【確認内容】: canvas要素がDOMに存在する（クラッシュしない）🔵

    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    expect(mockCtx.drawImage).not.toHaveBeenCalled(); // 【確認内容】: imageData=nullの場合はdrawImageが呼ばれない 🔵
  });

  // ============================================================
  // TC-009: Canvas 2Dコンテキスト取得失敗時に描画がスキップされる
  // ============================================================
  test("TC-009: getContext('2d')がnullを返す場合にエラーが発生しない", () => {
    // 【テスト目的】: Canvas 2Dコンテキストが取得できない場合の防御的動作を確認
    // 【テスト内容】: getContext('2d')がnullを返すようにモックを変更してレンダリング
    // 【期待される動作】: エラーが発生せず、コンポーネントが正常にレンダリングされる
    // 🔴 信頼性レベル: 要件定義の使用例4.7「Canvas 2Dコンテキスト取得失敗」から推測（実運用では発生しにくい）

    // 【テストデータ準備】: getContextがnullを返すようにモックを設定
    // 【初期条件設定】: 通常のWebView2環境では発生しないが、防御的実装として検証
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as typeof HTMLCanvasElement.prototype.getContext;

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 50,
      bottomY: 250,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    // 【実際の処理実行】: getContext=nullの状態でコンポーネントをレンダリング
    // 【処理内容】: 防御的nullチェックにより例外なく処理される
    expect(() => {
      render(<PreviewPanel {...props} />);
    }).not.toThrow(); // 【確認内容】: エラー（例外）が発生しない 🔴

    // 【後処理】: モックを元に戻す
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  // ============================================================
  // TC-010: クリップ高さが0の場合（topY === bottomY）
  // ============================================================
  test("TC-010: topYとbottomYが同じ値の場合（除去なし）にエラーが発生しない", () => {
    // 【テスト目的】: topY===bottomY（除去範囲0）でエラーが発生せず、全画像がプレビューされること
    // 【テスト内容】: topY=100, bottomY=100 → 上部100px + 下部200px = 300px（全体が残る）
    // 🟡 信頼性レベル: 設計修正「topY==bottomYは除去なし」より

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 100,
      bottomY: 100,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    expect(() => {
      render(<PreviewPanel {...props} />);
    }).not.toThrow();

    // 【確認内容】: drawImageが呼ばれること（上部+下部の2回描画）
    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  // ============================================================
  // TC-011: クリップ高さが1pxの場合（最小有効クリップ）
  // ============================================================
  test("TC-011: 除去範囲が1pxの場合にプレビューが描画される", () => {
    // 【テスト目的】: 最小除去範囲（1px）でdrawImageが正常に呼ばれること
    // 【テスト内容】: topY=100, bottomY=101 → 上部100px + 下部199px = 299px が残る
    // 🟡 信頼性レベル: 境界値テストとして妥当な推測

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 100,
      bottomY: 101,
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    render(<PreviewPanel {...props} />);

    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    // 【確認内容】: drawImageが2回呼ばれる（上部+下部） 🟡
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);

    // 【上部検証】: 上部(0..100)が描画される。sh=100
    const topCallArgs = mockCtx.drawImage.mock.calls[0];
    expect(topCallArgs[4]).toBe(100); // sh = topY = 100

    // 【下部検証】: 下部(101..300)が描画される。sh=199
    const bottomCallArgs = mockCtx.drawImage.mock.calls[1];
    expect(bottomCallArgs[4]).toBe(199); // sh = imageHeight - bottomY = 199
  });

  // ============================================================
  // TC-012: topY=0, bottomY=imageHeightの場合（全範囲選択）
  // ============================================================
  test("TC-012: 除去なし（topY=0, bottomY=0）の場合に画像全体がプレビュー表示される", () => {
    // 【テスト目的】: 除去なし（topY=0, bottomY=0）で画像全体が1回のdrawImageで描画されること
    // 【テスト内容】: 画像読み込み直後の初期状態（除去なし）でdrawImageのパラメータを検証
    // 🔵 信頼性レベル: 設計修正「初期値 clipTopY=0, clipBottomY=0（除去なし）」より

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 200,
      imageHeight: 300,
      topY: 0,
      bottomY: 0, // 除去なし
      trimTopY: 0,
      trimBottomY: 300,
      fillRightX: 200,
    };

    render(<PreviewPanel {...props} />);

    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    // 【確認内容】: drawImageが1回呼ばれる（上部0px=なし、下部300px=全体） 🔵
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      expect.anything(), // image
      0,                  // sx = 0
      0,                  // sy = bottomY = 0
      200,                // sw = imageWidth = 200
      300,                // sh = imageHeight - bottomY = 300（全体）
      0,                  // dx = 0
      0,                  // dy = topCanvasH = 0
      expect.any(Number), // dw = canvasWidth
      expect.any(Number), // dh = canvasHeight
    );
  });

  // ============================================================
  // TC-013: 大規模画像（4000x3000px）での描画
  // ============================================================
  test("TC-013: 大規模画像でもプレビューが正常に描画される", () => {
    // 【テスト目的】: 大規模画像（4000x3000px）でもdrawImageが正しいパラメータで呼ばれること
    // 【テスト内容】: topY=500, bottomY=2500 → 上部500px + 下部500px の2回描画
    // 🟡 信頼性レベル: 要件定義の制約条件「大規模画像（4000x3000px等）でも効率的にプレビュー表示可能」から妥当な推測

    const props = {
      imageData: MINIMAL_PNG_BASE64,
      imageWidth: 4000,
      imageHeight: 3000,
      topY: 500,
      bottomY: 2500,
      trimTopY: 0,
      trimBottomY: 3000,
      fillRightX: 4000,
    };

    render(<PreviewPanel {...props} />);

    const mockCtx = HTMLCanvasElement.prototype.getContext("2d") as unknown as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    // 【確認内容】: drawImageが2回呼ばれる（上部500px + 下部500px） 🟡
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);

    // 【上部描画確認】: 上部(0..500)
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0, 0, 4000, 500,
      0, 0,
      expect.any(Number), expect.any(Number),
    );

    // 【下部描画確認】: 下部(2500..3000)
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0, 2500, 4000, 500,
      0, expect.any(Number),
      expect.any(Number), expect.any(Number),
    );
  });
});
