// TODO: TASK-0003 で実装予定
// ドラッグ状態管理フック（上端・下端Y座標のドラッグ操作を管理）

import { useState } from "react";

export interface ClipRegion {
  topY: number;
  bottomY: number;
}

export function useClipRegion(imageHeight: number) {
  const [region, setRegion] = useState<ClipRegion>({
    topY: 0,
    bottomY: imageHeight,
  });

  return { region, setRegion };
}
