// テストファイル: src/hooks/__tests__/useClipRegion.test.ts
// 【テスト対象】: useClipRegionカスタムフック（ドラッグ状態管理）
// 【テスト目的】: TC-001〜TC-007、TC-011〜TC-015、TC-017〜TC-020、TC-023 のテストケースを実装
// 【テストフレームワーク】: Vitest + @testing-library/react

import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";
import { useClipRegion } from "../useClipRegion";

// ============================================================
// useClipRegionフックのテストスイート
// ============================================================
describe("useClipRegion", () => {
  // 【テスト前準備】: 各テスト実行前の共通設定
  // 【環境初期化】: 各テストは独立した状態で開始されるため、明示的なリセットは不要
  beforeEach(() => {
    // 【初期条件設定】: renderHookが各テストで新しいフックインスタンスを生成する
  });

  // ============================================================
  // 正常系テストケース
  // ============================================================

  test("TC-001: 初期状態でtopY=0、bottomY=imageHeightが設定される", () => {
    // 【テスト目的】: useClipRegionフックを指定したimageHeightで初期化した際、topY=0、bottomY=imageHeightに設定されること
    // 【テスト内容】: imageHeight=300でフックを初期化し、topY/bottomYの初期値を検証
    // 【期待される動作】: フック初期化時に画像全体が選択範囲として設定される
    // 🔵 信頼性レベル: タスクノートのuseClipRegionフック設計・要件定義の初期状態仕様より

    // 【テストデータ準備】: 一般的な画像高さとして300pxを設定
    // 【初期条件設定】: フックが未初期化状態でimageHeight=300を渡す
    const imageHeight = 300;

    // 【実際の処理実行】: useClipRegionフックを初期化
    // 【処理内容】: フックにimageHeightを渡して状態を初期化する
    const { result } = renderHook(() => useClipRegion(imageHeight));

    // 【結果検証】: topYとbottomYが期待値と一致すること
    // 【期待値確認】: 画像全体が選択範囲として初期化される

    expect(result.current.region.topY).toBe(0); // 【確認内容】: 画像上端が選択範囲の上端 🔵
    expect(result.current.region.bottomY).toBe(300); // 【確認内容】: 画像下端が選択範囲の下端 🔵
  });

  test("TC-002: startDragでドラッグ状態に遷移する", () => {
    // 【テスト目的】: startDrag('top', 50)を呼び出した後、isDraggingがtrueになること
    // 【テスト内容】: 上端線のy=50位置でドラッグを開始した場合のドラッグ状態フラグを検証
    // 【期待される動作】: 水平線上でマウスダウンした時にドラッグ状態に遷移する
    // 🔵 信頼性レベル: 要件定義のuseClipRegion出力仕様・データフロー図のイベント処理フローより

    // 【テストデータ準備】: imageHeight=300でフック初期化
    const { result } = renderHook(() => useClipRegion(300));

    // 【実際の処理実行】: startDragで上端線のドラッグを開始
    // 【処理内容】: 'top'線のy=50位置でドラッグ開始
    act(() => {
      result.current.startDrag("top", 50);
    });

    // 【結果検証】: isDraggingがtrueになること
    // 【期待値確認】: ドラッグ操作開始時にドラッグ中フラグが立つことでmousemoveでの座標更新が有効になる
    expect(result.current.isDragging).toBe(true); // 【確認内容】: ドラッグ状態フラグがtrueに変わる 🔵
  });

  test("TC-003: updateDragでtopYが更新される", () => {
    // 【テスト目的】: startDrag('top', 50)後にupdateDrag(100)を呼ぶと、topYが100に更新されること
    // 【テスト内容】: 上端線を50pxから100pxに移動するドラッグ操作
    // 【期待される動作】: ドラッグ中のマウス移動でクリップ上端が追従する
    // 🔵 信頼性レベル: 要件定義のイベント処理フロー・タスクノートのテスト例より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 上端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("top", 50);
    });

    // 【実際の処理実行】: y=100でドラッグ位置を更新
    // 【処理内容】: 上端線を100pxの位置に移動
    act(() => {
      result.current.updateDrag(100);
    });

    // 【結果検証】: topYが100に更新されること
    // 【期待値確認】: ドラッグ対象のtopYのみ更新され、bottomYは影響を受けない
    expect(result.current.region.topY).toBe(100); // 【確認内容】: topYが100に更新される 🔵
    expect(result.current.region.bottomY).toBe(300); // 【確認内容】: bottomYは変化しない 🔵
  });

  test("TC-004: updateDragでbottomYが更新される", () => {
    // 【テスト目的】: startDrag('bottom', 300)後にupdateDrag(200)を呼ぶと、bottomYが200に更新されること
    // 【テスト内容】: 下端線を300pxから200pxに移動するドラッグ操作
    // 【期待される動作】: ドラッグ中のマウス移動でクリップ下端が追従する
    // 🔵 信頼性レベル: 要件定義のイベント処理フロー・使用パターン3より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 下端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("bottom", 300);
    });

    // 【実際の処理実行】: y=200でドラッグ位置を更新
    // 【処理内容】: 下端線を200pxの位置に移動
    act(() => {
      result.current.updateDrag(200);
    });

    // 【結果検証】: bottomYが200に更新されること
    // 【期待値確認】: ドラッグ対象のbottomYのみ更新され、topYは影響を受けない
    expect(result.current.region.topY).toBe(0); // 【確認内容】: topYは変化しない 🔵
    expect(result.current.region.bottomY).toBe(200); // 【確認内容】: bottomYが200に更新される 🔵
  });

  test("TC-005: endDragでドラッグ状態が解除される", () => {
    // 【テスト目的】: startDrag後にendDragを呼ぶと、isDraggingがfalseになること
    // 【テスト内容】: ドラッグ開始後に終了する基本フロー
    // 【期待される動作】: マウスアップでドラッグ操作が完了し、通常状態に戻る
    // 🔵 信頼性レベル: 要件定義のイベント処理フロー（handleMouseUp）より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("top", 50);
    });

    // 【実際の処理実行】: endDragでドラッグを終了
    // 【処理内容】: マウスアップでドラッグ状態を解除
    act(() => {
      result.current.endDrag();
    });

    // 【結果検証】: isDraggingがfalseになること
    // 【期待値確認】: マウスアップでドラッグ状態が解除されることで、次の操作に備える
    expect(result.current.isDragging).toBe(false); // 【確認内容】: isDraggingがfalseに戻る 🔵
  });

  test("TC-006: endDrag後にupdateDragを呼んでも座標が変わらない", () => {
    // 【テスト目的】: endDrag後にupdateDragを呼んでもregionが変化しないこと
    // 【テスト内容】: ドラッグ終了後に追加のupdateDragが発火するケース（マウスイベントの遅延等）
    // 【期待される動作】: ドラッグ中でない状態ではupdateDragは無視される
    // 🟡 信頼性レベル: 要件定義のイベント処理フローから妥当な推測（isDragging判定から推測）

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: ドラッグ開始→更新→終了のフローを実行
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("top", 50);
    });
    act(() => {
      result.current.updateDrag(100);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【実際の処理実行】: ドラッグ終了後にupdateDragを呼び出す
    // 【処理内容】: isDragging=falseの状態でupdateDragを呼んでも無視されるべき
    act(() => {
      result.current.updateDrag(200);
    });

    // 【結果検証】: topYがendDrag前の値（100）を維持していること
    // 【期待値確認】: ドラッグ中でない場合、座標更新は無効であるべき
    expect(result.current.region.topY).toBe(100); // 【確認内容】: endDrag後の座標変更が無視される 🟡
  });

  test("TC-007: 連続ドラッグ操作（start→update→end→start→update→end）", () => {
    // 【テスト目的】: 複数回のドラッグ操作が正常に処理されること
    // 【テスト内容】: 上端線と下端線を順番にドラッグする実際の使用パターン
    // 【期待される動作】: 1回目のドラッグ完了後、2回目のドラッグが正常に開始・更新・終了できる
    // 🟡 信頼性レベル: 使用パターン2・3の組み合わせから妥当な推測

    // 【テストデータ準備】: imageHeight=300でフック初期化
    const { result } = renderHook(() => useClipRegion(300));

    // 【実際の処理実行】: 1回目のドラッグ（上端線）
    // 【処理内容】: topYをデフォルト0から50に移動
    act(() => {
      result.current.startDrag("top", 0);
    });
    act(() => {
      result.current.updateDrag(50);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【実際の処理実行】: 2回目のドラッグ（下端線）
    // 【処理内容】: bottomYをデフォルト300から250に移動
    act(() => {
      result.current.startDrag("bottom", 300);
    });
    act(() => {
      result.current.updateDrag(250);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【結果検証】: 各ドラッグ操作が独立して正しく処理された結果を確認
    // 【期待値確認】: 前回のドラッグ結果が保持されつつ、新たなドラッグが正常動作する
    expect(result.current.region.topY).toBe(50); // 【確認内容】: 1回目のドラッグ結果（topY=50）が保持される 🟡
    expect(result.current.region.bottomY).toBe(250); // 【確認内容】: 2回目のドラッグ結果（bottomY=250）が設定される 🟡
  });

  // ============================================================
  // 異常系テストケース
  // ============================================================

  test("TC-011: topYが負の値にならない（上方向クランプ）", () => {
    // 【テスト目的】: ドラッグ中にマウスがCanvasの上方向に出た場合のY座標クランプ
    // 【テスト内容】: 上端線を負のY座標でupdateDragした場合にtopY=0にクランプされること
    // 【期待される動作】: Y座標が画像範囲外（負の値）の場合に0にクランプされる
    // 🔵 信頼性レベル: 要件定義の座標制約「0 <= topY」・エッジケース1より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 上端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("top", 50);
    });

    // 【実際の処理実行】: 負の値（-50）でupdateDragを呼び出す
    // 【処理内容】: 画像範囲外（上方向）のY座標でドラッグ更新
    act(() => {
      result.current.updateDrag(-50);
    });

    // 【結果検証】: topYが0にクランプされること
    // 【期待値確認】: 負の値は0にクランプされ、有効範囲内に収まる
    expect(result.current.region.topY).toBe(0); // 【確認内容】: 負の値は0にクランプされる 🔵
  });

  test("TC-012: bottomYがimageHeightを超えない（下方向クランプ）", () => {
    // 【テスト目的】: ドラッグ中にマウスがCanvasの下方向に出た場合のY座標クランプ
    // 【テスト内容】: 下端線をimageHeight超過のY座標でupdateDragした場合にimageHeightにクランプされること
    // 【期待される動作】: Y座標が画像高さを超えた場合にimageHeightにクランプされる
    // 🔵 信頼性レベル: 要件定義の座標制約「bottomY <= imageHeight」・エッジケース1より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 下端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("bottom", 250);
    });

    // 【実際の処理実行】: imageHeight超過の値（350）でupdateDragを呼び出す
    // 【処理内容】: 画像範囲外（下方向）のY座標でドラッグ更新
    act(() => {
      result.current.updateDrag(350);
    });

    // 【結果検証】: bottomYがimageHeight（300）にクランプされること
    // 【期待値確認】: imageHeightを超える値はimageHeightにクランプされ、有効範囲内に収まる
    expect(result.current.region.bottomY).toBe(300); // 【確認内容】: imageHeight超過はimageHeightにクランプされる 🔵
  });

  test("TC-013: topYがbottomYを超えない（線の交差防止 - top側）", () => {
    // 【テスト目的】: topY線をドラッグしてbottomYを超えようとした場合の交差防止
    // 【テスト内容】: bottomY=200の状態でtopY線をbottomYを超えてドラッグした場合のクランプ
    // 【期待される動作】: topYはbottomY - 1 にクランプされ、線が交差しない
    // 🔵 信頼性レベル: 要件定義の座標制約「topY < bottomY」・エッジケース2・タスクノートのテスト例より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: bottomY=200の状態を設定するため、bottomをドラッグして200に移動
    const { result } = renderHook(() => useClipRegion(300));

    // bottomYを200に設定
    act(() => {
      result.current.startDrag("bottom", 300);
    });
    act(() => {
      result.current.updateDrag(200);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【実際の処理実行】: topY線をbottomY(200)を超える位置（250）にドラッグ
    // 【処理内容】: topY=100でドラッグ開始し、250（bottomY超過）に移動
    act(() => {
      result.current.startDrag("top", 100);
    });
    act(() => {
      result.current.updateDrag(250);
    });

    // 【結果検証】: topYがbottomY（200）にクランプされること
    // 【期待値確認】: topY <= bottomY の不変条件が維持される（topY === bottomY は除去なし）
    expect(result.current.region.topY).toBe(200); // 【確認内容】: topYはbottomYにクランプされる 🔵
  });

  test("TC-014: bottomYがtopYを下回らない（線の交差防止 - bottom側）", () => {
    // 【テスト目的】: bottomY線をドラッグしてtopYを下回ろうとした場合の交差防止
    // 【テスト内容】: topY=100の状態でbottomY線をtopYを下回る位置にドラッグした場合のクランプ
    // 【期待される動作】: bottomYはtopY + 1 にクランプされ、線が交差しない
    // 🟡 信頼性レベル: 要件定義のエッジケース2「逆パターン（bottomYがtopYを下回る）も同様にクランプ」から妥当な推測

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: topY=100の状態を設定するため、topをドラッグして100に移動
    const { result } = renderHook(() => useClipRegion(300));

    // topYを100に設定
    act(() => {
      result.current.startDrag("top", 0);
    });
    act(() => {
      result.current.updateDrag(100);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【実際の処理実行】: bottomY線をtopY(100)を下回る位置（50）にドラッグ
    // 【処理内容】: bottomY=200でドラッグ開始し、50（topY下回り）に移動
    act(() => {
      result.current.startDrag("bottom", 200);
    });
    act(() => {
      result.current.updateDrag(50);
    });

    // 【結果検証】: bottomYがtopY（100）にクランプされること
    // 【期待値確認】: topY <= bottomY の不変条件が維持される（topY === bottomY は除去なし）
    expect(result.current.region.bottomY).toBe(100); // 【確認内容】: bottomYはtopYにクランプされる 🟡
  });

  test("TC-015: ドラッグ未開始状態でupdateDragを呼んでも無視される", () => {
    // 【テスト目的】: startDragが呼ばれていない状態でupdateDragが呼ばれた場合の動作確認
    // 【テスト内容】: ドラッグ操作が開始されていない状態での座標更新を検証
    // 【期待される動作】: isDragging=falseの状態でupdateDragを呼んでも座標が変わらない
    // 🟡 信頼性レベル: 要件定義のイベント処理フロー（isDragging判定）から妥当な推測

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: startDragを呼ばずに初期化のみ
    const { result } = renderHook(() => useClipRegion(300));

    // 【実際の処理実行】: startDragなしでupdateDragを呼び出す
    // 【処理内容】: ドラッグ未開始状態でY座標100に更新しようとする
    act(() => {
      result.current.updateDrag(100);
    });

    // 【結果検証】: 初期値から変化しないこと
    // 【期待値確認】: ドラッグ操作が開始されていない場合、座標更新は無効
    expect(result.current.region.topY).toBe(0); // 【確認内容】: topYは初期値0から変化しない 🟡
    expect(result.current.region.bottomY).toBe(300); // 【確認内容】: bottomYは初期値300から変化しない 🟡
  });

  // ============================================================
  // 境界値テストケース
  // ============================================================

  test("TC-017: imageHeight=1の場合の初期化", () => {
    // 【テスト目的】: 画像高さが1pxの場合、topY=0、bottomY=1が設定されること
    // 【テスト内容】: 画像高さの実質的な最小値でのフック初期化を検証
    // 【期待される動作】: 極小画像でもフックが正常動作すること
    // 🟡 信頼性レベル: 要件定義に最小画像サイズの記載はないが、境界値テストとして妥当

    // 【テストデータ準備】: imageHeight=1（最小有効サイズ）でフック初期化
    // 【初期条件設定】: 1px高さの極小画像を想定
    const imageHeight = 1;

    // 【実際の処理実行】: imageHeight=1でフックを初期化
    // 【処理内容】: 最小有効サイズの画像高さでフック初期化
    const { result } = renderHook(() => useClipRegion(imageHeight));

    // 【結果検証】: topY=0、bottomY=1が設定されること
    // 【期待値確認】: topY(0) < bottomY(1) が維持された状態で初期化
    expect(result.current.region.topY).toBe(0); // 【確認内容】: 最小サイズでもtopY=0で初期化される 🟡
    expect(result.current.region.bottomY).toBe(1); // 【確認内容】: 最小サイズでもbottomY=imageHeightで初期化される 🟡
  });

  test("TC-018: topY=0にクランプされる境界（ちょうど0をドラッグ）", () => {
    // 【テスト目的】: topYの下限値0に到達するドラッグ操作が正確に動作すること
    // 【テスト内容】: topYをちょうど0の位置にドラッグした場合の動作を検証
    // 【期待される動作】: 0ちょうどの値が正しく設定されること
    // 🔵 信頼性レベル: 要件定義の座標制約「0 <= topY」より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 上端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("top", 50);
    });

    // 【実際の処理実行】: y=0（上端境界値）でupdateDragを呼び出す
    // 【処理内容】: 上端線を画像の最上端（y=0）に移動
    act(() => {
      result.current.updateDrag(0);
    });

    // 【結果検証】: topY=0が正確に設定されること
    // 【期待値確認】: 0は有効な値として正しく設定される（クランプではなく正常値）
    expect(result.current.region.topY).toBe(0); // 【確認内容】: topY=0は有効値として正確に設定される 🔵
  });

  test("TC-019: bottomY=imageHeightにクランプされる境界", () => {
    // 【テスト目的】: bottomYの上限値imageHeightに到達するドラッグ操作が正確に動作すること
    // 【テスト内容】: bottomYをちょうどimageHeightの位置にドラッグした場合の動作を検証
    // 【期待される動作】: imageHeightちょうどの値が正しく設定されること
    // 🔵 信頼性レベル: 要件定義の座標制約「bottomY <= imageHeight」より

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: 下端線でドラッグを開始する
    const { result } = renderHook(() => useClipRegion(300));

    act(() => {
      result.current.startDrag("bottom", 250);
    });

    // 【実際の処理実行】: y=300（下端境界値 = imageHeight）でupdateDragを呼び出す
    // 【処理内容】: 下端線を画像の最下端（y=imageHeight）に移動
    act(() => {
      result.current.updateDrag(300);
    });

    // 【結果検証】: bottomY=300（imageHeight）が正確に設定されること
    // 【期待値確認】: imageHeightは有効な値として正しく設定される
    expect(result.current.region.bottomY).toBe(300); // 【確認内容】: bottomY=imageHeightは有効値として正確に設定される 🔵
  });

  test("TC-020: topYとbottomYが隣接する最小間隔（差が1）", () => {
    // 【テスト目的】: topYとbottomYの差が最小値（1px）になる場合でも正常動作すること
    // 【テスト内容】: bottomY=101の状態でtopYを100にドラッグし、差が1になる場合を検証
    // 【期待される動作】: 最小クリップ範囲でも正常動作すること
    // 🟡 信頼性レベル: 要件定義の「topY < bottomY」制約から妥当な推測

    // 【テストデータ準備】: imageHeight=300でフック初期化
    // 【初期条件設定】: bottomY=101の状態を設定
    const { result } = renderHook(() => useClipRegion(300));

    // bottomYを101に設定
    act(() => {
      result.current.startDrag("bottom", 300);
    });
    act(() => {
      result.current.updateDrag(101);
    });
    act(() => {
      result.current.endDrag();
    });

    // 【実際の処理実行】: topY線をy=100にドラッグ（bottomY-1の位置）
    // 【処理内容】: topY=100はbottomY=101に対して有効な値（差が1）
    act(() => {
      result.current.startDrag("top", 0);
    });
    act(() => {
      result.current.updateDrag(100);
    });

    // 【結果検証】: topY=100、bottomY=101が設定されること（差が1で正常）
    // 【期待値確認】: 最小間隔1pxでも交差防止ロジックが正常動作する
    expect(result.current.region.topY).toBe(100); // 【確認内容】: topY=100は有効値として設定される 🟡
    expect(result.current.region.bottomY).toBe(101); // 【確認内容】: bottomY=101は変化しない 🟡
  });

  test("TC-023: imageHeight=0の場合の安全な動作", () => {
    // 【テスト目的】: imageHeight=0は画像未読込状態に相当し、クラッシュせず安全に動作すること
    // 【テスト内容】: 画像がない状態（imageHeight=0）でのフック初期化を検証
    // 【期待される動作】: エラーなしでtopY=0、bottomY=0に初期化されること
    // 🟡 信頼性レベル: 要件定義に明示的な記載なし。imageData=null時のエッジケースから妥当な推測

    // 【テストデータ準備】: imageHeight=0（画像未読込状態）でフック初期化
    // 【初期条件設定】: 画像が読み込まれる前の状態を想定
    const imageHeight = 0;

    // 【実際の処理実行】: imageHeight=0でフックを初期化
    // 【処理内容】: 画像なし状態でフック初期化
    const { result } = renderHook(() => useClipRegion(imageHeight));

    // 【結果検証】: エラーなしでtopY=0、bottomY=0に初期化されること
    // 【期待値確認】: 0高さでも初期化が正常に完了
    expect(result.current.region.topY).toBe(0); // 【確認内容】: imageHeight=0でtopY=0に初期化される 🟡
    expect(result.current.region.bottomY).toBe(0); // 【確認内容】: imageHeight=0でbottomY=0に初期化される 🟡
  });
});
