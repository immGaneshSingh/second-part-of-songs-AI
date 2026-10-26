import React from 'react';
import { Play, Pause, Shuffle, Heart, MoreHorizontal } from 'lucide-react';

interface SpotifyActionBarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  isShuffled?: boolean;
  onToggleShuffle?: () => void;
  isLiked?: boolean;
  onToggleLike?: () => void;
  onMoreClick?: () => void;
  moreTooltip?: string;
  metaText?: string;
  playAriaLabel?: string;
  className?: string;
}

export const SpotifyActionBar: React.FC<SpotifyActionBarProps> = ({
  isPlaying,
  onPlayPause,
  isShuffled = false,
  onToggleShuffle,
  isLiked = false,
  onToggleLike,
  onMoreClick,
  moreTooltip = 'More options',
  metaText,
  playAriaLabel,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 flex-wrap ${className}`}>
      {/* Primary Vibrant Emerald Play/Pause Circular Button */}
      <button
        onClick={onPlayPause}
        aria-label={playAriaLabel || (isPlaying ? 'Pause' : 'Play')}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950" />
        ) : (
          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 translate-x-0.5" />
        )}
      </button>

      {/* Shuffle Secondary Action Button */}
      {onToggleShuffle && (
        <button
          onClick={onToggleShuffle}
          title={isShuffled ? 'Random Play: ON' : 'Random Play: OFF'}
          aria-label={isShuffled ? 'Disable random play' : 'Enable random play'}
          className={`min-w-[42px] min-h-[42px] p-2.5 sm:p-3 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
            isShuffled
              ? 'text-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'text-slate-300 hover:text-white bg-slate-900/60 sm:bg-transparent hover:bg-white/10 border border-slate-800 sm:border-0'
          }`}
        >
          <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Favorite Heart Secondary Action Button */}
      {onToggleLike && (
        <button
          onClick={onToggleLike}
          title={isLiked ? 'Remove from your Liked Songs' : 'Save to your Liked Songs'}
          aria-label={isLiked ? 'Unlike playlist' : 'Like playlist'}
          className={`min-w-[42px] min-h-[42px] p-2.5 sm:p-3 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
            isLiked
              ? 'text-rose-400 hover:text-rose-300 bg-rose-500/20 ring-1 ring-rose-500/40 shadow-sm shadow-rose-500/20'
              : 'text-slate-300 hover:text-white bg-slate-900/60 sm:bg-transparent hover:bg-white/10 border border-slate-800 sm:border-0'
          }`}
        >
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      )}

      {/* More / Additional Options Icon */}
      {onMoreClick && (
        <button
          onClick={onMoreClick}
          title={moreTooltip}
          aria-label={moreTooltip}
          className="p-2.5 sm:p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Crisp Unboxed Metadata Separator */}
      {metaText && (
        <div className="text-xs text-white/80 font-medium pl-1 sm:pl-2">
          {metaText}
        </div>
      )}
    </div>
  );
};
