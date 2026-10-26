import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, Music, Radio, Youtube } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import { formatDynamicDuration, decodeHtmlEntities } from '../utils/audioUtils.ts';
import { getYouTubeThumbnail } from '../utils/youtubeUtils.ts';
import { CoverArt } from './CoverArt.tsx';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    currentTrack,
    isPlaying,
    playerStatus,
    activePlaylistId,
    isQueueOpen,
    toggleQueue,
    playQueueIndex,
    togglePlayPause,
  } = useMusic();

  const activeTrackRef = useRef<HTMLButtonElement | null>(null);

  const currentIdx = currentTrack
    ? queue.findIndex((t) => t.id === currentTrack.id)
    : -1;

  // Auto-scroll active playing track into view whenever currentTrack changes
  useEffect(() => {
    if (isQueueOpen && activeTrackRef.current) {
      try {
        activeTrackRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      } catch {}
    }
  }, [currentTrack?.id, isQueueOpen]);

  if (!isQueueOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 xl:hidden"
        onClick={toggleQueue}
      />

      <aside
        aria-label="Playlist Queue Sidebar"
        className="fixed xl:static inset-y-0 right-0 z-50 w-80 sm:w-88 bg-[#0c0e16] border-l border-slate-800/90 shadow-2xl xl:shadow-none flex flex-col shrink-0 transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/40">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-sm font-bold text-white truncate">
                Playlist Queue ({queue.length})
              </h3>
            </div>
            {activePlaylistId && (
              <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                <Youtube className="w-3 h-3 text-rose-500 shrink-0" />
                <span>ID: {activePlaylistId}</span>
              </p>
            )}
          </div>
          <button
            onClick={toggleQueue}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close queue"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Queue Track List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5" data-testid="queue-track-list">
          {queue.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No tracks in queue. Paste a YouTube Playlist or Video URL above.
            </p>
          ) : (
            queue.map((track, idx) => {
              const isCurrent =
                currentIdx === idx ||
                (currentTrack && currentTrack.id === track.id);
              const thumbnailUrl = track.youtubeId
                ? getYouTubeThumbnail(track.youtubeId)
                : track.coverUrl;

              return (
                <button
                  key={`${track.id}-${idx}`}
                  ref={isCurrent ? activeTrackRef : null}
                  type="button"
                  onClick={() => {
                    if (isCurrent) {
                      togglePlayPause();
                    } else {
                      playQueueIndex(idx);
                    }
                  }}
                  className={`w-full text-left group flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900/30 border-transparent hover:bg-slate-800/70 hover:border-slate-800'
                  }`}
                >
                  {/* Track Number */}
                  <span
                    className={`w-6 text-center text-[11px] font-mono tabular-nums font-bold shrink-0 ${
                      isCurrent ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* YouTube Thumbnail Preview (mqdefault.jpg) */}
                  <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 relative bg-slate-900 border border-slate-800">
                    <CoverArt
                      src={thumbnailUrl}
                      alt={track.title}
                      gradient={track.gradient}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-white fill-white translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Track Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent
                            ? 'text-emerald-300'
                            : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {decodeHtmlEntities(track.title)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate">
                        {decodeHtmlEntities(track.artist)}
                      </p>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          {playerStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <span
                    className={`text-[10px] font-mono tabular-nums shrink-0 ${
                      isCurrent ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {formatDynamicDuration(track.duration)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
