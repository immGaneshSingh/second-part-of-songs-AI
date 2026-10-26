import React, { useState, useEffect, useRef, startTransition } from 'react';
import { Search, X, Menu, Radio, ListMusic } from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import { GuitarLogo } from './GuitarLogo.tsx';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileSidebar }) => {
  const {
    searchQuery,
    setSearchQuery,
    activeView,
    setActiveView,
    triggerLogoClick,
    playerStatus,
    isQueueOpen,
    toggleQueue,
    queue,
  } = useMusic();

  // Local input state guarantees 0ms keystroke latency in the search box
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalQuery(val);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      startTransition(() => {
        setSearchQuery(val);
        if (val.trim() && activeView !== 'home' && activeView !== 'search') {
          setActiveView('home');
        }
      });
    }, 35);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    setLocalQuery('');
    startTransition(() => {
      setSearchQuery('');
    });
  };

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#090a0f]/95 backdrop-blur-xl border-b border-slate-800/70 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Hamburger Menu Button (All Screens) + Brand Guitar Logo (Secret 3-Click Admin Trigger) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 sm:p-2.5 text-slate-300 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
          title="Open side menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <GuitarLogo
          size={32}
          showText={true}
          subtext="Audio Streaming"
          onClick={triggerLogoClick}
        />
      </div>

      {/* Center: Instant-Response Search Input */}
      <div className="flex-1 max-w-md mx-auto min-w-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <input
            type="text"
            value={localQuery}
            onChange={handleSearchChange}
            placeholder="Search songs, singers, playlists..."
            aria-label="Search songs, artists, or albums"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-8 sm:pl-10 pr-7 py-1.5 sm:py-2 bg-slate-900/85 text-xs sm:text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-800/90 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          />
          {localQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Quiet Status Text + Queue Drawer Button */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          data-testid="topbar-player-status"
          className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              playerStatus === 'Now Playing'
                ? 'text-emerald-400 animate-pulse'
                : playerStatus === 'Buffering'
                ? 'text-amber-400 animate-pulse'
                : 'text-slate-500'
            }`}
          />
          <span
            className={
              playerStatus === 'Now Playing'
                ? 'text-emerald-300 font-medium'
                : playerStatus === 'Buffering'
                ? 'text-amber-300 font-medium'
                : 'text-slate-400'
            }
          >
            {playerStatus}
          </span>
        </div>

        <button
          onClick={toggleQueue}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isQueueOpen
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
          aria-label="Toggle playlist queue sidebar"
        >
          <ListMusic className="w-4 h-4" />
          <span className="hidden sm:inline">Queue</span>
          <span className="font-mono text-[10px] sm:text-[11px] opacity-80">
            ({queue.length})
          </span>
        </button>
      </div>
    </header>
  );
};
