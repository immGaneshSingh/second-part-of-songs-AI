import React, { useState } from 'react';
import { GuitarLogo } from './GuitarLogo.tsx';
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  X,
  Edit3,
  Play,
  MoreVertical,
  Music2,
  Flame,
  Mic2,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { ActiveView, Playlist } from '../types/music.ts';
import { EditPlaylistModal } from './EditPlaylistModal.tsx';
import { decodeHtmlEntities } from '../utils/audioUtils.ts';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const {
    activeView,
    setActiveView,
    playlists,
    likedTrackIds,
    setIsCreatePlaylistOpen,
    playPlaylist,
    playSection,
    triggerLogoClick,
    isAdminAuthenticated,
  } = useMusic();

  const [activeMenuPlaylistId, setActiveMenuPlaylistId] = useState<string | null>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    if (view === 'hindi' || view === 'bhojpuri' || view === 'bhakti' || view === 'english') {
      playSection(view, 'sequential');
    }
    onCloseMobile();
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    {
      id: 'liked',
      label: 'Liked Songs',
      icon: Heart,
      count: likedTrackIds.length,
    },
  ];

  const desiItems = [
    { id: 'hindi', label: 'Bollywood & Hindi Superhits', icon: Music2 },
    { id: 'bhojpuri', label: 'Bhojpuri Desi Dhamaka', icon: Flame },
    { id: 'bhakti', label: 'Bhakti Bhavana', icon: Sparkles },
    { id: 'english', label: 'English Songs', icon: Globe },
    { id: 'artists', label: 'Singers', icon: Mic2 },
  ];

  return (
    <>
      {/* Backdrop overlay when side menu is open */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        aria-label="Side Navigation Menu"
        aria-hidden={!isOpenMobile}
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0c0e16] border-r border-slate-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Brand Header with Guitar Symbol Logo (Secret 3-Click Admin Trigger) */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <GuitarLogo
            showText={true}
            size={38}
            subtext="AuraStream Music"
            onClick={triggerLogoClick}
          />
          <button
            onClick={onCloseMobile}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Scrollable Menu Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 scrollbar-none">
          {/* Primary Navigation */}
          <div className="px-3 py-3 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Browse
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id as ActiveView)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.12)] border-l-2 border-emerald-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desi Music Hub (Pure cleanly formatted links with no debug tags) */}
          <div className="px-3 py-3 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-amber-400/90 uppercase">
              Desi Music Hub 🇮🇳
            </div>
            {desiItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id as ActiveView)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.12)] border-l-2 border-amber-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Playlists Section */}
          <div className="px-3 py-3">
            <div className="flex items-center justify-between px-3 py-1.5 mb-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Playlists ({playlists.length})
              </span>
              <button
                onClick={() => setIsCreatePlaylistOpen(true)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors cursor-pointer"
                title="Create new playlist"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-0.5 pr-1 max-h-72 overflow-y-auto scrollbar-none">
              {playlists.map((playlist) => {
                const isActive = activeView === playlist.id;
                const isMenuOpen = activeMenuPlaylistId === playlist.id;
                const cleanName = decodeHtmlEntities(playlist.name);

                return (
                  <div
                    key={playlist.id}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-800/90 text-emerald-400 font-semibold border-l-2 border-emerald-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                    }`}
                  >
                    <button
                      onClick={() => handleNavClick(playlist.id as ActiveView)}
                      className="flex-1 text-left truncate pr-1 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="truncate">{cleanName}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                        {playlist.trackIds.length}
                      </span>

                      {/* Quick Play Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playPlaylist(playlist);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-400 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Play playlist"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Manage Menu Trigger (for custom playlists) */}
                      {playlist.isCustom && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuPlaylistId(isMenuOpen ? null : playlist.id);
                            }}
                            className={`p-1 rounded text-slate-400 hover:text-white transition-opacity cursor-pointer ${
                              isMenuOpen ? 'opacity-100 bg-slate-700' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title="Manage playlist"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Options */}
                          {isMenuOpen && (
                            <div
                              className="absolute right-0 top-full mt-1 w-36 bg-[#0e111a] border border-slate-750 rounded-xl shadow-2xl p-1 z-50 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setPlaylistToEdit(playlist);
                                  setActiveMenuPlaylistId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Details</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pure Music Streaming Footer */}
        <div className="shrink-0 p-3 border-t border-slate-800/60 bg-slate-900/30 text-center">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            AuraStream Desi Audio
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            HQ Indian & International Streaming
          </p>
        </div>
      </aside>

      {/* In-app Edit Playlist Modal */}
      <EditPlaylistModal
        playlist={playlistToEdit}
        isOpen={Boolean(playlistToEdit)}
        onClose={() => setPlaylistToEdit(null)}
      />
    </>
  );
};
