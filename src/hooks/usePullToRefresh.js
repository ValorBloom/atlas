import { useState, useEffect, useRef, useCallback } from 'react';

const THRESHOLD = 72; // px to trigger refresh
const RESISTANCE = 0.45; // drag resistance factor

export default function usePullToRefresh(onRefresh, containerRef) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef?.current || document.documentElement;
    if (el.scrollTop > 2) return; // only trigger at top
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [containerRef]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { setPullDistance(0); return; }
    // Prevent native scroll when pulling
    if (delta > 4) e.preventDefault();
    setPullDistance(Math.min(delta * RESISTANCE, THRESHOLD * 1.4));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6); // snap to indicator position
      try { await onRefresh(); } catch (_) {}
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const node = containerRef?.current || window;
    const opts = { passive: false };
    node.addEventListener('touchstart', handleTouchStart, opts);
    node.addEventListener('touchmove', handleTouchMove, opts);
    node.addEventListener('touchend', handleTouchEnd);
    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, refreshing };
}