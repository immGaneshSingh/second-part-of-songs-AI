import React, { useState, useMemo } from 'react';
import { X, Mic2, Languages, Sparkles, Loader2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import { decodeHtmlEntities, generateSmartSongLyrics } from '../utils/audioUtils.ts';

export const LyricsModal: React.FC = () => {
  const {
    currentTrack,
    currentTime,
    duration,
    isLyricsOpen,
    toggleLyrics,
    generateTrackLyricsWithAI,
  } = useMusic();
  const [scriptMode, setScriptMode] = useState<'devanagari' | 'roman'>('devanagari');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const resolvedLyrics = useMemo(() => {
    if (!currentTrack) {
      return { lyrics: [], devanagariLyrics: [] };
    }
    return generateSmartSongLyrics(currentTrack);
  }, [currentTrack]);

  if (!isLyricsOpen || !currentTrack) return null;

  const hasDevanagari = resolvedLyrics.devanagariLyrics.length > 0;
  const activeLyrics =
    scriptMode === 'devanagari' && hasDevanagari
      ? resolvedLyrics.devanagariLyrics
      : resolvedLyrics.lyrics;

  // Estimate active line based on playback progress
  const lineProgress = duration > 0 ? (currentTime / duration) * activeLyrics.length : 0;
  const activeLineIdx = Math.min(Math.floor(lineProgress), Math.max(0, activeLyrics.length - 1));

  const handleRegenerateAILyrics = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      await generateTrackLyricsWithAI(currentTrack.id);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[#0d0f17] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div
          className={`absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br ${currentTrack.gradient} opacity-20 rounded-full blur-3xl pointer-events-none`}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
              <Mic2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight truncate">
                  {decodeHtmlEntities(currentTrack.title)}
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                  AI Lyrics
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {decodeHtmlEntities(currentTrack.artist)}{' '}
                {currentTrack.hindiTitle ? `(${decodeHtmlEntities(currentTrack.hindiTitle)})` : ''} — Synchronized Lyrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* AI Lyrics Write / Refresh Button */}
            <button
              onClick={handleRegenerateAILyrics}
              disabled={isGeneratingAI}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors disabled:opacity-50"
              title="Write fresh poetic lyrics with AI"
            >
              {isGeneratingAI ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">AI Write</span>
            </button>

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
          <span>AI-written lyrics synchronized with audio playback</span>
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

