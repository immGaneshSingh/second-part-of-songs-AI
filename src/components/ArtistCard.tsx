import React from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Artist, ActiveView } from '../types/music.ts';
import { decodeHtmlEntities } from '../utils/audioUtils.ts';

interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export const ArtistCard: React.FC<ArtistCardProps> = React.memo(({ artist, className = '' }) => {
  const { setActiveView, playArtist } = useMusic();

  const cleanName = decodeHtmlEntities(artist.name);
  const cleanRole = decodeHtmlEntities(artist.role);

  const handleCardClick = () => {
    setActiveView(`artist-${artist.id}` as ActiveView);
    playArtist(artist, 'sequential');
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveView(`artist-${artist.id}` as ActiveView);
    playArtist(artist, 'sequential');
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Open ${cleanName} profile`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`group relative p-4 rounded-2xl bg-[#0e111a]/90 hover:bg-[#131726] border border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.20)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex flex-col items-center text-center shadow-md select-none ${className}`}
    >
      {/* Circular Artist Image with Play overlay */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-3.5 shadow-xl border-2 border-slate-750 group-hover:border-emerald-400 transition-colors bg-slate-900">
        <img
          key={artist.imageUrl}
          src={artist.imageUrl}
          alt={cleanName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallbackApplied) {
              target.dataset.fallbackApplied = 'true';
              target.src =
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Hover play button */}
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label={`Play hits by ${cleanName}`}
        >
          <div className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform transition-transform group-hover:scale-110 active:scale-95">
            <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
          </div>
        </button>
      </div>

      {/* Artist Name & Verified Badge */}
      <div className="w-full min-w-0">
        <div className="flex items-center justify-center gap-1.5 mb-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
            {cleanName}
          </h3>
          {artist.verified && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 fill-emerald-400/20" />
          )}
        </div>

        <p className="text-xs text-slate-400 font-medium truncate mb-2">
          {cleanRole}
        </p>

        {/* Unboxed Clean Typographic Metadata */}
        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-mono tabular-nums">
          <span>{artist.monthlyListeners}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-300 font-sans">{artist.language}</span>
        </div>
      </div>
    </div>
  );
});
