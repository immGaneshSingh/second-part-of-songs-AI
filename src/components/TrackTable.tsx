import React, { useState } from 'react';
import { Play, Pause, Heart, Clock, Music, ListPlus, Check } from 'lucide-react';
import type { Track, HomeSection } from '../types/music.ts';
import { useMusic } from '../context/MusicContext.tsx';
import {
  formatTime,
  formatDynamicDuration,
  resolveTrackSection,
  decodeHtmlEntities,
} from '../utils/audioUtils.ts';
import { CoverArt } from './CoverArt.tsx';

interface TrackTableProps {
  tracks: Track[];
  showHeader?: boolean;
  playlistId?: string;
  showSectionBadge?: boolean;
}

const SECTION_BADGE_META: Record<
  HomeSection,
  { label: string; className: string }
> = {
  hindi: {
    label: 'Hindi',
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  },
  bhojpuri: {
    label: 'Bhojpuri',
    className: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  },
  bhakti: {
    label: 'Bhakti 🪔',
    className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25',
  },
  english: {
    label: 'English',
    className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
  },
};

export const TrackTable: React.FC<TrackTableProps> = React.memo(
  ({ tracks, showHeader = true, playlistId, showSectionBadge = false }) => {
    const {
      currentTrack,
      isPlaying,
      playTrack,
      togglePlayPause,
      likedTrackIds,
      toggleLike,
      playlists,
      addTrackToPlaylist,
      setIsCreatePlaylistOpen,
    } = useMusic();

    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState<number>(100);

    React.useEffect(() => {
      setVisibleCount(100);
    }, [playlistId, tracks.length]);

    if (tracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
            <Music className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No tracks found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Try adjusting your search query or explore another section.
          </p>
        </div>
      );
    }

    const handleAddToPlaylist = (targetPlaylistId: string, trackId: string) => {
      addTrackToPlaylist(targetPlaylistId, trackId);
      setAddedFeedback(`${targetPlaylistId}-${trackId}`);
      setTimeout(() => {
        setAddedFeedback(null);
        setOpenDropdownId(null);
      }, 650);
    };

    const displayedTracks = tracks.slice(0, visibleCount);
    const remainingCount = Math.max(0, tracks.length - displayedTracks.length);

    return (
      <div className="w-full">
        {showHeader && (
          <div className="grid grid-cols-[24px_1fr_auto] sm:grid-cols-[36px_1fr_auto] md:grid-cols-[40px_1.6fr_1fr_90px_130px] gap-2 sm:gap-4 px-2 sm:px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1.5">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span className="hidden md:block text-right">Plays</span>
            <span className="flex items-center justify-end pr-1 sm:pr-2">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        <div className="space-y-1">
          {displayedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = likedTrackIds.includes(track.id);
            const isDropdownOpen = openDropdownId === track.id;
            const sectionKey = resolveTrackSection(track);
            const badgeMeta = SECTION_BADGE_META[sectionKey];

            const handleRowClick = () => {
              if (isCurrent) {
                togglePlayPause();
              } else {
                playTrack(track, tracks);
              }
            };

            return (
              <div
                key={track.id}
                onClick={handleRowClick}
                className={`group relative grid grid-cols-[24px_1fr_auto] sm:grid-cols-[36px_1fr_auto] md:grid-cols-[40px_1.6fr_1fr_90px_130px] gap-2 sm:gap-4 items-center px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-emerald-500/12 border border-emerald-500/30 text-emerald-400'
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                {/* Index / Play indicator */}
                <div className="flex items-center justify-center">
                  {isCurrent && isPlaying ? (
                    <div
                      className="flex items-end gap-0.5 h-3.5"
                      aria-label="Playing"
                    >
                      <span className="w-0.5 h-3.5 bg-emerald-400 animate-[bounce_0.8s_infinite]" />
                      <span className="w-0.5 h-2 bg-emerald-400 animate-[bounce_0.6s_infinite]" />
                      <span className="w-0.5 h-3 bg-emerald-400 animate-[bounce_0.9s_infinite]" />
                    </div>
                  ) : (
                    <>
                      <span
                        className={`text-[11px] sm:text-xs font-mono group-hover:hidden ${
                          isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick();
                        }}
                        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                        className="hidden group-hover:flex items-center justify-center text-white"
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Track Cover + Title + Artist */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                    <CoverArt
                      src={track.coverUrl}
                      alt={decodeHtmlEntities(track.title)}
                      gradient={track.gradient}
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p
                        className={`text-xs sm:text-sm font-medium truncate ${
                          isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-100'
                        }`}
                      >
                        {decodeHtmlEntities(track.title)}
                      </p>
                      {showSectionBadge && (
                        <span
                          className={`hidden sm:inline-block shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badgeMeta.className}`}
                        >
                          {badgeMeta.label}
                        </span>
                      )}
                    </div>
                    {track.hindiTitle && (
                      <p className="text-[11px] text-amber-300/80 font-medium truncate">
                        {decodeHtmlEntities(track.hindiTitle)}
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {decodeHtmlEntities(track.artist)}
                    </p>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:block text-xs text-slate-400 truncate">
                  {decodeHtmlEntities(track.album)}
                </div>

                {/* Play Count */}
                <div className="hidden md:block text-xs text-slate-400 text-right font-mono tabular-nums">
                  {(track.playCount || 0).toLocaleString()}
                </div>

                {/* Like + Playlist Actions + Duration */}
                <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track.id);
                    }}
                    aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
                    className={`p-1.5 rounded-full transition-colors ${
                      isLiked
                        ? 'text-rose-500 hover:text-rose-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  {/* Add to Playlist menu trigger */}
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setOpenDropdownId(isDropdownOpen ? null : track.id)
                      }
                      aria-label={`Add ${track.title} to playlist`}
                      title="Add to playlist"
                      className="p-1.5 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-52 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-30">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                          Add to Playlist
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/40">
                          {playlists.map((pl) => {
                            const alreadyIn = pl.trackIds.includes(track.id);
                            const justAdded = addedFeedback === `${pl.id}-${track.id}`;
                            return (
                              <button
                                key={pl.id}
                                onClick={() => handleAddToPlaylist(pl.id, track.id)}
                                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors"
                              >
                                <span className="truncate">{decodeHtmlEntities(pl.name)}</span>
                                {justAdded || alreadyIn ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-slate-800 mt-1 pt-1 px-1.5">
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              setIsCreatePlaylistOpen(true);
                            }}
                            className="w-full px-2 py-1.5 text-left text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            + New Playlist...
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="hidden sm:inline-block text-xs font-mono tabular-nums text-slate-400 w-10 text-right">
                    {formatDynamicDuration(track.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {remainingCount > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Showing {displayedTracks.length.toLocaleString()} of {tracks.length.toLocaleString()} songs
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 200)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Load {Math.min(200, remainingCount)} More Songs
              </button>
              {remainingCount > 200 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount(tracks.length)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Show All ({tracks.length.toLocaleString()})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

