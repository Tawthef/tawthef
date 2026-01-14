import { useState, useEffect, useCallback } from 'react';

interface ScrollProgress {
  progress: number; // 0 to 1
  scrollY: number;
  direction: 'up' | 'down' | null;
}

export const useScrollProgress = (maxScroll: number = 400): ScrollProgress => {
  const [state, setState] = useState<ScrollProgress>({
    progress: 0,
    scrollY: 0,
    direction: null,
  });

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const progress = Math.min(currentScrollY / maxScroll, 1);
    
    setState(prev => ({
      progress,
      scrollY: currentScrollY,
      direction: currentScrollY > prev.scrollY ? 'down' : currentScrollY < prev.scrollY ? 'up' : prev.direction,
    }));
  }, [maxScroll]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return state;
};
