import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  offset: number;
  height: number;
}

export const useVirtualization = (itemCount: number, options: VirtualizationOptions) => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalHeight = itemCount * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  // Generate virtual items
  const virtualItems: VirtualItem[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      offset: i * itemHeight,
      height: itemHeight
    });
  }
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);
  
  // Set up intersection observer for dynamic height calculation
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Item is visible, could be used for dynamic height calculation
            console.log('Item visible:', entry.target);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.1
      }
    );
    
    return () => observer.disconnect();
  }, []);
  
  return {
    containerRef,
    virtualItems,
    totalHeight,
    handleScroll,
    scrollTop,
    startIndex,
    endIndex
  };
};

// Advanced virtualization with dynamic heights
export const useDynamicVirtualization = (items: any[], getItemHeight: (index: number) => number) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate cumulative heights
  const cumulativeHeights = useRef<number[]>([]);
  
  useEffect(() => {
    let totalHeight = 0;
    cumulativeHeights.current = items.map((_, index) => {
      const height = getItemHeight(index);
      totalHeight += height;
      return totalHeight;
    });
  }, [items, getItemHeight]);
  
  const totalHeight = cumulativeHeights.current[cumulativeHeights.current.length - 1] || 0;
  
  // Binary search to find start index
  const findStartIndex = (scrollPosition: number): number => {
    let left = 0;
    let right = items.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midHeight = cumulativeHeights.current[mid];
      
      if (midHeight <= scrollPosition) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.max(0, left - 1);
  };
  
  const startIndex = findStartIndex(scrollTop);
  const endIndex = findStartIndex(scrollTop + containerHeight) + 1;
  
  // Calculate virtual items with dynamic heights
  const virtualItems = items.slice(startIndex, endIndex + 1).map((item, index) => {
    const actualIndex = startIndex + index;
    const offset = actualIndex > 0 ? cumulativeHeights.current[actualIndex - 1] : 0;
    const height = getItemHeight(actualIndex);
    
    return {
      index: actualIndex,
      offset,
      height,
      data: item
    };
  });
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);
  
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  
  return {
    containerRef,
    virtualItems,
    totalHeight,
    handleScroll,
    scrollTop,
    startIndex,
    endIndex
  };
};

// Hook for measuring item heights
export const useItemHeight = (ref: React.RefObject<HTMLElement>, deps: any[] = []) => {
  const [height, setHeight] = useState(0);
  
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, ...deps]);
  
  return height;
};