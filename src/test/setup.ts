// 【テスト前準備】: テスト環境のグローバルセットアップ
// 【環境初期化】: jsdom環境でCanvas APIをモックし、テスト実行を可能にする

/// <reference types="vitest/globals" />

// @testing-library/jest-dom のカスタムマッチャーを登録
// 【追加理由】: toBeInTheDocument, toBeDisabled 等のDOMマッチャーを有効にするため
import "@testing-library/jest-dom";

// Canvas 2D Context のモック（jsdomはCanvas APIを完全にサポートしないため）
const mockCanvasContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  globalAlpha: 1,
};

// HTMLCanvasElement.getContext のモック
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasContext);

// @tauri-apps/api の invoke をモック（テスト環境ではTauri APIが使えないため）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// @tauri-apps/plugin-dialog の open/save をモック（テスト環境ではTauriダイアログが使えないため）
// 🔵 TASK-0006のApp.tsx実装でdialogを使用するため、テスト環境向けにモック追加
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

// 【requestAnimationFrame モック】: テスト環境では rAF を同期的に実行する
// 【理由】: jsdom の rAF は非同期タスクとして扱われるため、テストのアサーション実行前に
//           コールバックが呼ばれない問題を回避するために同期モックで代替する
// 🔵 信頼性レベル: Vitestの公式推奨パターン（fakeTimersの代替）より
globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  // 【同期実行】: コールバックを即座に実行してテストの予測可能性を確保
  callback(performance.now());
  // 【ID返却】: キャンセル用のダミーIDを返す（cancelAnimationFrameと整合）
  return 0;
};

// 【cancelAnimationFrame モック】: rAFの同期モックに対応したキャンセル関数
// 【理由】: 同期モックではIDが常に0のため、実際のキャンセルは不要だがインターフェース互換のために定義
globalThis.cancelAnimationFrame = (_id: number): void => {
  // 【ノーオペレーション】: 同期実行済みのため何もしない
};

// 【Image モック】: jsdom環境では new Image() の onload が自動発火しないため同期モックで代替する
// 【理由】: Base64文字列を src に設定した際に jsdom は実際の画像ロードを実行しないため、
//           onload コールバックが発火せずテストのアサーションが実行前に失敗する問題を回避する
// 🔵 信頼性レベル: jsdom の Image APIモックパターン（TASK-0005テスト要件）より

// 【MockImage コンストラクタ関数】: src セッターで onload を同期発火させるImageモック
// 【実装方針】: TypeScript class のインスタンスプロパティより Object.defineProperty が優先されるよう
//              コンストラクタ関数 + prototype 方式で実装する
function MockImage(this: { onload: (() => void) | null; _src: string }) {
  // 【インスタンス初期化】: onload を null で初期化
  this.onload = null;
  this._src = "";
}

// 【src プロパティ定義】: セッターで onload を同期発火させる
// 【理由】: コンストラクタ関数方式なら class の自動プロパティ設定に干渉されない
Object.defineProperty(MockImage.prototype, "src", {
  get(this: { _src: string }) {
    // 【ゲッター】: 内部 _src 値を返す
    return this._src ?? "";
  },
  set(this: { _src: string; onload: (() => void) | null }, value: string) {
    // 【セッター】: src 設定直後に onload を同期発火させる
    this._src = value;
    if (value && this.onload) {
      // 【同期実行】: テスト内の drawImage アサーションより前に描画完了を保証
      this.onload();
    }
  },
  configurable: true,
});

// グローバル Image コンストラクタをモックに差し替える
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.Image = MockImage as unknown as typeof Image;
