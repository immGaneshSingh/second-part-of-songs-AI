import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCarouselProps {
  id?: string;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  id,
  title,
  subtitle,
  icon,
  seeAllLabel,
  onSeeAll,
  children,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = Math.max(300, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section id={id} className={`relative group/carousel ${className}`}>
      {/* Header bar */}
      <div className="flex items-end justify-between mb-3 px-0.5">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2">
            {icon && <span className="shrink-0 text-emerald-400">{icon}</span>}
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate mt-0.5 max-w-2xl">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSeeAll && seeAllLabel && (
            <button
              onClick={onSeeAll}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer mr-1"
            >
              {seeAllLabel}
            </button>
          )}

          {/* Carousel Navigation Arrow Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'bg-slate-900/90 border-slate-700/80 text-white hover:bg-slate-800 hover:border-emerald-500/50 hover:text-emerald-400 shadow-md active:scale-95'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                canScrollRight
                  ? 'bg-slate-900/90 border-slate-700/80 text-white hover:bg-slate-800 hover:border-emerald-500/50 hover:text-emerald-400 shadow-md active:scale-95'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1 px-0.5 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </section>
  );
};
