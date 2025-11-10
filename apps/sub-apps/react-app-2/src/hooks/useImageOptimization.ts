import { useState, useCallback, useRef, useEffect } from 'react';

interface ImageOptimizationOptions {
  placeholder?: string;
  errorFallback?: string;
  loading?: 'lazy' | 'eager';
  threshold?: number;
}

interface ImageState {
  src: string;
  loaded: boolean;
  error: boolean;
  loading: boolean;
}

export const useImageOptimization = (
  src: string, 
  options: ImageOptimizationOptions = {}
) => {
  const {
    placeholder = '/placeholder-image.jpg',
    errorFallback = '/error-image.jpg',
    loading = 'lazy',
    threshold = 0.1
  } = options;

  const [imageState, setImageState] = useState<ImageState>({
    src: placeholder,
    loaded: false,
    error: false,
    loading: true
  });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadImage = useCallback(() => {
    if (!src) return;

    setImageState(prev => ({ ...prev, loading: true }));

    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      setImageState({
        src,
        loaded: true,
        error: false,
        loading: false
      });
    };

    img.onerror = () => {
      setImageState({
        src: errorFallback,
        loaded: false,
        error: true,
        loading: false
      });
    };

    img.src = src;
  }, [src, errorFallback]);

  const setupIntersectionObserver = useCallback((element: HTMLImageElement) => {
    if (loading !== 'lazy') {
      loadImage();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin: '50px'
      }
    );

    observerRef.current.observe(element);
  }, [loadImage, loading, threshold]);

  const onImageLoad = useCallback(() => {
    setImageState(prev => ({ ...prev, loading: false }));
  }, []);

  const onImageError = useCallback(() => {
    setImageState({
      src: errorFallback,
      loaded: false,
      error: true,
      loading: false
    });
  }, [errorFallback]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
      }
    };
  }, []);

  return {
    ...imageState,
    setupIntersectionObserver,
    onImageLoad,
    onImageError,
    retry: loadImage
  };
};

// Progressive image loading hook
export const useProgressiveImage = (src: string, placeholder: string) => {
  const [sourceLoaded, setSourceLoaded] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setSourceLoaded(src);
  }, [src]);

  return sourceLoaded || placeholder;
};

// Responsive image hook
export const useResponsiveImage = (srcSet: string, sizes: string) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      setCurrentSrc(img.currentSrc || img.src);
    };

    img.srcset = srcSet;
    img.sizes = sizes;

    return () => {
      if (imgRef.current) {
        imgRef.current.onload = null;
      }
    };
  }, [srcSet, sizes]);

  return currentSrc;
};

// Image preloading hook
export const usePreloadImages = (imageUrls: string[]) => {
  const [loadedCount, setLoadedCount] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setAllLoaded(true);
      return;
    }

    let loaded = 0;
    const images: HTMLImageElement[] = [];

    imageUrls.forEach((url) => {
      const img = new Image();
      images.push(img);

      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === imageUrls.length) {
          setAllLoaded(true);
        }
      };

      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === imageUrls.length) {
          setAllLoaded(true);
        }
      };

      img.src = url;
    });

    return () => {
      images.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [imageUrls]);

  return { loadedCount, totalCount: imageUrls.length, allLoaded };
};