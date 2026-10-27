import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MusicProvider,
  useMusic,
} from './context/MusicContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { SongCard } from './components/SongCard.tsx';
import { TrackTable } from './components/TrackTable.tsx';
import { ArtistCard } from './components/ArtistCard.tsx';
import { BottomPlayer } from './components/BottomPlayer.tsx';
import { QueueDrawer } from './components/QueueDrawer.tsx';
import { CreatePlaylistModal } from './components/CreatePlaylistModal.tsx';
import { EditPlaylistModal } from './components/EditPlaylistModal.tsx';
import { AdminPanelModal } from './components/AdminPanelModal.tsx';
import { HorizontalCarousel } from './components/HorizontalCarousel.tsx';
import { PlaylistCard } from './components/PlaylistCard.tsx';
import { SpotifyActionBar } from './components/SpotifyActionBar.tsx';
import { GuitarLogo } from './components/GuitarLogo.tsx';
import {
  filterTracks,
  getSectionTracks,
  getStrictArtistTracks,
  resolveTrackSection,
  resolveTrackArtist,
  getSectionPlaylists,
  getArtistPlaylists,
  resolvePlaylistSection,
  resolvePlaylistArtist,
  decodeHtmlEntities,
  formatDynamicDuration,
} from './utils/audioUtils.ts';
import {
  Play,
  Heart,
  Sparkles,
  Library,
  Disc3,
  Plus,
  Edit3,
  Check,
  Music,
  Search,
  Flame,
  Mic2,
  CheckCircle2,
  ArrowLeft,
  Shuffle,
  Repeat,
  Globe,
  SlidersHorizontal,
  Home,
  X,
} from 'lucide-react';
import type { Track, Playlist, Genre, HomeSection } from './types/music.ts';

function MainContent() {
  const {
    tracks,
    playlists,
    artists,
    likedTrackIds,
    activeView,
    setActiveView,
    searchQuery,
    selectedGenre,
    setSelectedGenre,
    playTrack,
    playPlaylist,
    playArtist,
    playSection,
    updateTrackSection,
    updateTrackSinger,
    setIsCreatePlaylistOpen,
    addTrackToPlaylist,
    currentTrack,
    isPlaying,
    togglePlayPause,
    toastMessage,
    shuffle,
    toggleShuffle,
    isAdminAuthenticated,
    triggerLogoClick,
    setSearchQuery,
    isPlayerOpen,
  } = useMusic();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [singerSearchQuery, setSingerSearchQuery] = useState('');
  const [sectionManageSearch, setSectionManageSearch] = useState('');
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [singerFilter, setSingerFilter] = useState<string>('All');
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSingerFilter('All');
    setSingerSearchQuery('');
    setShowSectionManager(false);
    setSectionManageSearch('');
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeView]);

  // Filtered tracks based on current search input & category genre
  const filteredTracks = useMemo(() => {
    return filterTracks(tracks, searchQuery, selectedGenre);
  }, [tracks, searchQuery, selectedGenre]);

  // Strictly isolated tracks for Section 1, Section 2, Section 3, and Section 4
  const hindiTracks = useMemo(() => getSectionTracks(tracks, 'hindi'), [tracks]);
  const bhojpuriTracks = useMemo(() => getSectionTracks(tracks, 'bhojpuri'), [tracks]);
  const bhaktiTracks = useMemo(() => getSectionTracks(tracks, 'bhakti'), [tracks]);
  const englishTracks = useMemo(() => getSectionTracks(tracks, 'english'), [tracks]);

  // Latest playlists first so newly uploaded playlists show immediately at the beginning
  const latestPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [playlists]);

  // Latest artists first so newly added singers appear immediately
  const latestArtists = useMemo(() => {
    return [...artists].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [artists]);

  // Filtered singers strictly by singer name (English & Hindi name) for the Singers section search box
  const filteredSingers = useMemo(() => {
    const q = singerSearchQuery.trim().toLowerCase();
    if (!q) return latestArtists;
    return latestArtists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(q) ||
        (artist.hindiName && artist.hindiName.toLowerCase().includes(q))
    );
  }, [latestArtists, singerSearchQuery]);

  // Liked tracks list
  const likedTracks = useMemo(() => {
    return tracks.filter((t) => likedTrackIds.includes(t.id));
  }, [tracks, likedTrackIds]);

  // Current active playlist if activeView is playlist-*
  const activePlaylist = useMemo(() => {
    if (activeView.startsWith('playlist-')) {
      return playlists.find((p) => p.id === activeView);
    }
    return null;
  }, [activeView, playlists]);

  const activePlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    return activePlaylist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t));
  }, [activePlaylist, tracks]);

  // Active artist if activeView is artist-*
  const activeArtist = useMemo(() => {
    if (activeView.startsWith('artist-')) {
      const artistId = activeView.replace('artist-', '');
      return artists.find((a) => a.id === artistId || a.id === activeView);
    }
    return null;
  }, [activeView, artists]);

  // Strictly isolated songs for the active singer (e.g., Yo Yo Honey Singh ONLY plays Honey Singh songs)
  const activeArtistTracks = useMemo(() => {
    if (!activeArtist) return [];
    return getStrictArtistTracks(tracks, activeArtist);
  }, [activeArtist, tracks]);

  // Suggested tracks not yet in active playlist
  const candidateTracksToAdd = useMemo(() => {
    if (!activePlaylist) return [];
    const notInPlaylist = tracks.filter((t) => !activePlaylist.trackIds.includes(t.id));
    if (!playlistSearchQuery.trim()) return notInPlaylist.slice(0, 18);
    const query = playlistSearchQuery.toLowerCase().trim();
    return notInPlaylist
      .filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query) ||
          (t.hindiTitle && t.hindiTitle.toLowerCase().includes(query))
      )
      .slice(0, 18);
  }, [activePlaylist, tracks, playlistSearchQuery]);

  // Helper to render any of the 4 core sections (1: Hindi, 2: Bhojpuri, 3: Bhakti Bhavana, 4: English Songs)
  const renderSectionDetailView = (sectionKey: HomeSection) => {
    const sectionConfig: Record<
      HomeSection,
      {
        badge: string;
        title: string;
        subtitle: string;
        emoji: string;
        gradient: string;
        accentText: string;
        accentBtn: string;
        singers: string[];
        tracksList: Track[];
      }
    > = {
      hindi: {
        badge: 'Bollywood & Hindi Superhits',
        title: 'Bollywood & Hindi Superhits',
        subtitle:
          'Stream romantic melodies, chartbusters, and evergreen Hindi hits with non-stop continuous playback.',
        emoji: '🇮🇳',
        gradient: 'from-amber-600/90 via-rose-700/90 to-slate-950',
        accentText: 'text-amber-300',
        accentBtn: 'bg-amber-500 text-slate-950',
        singers: [
          'All',
          'Arijit Singh',
          'Yo Yo Honey Singh',
          'Shreya Ghoshal',
          'Jubin Nautiyal',
          'Sonu Nigam',
          'Badshah',
          'Udit Narayan',
          'Kumar Sanu',
        ],
        tracksList: hindiTracks,
      },
      bhojpuri: {
        badge: 'Bhojpuri Desi Dhamaka & Folk Beats',
        title: 'Bhojpuri Desi Dhamaka & Folk Beats',
        subtitle:
          'High-voltage Bhojpuri dance hits, folk beats, and DJ anthems by Pawan Singh, Khesari Lal Yadav, Manoj Tiwari, and Shilpi Raj.',
        emoji: '💥',
        gradient: 'from-orange-600/90 via-red-700/90 to-slate-950',
        accentText: 'text-orange-300',
        accentBtn: 'bg-orange-500 text-slate-950',
        singers: ['All', 'Pawan Singh', 'Khesari Lal', 'Manoj Tiwari', 'Shilpi Raj'],
        tracksList: bhojpuriTracks,
      },
      bhakti: {
        badge: 'Bhakti Bhavana · Devotional & God Songs',
        title: 'Bhakti Bhavana',
        subtitle:
          'Sacred Hanuman Chalisa, Ram Siya Ram, Shiv Tandav Stotram, Krishna & Mata Rani Bhajans for spiritual peace.',
        emoji: '🪔',
        gradient: 'from-amber-500/90 via-orange-700/90 to-red-950',
        accentText: 'text-yellow-300',
        accentBtn: 'bg-yellow-500 text-slate-950',
        singers: ['All', 'Hariharan', 'Sachet Tandon', 'Jubin Nautiyal', 'Shankar Mahadevan', 'Amit Trivedi'],
        tracksList: bhaktiTracks,
      },
      english: {
        badge: 'Global Pop & International Hits',
        title: 'English Songs',
        subtitle:
          'International chartbusters, global pop anthems, synthwave, and Billboard hits.',
        emoji: '🌍',
        gradient: 'from-cyan-600/90 via-blue-700/90 to-indigo-950',
        accentText: 'text-cyan-300',
        accentBtn: 'bg-cyan-500 text-slate-950',
        singers: ['All', 'The Weeknd', 'Ed Sheeran', 'Imagine Dragons', 'Dua Lipa', 'The Chainsmokers'],
        tracksList: englishTracks,
      },
    };

    const cfg = sectionConfig[sectionKey];
    const dynamicSingers = Array.from(
      new Set([
        ...cfg.singers,
        ...cfg.tracksList
          .map((t) => {
            const matched = artists.find((a) => a.id === t.artistId);
            return matched ? matched.name : t.artist.split(/[·•,|]/)[0].trim();
          })
          .filter((name) => name && name.length > 1 && name !== 'Various Artists'),
      ])
    ).slice(0, 16);
    cfg.singers = dynamicSingers;

    const displayTracks =
      singerFilter === 'All'
        ? cfg.tracksList
        : cfg.tracksList.filter((t) =>
            t.artist.toLowerCase().includes(singerFilter.toLowerCase()) ||
            (t.artistId &&
              artists
                .find((a) => a.id === t.artistId)
                ?.name.toLowerCase()
                .includes(singerFilter.toLowerCase()))
          );

    const otherTracksForManager = tracks
      .filter((t) => {
        if (!sectionManageSearch.trim()) return true;
        const q = sectionManageSearch.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.hindiTitle && t.hindiTitle.toLowerCase().includes(q))
        );
      })
      .slice(0, 30);

    const sectionPlaylists = getSectionPlaylists(playlists, sectionKey);
    const isPlayingThisSection =
      isPlaying && Boolean(currentTrack && displayTracks.some((t) => t.id === currentTrack.id));

    return (
      <div className="space-y-8 animate-fade-slide-up">
        {/* Back to Home Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSectionManager((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {showSectionManager
                ? 'Hide Placement Manager'
                : 'Manage Song Placements'}
            </span>
          </button>
        </div>

        {/* Refined Glassmorphism Section Banner Header */}
        <div
          className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 bg-gradient-to-r ${cfg.gradient} border border-white/15 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 sm:gap-6`}
        >
          <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-2xl bg-black/40 backdrop-blur-md flex flex-col items-center justify-center shadow-2xl shrink-0 border border-white/10 text-center p-2.5 sm:p-3">
            <span className="text-3xl sm:text-4xl mb-0.5 sm:mb-1">{cfg.emoji}</span>
            <span className={`text-xs sm:text-sm font-bold ${cfg.accentText} line-clamp-1`}>{cfg.title}</span>
            <span className="text-[11px] sm:text-xs text-white/80 mt-0.5 sm:mt-1 font-mono tabular-nums">{cfg.tracksList.length} Songs</span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[11px] sm:text-xs font-semibold mb-1.5 sm:mb-2">
              <span>{cfg.badge}</span>
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold text-white mb-1.5 sm:mb-2 tracking-tight">
              {cfg.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              {cfg.subtitle}
            </p>

            {/* Clean Spotify-Style Action Bar */}
            <SpotifyActionBar
              isPlaying={isPlayingThisSection}
              onPlayPause={() => {
                if (isPlayingThisSection) {
                  togglePlayPause();
                } else {
                  playSection(sectionKey, shuffle ? 'shuffle' : 'sequential');
                }
              }}
              isShuffled={shuffle}
              onToggleShuffle={() => {
                toggleShuffle();
                playSection(sectionKey, !shuffle ? 'shuffle' : 'sequential');
              }}
              onMoreClick={() => setShowSectionManager((prev) => !prev)}
              moreTooltip="Manage song placements in this section"
              metaText={`${cfg.tracksList.length} songs · ${sectionPlaylists.length} playlists · Curated by AuraStream`}
              className="mt-4 sm:mt-5"
            />
          </div>
        </div>

        {/* Interactive Song Section & Singer Manager (Clean, non-debug labeling) */}
        {showSectionManager && (
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span>Manage Song Placement: Genre Section & Featured Singer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign any song to its specific Genre Section and Featured Singer for continuous playback across all users.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sectionManageSearch}
                  onChange={(e) => setSectionManageSearch(e.target.value)}
                  placeholder="Find song to assign..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/60">
              {otherTracksForManager.map((t) => {
                const curSec = resolveTrackSection(t);
                const curArt = resolveTrackArtist(t, artists) || artists[0];
                return (
                  <div
                    key={`sec-mgr-${t.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-slate-900/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(t.title)}</p>
                      <p className="text-[11px] text-slate-400 truncate">{decodeHtmlEntities(t.artist)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Section for ${t.title}`}
                        value={curSec}
                        onChange={(e) => updateTrackSection(t.id, e.target.value as HomeSection)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="hindi">Bollywood & Hindi</option>
                        <option value="bhojpuri">Bhojpuri Dhamaka</option>
                        <option value="bhakti">Bhakti Bhavana 🪔</option>
                        <option value="english">English Songs 🌍</option>
                      </select>

                      <select
                        aria-label={`Singer for ${t.title}`}
                        value={curArt.id}
                        onChange={(e) => updateTrackSinger(t.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        {artists.map((art) => (
                          <option key={art.id} value={art.id}>
                            {art.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Singer Filter Bar inside Section */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">Filter Singer:</span>
          {cfg.singers.map((singer) => (
            <button
              key={singer}
              onClick={() => setSingerFilter(singer)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                singerFilter === singer
                  ? `${cfg.accentBtn} shadow-md`
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {singer}
            </button>
          ))}
        </div>

        {/* Playlists Assigned to this Specific Section */}
        {sectionPlaylists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Library className="w-4 h-4 text-emerald-400" />
                <span>Playlists in {cfg.title}</span>
                <span className="text-xs text-emerald-400 font-mono">
                  ({sectionPlaylists.length})
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionPlaylists.map((pl) => (
                <PlaylistCard
                  key={`sec-pl-${pl.id}`}
                  playlist={pl}
                  variant="horizontal"
                />
              ))}
            </div>
          </div>
        )}

        {/* Grid of Section Song Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{cfg.title}</span>
              <span className={`text-xs ${cfg.accentText} font-mono`}>
                ({displayTracks.length} songs)
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {displayTracks.slice(0, 8).map((track) => (
              <SongCard
                key={`${sectionKey}-card-${track.id}`}
                track={track}
                allTracks={displayTracks}
              />
            ))}
          </div>
        </div>

        {/* Full Section TrackTable (strictly isolated queue) */}
        <div>
          <h3 className="text-base font-bold text-white mb-3">
            All Songs in {cfg.title} ({displayTracks.length})
          </h3>
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6 shadow-sm">
            <TrackTable tracks={displayTracks} showSectionBadge={true} />
          </div>
        </div>
      </div>
    );
  };

  // Render view body
  const renderViewContent = () => {
    // Sections 1 to 4 Dedicated Views
    if (
      activeView === 'hindi' ||
      activeView === 'bhojpuri' ||
      activeView === 'bhakti' ||
      activeView === 'english'
    ) {
      return renderSectionDetailView(activeView);
    }

    // 5. Famous Indian Singers Directory View
    if (activeView === 'artists') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                <Mic2 className="w-7 h-7 text-amber-400" />
                <span>Singers</span>
                <span className="text-xs sm:text-sm font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  {filteredSingers.length}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Search any singer by name to open their verified profile and stream their exclusive song collection.
              </p>
            </div>
            <button
              onClick={() => setActiveView('home')}
              className="self-start flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Dedicated Singer Name Search Box */}
          <div className="relative flex items-center max-w-xl">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={singerSearchQuery}
              onChange={(e) => setSingerSearchQuery(e.target.value)}
              placeholder="Search singer name (e.g., Arijit Singh, Pawan Singh, Shreya Ghoshal)..."
              aria-label="Search singer by name"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-900/95 text-xs sm:text-sm text-white placeholder-slate-400 rounded-xl border border-slate-700/90 focus:outline-none focus:border-amber-400 shadow-inner transition-colors"
            />
            {singerSearchQuery && (
              <button
                type="button"
                onClick={() => setSingerSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Clear singer search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filteredSingers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSingers.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <Mic2 className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">
                No singer found matching &ldquo;{singerSearchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400">
                Try searching with a different spelling or clear the search box to view all {latestArtists.length} singers.
              </p>
            </div>
          )}
        </div>
      );
    }

    // 6. Dynamic Artist Profile View (e.g. artist-yo-yo-honey-singh, artist-arijit-singh)
    // Strictly plays ONLY this singer's songs!
    if (activeArtist) {
      return (
        <div className="space-y-8">
          {/* Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveView('artists')}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Singers</span>
            </button>
          </div>

          {/* Artist Hero Header */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-4 sm:p-10 bg-gradient-to-br ${activeArtist.gradient} shadow-2xl border border-white/10 relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 sm:gap-8`}
          >
            <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 shrink-0 bg-slate-900">
              <img
                src={activeArtist.imageUrl}
                alt={decodeHtmlEntities(activeArtist.name)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Singer · Exclusive Artist Queue</span>
                </span>
                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-black/40 text-white font-medium border border-white/10">
                  {activeArtist.language}
                </span>
              </div>

              <h1 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight">
                {decodeHtmlEntities(activeArtist.name)}
              </h1>

              {activeArtist.hindiName && (
                <p className="text-sm sm:text-lg font-semibold text-amber-300 mt-0.5 sm:mt-1">
                  {decodeHtmlEntities(activeArtist.hindiName)}
                </p>
              )}

              <p className="text-xs sm:text-sm text-slate-200/90 mt-1.5 sm:mt-2 max-w-2xl leading-relaxed">
                {decodeHtmlEntities(activeArtist.bio)}
              </p>

              {/* Clean Spotify-Style Action Bar */}
              <SpotifyActionBar
                isPlaying={isPlaying && Boolean(currentTrack && activeArtistTracks.some((t) => t.id === currentTrack.id))}
                onPlayPause={() => {
                  if (isPlaying && currentTrack && activeArtistTracks.some((t) => t.id === currentTrack.id)) {
                    togglePlayPause();
                  } else {
                    playArtist(activeArtist, shuffle ? 'shuffle' : 'sequential');
                  }
                }}
                isShuffled={shuffle}
                onToggleShuffle={() => {
                  toggleShuffle();
                  playArtist(activeArtist, !shuffle ? 'shuffle' : 'sequential');
                }}
                metaText={`${activeArtistTracks.length} songs · ${activeArtist.monthlyListeners} Listeners · Verified Artist`}
                className="mt-4 sm:mt-6"
              />
            </div>
          </div>

          {/* Playlists Assigned to this Specific Singer */}
          {(() => {
            const artistPlaylists = getArtistPlaylists(
              playlists,
              activeArtist,
              artists,
              tracks
            );
            if (artistPlaylists.length === 0) return null;
            return (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Library className="w-4 h-4 text-emerald-400" />
                    <span>Playlists Featuring {decodeHtmlEntities(activeArtist.name)}</span>
                    <span className="text-xs text-emerald-400 font-mono">
                      ({artistPlaylists.length})
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {artistPlaylists.map((pl) => (
                    <PlaylistCard
                      key={`artist-pl-${pl.id}`}
                      playlist={pl}
                      variant="horizontal"
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Artist's Song Cards (strictly isolated queue) */}
          {activeArtistTracks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  Top Hits by {activeArtist.name}
                </h2>
                <span className="text-xs text-emerald-400 font-mono">
                  Only {activeArtist.name} songs will play
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {activeArtistTracks.slice(0, 4).map((track) => (
                  <SongCard
                    key={`artist-card-${track.id}`}
                    track={track}
                    allTracks={activeArtistTracks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artist's Official Tracks Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                All {activeArtist.name} Songs ({activeArtistTracks.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {activeArtistTracks.length} official tracks
              </span>
            </div>
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6 shadow-sm">
              <TrackTable tracks={activeArtistTracks} showSectionBadge={true} />
            </div>
          </div>
        </div>
      );
    }

    // 7. Liked Songs View
    if (activeView === 'liked') {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-rose-900/60 via-purple-950/40 to-slate-900 border border-rose-500/20 shadow-xl flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-2xl shrink-0">
              <Heart className="w-16 h-16 text-white fill-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                Playlist · Synced to Account
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1 mb-2">
                Liked Songs
              </h1>
              <p className="text-sm text-slate-300">
                Your personal collection of saved favorites, preserved across sessions.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                <button
                  disabled={likedTracks.length === 0}
                  onClick={() => likedTracks.length > 0 && playTrack(likedTracks[0], likedTracks)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  <span>Play All</span>
                </button>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6">
            <TrackTable tracks={likedTracks} />
          </div>
        </div>
      );
    }

    // 8. Playlist Detail View
    if (activePlaylist) {
      return (
        <div className="space-y-8">
          <div
            className={`rounded-2xl p-6 md:p-8 bg-gradient-to-br ${activePlaylist.coverGradient} shadow-xl border border-white/10 flex flex-col sm:flex-row items-center gap-6`}
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl shrink-0 border border-white/10">
              <Disc3 className="w-16 h-16 text-white opacity-80" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                  {activePlaylist.isCustom ? 'Custom Playlist' : 'Curated Playlist'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1 mb-2 tracking-tight">
                {decodeHtmlEntities(activePlaylist.name)}
              </h1>
              {activePlaylist.description && (
                <p className="text-sm text-slate-200/90 max-w-xl leading-relaxed">
                  {decodeHtmlEntities(activePlaylist.description)}
                </p>
              )}

              {/* Clean Spotify-Style Action Bar */}
              <div className="mt-5 flex items-center gap-3 sm:gap-4 flex-wrap">
                <SpotifyActionBar
                  isPlaying={isPlaying && Boolean(currentTrack && activePlaylistTracks.some((t) => t.id === currentTrack.id))}
                  onPlayPause={() => {
                    if (isPlaying && currentTrack && activePlaylistTracks.some((t) => t.id === currentTrack.id)) {
                      togglePlayPause();
                    } else {
                      playPlaylist(activePlaylist, shuffle ? 'shuffle' : 'sequential');
                    }
                  }}
                  isShuffled={shuffle}
                  onToggleShuffle={() => {
                    toggleShuffle();
                    playPlaylist(activePlaylist, !shuffle ? 'shuffle' : 'sequential');
                  }}
                  onMoreClick={activePlaylist.isCustom ? () => setPlaylistToEdit(activePlaylist) : undefined}
                  moreTooltip="Edit playlist"
                  metaText={`${activePlaylistTracks.length} songs · Curated by AuraStream`}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Tracks in &ldquo;{decodeHtmlEntities(activePlaylist.name)}&rdquo;</span>
                  <span className="text-xs text-emerald-400 font-mono tabular-nums">
                    ({activePlaylistTracks.length} songs)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Non-stop continuous playback · Only songs from this specific playlist will play
                </p>
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6">
              <TrackTable
                tracks={activePlaylistTracks}
                playlistId={activePlaylist.id}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add Songs to &ldquo;{activePlaylist.name}&rdquo;
                </h3>
                <p className="text-xs text-slate-400">
                  Search or select from available Hindi, Bhojpuri, Bhakti, or English library tracks.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={playlistSearchQuery}
                  onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                  placeholder="Find songs to add..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 text-xs text-white placeholder-slate-400 rounded-xl border border-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {candidateTracksToAdd.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {candidateTracksToAdd.map((track) => (
                  <div
                    key={`suggest-${track.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => addTrackToPlaylist(activePlaylist.id, track.id)}
                      className="ml-2 p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                      title="Add to playlist"
                      aria-label={`Add ${track.title} to playlist`}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden lg:inline text-[11px]">Add</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800/50 text-center text-slate-400 text-xs">
                {playlistSearchQuery
                  ? `No matching songs found for "${playlistSearchQuery}".`
                  : 'All songs have been added to this playlist!'}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 9. Search Dedicated View
    if (activeView === 'search') {
      const genresList: Array<{ name: Genre; color: string; desc: string }> = [
        { name: 'Hindi', color: 'from-amber-600 to-rose-800', desc: 'Bollywood & Hindi Superhits' },
        { name: 'Bhojpuri', color: 'from-orange-600 to-red-800', desc: 'Bhojpuri Desi Dhamaka' },
        { name: 'Bhakti', color: 'from-yellow-600 to-orange-800', desc: 'Bhakti Bhavana (God Songs)' },
        { name: 'English', color: 'from-cyan-600 to-blue-800', desc: 'Global English Hits' },
      ];

      return (
        <div className="space-y-6">
          {/* Search Input inside Browse View */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, singers, albums..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 text-xs sm:text-sm text-white placeholder-slate-400 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Browse Music Sections</h2>
              {selectedGenre !== 'All' && (
                <button
                  onClick={() => setSelectedGenre('All')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-3.5">
              Filter by Bollywood & Hindi, Bhojpuri, Bhakti Bhavana, or English Songs.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {genresList.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setSelectedGenre(g.name)}
                  className={`p-3.5 rounded-xl bg-gradient-to-br ${g.color} text-left transition-transform hover:scale-102 active:scale-98 shadow-md cursor-pointer ${
                    selectedGenre === g.name ? 'ring-2 ring-white' : ''
                  }`}
                >
                  <h4 className="text-sm font-bold text-white">{g.name}</h4>
                  <p className="text-[10px] text-white/80 mt-0.5 line-clamp-1">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {searchQuery
                  ? `Search results for "${searchQuery}"`
                  : selectedGenre !== 'All'
                  ? `${selectedGenre} Tracks`
                  : 'All Available Tracks'}
              </h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {filteredTracks.length} found
              </span>
            </div>
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6">
              <TrackTable tracks={filteredTracks} showSectionBadge={true} />
            </div>
          </div>
        </div>
      );
    }

    // 10. Library & All Playlists View (Opened when clicking "See all" on Section 6)
    if (activeView === 'library') {
      const secBadgeLabel: Record<HomeSection, string> = {
        hindi: 'Bollywood & Hindi Superhits',
        bhojpuri: 'Bhojpuri Desi Dhamaka',
        bhakti: 'Bhakti Bhavana',
        english: 'English Songs',
      };

      return (
        <div className="space-y-8 animate-fade-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <button
                onClick={() => setActiveView('home')}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Official YouTube & Curated Playlists ({playlists.length})
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Explore hand-crafted collections, artist essentials, and uninterrupted themed playlists.
              </p>
            </div>
            <button
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="self-start flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Liked songs tile */}
            <div
              onClick={() => setActiveView('liked')}
              className="p-5 rounded-2xl bg-gradient-to-br from-rose-900/60 to-purple-950/60 border border-rose-500/30 cursor-pointer hover:border-rose-400/60 hover:shadow-[0_0_24px_rgba(244,63,94,0.20)] hover:-translate-y-1 transition-all duration-300 shadow-md group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <Heart className="w-6 h-6 text-white fill-white" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-rose-300">
                  Liked Songs
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Your personal collection of favorite tracks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rose-500/20 text-xs text-rose-300/80 font-mono tabular-nums">
                {likedTracks.length} saved {likedTracks.length === 1 ? 'track' : 'tracks'}
              </div>
            </div>

            {/* All Playlists tiles */}
            {latestPlaylists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                variant="horizontal"
              />
            ))}
          </div>
        </div>
      );
    }

    // 11. Default: Home View — Clean Spotify-Grade Interface directly below Logo & Search Box
    return (
      <div className="space-y-9">
        {searchQuery ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Search Results for &ldquo;{searchQuery}&rdquo;
              </h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {filteredTracks.length} results
              </span>
            </div>
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 md:p-6">
              <TrackTable tracks={filteredTracks} showSectionBadge={true} />
            </div>
          </div>
        ) : (
          <>
            {/* FEATURED: Featured Playlists (2 compact cards visible side-by-side on mobile) */}
            <HorizontalCarousel
              id="home-featured-playlists"
              title="Featured Playlists"
              subtitle="Handpicked collections, non-stop mood mixes, and popular streams"
              icon={<Sparkles className="w-5 h-5 text-amber-400" />}
              seeAllLabel={`See all (${latestPlaylists.length}) →`}
              onSeeAll={() => setActiveView('library')}
              className="animate-fade-slide-up"
            >
              {latestPlaylists.slice(0, 30).map((pl) => (
                <PlaylistCard
                  key={`home-feat-${pl.id}-${pl.trackIds.length}-${pl.createdAt || 0}`}
                  playlist={pl}
                  variant="square"
                  className="w-[calc(50%-6px)] sm:w-48 md:w-52 shrink-0 snap-start"
                />
              ))}
            </HorizontalCarousel>

            {/* SECTION 1: Bollywood & Hindi Superhits (2 compact cards visible side-by-side on mobile) */}
            <div data-testid="home-section-1-hindi">
              <HorizontalCarousel
                id="sec1-hindi"
                title="Bollywood & Hindi Superhits"
                subtitle="Top Bollywood film soundtracks, soulful melodies, and chartbusters"
                icon={<span className="text-xl">🇮🇳</span>}
                seeAllLabel={`See all (${hindiTracks.length}) →`}
                onSeeAll={() => {
                  setActiveView('hindi');
                  playSection('hindi', 'sequential');
                }}
                className="animate-fade-slide-up [animation-delay:75ms]"
              >
                {hindiTracks.slice(0, 24).map((track) => (
                  <SongCard
                    key={`sec1-hindi-${track.id}-${track.createdAt || 0}`}
                    track={track}
                    allTracks={hindiTracks}
                    className="w-[calc(50%-6px)] sm:w-44 md:w-48 shrink-0 snap-start"
                  />
                ))}
              </HorizontalCarousel>
            </div>

            {/* SECTION 2: Bhojpuri Desi Dhamaka & Folk Beats */}
            <div data-testid="home-section-2-bhojpuri">
              <HorizontalCarousel
                id="sec2-bhojpuri"
                title="Bhojpuri Desi Dhamaka & Folk Beats"
                subtitle="High-voltage dance anthems, DJ folk beats, and rural chart-toppers"
                icon={<Flame className="w-5 h-5 text-orange-400" />}
                seeAllLabel={`See all (${bhojpuriTracks.length}) →`}
                onSeeAll={() => {
                  setActiveView('bhojpuri');
                  playSection('bhojpuri', 'sequential');
                }}
                className="animate-fade-slide-up [animation-delay:150ms]"
              >
                {bhojpuriTracks.slice(0, 24).map((track) => (
                  <SongCard
                    key={`sec2-bhoj-${track.id}-${track.createdAt || 0}`}
                    track={track}
                    allTracks={bhojpuriTracks}
                    className="w-[calc(50%-6px)] sm:w-44 md:w-48 shrink-0 snap-start"
                  />
                ))}
              </HorizontalCarousel>
            </div>

            {/* SECTION 3: Bhakti Bhavana */}
            <div data-testid="home-section-3-bhakti">
              <HorizontalCarousel
                id="sec3-bhakti"
                title="Bhakti Bhavana"
                subtitle="Devotional God songs, Hanuman Chalisa, Shiv Tandav, and divine morning bhajans"
                icon={<Sparkles className="w-5 h-5 text-yellow-400" />}
                seeAllLabel={`See all (${bhaktiTracks.length}) →`}
                onSeeAll={() => {
                  setActiveView('bhakti');
                  playSection('bhakti', 'sequential');
                }}
                className="animate-fade-slide-up [animation-delay:225ms]"
              >
                {bhaktiTracks.slice(0, 24).map((track) => (
                  <SongCard
                    key={`sec3-bhakti-${track.id}-${track.createdAt || 0}`}
                    track={track}
                    allTracks={bhaktiTracks}
                    className="w-[calc(50%-6px)] sm:w-44 md:w-48 shrink-0 snap-start"
                  />
                ))}
              </HorizontalCarousel>
            </div>

            {/* SECTION 4: English Songs */}
            <div data-testid="home-section-4-english">
              <HorizontalCarousel
                id="sec4-english"
                title="English Songs"
                subtitle="Global pop anthems, billboard hits, synthwave, and international chartbusters"
                icon={<Globe className="w-5 h-5 text-cyan-400" />}
                seeAllLabel={`See all (${englishTracks.length}) →`}
                onSeeAll={() => {
                  setActiveView('english');
                  playSection('english', 'sequential');
                }}
                className="animate-fade-slide-up [animation-delay:300ms]"
              >
                {englishTracks.slice(0, 24).map((track) => (
                  <SongCard
                    key={`sec4-english-${track.id}-${track.createdAt || 0}`}
                    track={track}
                    allTracks={englishTracks}
                    className="w-[calc(50%-6px)] sm:w-44 md:w-48 shrink-0 snap-start"
                  />
                ))}
              </HorizontalCarousel>
            </div>

            {/* SECTION 5: Singers */}
            <div data-testid="home-section-5-singers">
              <HorizontalCarousel
                id="sec5-singers"
                title="Singers"
                subtitle="Verified playback legends, icons, and chart-topping regional artists"
                icon={<Mic2 className="w-5 h-5 text-amber-400" />}
                seeAllLabel={`See all (${latestArtists.length}) →`}
                onSeeAll={() => setActiveView('artists')}
                className="animate-fade-slide-up [animation-delay:375ms]"
              >
                {latestArtists.map((artist) => (
                  <ArtistCard
                    key={`home-artist-${artist.id}-${artist.createdAt || 0}`}
                    artist={artist}
                    className="w-[calc(50%-6px)] sm:w-36 md:w-40 shrink-0 snap-start"
                  />
                ))}
              </HorizontalCarousel>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#090a0f] text-slate-100">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Upper Area: Sidebar + Main Content Viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar with Guitar Logo & Desi Music Hub */}
        <Sidebar
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main View Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TopBar: Shown on Desktop, completely hidden on Mobile as requested */}
          <div className="hidden md:block">
            <TopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          </div>

          {/* Scrollable Content Container with clean top spacing and bottom clearance */}
          <main
            ref={mainScrollRef}
            className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-3 sm:py-6 pb-36 md:pb-32"
          >
            <div className="max-w-7xl mx-auto">{renderViewContent()}</div>
          </main>
        </div>

        {/* Interactive Sidebar Queue (Docked on Desktop, Drawer on Mobile) */}
        <QueueDrawer />
      </div>

      {/* Docked Bottom Music Player */}
      <BottomPlayer />

      {/* Mobile Bottom Navigation Bar (App-style quick switching on phones) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden shrink-0 grid grid-cols-5 bg-[#08090e]/98 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 z-40 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.4)]"
      >
        <button
          onClick={() => setActiveView('home')}
          className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            activeView === 'home' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            activeView === 'search' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Browse</span>
        </button>
        <button
          onClick={() => setActiveView('artists')}
          className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            activeView === 'artists' || activeView.startsWith('artist-')
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Singers</span>
        </button>
        <button
          onClick={() => setActiveView('library')}
          className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            activeView === 'library' || activeView.startsWith('playlist-')
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Library className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Playlists</span>
        </button>
        <button
          onClick={triggerLogoClick}
          className={`min-h-[46px] flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
            isPlayerOpen
              ? 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/40 font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
          title="1x Click: Show/Hide Music Player | 3x Click in 1.5s: Open Admin Panel"
          aria-label="Toggle Music Player or Open Admin Panel"
        >
          <div className={`relative rounded-full ${isPlaying ? 'ring-2 ring-emerald-400/70 animate-pulse' : ''}`}>
            <GuitarLogo size={22} showText={false} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">
            {isPlayerOpen ? 'Hide' : 'Player'}
          </span>
        </button>
      </nav>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal />

      {/* Edit Playlist Modal */}
      <EditPlaylistModal
        playlist={playlistToEdit}
        isOpen={Boolean(playlistToEdit)}
        onClose={() => setPlaylistToEdit(null)}
      />

      {/* Super Admin Control Center Modal (Secret 3-Click Logo Protection) */}
      <AdminPanelModal />
    </div>
  );
}

export default function App() {
  return (
    <MusicProvider>
      <MainContent />
    </MusicProvider>
  );
}
