'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent, type PointerEventHandler } from 'react';
import {
  MIN_MAP_ZOOM,
  getDraggedMapPan,
  getResetMapPan,
  getZoomInValue,
  getZoomOutValue,
  hasExceededMapDragThreshold,
  type MapPan,
  type PointerDragState,
} from '@/features/dashboard/lib/map-interactions';

function getCountryCodeFromElement(element: Element | null) {
  if (!element) return null;
  const countryNode = element.closest<SVGPathElement>('[data-country-code]');
  return countryNode?.dataset.countryCode ?? null;
}

function getCountryCodeFromPointerPosition(clientX: number, clientY: number) {
  if (typeof document === 'undefined') return null;
  return getCountryCodeFromElement(document.elementFromPoint(clientX, clientY));
}

function getRelativePointerPosition(
  event: Pick<ReactPointerEvent<HTMLDivElement>, 'clientX' | 'clientY' | 'currentTarget'>,
) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

export function useWorldMapControls({
  isSelectableCountry,
  onSelectCountry,
}: {
  isSelectableCountry: (countryCode: string) => boolean;
  onSelectCountry: (countryCode: string) => void;
}) {
  const [zoom, setZoom] = useState(MIN_MAP_ZOOM);
  const [pan, setPan] = useState<MapPan>(getResetMapPan());
  const [dragging, setDragging] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<PointerDragState | null>(null);
  const pressedCountryCodeRef = useRef<string | null>(null);

  const onZoomOut = () => {
    setZoom((value) => getZoomOutValue(value));
  };

  const onZoomIn = () => {
    setZoom((value) => getZoomInValue(value));
  };

  const onResetView = () => {
    setZoom(MIN_MAP_ZOOM);
    setPan(getResetMapPan());
    setDragging(false);
    setHoveredCode(null);
    setPointerPosition(null);
    dragStateRef.current = null;
    pressedCountryCodeRef.current = null;
  };

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pressedCountryCodeRef.current = getCountryCodeFromPointerPosition(event.clientX, event.clientY);
    setPointerPosition(getRelativePointerPosition(event));

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const dragState = dragStateRef.current;
    const hoveredCountryCode = getCountryCodeFromPointerPosition(event.clientX, event.clientY);
    setPointerPosition(getRelativePointerPosition(event));

    if (!dragState || dragState.pointerId !== event.pointerId) {
      setHoveredCode(hoveredCountryCode);
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const exceededThreshold = hasExceededMapDragThreshold(deltaX, deltaY);

    if (!dragState.moved && !exceededThreshold) {
      setHoveredCode(hoveredCountryCode);
      return;
    }

    if (!dragState.moved) {
      dragState.moved = true;
      setDragging(true);
      setHoveredCode(null);
    }

    setPan(getDraggedMapPan(dragState, deltaX, deltaY));
  };

  const finishPointerInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setDragging(false);
  };

  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const dragState = dragStateRef.current;
    const releasedCountryCode = getCountryCodeFromPointerPosition(event.clientX, event.clientY);
    const shouldSelectCountry = Boolean(
      dragState &&
      !dragState.moved &&
      releasedCountryCode &&
      pressedCountryCodeRef.current === releasedCountryCode &&
      isSelectableCountry(releasedCountryCode),
    );

    finishPointerInteraction(event);
    setPointerPosition(getRelativePointerPosition(event));
    setHoveredCode(releasedCountryCode);
    pressedCountryCodeRef.current = null;

    if (shouldSelectCountry && releasedCountryCode) {
      onSelectCountry(releasedCountryCode);
    }
  };

  const onPointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
    finishPointerInteraction(event);
    pressedCountryCodeRef.current = null;
    setHoveredCode(null);
    setPointerPosition(null);
  };

  const onPointerLeave: PointerEventHandler<HTMLDivElement> = () => {
    if (dragStateRef.current?.moved) return;
    setHoveredCode(null);
    setPointerPosition(null);
  };

  return {
    zoom,
    pan,
    dragging,
    hoveredCode,
    pointerPosition,
    onZoomOut,
    onZoomIn,
    onResetView,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  };
}
