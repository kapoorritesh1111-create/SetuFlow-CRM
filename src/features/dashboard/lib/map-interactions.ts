export type MapPan = {
  x: number;
  y: number;
};

export type PointerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  moved: boolean;
};

export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 2.8;
export const MAP_ZOOM_STEP = 0.2;
export const MAP_DRAG_THRESHOLD_PX = 6;

export function roundMapZoom(value: number) {
  return Number(value.toFixed(1));
}

export function clampMapZoom(value: number) {
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, roundMapZoom(value)));
}

export function getZoomInValue(currentZoom: number) {
  return clampMapZoom(currentZoom + MAP_ZOOM_STEP);
}

export function getZoomOutValue(currentZoom: number) {
  return clampMapZoom(currentZoom - MAP_ZOOM_STEP);
}

export function getResetMapPan(): MapPan {
  return { x: 0, y: 0 };
}

export function hasExceededMapDragThreshold(deltaX: number, deltaY: number) {
  return Math.abs(deltaX) > MAP_DRAG_THRESHOLD_PX || Math.abs(deltaY) > MAP_DRAG_THRESHOLD_PX;
}

export function getDraggedMapPan(dragState: Pick<PointerDragState, 'panX' | 'panY'>, deltaX: number, deltaY: number): MapPan {
  return {
    x: dragState.panX + deltaX,
    y: dragState.panY + deltaY,
  };
}
