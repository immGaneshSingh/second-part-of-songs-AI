import React, { useState } from 'react';
import { Play, Pause, Heart, Plus, Check } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Track } from '../types/music.ts';
import { CoverArt } from './CoverArt.tsx';
import { decodeHtmlEntities, formatDynamicDuration } from '../utils/audioUtils.ts';

interface SongCardProps {
  track: Track;
  allTracks?: Track[];
  className?: string;
}

export const SongCard: React.FC<SongCardProps> = React.memo(({ track, allTracks, className = '' }) => {
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

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);

  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;
  const isLiked = likedTrackIds.includes(track.id);

  const cleanTitle = decodeHtmlEntities(track.title);
  const cleanArtist = decodeHtmlEntities(track.artist);
  const cleanAlbum = decodeHtmlEntities(track.album);

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track, allTracks);
    }
  };

  const handleAddToPlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addTrackToPlaylist(playlistId, track.id);
    setAddedPlaylistId(playlistId);
    setTimeout(() => {
      setAddedPlaylistId(null);
      setShowPlaylistMenu(false);
    }, 800);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative p-2.5 sm:p-3 rounded-2xl bg-[#0e111a]/95 hover:bg-[#131726] border transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between select-none ${
        isCurrent
          ? 'border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30'
          : 'border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.20)] hover:-translate-y-0.5'
      } ${className}`}
    >
      {/* Cover Art Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 sm:mb-3 shadow-md bg-slate-900">
        <CoverArt
          src={track.coverUrl}
          alt={cleanTitle}
          gradient={track.gradient}
          showVinylGroove={true}
        />

        {/* Hover / Active Play Button Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-all duration-200 ${
            isPlayingThis
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform transition-transform group-hover:scale-105 active:scale-95">
            {isPlayingThis ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 translate-x-0.5" />
            )}
          </div>
        </div>

        {/* Like Heart Button (top right corner) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track.id);
          }}
          className={`absolute top-1.5 right-1.5 p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer ${
            isLiked
              ? 'bg-black/60 text-rose-500 opacity-100'
              : 'bg-black/50 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isLiked ? 'Unlike track' : 'Like track'}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Quiet Genre & Audio Quality Badge */}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-[9px] sm:text-[10px] font-medium text-slate-200">
            {track.language || track.genre}
          </span>
          {track.isOfficial && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-md text-[8px] sm:text-[9px] font-bold text-slate-950">
              HQ
            </span>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="mb-1.5 min-w-0">
          <h3
            title={cleanTitle}
            className={`text-xs sm:text-sm font-bold truncate transition-colors ${
              isCurrent ? 'text-emerald-400' : 'text-slate-100 group-hover:text-white'
            }`}
          >
            {cleanTitle}
          </h3>
          <p title={cleanArtist} className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
            {cleanArtist}
          </p>
        </div>

        {/* Footer info: dynamic duration and add to playlist */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/50 text-[10px] sm:text-[11px] text-slate-400">
          <span className="font-mono tabular-nums text-slate-400">
            {track.duration > 0 ? (
              formatDynamicDuration(track.duration)
            ) : (
              <span className="inline-block w-8 h-2.5 rounded bg-slate-800 animate-pulse" />
            )}
          </span>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu((prev) => !prev);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Add to playlist"
              aria-label="Add to playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Playlist dropdown menu */}
            {showPlaylistMenu && (
              <div
                className="absolute right-0 bottom-full mb-1 w-48 bg-[#0e111a] border border-slate-750 rounded-xl shadow-2xl p-1 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Add to Playlist
                </div>
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={(e) => handleAddToPlaylist(pl.id, e)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{decodeHtmlEntities(pl.name)}</span>
                      {addedPlaylistId === pl.id || pl.trackIds.includes(track.id) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="pt-1 mt-1 border-t border-slate-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlaylistMenu(false);
                      setIsCreatePlaylistOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create new playlist</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
