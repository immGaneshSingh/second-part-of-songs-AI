import React, { useState } from 'react';
import { Play, Pause, Heart, Flame, Clock, Plus, Check, MoreHorizontal } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Track } from '../types/music.ts';
import { decodeHtmlEntities, formatDynamicDuration } from '../utils/audioUtils.ts';
import { CoverArt } from './CoverArt.tsx';

interface HeroBannerProps {
  trendingTrack: Track;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ trendingTrack }) => {
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
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const isCurrentTrending = currentTrack?.id === trendingTrack.id;
  const isPlayingThis = isCurrentTrending && isPlaying;
  const isLiked = likedTrackIds.includes(trendingTrack.id);

  const handlePlayHero = () => {
    if (isCurrentTrending) {
      togglePlayPause();
    } else {
      playTrack(trendingTrack);
    }
  };

  const handleAddToPlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addTrackToPlaylist(playlistId, trendingTrack.id);
    setJustAddedId(playlistId);
    setTimeout(() => {
      setJustAddedId(null);
      setShowPlaylistMenu(false);
    }, 800);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
      {/* Background glow and ambient gradient */}
      <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Left: Track Information */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold tracking-wide">TRENDING #1</span>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 font-medium">{trendingTrack.genre}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono tabular-nums">
              {(trendingTrack.playCount / 1000000).toFixed(1)}M Streams
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight">
              {decodeHtmlEntities(trendingTrack.title)}
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium">
              {decodeHtmlEntities(trendingTrack.artist)}{' '}
              <span className="text-slate-400 font-normal">
                on {decodeHtmlEntities(trendingTrack.album)}
              </span>
            </p>
          </div>

          {/* Spotify-Style Action Row */}
          <div className="flex items-center gap-3 sm:gap-4 pt-1 flex-wrap">
            {/* Primary vibrant emerald circular play button */}
            <button
              onClick={handlePlayHero}
              aria-label={isPlayingThis ? 'Pause' : 'Play'}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
            >
              {isPlayingThis ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 translate-x-0.5" />
              )}
            </button>

            {/* Like Favorite Heart */}
            <button
              onClick={() => toggleLike(trendingTrack.id)}
              className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 cursor-pointer ${
                isLiked
                  ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Add to Playlist button on Hero Banner */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylistMenu((prev) => !prev);
                }}
                className="p-2.5 sm:p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Add to playlist"
                title="Add to playlist"
              >
                <Plus className="w-5 h-5" />
              </button>

              {showPlaylistMenu && (
                <div
                  className="absolute left-0 bottom-full mb-2 w-52 bg-[#0e111a] border border-slate-750 rounded-2xl shadow-2xl p-1.5 z-50 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Add to Playlist
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={(e) => handleAddToPlaylist(pl.id, e)}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center justify-between"
                      >
                        <span className="truncate">{decodeHtmlEntities(pl.name)}</span>
                        {justAddedId === pl.id || pl.trackIds.includes(trendingTrack.id) ? (
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
                      className="w-full text-left px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center gap-1.5 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Playlist</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-1 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDynamicDuration(trendingTrack.duration)}</span>
            </div>
          </div>
        </div>

        {/* Right: Album Artwork Showcase */}
        <div className="relative group shrink-0 w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 self-start sm:self-auto">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
            <CoverArt
              src={trendingTrack.coverUrl}
              alt={trendingTrack.title}
              gradient={trendingTrack.gradient}
              showVinylGroove={true}
            />
          </div>

          {/* Soundwave equalizer indicator overlay when playing */}
          {isPlayingThis && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl backdrop-blur-xs flex items-center justify-center gap-1 px-4">
              <div className="w-1.5 bg-emerald-400 rounded-full animate-pulse h-8" />
              <div
                className="w-1.5 bg-emerald-400 rounded-full animate-pulse h-12"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-1.5 bg-emerald-400 rounded-full animate-pulse h-6"
                style={{ animationDelay: '300ms' }}
              />
              <div
                className="w-1.5 bg-emerald-400 rounded-full animate-pulse h-10"
                style={{ animationDelay: '75ms' }}
              />
              <div
                className="w-1.5 bg-emerald-400 rounded-full animate-pulse h-7"
                style={{ animationDelay: '220ms' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
