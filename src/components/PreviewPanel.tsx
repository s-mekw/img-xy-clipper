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
  imageData: string | null;
  imageWidth: number;
  imageHeight: number;
  topY: number;
  bottomY: number;
  trimTopY: number;
  trimBottomY: number;
  fillRightX: number;
}

// （PREVIEW_WIDTH は廃止: Canvas幅は imageWidth をそのまま使用する）

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
  trimTopY,
  trimBottomY,
  fillRightX,
}) => {
  // 【Ref定義1】: Canvas要素への参照（Canvas API操作のために使用） 🔵
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 【動的Canvas高さ計算】: トリム+クリップ結果の実際のアスペクト比に基づいてCanvas高さを算出
  // 残る部分: [trimTopY..clipTopY] + [clipBottomY..trimBottomY]
  const topPartHeight = topY - trimTopY;
  const bottomPartHeight = trimBottomY - bottomY;
  const keptHeight = topPartHeight + bottomPartHeight;
  const canvasHeight = keptHeight > 0 ? keptHeight : imageHeight;

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

    // 【残存高さ計算】: [trimTopY..clipTopY] + [clipBottomY..trimBottomY] がゼロ以下なら描画スキップ
    const localTopPartHeight = topY - trimTopY;
    const localBottomPartHeight = trimBottomY - bottomY;
    const localKeptHeight = localTopPartHeight + localBottomPartHeight;
    if (localKeptHeight <= 0) return;

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

      // トリム+クリップ結合プレビュー: [trimTopY..clipTopY] + [clipBottomY..trimBottomY]
      const topCanvasH = (localTopPartHeight / localKeptHeight) * canvas.height;
      const bottomCanvasH = (localBottomPartHeight / localKeptHeight) * canvas.height;

      if (localTopPartHeight > 0) {
        ctx.drawImage(
          img,
          0, trimTopY, imageWidth, localTopPartHeight,
          0, 0, canvas.width, topCanvasH,
        );
      }
      if (localBottomPartHeight > 0) {
        ctx.drawImage(
          img,
          0, bottomY, imageWidth, localBottomPartHeight,
          0, topCanvasH, canvas.width, bottomCanvasH,
        );
      }

      // 【塗りつぶし描画】: fillRightX より右側を #fffdea で塗りつぶし
      if (fillRightX < imageWidth) {
        ctx.fillStyle = "#fffdea";
        ctx.fillRect(fillRightX, 0, canvas.width - fillRightX, canvas.height);
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
  }, [imageData, imageWidth, imageHeight, topY, bottomY, trimTopY, trimBottomY, fillRightX]); // 【依存配列】: 変更時に再描画 🔵

  // 【レンダリング】: Canvas要素を描画 🔵
  // 【属性設定】:
  //   - width/height: Canvas描画座標系の基準サイズ（固定値 PREVIEW_WIDTH x PREVIEW_HEIGHT）
  //   - CSSサイズではなくCanvas描画サイズとして設定することで歪みを防止
  return (
    <canvas
      ref={canvasRef}
      id="preview-canvas"
      className="preview-panel"
      width={imageWidth}
      height={canvasHeight}
    />
  );
};

export default PreviewPanel;
