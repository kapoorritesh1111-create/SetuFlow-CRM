export type MapPan = {
  x: number;
  y: number;
};

export type MapBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
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

export function getFocusedCountryView({
  bounds,
  mapWidth,
  mapHeight,
  padding = 54,
}: {
  bounds: MapBounds;
  mapWidth: number;
  mapHeight: number;
  padding?: number;
}) {
  const countryWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const countryHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const usableWidth = Math.max(mapWidth - padding * 2, 1);
  const usableHeight = Math.max(mapHeight - padding * 2, 1);
  const zoom = clampMapZoom(Math.min(usableWidth / countryWidth, usableHeight / countryHeight));
  const countryCenterX = bounds.minX + countryWidth / 2;
  const countryCenterY = bounds.minY + countryHeight / 2;

  return {
    zoom,
    pan: {
      x: mapWidth / 2 - countryCenterX * zoom,
      y: mapHeight / 2 - countryCenterY * zoom,
    },
  };
}
