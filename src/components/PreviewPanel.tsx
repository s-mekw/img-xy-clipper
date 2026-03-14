// 選択範囲のリアルタイム拡大プレビュー表示コンポーネント
// 【機能概要】: imageDataのBase64画像から topY〜bottomY 範囲を拡大してCanvasに描画する
// 【設計方針】:
//   1. props.imageData が設定されたら Canvas に topY〜bottomY の拡大プレビューを描画
//   2. topY/bottomY 変更時に Canvas を再描画してリアルタイムプレビューを実現
//   3. imageData=null / clipHeight=0 / getContext失敗 の場合は安全にスキップ
//   4. 同一の imageData を再ロードしないよう useRef によるキャッシュを使用
// 🔵 信頼性レベル: 要件定義REQ-004・note.mdのCanvas描画戦略・Redフェーズ記録より

import React, { useRef, useEffect } from "react";

// 【インターフェース定義】: PreviewPanelコンポーネントのPropsを定義 🔵
// 【参照元】: 要件定義書 セクション2「入力パラメータ（Props）」・note.md「コーディング規約」
interface IPreviewPanelProps {
  /** Base64エンコード済み画像データ（nullの場合はプレビューなし） */
  imageData: string | null;
  /** 画像の幅（px） */
  imageWidth: number;
  /**
   * 画像の高さ（px）
   * 【設計メモ】: 現在の実装では drawImage のソース範囲指定に imageWidth のみ使用し、
   * imageHeight は将来の拡張（アスペクト比計算・Canvas動的サイズ変更等）に備えて
   * props として定義・受け取りを行う。
   */
  imageHeight: number;
  /** クリップ上端のY座標（px）。0 <= topY < bottomY */
  topY: number;
  /** クリップ下端のY座標（px）。topY < bottomY <= imageHeight */
  bottomY: number;
}

// 【定数定義】: プレビューCanvasの固定サイズ（描画先の幅・高さ） 🟡
// 【参照元】: note.md「Canvas描画戦略」の「固定サイズ: 200px x 300px」
// 【設計意図】: 固定サイズにすることで、大規模画像でもメモリ効率的なプレビューを実現
const PREVIEW_WIDTH = 200;

/**
 * 【機能概要】: Base64画像の topY〜bottomY 範囲を拡大してCanvasに描画するコンポーネント
 * 【実装方針】: useRef + useEffect パターン（ImageCanvasコンポーネントのCanvas描画パターンを踏襲）
 * 【パフォーマンス】: cachedImgRef により同一 imageData での重複 Image ロードを回避
 * 【保守性】: useEffect クリーンアップで onload リスナーをクリアしてメモリリークを防止
 * 【テスト対応】: TC-001〜TC-013 の全テストケースを通すための実装
 * 🔵 信頼性レベル: 要件定義REQ-004・architecture.md「コンポーネント構成」・Redフェーズ記録より
 */
const PreviewPanel: React.FC<IPreviewPanelProps> = ({
  imageData,
  imageWidth,
  imageHeight,
  topY,
  bottomY,
}) => {
  // 【Ref定義1】: Canvas要素への参照（Canvas API操作のために使用） 🔵
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 【動的Canvas高さ計算】: クリップ結果の実際のアスペクト比に基づいてCanvas高さを算出
  const keptHeight = topY + (imageHeight - bottomY);
  const canvasHeight = imageWidth > 0 && keptHeight > 0
    ? Math.round(PREVIEW_WIDTH * (keptHeight / imageWidth))
    : PREVIEW_WIDTH;

  // 【Ref定義2】: ロード済み Image オブジェクトのキャッシュ 🔵
  // 【改善内容】: Greenフェーズでは毎回 new Image() を作成していたが、
  //              同一 imageData を繰り返し受け取った場合の再ロードを防ぐため useRef でキャッシュする
  // 【効果】: topY/bottomY 変更のみの再描画時に Image の再ロードコストを削減
  // 【参照元】: Greenフェーズ課題1「Imageキャッシュの欠如」・note.md「キャッシング」
  const cachedImgRef = useRef<HTMLImageElement | null>(null);
  // 【Ref定義3】: キャッシュ済み imageData の追跡（どの imageData がキャッシュされているか管理） 🔵
  const cachedImageDataRef = useRef<string | null>(null);

  // ------------------------------------------------------------
  // Canvas描画エフェクト
  // ------------------------------------------------------------

  useEffect(() => {
    // 【描画スキップ条件1】: imageDataがnullの場合は描画しない（TC-008対応） 🔵
    // 【理由】: 画像未読込の初期状態ではCanvas描画を実行しないことで安全性を確保
    if (!imageData) return;

    // 【Canvas要素取得】: refからCanvas要素を取得 🔵
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 【Canvas 2Dコンテキスト取得】: 取得失敗時はサイレントスキップ（TC-009対応） 🔴
    // 【理由】: WebView2では発生しにくいが防御的プログラミングとしてnullチェックを実施
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 【残存高さ計算】: 上部(0..topY) + 下部(bottomY..imageHeight) の合計がゼロ以下なら描画スキップ 🔵
    const topPartHeight = topY;
    const bottomPartHeight = imageHeight - bottomY;
    const keptHeight = topPartHeight + bottomPartHeight;
    if (keptHeight <= 0) return;

    /**
     * 【ヘルパー関数】: ロード済み Image を Canvas に上下結合して拡大描画する
     * 【単一責任】: drawImage の呼び出しのみを担当（ロード処理とは分離）
     * 【再利用性】: キャッシュヒット時・ロード完了時の両方から呼び出せる
     * 🔵 信頼性レベル: note.md「Canvas描画戦略」より
     * @param img - ロード済みの HTMLImageElement
     */
    const drawPreview = (img: HTMLImageElement): void => {
      // 【Canvas クリア】: 前回の描画内容を削除して再描画の準備 🔵
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 【上下結合プレビュー描画】: 中央を除去した上部+下部を結合して描画 🔵
      const topCanvasH = (topPartHeight / keptHeight) * canvas.height;
      const bottomCanvasH = (bottomPartHeight / keptHeight) * canvas.height;

      if (topPartHeight > 0) {
        ctx.drawImage(
          img,
          0, 0, imageWidth, topPartHeight,
          0, 0, canvas.width, topCanvasH,
        );
      }
      if (bottomPartHeight > 0) {
        ctx.drawImage(
          img,
          0, bottomY, imageWidth, bottomPartHeight,
          0, topCanvasH, canvas.width, bottomCanvasH,
        );
      }
    };

    // 【Imageキャッシュヒット判定】: 同じ imageData が既にキャッシュ済みかを確認 🔵
    // 【改善内容】: Greenフェーズの毎回 new Image() からキャッシュ再利用に改善
    // 【効果】: topY/bottomY のみ変化した再描画では Image ロードコストが発生しない
    if (cachedImgRef.current && cachedImageDataRef.current === imageData) {
      // 【キャッシュヒット】: キャッシュ済みの Image を直接使って描画（再ロード不要）
      drawPreview(cachedImgRef.current);
      return;
    }

    // 【Base64画像ロード】: キャッシュミス時のみ新しい Image オブジェクトを作成してロード 🔵
    // 【理由】: Image.srcの設定は非同期のため、onloadイベント内でCanvasに描画する必要がある
    // 【テスト環境】: setup.ts の MockImage により onload が src 設定直後に同期発火する
    const img = new Image();

    img.onload = () => {
      // 【キャッシュ更新】: ロード完了後に Ref へキャッシュを保存 🔵
      // 【目的】: 以後同じ imageData への変更で再描画される際に再ロードを避ける
      cachedImgRef.current = img;
      cachedImageDataRef.current = imageData;

      drawPreview(img);
    };

    // 【画像ソース設定】: Base64データをImageに設定してロード開始 🔵
    // 【実行タイミング】: src設定後、テスト環境では同期的に onload が発火する
    img.src = imageData;

    // 【クリーンアップ関数】: コンポーネントのアンマウント時またはエフェクト再実行前に呼ばれる 🔵
    // 【改善内容】: Greenフェーズでは cleanup が未実装だったため onload リスナーが残存していた
    // 【効果】: アンマウント後に onload が発火しても Canvas 操作が実行されずメモリリークを防止
    // 【参照元】: Greenフェーズ課題2「cleanup 関数なし」・note.md「メモリリーク防止」
    return () => {
      // 【onload リスナー解除】: ローカルの img への参照を通じて onload をクリア
      // 【理由】: src 設定後に非同期でロードが完了する場合、アンマウント済みコンポーネントの
      //           Canvas への drawImage 呼び出しを防ぐ
      img.onload = null;
    };
  }, [imageData, imageWidth, imageHeight, topY, bottomY]); // 【依存配列】: 変更時に再描画（TC-004, TC-005, TC-007対応） 🔵

  // 【レンダリング】: Canvas要素を描画 🔵
  // 【属性設定】:
  //   - width/height: Canvas描画座標系の基準サイズ（固定値 PREVIEW_WIDTH x PREVIEW_HEIGHT）
  //   - CSSサイズではなくCanvas描画サイズとして設定することで歪みを防止
  return (
    <canvas
      ref={canvasRef}
      id="preview-canvas"
      className="preview-panel"
      width={PREVIEW_WIDTH}
      height={canvasHeight}
    />
  );
};

export default PreviewPanel;
