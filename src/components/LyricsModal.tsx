import React, { useState } from 'react';
import { X, Mic2, Languages } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import { decodeHtmlEntities } from '../utils/audioUtils.ts';

export const LyricsModal: React.FC = () => {
  const { currentTrack, currentTime, duration, isLyricsOpen, toggleLyrics } = useMusic();
  const [scriptMode, setScriptMode] = useState<'devanagari' | 'roman'>('devanagari');

  if (!isLyricsOpen || !currentTrack) return null;

  const hasDevanagari = currentTrack.devanagariLyrics && currentTrack.devanagariLyrics.length > 0;
  const activeLyrics =
    scriptMode === 'devanagari' && hasDevanagari
      ? currentTrack.devanagariLyrics!
      : currentTrack.lyrics || [
          'Instrumental section...',
          'Vocal melodies playing...',
          'Music streaming smoothly...',
        ];

  // Estimate active line based on playback progress
  const lineProgress = duration > 0 ? (currentTime / duration) * activeLyrics.length : 0;
  const activeLineIdx = Math.min(Math.floor(lineProgress), activeLyrics.length - 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[#0d0f17] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div
          className={`absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br ${currentTrack.gradient} opacity-20 rounded-full blur-3xl pointer-events-none`}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  {decodeHtmlEntities(currentTrack.title)}
                </h3>
                {currentTrack.isOfficial && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Official
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {decodeHtmlEntities(currentTrack.artist)}{' '}
                {currentTrack.hindiTitle ? `(${decodeHtmlEntities(currentTrack.hindiTitle)})` : ''} — Lyrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Script toggle (Devanagari vs Roman/Hinglish) */}
            {hasDevanagari && (
              <button
                onClick={() =>
                  setScriptMode((prev) => (prev === 'devanagari' ? 'roman' : 'devanagari'))
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                title="Switch lyrics script"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{scriptMode === 'devanagari' ? 'हिन्दी लिपि' : 'Hinglish'}</span>
              </button>
            )}

            <button
              onClick={toggleLyrics}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              aria-label="Close lyrics"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics scrollable list */}
        <div className="flex-1 overflow-y-auto py-8 space-y-5 text-center relative z-10">
          {activeLyrics.map((line, idx) => {
            const isCurrentLine = idx === activeLineIdx;
            const isPast = idx < activeLineIdx;
            return (
              <p
                key={idx}
                className={`text-base sm:text-xl font-bold transition-all duration-300 ${
                  isCurrentLine
                    ? 'text-amber-400 scale-105'
                    : isPast
                    ? 'text-slate-500'
                    : 'text-slate-300 opacity-80'
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Lyrics synchronized with audio playback</span>
          {hasDevanagari && (
            <span className="text-[11px] text-amber-400/80">
              {scriptMode === 'devanagari' ? 'Devanagari view' : 'Romanized view'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
