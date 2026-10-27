import React from 'react';
import { Play, Music, Sparkles } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Playlist, ActiveView } from '../types/music.ts';
import {
  decodeHtmlEntities,
  resolvePlaylistSection,
  resolvePlaylistArtist,
} from '../utils/audioUtils.ts';

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
  variant?: 'square' | 'horizontal';
}

const SECTION_USER_LABELS: Record<string, string> = {
  hindi: 'Bollywood & Hindi',
  bhojpuri: 'Bhojpuri Folk',
  bhakti: 'Devotional Bhakti',
  english: 'English Pop',
};

export const PlaylistCard: React.FC<PlaylistCardProps> = React.memo(
  ({ playlist, className = '', variant = 'square' }) => {
    const { setActiveView, playPlaylist, artists, tracks } = useMusic();

    const cleanName = decodeHtmlEntities(playlist.name);
    const cleanDesc = decodeHtmlEntities(playlist.description);
    const plSec = playlist.section || resolvePlaylistSection(playlist);
    const plArtist =
      (playlist.artistId ? artists.find((a) => a.id === playlist.artistId) : undefined) ||
      resolvePlaylistArtist(playlist, artists);

    const handleCardClick = () => {
      setActiveView(playlist.id as ActiveView);
    };

    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      playPlaylist(playlist);
    };

    const firstId = playlist.trackIds[0];
    const directYtVid =
      firstId && firstId.startsWith('track-yt-pl-') && firstId.length > 12
        ? firstId.slice('track-yt-pl-'.length)
        : undefined;
    const firstTrack = directYtVid
      ? { coverUrl: `https://i.ytimg.com/vi/${directYtVid}/hqdefault.jpg` }
      : firstId
      ? tracks.find((t) => t.id === firstId)
      : undefined;

    if (variant === 'horizontal') {
      return (
        <div
          onClick={handleCardClick}
          role="button"
          tabIndex={0}
          aria-label={`Open ${cleanName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
          className={`group relative p-3.5 rounded-2xl bg-[#0e111a]/90 hover:bg-[#131726] border border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.20)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between gap-4 select-none ${className}`}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${playlist.coverGradient} flex items-center justify-center shadow-lg shrink-0 overflow-hidden`}
            >
              {firstTrack?.coverUrl ? (
                <img
                  src={firstTrack.coverUrl}
                  alt={cleanName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <Music className="w-6 h-6 text-white/90" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 truncate transition-colors">
                {cleanName}
              </h3>
              {cleanDesc && (
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {cleanDesc}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                <span>{playlist.trackIds.length} songs</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">
                  {SECTION_USER_LABELS[plSec] || 'Curated'}
                </span>
                {plArtist && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-emerald-400 truncate max-w-[120px]">
                      {plArtist.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={`Play ${cleanName}`}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 shrink-0 transition-transform group-hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
          </button>
        </div>
      );
    }

    // Default square card (compact on mobile so 2 cards fit side-by-side cleanly)
    return (
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label={`Open playlist ${cleanName}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={`group relative p-2.5 sm:p-3.5 rounded-2xl bg-[#0e111a]/95 hover:bg-[#131726] border border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.20)] hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between select-none ${className}`}
      >
        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 sm:mb-3 bg-gradient-to-br shadow-md flex items-center justify-center">
          <div
            className={`w-full h-full bg-gradient-to-br ${playlist.coverGradient} flex items-center justify-center relative overflow-hidden`}
          >
            {firstTrack?.coverUrl ? (
              <img
                src={firstTrack.coverUrl}
                alt={cleanName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none" />
                <Music className="w-9 h-9 sm:w-12 sm:h-12 text-white/80 group-hover:scale-110 transition-transform duration-300" />
              </>
            )}

            {/* Subtle gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label={`Play ${cleanName}`}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform transition-transform group-hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3
              title={cleanName}
              className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 line-clamp-1 sm:line-clamp-2 leading-snug transition-colors"
            >
              {cleanName}
            </h3>
            <p
              title={cleanDesc}
              className="text-[11px] sm:text-xs text-slate-400 line-clamp-1 mt-0.5 leading-snug"
            >
              {cleanDesc || 'Curated music playlist'}
            </p>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 font-mono tabular-nums pt-1.5 border-t border-slate-800/60 mt-2">
            <span className="shrink-0">{playlist.trackIds.length} songs</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 font-sans truncate">
              {SECTION_USER_LABELS[plSec] || 'Playlist'}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
