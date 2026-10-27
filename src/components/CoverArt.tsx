import React, { useState } from 'react';
import { Music2 } from 'lucide-react';

interface CoverArtProps {
  src: string;
  alt: string;
  gradient?: string;
  className?: string;
  showVinylGroove?: boolean;
}

export const CoverArt: React.FC<CoverArtProps> = ({
  src,
  alt,
  gradient = 'from-violet-600 to-indigo-900',
  className = 'w-full h-full',
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${className}`}>
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-white/80">
          <Music2 className="w-8 h-8 mb-1 opacity-70" />
          <span className="text-[11px] font-medium text-center line-clamp-1 opacity-90 px-1">
            {alt}
          </span>
        </div>
      )}
    </div>
  );
};

