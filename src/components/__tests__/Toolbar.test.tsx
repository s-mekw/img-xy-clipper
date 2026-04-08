// テストファイル: src/components/__tests__/Toolbar.test.tsx
// 【テスト対象】: Toolbarコンポーネント（src/components/Toolbar.tsx）
// 【テスト目的】: TC-011〜TC-014, TC-016〜TC-020, TC-024 のテストケースを実装
// 【テストフレームワーク】: Vitest + @testing-library/react + userEvent
// 【テスト方針】: props 経由で動作を制御する Toolbar の UI テスト

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// 【テスト対象のコンポーネントインポート】
// 【注意】: src/components/Toolbar.tsx の Toolbar コンポーネントを named export で
//          実装する必要がある。現時点では未実装のため、テストは必ず失敗する。
import { Toolbar } from "../Toolbar";

// ============================================================
// Toolbar コンポーネントのテストスイート
// ============================================================
describe("Toolbar", () => {
  // 【テスト前準備】: モックのリセット
  // 【環境初期化】: 前のテストのモック呼び出し記録をクリアする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 【テスト後処理】: モック状態の復元
  // 【状態復元】: 次のテストに影響しないようモック実装を元に戻す
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // TC-011: 「ファイルを開く」ボタン表示
  // ============================================================
  test("TC-011: Toolbarに「ファイルを開く」ボタンが表示される", () => {
    // 【テスト目的】: Toolbar コンポーネントに「ファイルを開く」ボタンが存在すること
    // 【テスト内容】: 初期状態のpropsでレンダリングして「ファイルを開く」ボタンの存在を確認
    // 【期待される動作】: ボタンがDOM上にレンダリングされる
    // 🔵 信頼性レベル: TASK-0006 完了条件より

    // 【テストデータ準備】: 初期状態のToolbar props（画像未読込）
    // 【初期条件設定】: アプリ起動直後の状態（isLoading=false, isSaving=false, isImageLoaded=false）

    // 【実際の処理実行】: 初期状態でToolbarをレンダリング
    // 【処理内容】: デフォルト状態のpropsでコンポーネントを描画する
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 「ファイルを開く」ボタンが表示されること
    // 【期待値確認】: Toolbar UI の基本構造として必須のボタン
    expect(screen.getByText("ファイルを開く")).toBeInTheDocument(); // 【確認内容】: 「ファイルを開く」テキストのボタンがDOMに存在する 🔵
  });

  // ============================================================
  // TC-012: 「保存」ボタン表示
  // ============================================================
  test("TC-012: Toolbarに「保存」ボタンが表示される", () => {
    // 【テスト目的】: Toolbar コンポーネントに「保存」ボタンが存在すること
    // 【テスト内容】: 画像読み込み済みpropsでレンダリングして「保存」ボタンの存在を確認
    // 【期待される動作】: ボタンがDOM上にレンダリングされる
    // 🔵 信頼性レベル: TASK-0006 完了条件より

    // 【テストデータ準備】: 画像読み込み済みのToolbar props
    // 【初期条件設定】: 画像読み込み完了後の状態（isImageLoaded=true）

    // 【実際の処理実行】: 画像読み込み済み状態でToolbarをレンダリング
    // 【処理内容】: 保存ボタンが存在することをDOMで確認する
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={true}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 「保存」ボタンが表示されること
    // 【期待値確認】: Toolbar UI の基本構造として必須のボタン
    expect(screen.getByText("保存")).toBeInTheDocument(); // 【確認内容】: 「保存」テキストのボタンがDOMに存在する 🔵
  });

  // ============================================================
  // TC-013: 「ファイルを開く」ボタンクリックで onLoadImage が呼ばれる
  // ============================================================
  test("TC-013: 「ファイルを開く」ボタンクリックでonLoadImageが呼ばれる", async () => {
    // 【テスト目的】: ボタンクリック時に親から渡された onLoadImage コールバックが呼ばれること
    // 【テスト内容】: 有効状態のボタンをクリックして onLoadImage が1回呼ばれることを確認
    // 【期待される動作】: onLoadImage が1回呼ばれる
    // 🔵 信頼性レベル: 要件定義書2.1 IToolbarProps の onLoadImage コールバック定義より

    // 【テストデータ準備】: コールバックをモック関数として作成
    // 【初期条件設定】: 読み込み可能な初期状態（isLoading=false）
    const mockOnLoadImage = vi.fn();

    // 【実際の処理実行】: Toolbarをレンダリングしてボタンをクリック
    // 【処理内容】: userEvent でボタンをクリックし、コールバックが呼ばれるか確認
    const user = userEvent.setup();
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={mockOnLoadImage}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: onLoadImage が1回呼ばれること
    // 【期待値確認】: ボタンクリックとコールバックが正しく連携している
    expect(mockOnLoadImage).toHaveBeenCalledTimes(1); // 【確認内容】: onLoadImage が正確に1回呼ばれる 🔵
  });

  // ============================================================
  // TC-014: 「保存」ボタンクリックで onSaveImage が呼ばれる
  // ============================================================
  test("TC-014: 「保存」ボタンクリックでonSaveImageが呼ばれる", async () => {
    // 【テスト目的】: 画像読み込み済み状態で保存ボタンクリック時に onSaveImage が呼ばれること
    // 【テスト内容】: isImageLoaded=true の保存ボタンをクリックして onSaveImage が1回呼ばれることを確認
    // 【期待される動作】: onSaveImage が1回呼ばれる
    // 🔵 信頼性レベル: 要件定義書2.1 IToolbarProps の onSaveImage コールバック定義より

    // 【テストデータ準備】: コールバックをモック関数として作成
    // 【初期条件設定】: 画像読み込み済みで保存可能な状態（isImageLoaded=true, isSaving=false）
    const mockOnSaveImage = vi.fn();

    // 【実際の処理実行】: Toolbarをレンダリングして保存ボタンをクリック
    // 【処理内容】: userEvent で保存ボタンをクリックし、コールバックが呼ばれるか確認
    const user = userEvent.setup();
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={true}
        onLoadImage={vi.fn()}
        onSaveImage={mockOnSaveImage}
        onSaveAsImage={vi.fn()}
      />
    );

    await user.click(screen.getByText("保存"));

    // 【結果検証】: onSaveImage が1回呼ばれること
    // 【期待値確認】: 保存ボタンクリックとコールバックが正しく連携している
    expect(mockOnSaveImage).toHaveBeenCalledTimes(1); // 【確認内容】: onSaveImage が正確に1回呼ばれる 🔵
  });

  // ============================================================
  // TC-016: isLoading=true の場合「ファイルを開く」ボタンが無効化される
  // ============================================================
  test("TC-016: isLoading時に「ファイルを開く」ボタンが無効化される", () => {
    // 【テスト目的】: ファイル読み込み中に再度読み込み操作を防止するためボタンが無効化されること
    // 【テスト内容】: isLoading=true でレンダリングして「ファイルを開く」ボタンの disabled 属性を確認
    // 【期待される動作】: ボタンの disabled 属性が true
    // 🔵 信頼性レベル: 要件定義書2.1 ボタン有効/無効制御ルール表より

    // 【テストデータ準備】: 読み込み中のToolbar props
    // 【初期条件設定】: ファイル読み込み中の状態（isLoading=true）

    // 【実際の処理実行】: isLoading=true でToolbarをレンダリング
    // 【処理内容】: 読み込み中状態のボタン制御を確認する
    render(
      <Toolbar
        isLoading={true}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 「ファイルを開く」ボタンが無効化されていること
    // 【期待値確認】: 二重読み込みによる状態不整合を物理的にブロックする
    expect(screen.getByText("ファイルを開く")).toBeDisabled(); // 【確認内容】: ボタンの disabled 属性が true 🔵
  });

  // ============================================================
  // TC-017: isImageLoaded=false の場合「保存」ボタンが無効化される
  // ============================================================
  test("TC-017: 画像未読込時に「保存」ボタンが無効化される", () => {
    // 【テスト目的】: 画像が読み込まれていない状態で保存操作を防止するためボタンが無効化されること
    // 【テスト内容】: isImageLoaded=false でレンダリングして「保存」ボタンの disabled 属性を確認
    // 【期待される動作】: 「保存」ボタンの disabled 属性が true
    // 🔵 信頼性レベル: 要件定義書2.1 ボタン有効/無効制御ルール表より

    // 【テストデータ準備】: 画像未読込のToolbar props
    // 【初期条件設定】: アプリ起動直後（isImageLoaded=false）

    // 【実際の処理実行】: isImageLoaded=false でToolbarをレンダリング
    // 【処理内容】: 保存対象がない状態のボタン制御を確認する
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 「保存」ボタンが無効化されていること
    // 【期待値確認】: 保存対象がない無効なIPC呼び出しをブロックする
    expect(screen.getByText("保存")).toBeDisabled(); // 【確認内容】: 「保存」ボタンの disabled 属性が true 🔵
  });

  // ============================================================
  // TC-018: isSaving=true の場合「保存」ボタンが無効化される
  // ============================================================
  test("TC-018: 保存中に「保存」ボタンが無効化される", () => {
    // 【テスト目的】: 保存処理中に再度保存操作を防止するためボタンが無効化されること
    // 【テスト内容】: isSaving=true でレンダリングして「保存」ボタンの disabled 属性を確認
    // 【期待される動作】: 「保存」ボタンの disabled 属性が true
    // 🔵 信頼性レベル: 要件定義書2.1 ボタン有効/無効制御ルール表より

    // 【テストデータ準備】: 保存中のToolbar props
    // 【初期条件設定】: IPC clip_and_save コマンド実行中（isSaving=true）

    // 【実際の処理実行】: isSaving=true でToolbarをレンダリング
    // 【処理内容】: 保存中状態のボタン制御を確認する
    render(
      <Toolbar
        isLoading={false}
        isSaving={true}
        isImageLoaded={true}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 「保存」ボタンが無効化されていること
    // 【期待値確認】: 二重保存による競合を物理的にブロックする
    // 【改善内容】: isSaving=true 時はテキストが「保存中...」に変わるため、正規表現で検索
    // 🔵 Toolbar.tsx の { isSaving ? "保存中..." : "保存" } の実装に合わせた検証
    expect(screen.getByText("保存中...")).toBeDisabled(); // 【確認内容】: 「保存」ボタンが「保存中...」テキストで無効化されている 🔵
  });

  // ============================================================
  // TC-019: isLoading=true 時に「ファイルを開く」ボタンをクリックしても onLoadImage が呼ばれない
  // ============================================================
  test("TC-019: isLoading時にボタンをクリックしてもonLoadImageが呼ばれない", async () => {
    // 【テスト目的】: 無効化された「ファイルを開く」ボタンのクリックが無視されること
    // 【テスト内容】: isLoading=true の無効ボタンをクリックして onLoadImage が呼ばれないことを確認
    // 【期待される動作】: onLoadImage が呼ばれない（0回）
    // 🟡 信頼性レベル: 要件定義書2.1から妥当な推測（disabled時のクリック動作はHTMLの標準動作）

    // 【テストデータ準備】: コールバックをモック関数として作成
    // 【初期条件設定】: 読み込み中の状態（isLoading=true）でボタンが disabled
    const mockOnLoadImage = vi.fn();

    // 【実際の処理実行】: isLoading=true でToolbarをレンダリングし、無効ボタンをクリック試行
    // 【処理内容】: disabled ボタンはクリックイベントが発火しないことを確認
    const user = userEvent.setup();
    render(
      <Toolbar
        isLoading={true}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={mockOnLoadImage}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // disabled ボタンへのクリック試行（userEvent は disabled ボタンへのクリックを無視する）
    await user.click(screen.getByText("ファイルを開く"));

    // 【結果検証】: onLoadImage が呼ばれないこと
    // 【期待値確認】: disabled 属性により操作がブロックされる
    expect(mockOnLoadImage).not.toHaveBeenCalled(); // 【確認内容】: onLoadImage が呼ばれない（0回）🟡
  });

  // ============================================================
  // TC-020: isImageLoaded=false の場合に保存ボタンクリックしても onSaveImage が呼ばれない
  // ============================================================
  test("TC-020: 画像未読込時に保存ボタンをクリックしてもonSaveImageが呼ばれない", async () => {
    // 【テスト目的】: 画像未読込の無効化された保存ボタンのクリックが無視されること
    // 【テスト内容】: isImageLoaded=false の無効保存ボタンをクリックして onSaveImage が呼ばれないことを確認
    // 【期待される動作】: onSaveImage が呼ばれない（0回）
    // 🟡 信頼性レベル: 要件定義書2.1から妥当な推測

    // 【テストデータ準備】: コールバックをモック関数として作成
    // 【初期条件設定】: 画像未読込の状態（isImageLoaded=false）で保存ボタンが disabled
    const mockOnSaveImage = vi.fn();

    // 【実際の処理実行】: isImageLoaded=false でToolbarをレンダリングし、無効保存ボタンをクリック試行
    // 【処理内容】: disabled 保存ボタンへのクリックが抑制されることを確認
    const user = userEvent.setup();
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={false}
        onLoadImage={vi.fn()}
        onSaveImage={mockOnSaveImage}
        onSaveAsImage={vi.fn()}
      />
    );

    // disabled 保存ボタンへのクリック試行
    await user.click(screen.getByText("保存"));

    // 【結果検証】: onSaveImage が呼ばれないこと
    // 【期待値確認】: 不正なIPC呼び出しを防止する
    expect(mockOnSaveImage).not.toHaveBeenCalled(); // 【確認内容】: onSaveImage が呼ばれない（0回）🟡
  });

  // ============================================================
  // TC-024: 通常状態で両ボタンが有効である
  // ============================================================
  test("TC-024: 通常状態で両ボタンが有効である", () => {
    // 【テスト目的】: 全フラグが正常な場合（isLoading=false, isSaving=false, isImageLoaded=true）に両ボタンが有効であること
    // 【テスト内容】: 通常操作可能な状態でレンダリングして両ボタンの disabled 状態を確認
    // 【期待される動作】: 「ファイルを開く」ボタンと「保存」ボタンの両方が disabled=false
    // 🔵 信頼性レベル: 要件定義書2.1 ボタン有効/無効制御ルール表より

    // 【テストデータ準備】: 全フラグが有効条件を満たす状態のprops
    // 【初期条件設定】: 画像読み込み完了後の通常操作状態（isLoading=false, isSaving=false, isImageLoaded=true）

    // 【実際の処理実行】: 通常状態でToolbarをレンダリング
    // 【処理内容】: 両ボタンが有効であることをDOMで確認する
    render(
      <Toolbar
        isLoading={false}
        isSaving={false}
        isImageLoaded={true}
        onLoadImage={vi.fn()}
        onSaveImage={vi.fn()}
        onSaveAsImage={vi.fn()}
      />
    );

    // 【結果検証】: 両ボタンが有効（disabled=false）であること
    // 【期待値確認】: 有効条件が正しく評価され、ユーザーが操作可能な状態
    expect(screen.getByText("ファイルを開く")).not.toBeDisabled(); // 【確認内容】: 「ファイルを開く」ボタンが有効 🔵
    expect(screen.getByText("保存")).not.toBeDisabled(); // 【確認内容】: 「保存」ボタンが有効 🔵
  });
});
