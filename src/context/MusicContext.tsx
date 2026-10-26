import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  Track,
  Playlist,
  Genre,
  HomeSection,
  RepeatMode,
  ActiveView,
  User,
  Artist,
  PlayerStatus,
} from '../types/music.ts';
import { INITIAL_TRACKS, INITIAL_PLAYLISTS, INITIAL_ARTISTS } from '../data/mockTracks.ts';
import {
  getNextTrackIndex,
  getPrevTrackIndex,
  clamp,
  addTrackToPlaylistTracks,
  removeTrackFromPlaylistTracks,
  getStrictPlaylistTracks,
  getTopPlayedTodayTracks,
  resolveTrackSection,
  getSectionTracks,
  getStrictArtistTracks,
  resolvePlaylistSection,
  resolvePlaylistArtist,
  resolveTrackArtist,
  smartClassifyTrackMetadata,
  findMatchingArtist,
  isGenericChannelOrLabel,
  isVerifiedRealSingerName,
  getCanonicalSongKey,
  deduplicateCatalogTracks,
  getNextCatalogTimestamp,
  type AIClassifiedTrackResult,
} from '../utils/audioUtils.ts';
import {
  authenticateUser,
  registerUser,
  getUserLikedSongs,
  saveUserLikedSongs,
  getUserPlaylists,
  saveUserPlaylists,
} from '../utils/authUtils.ts';
import {
  parseYouTubeInput,
  getYouTubeThumbnail,
  getNoembedUrl,
  shouldSkipOnYouTubeError,
  isCustomDirectAudioUrl,
  DEFAULT_YOUTUBE_QUEUE,
} from '../utils/youtubeUtils.ts';
import { parseBulkYouTubeLines, isSqlScriptInput } from '../utils/storageUtils.ts';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const DEFAULT_DEMO_USER: User = {
  id: 'user-alex-demo',
  name: 'Alex Rivera',
  email: 'demo@aurastream.io',
  password: 'password123',
  avatarUrl: '',
  createdAt: '2024-01-15T00:00:00.000Z',
};

function mergeArtistsWithInitial(loadedArtists: Artist[]): Artist[] {
  if (Array.isArray(loadedArtists) && loadedArtists.length > 0) {
    return loadedArtists.filter(
      (a) =>
        INITIAL_ARTISTS.some((ia) => ia.id === a.id) ||
        (!isGenericChannelOrLabel(a.name) && isVerifiedRealSingerName(a.name))
    );
  }
  return INITIAL_ARTISTS;
}

function mergeTracksWithInitial(
  loadedTracks: Track[],
  activeArtists: Artist[] = INITIAL_ARTISTS
): Track[] {
  if (!Array.isArray(loadedTracks) || loadedTracks.length === 0) {
    return INITIAL_TRACKS;
  }
  const artistsPool = mergeArtistsWithInitial(activeArtists);

  const enriched = loadedTracks.map((t) => {
    const aiCheck = smartClassifyTrackMetadata(
      { title: t.title, artist: t.artist, album: t.album },
      artistsPool
    );
    const isPoisonedArijit =
      t.artistId === 'artist-arijit-singh' &&
      !`${t.artist || ''} ${t.title || ''}`.toLowerCase().includes('arijit') &&
      t.id !== 'track-in-1' &&
      t.id !== 'track-in-2' &&
      t.id !== 'track-bhakti-4';

    const effectiveArtistName =
      isGenericChannelOrLabel(t.artist) && aiCheck.singerName && aiCheck.singerName !== 'Various Artists'
        ? aiCheck.singerName
        : t.artist;

    const cleanCandidate: Track = {
      ...t,
      title: aiCheck.cleanTitle || t.title,
      artist: effectiveArtistName,
      artistId: isPoisonedArijit ? undefined : t.artistId,
    };

    const resolvedSec = resolveTrackSection(cleanCandidate);
    const resolvedArt =
      resolveTrackArtist(cleanCandidate, artistsPool) ||
      findMatchingArtist(aiCheck.singerName, artistsPool);

    return {
      ...cleanCandidate,
      section: resolvedSec,
      artistId: resolvedArt?.id || cleanCandidate.artistId,
    };
  });

  const { tracks: deduped } = deduplicateCatalogTracks(enriched, [], artistsPool);
  return deduped;
}

function mergePlaylistsWithInitial(
  loadedPlaylists: Playlist[],
  activeArtists: Artist[] = INITIAL_ARTISTS,
  activeTracks: Track[] = INITIAL_TRACKS
): Playlist[] {
  if (!Array.isArray(loadedPlaylists) || loadedPlaylists.length === 0) {
    return INITIAL_PLAYLISTS;
  }
  const artistsPool = mergeArtistsWithInitial(activeArtists);

  return loadedPlaylists.map((pl) => {
    const resolvedSec = resolvePlaylistSection(pl, activeTracks);
    const resolvedArt = resolvePlaylistArtist(pl, artistsPool, activeTracks);
    return {
      ...pl,
      section: resolvedSec,
      artistId: resolvedArt?.id || pl.artistId,
      artistName: resolvedArt?.name || pl.artistName,
    };
  });
}

interface MusicContextType {
  tracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  playerStatus: PlayerStatus;
  activePlaylistId: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  likedTrackIds: string[];
  activeView: ActiveView;
  searchQuery: string;
  selectedGenre: Genre;
  queue: Track[];
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isCreatePlaylistOpen: boolean;
  isAuthModalOpen: boolean;
  isManageSongsOpen: boolean;
  isAdminModalOpen: boolean;
  isAdminAuthenticated: boolean;
  adminEmail: string;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (open: boolean) => void;
  togglePlayerOpen: () => void;
  currentUser: User | null;
  toastMessage: string | null;
  dailyPlayCounts: Record<string, number>;
  top10TodayTracks: Track[];
  // Admin Actions
  adminLogin: (password: string) => { success: boolean; error?: string };
  adminLogout: () => void;
  triggerLogoClick: () => void;
  setIsAdminModalOpen: (open: boolean) => void;
  // Auth Actions
  login: (email: string, password?: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsManageSongsOpen: (open: boolean) => void;
  // YouTube & Playback Actions
  loadYouTubeInput: (rawInput: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  playQueueIndex: (index: number) => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleLike: (trackId: string) => void;
  setActiveView: (view: ActiveView) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: Genre) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  setIsCreatePlaylistOpen: (open: boolean) => void;
  // Song / Library Management
  addTrack: (trackData: Omit<Track, 'id'> & { id?: string }) => Track;
  removeTrack: (trackId: string) => void;
  updateTrackSection: (trackId: string, section: HomeSection) => void;
  updateTrackSinger: (trackId: string, artistId: string) => void;
  resetTracksToDefault: () => void;
  fetchYouTubeTrackInfo: (
    rawInput: string
  ) => Promise<{
    success: boolean;
    videoId?: string;
    title?: string;
    author?: string;
    thumbnail?: string;
    error?: string;
    aiClassification?: AIClassifiedTrackResult;
  }>;
  aiClassifySingleInput: (input: {
    title: string;
    artist?: string;
    album?: string;
    playlistTitle?: string;
  }) => Promise<AIClassifiedTrackResult>;
  aiAutoOrganizeCatalog: () => Promise<{
    organizedTracks: number;
    organizedPlaylists: number;
    newSingersCreated: string[];
    summary: Array<{ title: string; singer: string; category: string }>;
  }>;
  cleanFalseSingersAndDeduplicateCatalog: () => Promise<{
    removedFalseSingers: string[];
    dedupedSongsCount: number;
    totalUniqueSongs: number;
    totalVerifiedSingers: number;
  }>;
  // Playlist Management
  createPlaylist: (
    name: string,
    description: string,
    options?: {
      section?: HomeSection;
      artistId?: string;
      artistName?: string;
      coverGradient?: string;
    }
  ) => void;
  addAdminYouTubePlaylist: (data: {
    name: string;
    description: string;
    youtubeInput: string;
    category?: Playlist['category'];
    section?: HomeSection;
    artistId?: string;
    artistName?: string;
    trackIds?: string[];
    useAISmartCategorize?: boolean;
  }) => Promise<{
    success: boolean;
    error?: string;
    playlist?: Playlist;
    aiSummary?: string;
    aiDetails?: Array<{ title: string; singer: string; category: string }>;
  }>;
  updatePlaylistPlacement: (
    playlistId: string,
    section: HomeSection,
    artistId: string
  ) => void;
  resetPlaylistsToDefault: () => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  editPlaylist: (playlistId: string, name: string, description: string) => void;
  playPlaylist: (playlist: Playlist, mode?: 'sequential' | 'shuffle') => void;
  playArtist: (artist: Artist, mode?: 'sequential' | 'shuffle') => void;
  playSection: (section: HomeSection, mode?: 'sequential' | 'shuffle') => void;
  // Permanent Server Storage & Bulk Import Actions
  lastServerSyncAt: string | null;
  storageMode: 'server-permanent' | 'supabase+server';
  saveCatalogPermanently: () => Promise<boolean>;
  importCatalogFromBackup: (
    tracks: Track[],
    playlists: Playlist[],
    artists?: Artist[]
  ) => Promise<boolean>;
  bulkImportYouTubeCatalog: (
    rawLines: string,
    defaultGenre?: Genre,
    defaultSection?: HomeSection,
    defaultArtistId?: string,
    useAISmartCategorize?: boolean
  ) => Promise<{
    addedSongs: number;
    addedPlaylists: number;
    errors: string[];
    aiDetails?: Array<{ title: string; singer: string; category: string }>;
  }>;
  // Singer / Artist Profile Management
  addArtist: (artistData: Omit<Artist, 'id'> & { id?: string }) => Artist;
  updateArtist: (artistId: string, updates: Partial<Artist>) => void;
  deleteArtist: (artistId: string) => void;
  addTrackToArtist: (artistId: string, trackId: string) => void;
  removeTrackFromArtist: (artistId: string, trackId: string) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

async function classifyBatchWithAI(
  items: Array<{
    id?: string;
    title: string;
    artist?: string;
    album?: string;
    playlistTitle?: string;
  }>
): Promise<AIClassifiedTrackResult[]> {
  if (!items || items.length === 0) return [];
  try {
    const res = await fetch('/api/ai/classify-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length === items.length) {
        return data.results as AIClassifiedTrackResult[];
      }
    }
  } catch {
    // Fallback to local smart classifier
  }
  return items.map((item) => smartClassifyTrackMetadata(item));
}

function createSingerObjectFromAI(
  singerName: string,
  aiInfo: AIClassifiedTrackResult,
  coverUrl?: string
): Artist {
  const cleanName = singerName.trim();
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return {
    id: `artist-${slug || Date.now()}`,
    name: cleanName,
    hindiName: cleanName,
    role: aiInfo.singerRole || `${aiInfo.categoryLabel} Playback Artist`,
    language: aiInfo.singerLanguageCategory || 'Hindi',
    imageUrl:
      coverUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    gradient:
      aiInfo.section === 'english'
        ? 'from-sky-600 via-blue-700 to-slate-950'
        : aiInfo.section === 'bhojpuri'
        ? 'from-rose-600 via-orange-600 to-amber-950'
        : aiInfo.section === 'bhakti'
        ? 'from-amber-500 via-orange-600 to-red-950'
        : 'from-emerald-600 via-teal-700 to-slate-950',
    monthlyListeners: '5.0M',
    verified: true,
    bio: `${cleanName} — AI-organized singer profile (${aiInfo.categoryLabel}).`,
    topTrackIds: [],
    createdAt: Date.now(),
  };
}

async function fetchNoembedMetadata(
  videoId: string
): Promise<{ title: string; author: string }> {
  const known = DEFAULT_YOUTUBE_QUEUE.find((item) => item.videoId === videoId);
  // 1. Try server-side YouTube oEmbed proxy first (reliable, no CORS/adblock issues)
  try {
    const serverRes = await fetch(`/api/youtube-oembed?videoId=${encodeURIComponent(videoId)}`);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData && serverData.title) {
        return {
          title: String(serverData.title),
          author: String(serverData.author || known?.author || 'YouTube Music'),
        };
      }
    }
  } catch {
    // Fallback to client-side noembed
  }

  // 2. Fallback to public noembed endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(getNoembedUrl(videoId), { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: String(data.title),
          author: String(data.author_name || known?.author || 'YouTube Music'),
        };
      }
    }
  } catch {
    // Fallback if offline or blocked
  }
  return {
    title: known?.title || `YouTube Audio Track (${videoId})`,
    author: known?.author || 'YouTube Stream',
  };
}

async function fetchServerPlaylistTracks(
  playlistId: string,
  genre: Genre = 'Hindi',
  seedVideoId?: string,
  fallbackTitle?: string
): Promise<{ title: string; tracks: Track[] } | null> {
  try {
    const params = new URLSearchParams({ playlistId });
    if (seedVideoId) params.set('videoId', seedVideoId);
    if (fallbackTitle) params.set('title', fallbackTitle);
    const res = await fetch(`/api/youtube-playlist?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      playlistId?: string;
      title?: string;
      videos?: Array<{
        videoId: string;
        title: string;
        artist: string;
        coverUrl: string;
        audioUrl: string;
        duration: number;
      }>;
    };
    if (!data || !Array.isArray(data.videos) || data.videos.length === 0) {
      return null;
    }
    const resolvedTracks: Track[] = data.videos.map((v) => ({
      id: `track-yt-pl-${v.videoId}`,
      title: v.title,
      artist: v.artist,
      album: data.title || 'YouTube Playlist',
      duration: v.duration || 240,
      audioUrl: '',
      coverUrl: v.coverUrl || getYouTubeThumbnail(v.videoId),
      youtubeId: v.videoId,
      genre,
      language: genre === 'Bhojpuri' ? 'Bhojpuri' : 'Hindi',
      releaseYear: new Date().getFullYear(),
      playCount: Math.floor(Math.random() * 400000) + 75000,
      gradient: 'from-emerald-600 via-teal-800 to-slate-950',
      isOfficial: true,
    }));
    return {
      title: data.title || `YouTube Playlist (${playlistId.slice(0, 10)})`,
      tracks: resolvedTracks,
    };
  } catch {
    return null;
  }
}

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('aurastream_tracks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeTracksWithInitial(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved tracks', e);
    }
    return INITIAL_TRACKS;
  });

  const [artists, setArtists] = useState<Artist[]>(() => {
    try {
      const saved = localStorage.getItem('aurastream_artists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeArtistsWithInitial(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved artists', e);
    }
    return INITIAL_ARTISTS;
  });
  const [isManageSongsOpen, setIsManageSongsOpen] = useState(false);

  // Admin Portal State & Security (Owner Gmail hidden from UI)
  const ADMIN_EMAIL = 'Verified Owner';
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('aurastream_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const togglePlayerOpen = useCallback(() => {
    setIsPlayerOpen((prev) => !prev);
  }, []);

  const clickTimesRef = useRef<number[]>([]);

  // Guitar Logo behavior:
  // - Single press (1 click): toggles the green-box player options (show / hide)
  // - 3 presses within 1.5 seconds (1500ms): opens the Admin Panel
  const triggerLogoClick = useCallback(() => {
    const now = Date.now();
    const recent = [...clickTimesRef.current.filter((t) => now - t <= 1500), now];
    clickTimesRef.current = recent;

    if (recent.length >= 3) {
      clickTimesRef.current = [];
      setIsPlayerOpen(false);
      setIsAdminModalOpen(true);
      return;
    }

    setIsPlayerOpen((prev) => !prev);
  }, []);

  const adminLogin = useCallback((enteredKey: string) => {
    const cleanKey = enteredKey.trim();
    const customKey = localStorage.getItem('aurastream_admin_custom_key');
    const validKeys = [
      customKey,
      'admin786',
      'ganesh62044',
      'ganesh@62044',
      'admin123',
      'AuraStream@Admin2026',
    ].filter(Boolean);

    if (validKeys.includes(cleanKey)) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('aurastream_admin_auth', 'true');
      } catch {}
      return { success: true };
    }
    return {
      success: false,
      error: 'Invalid Admin Master Key. Access denied.',
    };
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('aurastream_admin_auth');
    } catch {}
    setIsAdminModalOpen(false);
  }, []);

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('aurastream_users');
      return saved ? JSON.parse(saved) : [DEFAULT_DEMO_USER];
    } catch {
      return [DEFAULT_DEMO_USER];
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('aurastream_session');
      return saved ? JSON.parse(saved) : DEFAULT_DEMO_USER;
    } catch {
      return DEFAULT_DEMO_USER;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [likedStore, setLikedStore] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('aurastream_liked_by_user');
      return saved
        ? JSON.parse(saved)
        : {
            'user-alex-demo': ['track-in-1', 'track-in-2', 'track-in-3'],
          };
    } catch {
      return { 'user-alex-demo': ['track-in-1', 'track-in-2', 'track-in-3'] };
    }
  });

  const [playlistsStore, setPlaylistsStore] = useState<Record<string, Playlist[]>>(() => {
    try {
      const directPl = localStorage.getItem('aurastream_playlists');
      if (directPl) {
        const parsedDirect = JSON.parse(directPl);
        if (Array.isArray(parsedDirect) && parsedDirect.length > 0) {
          return {
            'user-alex-demo': parsedDirect,
            guest: parsedDirect,
          };
        }
      }
      const saved = localStorage.getItem('aurastream_playlists_by_user');
      return saved
        ? JSON.parse(saved)
        : {
            'user-alex-demo': INITIAL_PLAYLISTS,
            guest: INITIAL_PLAYLISTS,
          };
    } catch {
      return { 'user-alex-demo': INITIAL_PLAYLISTS, guest: INITIAL_PLAYLISTS };
    }
  });

  const activeUserId = currentUser ? currentUser.id : 'guest';
  const likedTrackIds = getUserLikedSongs(
    likedStore,
    activeUserId,
    activeUserId === 'user-alex-demo' ? ['track-in-1', 'track-in-2', 'track-in-3'] : ['track-in-1']
  );

  const playlists = getUserPlaylists(playlistsStore, activeUserId, INITIAL_PLAYLISTS);

  const [lastServerSyncAt, setLastServerSyncAt] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'server-permanent' | 'supabase+server'>(
    'server-permanent'
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;
  const playlistsRef = useRef<Playlist[]>(playlists);
  playlistsRef.current = playlists;
  const artistsRef = useRef<Artist[]>(artists);
  artistsRef.current = artists;

  const safeSaveCatalogToLocalStorage = useCallback(
    (nextTracks?: Track[], nextPlaylists?: Playlist[], nextArtists?: Artist[]) => {
      // Save playlists first so browser 5MB localStorage quota is never exhausted before playlists are stored
      if (nextPlaylists !== undefined) {
        try {
          localStorage.setItem('aurastream_playlists', JSON.stringify(nextPlaylists));
          localStorage.setItem(
            'aurastream_playlists_by_user',
            JSON.stringify({
              'user-alex-demo': nextPlaylists,
              guest: nextPlaylists,
            })
          );
        } catch {
          try {
            localStorage.removeItem('aurastream_tracks');
            localStorage.setItem('aurastream_playlists', JSON.stringify(nextPlaylists));
          } catch {}
        }
      }
      if (nextArtists !== undefined) {
        try {
          localStorage.setItem('aurastream_artists', JSON.stringify(nextArtists));
        } catch {}
      }
      if (nextTracks !== undefined) {
        try {
          localStorage.setItem('aurastream_tracks', JSON.stringify(nextTracks));
        } catch {
          // If 3,300+ tracks exceed the browser's 5MB localStorage quota, store a 600-track offline subset while the full catalog lives in state & server
          try {
            localStorage.setItem(
              'aurastream_tracks',
              JSON.stringify(nextTracks.slice(0, 600))
            );
          } catch {}
        }
      }
    },
    []
  );

  const persistCatalogToServer = useCallback(
    async (nextTracks?: Track[], nextPlaylists?: Playlist[], nextArtists?: Artist[]) => {
      try {
        const rawTracks = nextTracks !== undefined ? nextTracks : tracksRef.current;
        const rawPlaylists = nextPlaylists !== undefined ? nextPlaylists : playlistsRef.current;
        const rawArtists = (nextArtists !== undefined ? nextArtists : artistsRef.current).filter(
          (a) =>
            INITIAL_ARTISTS.some((ia) => ia.id === a.id) ||
            Boolean(a.createdAt) ||
            a.id.startsWith('artist-') ||
            (!isGenericChannelOrLabel(a.name) && isVerifiedRealSingerName(a.name))
        );

        const deduped = deduplicateCatalogTracks(rawTracks, rawPlaylists, rawArtists);
        const payloadTracks = deduped.tracks;
        const payloadPlaylists = deduped.playlists;
        const payloadArtists = deduped.artists;

        tracksRef.current = payloadTracks;
        playlistsRef.current = payloadPlaylists;
        artistsRef.current = payloadArtists;

        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracks: payloadTracks,
            playlists: payloadPlaylists,
            artists: payloadArtists,
            authoritative: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updatedAt) {
            setLastServerSyncAt(data.updatedAt);
          }
          const finalArtists = Array.isArray(data.artists) ? data.artists : payloadArtists;
          const finalTracks = Array.isArray(data.tracks) ? data.tracks : payloadTracks;
          const finalPlaylists = Array.isArray(data.playlists) ? data.playlists : payloadPlaylists;

          artistsRef.current = finalArtists;
          setArtists(finalArtists);

          tracksRef.current = finalTracks;
          setTracks(finalTracks);

          playlistsRef.current = finalPlaylists;
          setPlaylistsStore((prev) => {
            const next: Record<string, Playlist[]> = {
              ...prev,
              'user-alex-demo': finalPlaylists,
              guest: finalPlaylists,
              [activeUserId]: finalPlaylists,
            };
            for (const k of Object.keys(prev)) {
              next[k] = finalPlaylists;
            }
            return next;
          });

          safeSaveCatalogToLocalStorage(finalTracks, finalPlaylists, finalArtists);
          return true;
        }
      } catch (err) {
        console.warn('Could not persist catalog to server:', err);
      }
      return false;
    },
    [activeUserId, safeSaveCatalogToLocalStorage]
  );

  // Load permanent catalog from server on startup, window focus, and periodic background sync so every user browser sees Admin uploads automatically
  useEffect(() => {
    let cancelled = false;
    async function fetchPermanentCatalog() {
      try {
        const res = await fetch('/api/catalog');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.storageMode === 'supabase+server' || data.storageMode === 'server-permanent') {
          setStorageMode(data.storageMode);
        }
        if (data.updatedAt) {
          setLastServerSyncAt(data.updatedAt);
        }

        const deletedTracksSet = new Set<string>(
          Array.isArray(data.deletedTrackIds) ? data.deletedTrackIds : []
        );
        const deletedPlaylistsSet = new Set<string>(
          Array.isArray(data.deletedPlaylistIds) ? data.deletedPlaylistIds : []
        );
        const deletedArtistsSet = new Set<string>(
          Array.isArray(data.deletedArtistIds) ? data.deletedArtistIds : []
        );

        const serverArtists: Artist[] =
          Array.isArray(data.artists) && data.artists.length > 0
            ? data.artists.filter(
                (a: Artist) =>
                  !deletedArtistsSet.has(a.id) &&
                  (INITIAL_ARTISTS.some((ia) => ia.id === a.id) ||
                    Boolean(a.createdAt) ||
                    a.id.startsWith('artist-') ||
                    (!isGenericChannelOrLabel(a.name) && isVerifiedRealSingerName(a.name)))
              )
            : INITIAL_ARTISTS;

        const serverTracks: Track[] =
          Array.isArray(data.tracks) && data.tracks.length > 0
            ? data.tracks.filter((t: Track) => !deletedTracksSet.has(t.id))
            : INITIAL_TRACKS;

        const serverPlaylists: Playlist[] =
          Array.isArray(data.playlists) && data.playlists.length > 0
            ? data.playlists.filter((p: Playlist) => !deletedPlaylistsSet.has(p.id))
            : INITIAL_PLAYLISTS;

        // Preserve any custom/admin items created in this session that aren't in the server response or deleted set
        const serverTrackIds = new Set(serverTracks.map((t) => t.id));
        const localCustomTracks = tracksRef.current.filter(
          (t) =>
            !serverTrackIds.has(t.id) &&
            !deletedTracksSet.has(t.id) &&
            (Boolean(t.createdAt) || t.id.startsWith('track-custom-') || t.id.startsWith('track-yt-'))
        );

        const serverPlaylistIds = new Set(serverPlaylists.map((p) => p.id));
        const localCustomPlaylists = playlistsRef.current.filter(
          (p) =>
            !serverPlaylistIds.has(p.id) &&
            !deletedPlaylistsSet.has(p.id) &&
            (Boolean(p.createdAt) || p.id.startsWith('playlist-yt-') || p.isCustom)
        );

        const serverArtistIds = new Set(serverArtists.map((a) => a.id));
        const localCustomArtists = artistsRef.current.filter(
          (a) =>
            !serverArtistIds.has(a.id) &&
            !deletedArtistsSet.has(a.id) &&
            Boolean(a.createdAt)
        );

        const mergedTracks = [...serverTracks, ...localCustomTracks];
        const mergedPlaylists = [...serverPlaylists, ...localCustomPlaylists];
        const mergedArtists = [...serverArtists, ...localCustomArtists];

        const deduped = deduplicateCatalogTracks(mergedTracks, mergedPlaylists, mergedArtists);

        artistsRef.current = deduped.artists;
        setArtists(deduped.artists);

        tracksRef.current = deduped.tracks;
        setTracks(deduped.tracks);

        playlistsRef.current = deduped.playlists;
        setPlaylistsStore((prev) => {
          const next: Record<string, Playlist[]> = {
            ...prev,
            'user-alex-demo': deduped.playlists,
            guest: deduped.playlists,
          };
          for (const k of Object.keys(prev)) {
            next[k] = deduped.playlists;
          }
          return next;
        });

        safeSaveCatalogToLocalStorage(deduped.tracks, deduped.playlists, deduped.artists);
      } catch {
        // Fallback to local / bundled catalog if offline
      }
    }

    fetchPermanentCatalog();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void fetchPermanentCatalog();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const intervalId = window.setInterval(() => {
      void fetchPermanentCatalog();
    }, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [safeSaveCatalogToLocalStorage]);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(INITIAL_TRACKS[0]);
  const [queue, setQueue] = useState<Track[]>(INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('Paused');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(
    'PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK'
  );
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(INITIAL_TRACKS[0].duration);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [shuffle, setShuffle] = useState<boolean>(false);

  // Track user's daily play counts so "Most Played Top 10 Songs Today" updates in real time
  const todayKey = new Date().toISOString().slice(0, 10);
  const [dailyPlayCounts, setDailyPlayCounts] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('aurastream_daily_plays');
      if (raw) {
        const parsed = JSON.parse(raw) as { date?: string; counts?: Record<string, number> };
        if (parsed && parsed.date === todayKey && parsed.counts && typeof parsed.counts === 'object') {
          return parsed.counts;
        }
      }
    } catch {}
    return {};
  });

  const top10TodayTracks = useMemo(
    () => getTopPlayedTodayTracks(tracks, dailyPlayCounts, 10),
    [tracks, dailyPlayCounts]
  );

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<Genre>('All');
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const isUsingYouTubeIframeRef = useRef<boolean>(true);
  const prevVolumeRef = useRef<number>(0.8);
  const currentTrackRef = useRef<Track | null>(INITIAL_TRACKS[0]);
  const pendingYouTubeVideoIdRef = useRef<string | null>(null);
  const triedFallbackVideoIdsRef = useRef<Set<string>>(new Set());
  const playNextRef = useRef<() => void>(() => {});

  // Helper to resolve a list of YouTube Video IDs into Track objects using noembed.com
  const hydratePlaylistFromVideoIds = useCallback(
    async (videoIds: string[], playlistId?: string) => {
      if (!videoIds || videoIds.length === 0) return;
      const baseTracks: Track[] = videoIds.map((vid, idx) => {
        const known = DEFAULT_YOUTUBE_QUEUE.find((item) => item.videoId === vid);
        return {
          id: `yt-${vid}-${idx}`,
          youtubeId: vid,
          title: known?.title || `Loading Track #${idx + 1} (${vid})...`,
          artist: known?.author || 'YouTube Audio Stream',
          album: playlistId ? `Playlist ${playlistId.slice(0, 10)}...` : 'YouTube Queue',
          duration: known?.duration || 220,
          audioUrl: '',
          coverUrl: getYouTubeThumbnail(vid),
          genre: 'Hindi',
          releaseYear: 2025,
          playCount: 250000,
          gradient: 'from-emerald-600 via-teal-800 to-slate-950',
          isOfficial: true,
        };
      });

      setQueue(baseTracks);
      setCurrentTrack(baseTracks[0]);
      currentTrackRef.current = baseTracks[0];

      // Fetch real titles dynamically via https://noembed.com/embed?url=https://www.youtube.com/watch?v={id}
      const hydrated = await Promise.all(
        baseTracks.map(async (t) => {
          if (!t.youtubeId) return t;
          const meta = await fetchNoembedMetadata(t.youtubeId);
          return {
            ...t,
            title: meta.title,
            artist: meta.author,
          };
        })
      );

      setQueue(hydrated);
      setCurrentTrack((prev) => {
        if (!prev) return hydrated[0];
        const match = hydrated.find((h) => h.id === prev.id || h.youtubeId === prev.youtubeId);
        const resolved = match || prev;
        currentTrackRef.current = resolved;
        return resolved;
      });
      return hydrated;
    },
    []
  );

  // Official YouTube IFrame Player API initialization
  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || ytPlayerRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player('yt-hidden-audio-player', {
          height: '200',
          width: '200',
          videoId: INITIAL_TRACKS[0].youtubeId || 'BddP6PYo2gs',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              isYtReadyRef.current = true;
              try {
                event.target.setVolume(Math.round(volume * 100));
                event.target.setPlaybackQuality?.('small');
                if (pendingYouTubeVideoIdRef.current) {
                  const pendingVid = pendingYouTubeVideoIdRef.current;
                  pendingYouTubeVideoIdRef.current = null;
                  event.target.loadVideoById({
                    videoId: pendingVid,
                    startSeconds: 0,
                    suggestedQuality: 'small',
                  });
                  event.target.playVideo?.();
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;

              if (event.data === YTState.BUFFERING) {
                isUsingYouTubeIframeRef.current = true;
                setIsPlaying(true);
                setPlayerStatus('Now Playing');
              } else if (event.data === YTState.PLAYING) {
                isUsingYouTubeIframeRef.current = true;
                if (audioRef.current && !audioRef.current.paused) {
                  audioRef.current.pause();
                }

                setIsPlaying(true);
                setPlayerStatus('Now Playing');

                try {
                  const dur = event.target.getDuration();
                  if (dur && dur > 0) setDuration(Math.round(dur));

                  const playlistIds: string[] = event.target.getPlaylist?.() || [];
                  const currentIdx: number = event.target.getPlaylistIndex?.() ?? -1;
                  if (playlistIds.length > 0 && currentIdx >= 0) {
                    const currentVid = playlistIds[currentIdx];
                    if (currentVid) {
                      fetchNoembedMetadata(currentVid).then((meta) => {
                        setCurrentTrack((prev) =>
                          prev && prev.youtubeId === currentVid
                            ? { ...prev, title: meta.title, artist: meta.author }
                            : prev
                        );
                      });
                    }
                  }
                } catch {}
              } else if (event.data === YTState.PAUSED) {
                if (isUsingYouTubeIframeRef.current) {
                  setIsPlaying(false);
                  setPlayerStatus('Paused');
                }
              } else if (event.data === YTState.ENDED) {
                playNextRef.current();
              }
            },
            onError: (event: any) => {
              const code = Number(event?.data ?? 150);
              if (shouldSkipOnYouTubeError(code)) {
                const activeTrack = currentTrackRef.current;
                if (!activeTrack) return;

                // Automatically resolve an alternative embeddable YouTube audio upload of the exact same song
                const excludeList = Array.from(triedFallbackVideoIdsRef.current).join(',');
                fetch(
                  `/api/youtube-playable?title=${encodeURIComponent(
                    activeTrack.title
                  )}&artist=${encodeURIComponent(
                    activeTrack.artist
                  )}&exclude=${encodeURIComponent(excludeList)}`
                )
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data: { videoIds?: string[] } | null) => {
                    if (currentTrackRef.current?.id !== activeTrack.id) return;
                    const nextVid = data?.videoIds?.find(
                      (id) => !triedFallbackVideoIdsRef.current.has(id)
                    );
                    if (nextVid && ytPlayerRef.current?.loadVideoById) {
                      triedFallbackVideoIdsRef.current.add(nextVid);
                      try {
                        ytPlayerRef.current.loadVideoById({
                          videoId: nextVid,
                          startSeconds: 0,
                          suggestedQuality: 'small',
                        });
                        ytPlayerRef.current.playVideo?.();
                        return;
                      } catch {}
                    }
                    // If no alternative embeddable stream is found for this track, advance to next song in playlist
                    playNextRef.current();
                  })
                  .catch(() => {
                    playNextRef.current();
                  });
              }
            },
          },
        });
      } catch (err) {
        console.warn('YouTube IFrame Player init fallback:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }
  }, [hydratePlaylistFromVideoIds, showToast, volume]);

  // Real-time progress ticker for YouTube IFrame Player
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (isUsingYouTubeIframeRef.current) {
        try {
          const ct = ytPlayerRef.current?.getCurrentTime?.();
          const dur = ytPlayerRef.current?.getDuration?.();
          if (typeof dur === 'number' && dur > 0 && !isNaN(dur)) {
            setDuration(dur);
          }
          if (typeof ct === 'number' && !isNaN(ct) && ct > 0) {
            setCurrentTime(ct);
            return;
          }
        } catch {}
        // Silent visual progress ticker when YouTube player is warming up or in headless environments
        setCurrentTime((prev) => {
          if (prev + 0.5 >= duration) {
            playNextRef.current();
            return 0;
          }
          return prev + 0.5;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Audio HTML5 initialization (used only for custom direct MP3 URLs, never noisy placeholder demo tracks)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.8;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!isUsingYouTubeIframeRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (
        !isUsingYouTubeIframeRef.current &&
        audio.duration &&
        !isNaN(audio.duration) &&
        isFinite(audio.duration)
      ) {
        setDuration(audio.duration);
      }
    };

    const onWaiting = () => {
      if (!isUsingYouTubeIframeRef.current) {
        setPlayerStatus('Buffering');
      }
    };
    const onPlay = () => {
      if (!isUsingYouTubeIframeRef.current) {
        setIsPlaying(true);
        setPlayerStatus('Now Playing');
      }
    };
    const onPause = () => {
      if (!isUsingYouTubeIframeRef.current) {
        setIsPlaying(false);
        setPlayerStatus('Paused');
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('aurastream_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('aurastream_session', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('aurastream_session');
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('aurastream_liked_by_user', JSON.stringify(likedStore));
    } catch {}
  }, [likedStore]);

  useEffect(() => {
    try {
      localStorage.setItem('aurastream_playlists_by_user', JSON.stringify(playlistsStore));
    } catch {}
  }, [playlistsStore]);

  const login = useCallback(
    (email: string, password?: string) => {
      const res = authenticateUser(users, email, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsAuthModalOpen(false);
        showToast(`Welcome back, ${res.user.name}!`);
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed' };
    },
    [users, showToast]
  );

  const signup = useCallback(
    (name: string, email: string, password?: string) => {
      const res = registerUser(users, { name, email, password });
      if (res.success && res.user) {
        setUsers((prev) => [...prev, res.user!]);
        setCurrentUser(res.user);
        setPlaylistsStore((prev) => saveUserPlaylists(prev, res.user!.id, INITIAL_PLAYLISTS));
        setLikedStore((prev) => saveUserLikedSongs(prev, res.user!.id, ['track-in-1']));
        setIsAuthModalOpen(false);
        showToast(`Account created! Welcome, ${res.user.name}`);
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    },
    [users, showToast]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    showToast('Logged out successfully.');
  }, [showToast]);

  // Play a specific track cleanly and record today's play count
  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.duration || 220);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        setRepeatMode((prev) => (prev === 'off' ? 'all' : prev));
      }

      // Increment user's daily play count for "Most Played Top 10 Songs Today"
      setDailyPlayCounts((prev) => {
        const next = { ...prev, [track.id]: (prev[track.id] || 0) + 1 };
        try {
          localStorage.setItem(
            'aurastream_daily_plays',
            JSON.stringify({ date: new Date().toISOString().slice(0, 10), counts: next })
          );
        } catch {}
        return next;
      });

      // Always stop any previous HTML5 audio stream immediately
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }

      // 1. If the song has a YouTube Video ID, play the real song via YouTube IFrame Player (~1-2s buffer)
      if (track.youtubeId) {
        isUsingYouTubeIframeRef.current = true;
        triedFallbackVideoIdsRef.current = new Set([track.youtubeId]);
        setIsPlaying(true);
        setPlayerStatus('Now Playing');

        if (isYtReadyRef.current && ytPlayerRef.current?.loadVideoById) {
          pendingYouTubeVideoIdRef.current = null;
          try {
            ytPlayerRef.current.loadVideoById({
              videoId: track.youtubeId,
              startSeconds: 0,
              suggestedQuality: 'small',
            });
            ytPlayerRef.current.playVideo?.();
          } catch {
            try {
              ytPlayerRef.current.loadVideoById(track.youtubeId);
              ytPlayerRef.current.playVideo?.();
            } catch {}
          }
        } else {
          pendingYouTubeVideoIdRef.current = track.youtubeId;
        }
        return;
      }

      // 2. If the user explicitly provided a real custom MP3 URL (not SoundHelix/CodeSkulptor), stream it via HTML5 Audio
      if (isCustomDirectAudioUrl(track.audioUrl) && audioRef.current) {
        isUsingYouTubeIframeRef.current = false;
        const audio = audioRef.current;
        audio.src = track.audioUrl.trim();
        audio.currentTime = 0;
        setIsPlaying(true);
        setPlayerStatus('Now Playing');
        audio.play().catch(() => {});
        return;
      }

      // 3. Otherwise resolve a playable YouTube video for this track's title & artist
      isUsingYouTubeIframeRef.current = true;
      setIsPlaying(true);
      setPlayerStatus('Now Playing');
      fetch(
        `/api/youtube-playable?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
          track.artist
        )}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { videoIds?: string[] } | null) => {
          if (currentTrackRef.current?.id !== track.id || !data?.videoIds?.[0]) return;
          const resolvedVid = data.videoIds[0];
          triedFallbackVideoIdsRef.current = new Set([resolvedVid]);
          if (isYtReadyRef.current && ytPlayerRef.current?.loadVideoById) {
            try {
              ytPlayerRef.current.loadVideoById({
                videoId: resolvedVid,
                startSeconds: 0,
                suggestedQuality: 'small',
              });
              ytPlayerRef.current.playVideo?.();
            } catch {}
          } else {
            pendingYouTubeVideoIdRef.current = resolvedVid;
          }
        })
        .catch(() => {});
    },
    []
  );

  // Play a specific index in the current queue (triggers player.playVideoAt(index) when applicable)
  const playQueueIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      const targetTrack = queue[index];
      if (!targetTrack) return;

      if (isYtReadyRef.current && ytPlayerRef.current?.playVideoAt) {
        try {
          const ytList = ytPlayerRef.current.getPlaylist?.();
          if (Array.isArray(ytList) && ytList.length > index) {
            ytPlayerRef.current.playVideoAt(index);
          }
        } catch {}
      }

      playTrack(targetTrack);
    },
    [queue, playTrack]
  );

  // Load either a YouTube Playlist URL/ID (PL...) or a single 11-char Video URL/ID
  const loadYouTubeInput = useCallback(
    async (
      rawInput: string
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      const parsed = parseYouTubeInput(rawInput);
      if (parsed.type === 'invalid') {
        return { success: false, error: parsed.error };
      }

      setPlayerStatus('Buffering');

      if (parsed.type === 'playlist') {
        const { playlistId } = parsed;
        setActivePlaylistId(playlistId);

        // First try resolving the actual videos from this YouTube playlist via our backend
        const serverPl = await fetchServerPlaylistTracks(playlistId, 'Hindi');
        if (serverPl && serverPl.tracks.length > 0) {
          const aiResults = await classifyBatchWithAI(
            serverPl.tracks.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              playlistTitle: serverPl.title,
            }))
          );

          const nextArtists = [...artists];
          const enrichedTracks: Track[] = serverPl.tracks.map((st, idx) => {
            const aiInfo =
              aiResults[idx] ||
              smartClassifyTrackMetadata({
                title: st.title,
                artist: st.artist,
                playlistTitle: serverPl.title,
              });
            let matchedArtist = findMatchingArtist(aiInfo.singerName, nextArtists);
            if (
              !matchedArtist &&
              aiInfo.singerName &&
              aiInfo.singerName !== 'Various Artists' &&
              isVerifiedRealSingerName(aiInfo.singerName)
            ) {
              matchedArtist = createSingerObjectFromAI(
                aiInfo.singerName,
                aiInfo,
                st.coverUrl
              );
              nextArtists.unshift(matchedArtist);
            }
            if (matchedArtist) {
              const topIds = matchedArtist.topTrackIds || [];
              if (!topIds.includes(st.id)) {
                matchedArtist.topTrackIds = [st.id, ...topIds];
              }
            }
            return {
              ...st,
              title: aiInfo.cleanTitle || st.title,
              artist: matchedArtist?.name || aiInfo.singerName || st.artist,
              artistId: matchedArtist?.id,
              section: aiInfo.section,
              genre: aiInfo.genre,
              language: aiInfo.language,
            };
          });

          if (nextArtists.length !== artists.length) {
            setArtists(nextArtists);
            try {
              localStorage.setItem('aurastream_artists', JSON.stringify(nextArtists));
            } catch {}
          }

          setTracks((prev) => {
            const existingYtIds = new Set(prev.map((t) => t.youtubeId).filter(Boolean));
            const existingSongKeys = new Set(prev.map((t) => getCanonicalSongKey(t)));
            const brandNew = enrichedTracks.filter((t) => {
              const key = getCanonicalSongKey(t);
              if (t.youtubeId && existingYtIds.has(t.youtubeId)) return false;
              if (existingSongKeys.has(key)) return false;
              existingSongKeys.add(key);
              if (t.youtubeId) existingYtIds.add(t.youtubeId);
              return true;
            });
            const updated = brandNew.length > 0 ? [...brandNew, ...prev] : prev;
            try {
              localStorage.setItem('aurastream_tracks', JSON.stringify(updated));
            } catch {}
            persistCatalogToServer(updated, playlists, nextArtists);
            return updated;
          });
          setQueue(enrichedTracks);
          playTrack(enrichedTracks[0], enrichedTracks);
          const firstAi = aiResults[0];
          showToast(
            `AI Organized "${serverPl.title}" (${enrichedTracks.length} songs → ${
              firstAi?.singerName || 'Singers'
            }, ${firstAi?.categoryLabel || 'Categorized'})`
          );
          return {
            success: true,
            message: `AI Organized & Streaming "${serverPl.title}" (${enrichedTracks.length} songs)`,
          };
        }

        // Fallback to default YouTube queue if offline
        const defaultIds = DEFAULT_YOUTUBE_QUEUE.map((q) => q.videoId);
        const hydrated = await hydratePlaylistFromVideoIds(defaultIds, playlistId);

        if (hydrated && hydrated.length > 0) {
          playTrack(hydrated[0], hydrated);
        }
        setIsPlaying(true);
        setPlayerStatus('Now Playing');
        showToast(`Loaded YouTube Playlist: ${playlistId}`);
        return {
          success: true,
          message: `Streaming YouTube Playlist (${playlistId})`,
        };
      }

      // Single video ID
      const { videoId } = parsed;
      const meta = await fetchNoembedMetadata(videoId);
      const [aiInfo] = await classifyBatchWithAI([
        { title: meta.title, artist: meta.author },
      ]);
      const classification =
        aiInfo || smartClassifyTrackMetadata({ title: meta.title, artist: meta.author });

      const nextArtists = [...artists];
      let matchedArtist = findMatchingArtist(classification.singerName, nextArtists);
      if (
        !matchedArtist &&
        classification.singerName &&
        classification.singerName !== 'Various Artists' &&
        isVerifiedRealSingerName(classification.singerName)
      ) {
        matchedArtist = createSingerObjectFromAI(
          classification.singerName,
          classification,
          getYouTubeThumbnail(videoId)
        );
        nextArtists.unshift(matchedArtist);
      }

      const newTrack: Track = {
        id: `track-custom-yt-${videoId}-${Date.now()}`,
        youtubeId: videoId,
        title: classification.cleanTitle || meta.title,
        artist: matchedArtist?.name || classification.singerName || meta.author,
        artistId: matchedArtist?.id,
        section: classification.section,
        album: 'YouTube Audio Stream',
        duration: 235,
        audioUrl: '',
        coverUrl: getYouTubeThumbnail(videoId),
        genre: classification.genre,
        language: classification.language,
        releaseYear: new Date().getFullYear(),
        playCount: 100000,
        gradient: 'from-emerald-600 via-teal-800 to-slate-950',
        isOfficial: true,
        createdAt: Date.now(),
      };

      if (matchedArtist) {
        const topIds = matchedArtist.topTrackIds || [];
        if (!topIds.includes(newTrack.id)) {
          matchedArtist.topTrackIds = [newTrack.id, ...topIds];
        }
      }
      setArtists(nextArtists);
      try {
        localStorage.setItem('aurastream_artists', JSON.stringify(nextArtists));
      } catch {}

      const updatedQueue = [
        newTrack,
        ...queue.filter((t) => t.youtubeId !== videoId),
      ];
      const updatedTracks = [
        newTrack,
        ...tracks.filter((t) => t.youtubeId !== videoId),
      ];
      setTracks(updatedTracks);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updatedTracks));
      } catch {}
      persistCatalogToServer(updatedTracks, playlists, nextArtists);

      playTrack(newTrack, updatedQueue);
      showToast(
        `AI Added: "${newTrack.title}" → Singer: ${newTrack.artist} | Category: ${classification.categoryLabel}`
      );
      return {
        success: true,
        message: `AI Added "${newTrack.title}" (Singer: ${newTrack.artist}, ${classification.categoryLabel})`,
      };
    },
    [
      hydratePlaylistFromVideoIds,
      playTrack,
      queue,
      tracks,
      playlists,
      artists,
      persistCatalogToServer,
      showToast,
    ]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) {
      if (tracks.length > 0) {
        playTrack(tracks[0]);
      }
      return;
    }

    if (isPlaying) {
      if (isUsingYouTubeIframeRef.current && ytPlayerRef.current?.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
      setPlayerStatus('Paused');
    } else {
      if (isUsingYouTubeIframeRef.current) {
        try {
          ytPlayerRef.current?.playVideo?.();
        } catch {}
        setIsPlaying(true);
        setPlayerStatus('Now Playing');
        return;
      }
      if (audio && isCustomDirectAudioUrl(currentTrack.audioUrl)) {
        if (!audio.src || audio.src === '') {
          audio.src = currentTrack.audioUrl;
        }
        audio.play().catch(() => {});
        setIsPlaying(true);
        setPlayerStatus('Now Playing');
      } else {
        playTrack(currentTrack);
      }
    }
  }, [currentTrack, isPlaying, tracks, playTrack]);

  const playNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = getNextTrackIndex(currentIdx, queue.length, shuffle, repeatMode);

    if (nextIdx !== -1 && queue[nextIdx]) {
      playTrack(queue[nextIdx]);
    } else {
      setIsPlaying(false);
      setPlayerStatus('Paused');
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [currentTrack, queue, shuffle, repeatMode, playTrack]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrev = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = getPrevTrackIndex(currentIdx, queue.length, currentTime);

    if (prevIdx !== -1 && queue[prevIdx]) {
      if (prevIdx === currentIdx) {
        if (isUsingYouTubeIframeRef.current && ytPlayerRef.current?.seekTo) {
          try {
            ytPlayerRef.current.seekTo(0, true);
          } catch {}
        }
        if (audioRef.current && !isUsingYouTubeIframeRef.current) {
          audioRef.current.currentTime = 0;
        }
        setCurrentTime(0);
      } else {
        playTrack(queue[prevIdx]);
      }
    }
  }, [currentTrack, queue, currentTime, playTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNext();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, playNext]);

  const seek = useCallback(
    (seconds: number) => {
      const safeSecs = clamp(seconds, 0, duration);
      setCurrentTime(safeSecs);
      if (isUsingYouTubeIframeRef.current && ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(safeSecs, true);
        } catch {}
      }
      if (audioRef.current && !isUsingYouTubeIframeRef.current) {
        audioRef.current.currentTime = safeSecs;
      }
    },
    [duration]
  );

  const setVolume = useCallback((val: number) => {
    const safeVal = clamp(val, 0, 1);
    setVolumeState(safeVal);
    if (safeVal === 0) {
      setIsMuted(true);
      try {
        ytPlayerRef.current?.mute?.();
      } catch {}
    } else {
      setIsMuted(false);
      prevVolumeRef.current = safeVal;
      try {
        ytPlayerRef.current?.unMute?.();
        ytPlayerRef.current?.setVolume?.(Math.round(safeVal * 100));
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = safeVal;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5;
      setIsMuted(false);
      setVolumeState(restored);
      if (audioRef.current) audioRef.current.volume = restored;
      try {
        ytPlayerRef.current?.unMute?.();
        ytPlayerRef.current?.setVolume?.(Math.round(restored * 100));
      } catch {}
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      setVolumeState(0);
      if (audioRef.current) audioRef.current.volume = 0;
      try {
        ytPlayerRef.current?.mute?.();
      } catch {}
    }
  }, [isMuted, volume]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const toggleLike = useCallback(
    (trackId: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentLiked = getUserLikedSongs(likedStore, targetUser);
      let updated: string[];
      let isLikedNow = false;

      if (currentLiked.includes(trackId)) {
        updated = currentLiked.filter((id) => id !== trackId);
      } else {
        updated = [...currentLiked, trackId];
        isLikedNow = true;
      }

      setLikedStore((prev) => saveUserLikedSongs(prev, targetUser, updated));
      const track = tracks.find((t) => t.id === trackId) || queue.find((t) => t.id === trackId);
      if (track) {
        showToast(
          isLikedNow ? `Saved to Liked Songs: "${track.title}"` : `Removed from Liked Songs`
        );
      }
    },
    [currentUser, likedStore, tracks, queue, showToast]
  );

  const toggleQueue = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const toggleLyrics = useCallback(() => {
    setIsLyricsOpen((prev) => !prev);
  }, []);

  const createPlaylist = useCallback(
    (
      name: string,
      description: string,
      options?: {
        section?: HomeSection;
        artistId?: string;
        artistName?: string;
        coverGradient?: string;
      }
    ) => {
      if (!name.trim()) return;
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(playlistsStore, targetUser);

      const gradients = [
        'from-emerald-500 to-teal-700',
        'from-violet-500 to-purple-800',
        'from-blue-500 to-indigo-800',
        'from-rose-500 to-orange-700',
        'from-amber-500 to-yellow-700',
      ];

      const chosenSec: HomeSection = options?.section || 'hindi';
      const matchedArtist =
        artists.find(
          (a) =>
            (options?.artistId && a.id === options.artistId) ||
            (options?.artistName &&
              a.name.trim().toLowerCase() === options.artistName.trim().toLowerCase())
        ) || artists[0];

      const secToCategory: Record<HomeSection, Playlist['category']> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };

      const nextTs = getNextCatalogTimestamp(
        tracksRef.current,
        playlistsRef.current,
        artistsRef.current
      );
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || 'Custom curated music mix.',
        trackIds: [],
        coverGradient:
          options?.coverGradient || gradients[currentPls.length % gradients.length],
        isCustom: true,
        category: secToCategory[chosenSec],
        section: chosenSec,
        artistId: matchedArtist?.id,
        artistName: matchedArtist?.name,
        createdAt: nextTs,
      };

      const updated = [newPlaylist, ...currentPls];
      playlistsRef.current = updated;
      setPlaylistsStore((prev) => {
        const next = saveUserPlaylists(prev, targetUser, updated);
        next.guest = updated;
        next['user-alex-demo'] = updated;
        return next;
      });
      void persistCatalogToServer(tracksRef.current, updated, artistsRef.current);
      setActiveView(newPlaylist.id as ActiveView);
      showToast(
        `Created playlist "${newPlaylist.name}" in Section (${chosenSec.toUpperCase()}) & Singer (${matchedArtist?.name || 'Section 5'})`
      );
    },
    [currentUser, playlistsStore, artists, tracks, persistCatalogToServer, showToast]
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(playlistsStore, targetUser);

      const updated = currentPls.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            trackIds: addTrackToPlaylistTracks(pl.trackIds, trackId),
          };
        }
        return pl;
      });

      setPlaylistsStore((prev) => saveUserPlaylists(prev, targetUser, updated));
      persistCatalogToServer(tracks, updated);
      const targetPl = currentPls.find((p) => p.id === playlistId);
      if (targetPl) {
        showToast(`Added track to "${targetPl.name}" permanently`);
      }
    },
    [currentUser, playlistsStore, tracks, persistCatalogToServer, showToast]
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(playlistsStore, targetUser);

      const updated = currentPls.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            trackIds: removeTrackFromPlaylistTracks(pl.trackIds, trackId),
          };
        }
        return pl;
      });

      setPlaylistsStore((prev) => saveUserPlaylists(prev, targetUser, updated));
      persistCatalogToServer(tracks, updated);
      showToast('Removed track from playlist permanently.');
    },
    [currentUser, playlistsStore, tracks, persistCatalogToServer, showToast]
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls =
        playlistsRef.current.length > 0
          ? playlistsRef.current
          : getUserPlaylists(playlistsStore, targetUser);
      const updated = currentPls.filter((pl) => pl.id !== playlistId);

      playlistsRef.current = updated;
      setPlaylistsStore((prev) => {
        const next: Record<string, Playlist[]> = {
          ...prev,
          'user-alex-demo': updated,
          guest: updated,
          [targetUser]: updated,
        };
        for (const k of Object.keys(prev)) {
          next[k] = updated;
        }
        return next;
      });
      safeSaveCatalogToLocalStorage(tracksRef.current, updated, artistsRef.current);
      void persistCatalogToServer(tracksRef.current, updated, artistsRef.current);
      if (activeView === playlistId) {
        setActiveView('home');
      }
      showToast('Playlist permanently deleted for all users.');
    },
    [
      currentUser,
      playlistsStore,
      activeView,
      safeSaveCatalogToLocalStorage,
      persistCatalogToServer,
      showToast,
    ]
  );

  const editPlaylist = useCallback(
    (playlistId: string, name: string, description: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(playlistsStore, targetUser);

      const updated = currentPls.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            name: name.trim() || pl.name,
            description: description.trim() || pl.description,
          };
        }
        return pl;
      });

      setPlaylistsStore((prev) => saveUserPlaylists(prev, targetUser, updated));
      persistCatalogToServer(tracks, updated);
      showToast('Playlist details updated.');
    },
    [currentUser, playlistsStore, tracks, persistCatalogToServer, showToast]
  );

  const aiClassifySingleInput = useCallback(
    async (input: {
      title: string;
      artist?: string;
      album?: string;
      playlistTitle?: string;
    }): Promise<AIClassifiedTrackResult> => {
      const [res] = await classifyBatchWithAI([input]);
      return res || smartClassifyTrackMetadata(input);
    },
    []
  );

  const fetchYouTubeTrackInfo = useCallback(async (rawInput: string) => {
    const parsed = parseYouTubeInput(rawInput);
    if (parsed.type === 'invalid') {
      return { success: false, error: parsed.error };
    }
    const vid = parsed.type === 'video' ? parsed.videoId : parsed.videoId || '';
    if (!vid) {
      return {
        success: false,
        error:
          'This is a Playlist URL. Please use the YouTube Playlists tab to add a full playlist, or paste a single Video URL/ID here.',
      };
    }
    const meta = await fetchNoembedMetadata(vid);
    const [aiRes] = await classifyBatchWithAI([
      { title: meta.title, artist: meta.author },
    ]);
    const aiClassification =
      aiRes || smartClassifyTrackMetadata({ title: meta.title, artist: meta.author });

    return {
      success: true,
      videoId: vid,
      title: aiClassification.cleanTitle || meta.title,
      author: aiClassification.singerName || meta.author,
      thumbnail: getYouTubeThumbnail(vid),
      aiClassification,
    };
  }, []);

  const addAdminYouTubePlaylist = useCallback(
    async (data: {
      name: string;
      description: string;
      youtubeInput: string;
      category?: Playlist['category'];
      section?: HomeSection;
      artistId?: string;
      artistName?: string;
      trackIds?: string[];
      useAISmartCategorize?: boolean;
    }) => {
      let resolvedPlaylistId: string | undefined = undefined;
      let resolvedVideoId: string | undefined = undefined;
      if (data.youtubeInput.trim()) {
        const parsed = parseYouTubeInput(data.youtubeInput.trim());
        if (parsed.type === 'playlist') {
          resolvedPlaylistId = parsed.playlistId;
          resolvedVideoId = parsed.videoId;
        } else if (parsed.type === 'video' && parsed.videoId) {
          resolvedPlaylistId = `RD${parsed.videoId}`;
          resolvedVideoId = parsed.videoId;
        } else if (data.youtubeInput.trim().length >= 3) {
          resolvedPlaylistId = data.youtubeInput.trim();
        } else {
          return {
            success: false,
            error:
              'Please enter a valid YouTube Playlist URL (?list=PL...), Video URL, or Playlist ID.',
          };
        }
      }

      const useAI = data.useAISmartCategorize !== false;
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(
        playlistsStore,
        targetUser,
        INITIAL_PLAYLISTS
      );

      const gradients = [
        'from-emerald-500 to-teal-700',
        'from-amber-500 to-rose-700',
        'from-orange-500 to-red-700',
        'from-violet-600 to-indigo-800',
        'from-rose-500 to-purple-800',
      ];

      let chosenSec: HomeSection =
        data.section ||
        (data.category === 'Bhojpuri'
          ? 'bhojpuri'
          : data.category === 'Bhakti'
          ? 'bhakti'
          : data.category === 'English'
          ? 'english'
          : 'hindi');

      const secToGenre: Record<HomeSection, Genre> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };
      const secToCategory: Record<HomeSection, Playlist['category']> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };

      const genreForPl: Genre = secToGenre[chosenSec];
      let serverPl: { title: string; tracks: Track[] } | null = null;
      if (resolvedPlaylistId) {
        serverPl = await fetchServerPlaylistTracks(
          resolvedPlaylistId,
          genreForPl,
          resolvedVideoId,
          data.name.trim()
        );
      }

      const nextArtists = [...artistsRef.current];
      let targetArtist =
        nextArtists.find(
          (a) =>
            (data.artistId && a.id === data.artistId) ||
            (data.artistName &&
              a.name.trim().toLowerCase() === data.artistName.trim().toLowerCase())
        ) || nextArtists[0];

      const mergedTracks = [...tracksRef.current];
      const plTrackIds: string[] =
        data.trackIds && data.trackIds.length > 0 ? [...data.trackIds] : [];
      const aiDetails: Array<{ title: string; singer: string; category: string }> = [];
      const sectionCounts = new Map<HomeSection, number>();
      const singerCounts = new Map<string, number>();

      const uploadTs =
        getNextCatalogTimestamp(
          tracksRef.current,
          playlistsRef.current,
          artistsRef.current
        ) + 10000;

      if (serverPl && serverPl.tracks.length > 0) {
        const aiResults = await classifyBatchWithAI(
          serverPl.tracks.map((st) => ({
            id: st.id,
            title: st.title,
            artist: st.artist,
            playlistTitle: data.name.trim() || serverPl!.title,
          }))
        );

        for (let i = 0; i < serverPl.tracks.length; i++) {
          const st = serverPl.tracks[i];
          const trackCreatedAt = uploadTs - i;
          const aiInfo =
            aiResults[i] ||
            smartClassifyTrackMetadata({
              title: st.title,
              artist: st.artist,
              playlistTitle: data.name.trim() || serverPl.title,
            });

          const trackSec: HomeSection = useAI ? aiInfo.section : chosenSec;
          const trackGenre: Genre = useAI ? aiInfo.genre : genreForPl;

          let trackArtistObj = useAI
            ? findMatchingArtist(aiInfo.singerName, nextArtists)
            : targetArtist;

          if (
            useAI &&
            !trackArtistObj &&
            aiInfo.singerName &&
            aiInfo.singerName !== 'Various Artists' &&
            isVerifiedRealSingerName(aiInfo.singerName)
          ) {
            trackArtistObj = {
              ...createSingerObjectFromAI(
                aiInfo.singerName,
                aiInfo,
                st.coverUrl
              ),
              createdAt: trackCreatedAt,
            };
            nextArtists.unshift(trackArtistObj);
          }

          if (!trackArtistObj) {
            trackArtistObj = targetArtist;
          }

          const finalSingerName =
            trackArtistObj?.name ||
            (aiInfo.singerName !== 'Various Artists' ? aiInfo.singerName : '') ||
            st.artist;

          sectionCounts.set(trackSec, (sectionCounts.get(trackSec) || 0) + 1);
          if (finalSingerName && finalSingerName !== 'Various Artists') {
            singerCounts.set(
              finalSingerName,
              (singerCounts.get(finalSingerName) || 0) + 1
            );
          }

          const cleanCandidateTitle = aiInfo.cleanTitle || st.title;
          const candidateKey = getCanonicalSongKey({
            title: cleanCandidateTitle,
            artist: finalSingerName,
            youtubeId: st.youtubeId,
          });
          const existingIndex = mergedTracks.findIndex(
            (t) =>
              (st.youtubeId && t.youtubeId === st.youtubeId) ||
              getCanonicalSongKey(t) === candidateKey
          );
          const enrichedSt: Track = {
            ...st,
            title: cleanCandidateTitle,
            section: trackSec,
            genre: trackGenre,
            language: aiInfo.language || st.language,
            artistId: trackArtistObj?.id,
            artist: finalSingerName,
            createdAt: trackCreatedAt,
          };

          let finalTrackId = enrichedSt.id;
          if (existingIndex >= 0) {
            const updatedExisting: Track = {
              ...mergedTracks[existingIndex],
              title: cleanCandidateTitle || mergedTracks[existingIndex].title,
              section: trackSec,
              genre: trackGenre,
              artistId: trackArtistObj?.id || mergedTracks[existingIndex].artistId,
              artist: finalSingerName || mergedTracks[existingIndex].artist,
              createdAt: trackCreatedAt,
            };
            mergedTracks.splice(existingIndex, 1);
            mergedTracks.unshift(updatedExisting);
            finalTrackId = updatedExisting.id;
            if (!plTrackIds.includes(updatedExisting.id)) {
              plTrackIds.push(updatedExisting.id);
            }
          } else {
            mergedTracks.unshift(enrichedSt);
            if (!plTrackIds.includes(enrichedSt.id)) {
              plTrackIds.push(enrichedSt.id);
            }
          }

          if (trackArtistObj) {
            const topIds = trackArtistObj.topTrackIds || [];
            if (!topIds.includes(finalTrackId)) {
              trackArtistObj.topTrackIds = [finalTrackId, ...topIds];
            }
          }

          aiDetails.push({
            title: enrichedSt.title,
            singer: finalSingerName,
            category: aiInfo.categoryLabel,
          });
        }
      }

      // Client-side fallback when server playlist scraping is unavailable (e.g. serverless deployment or YouTube Mix URL)
      if (plTrackIds.length === 0 && resolvedVideoId) {
        const meta = await fetchNoembedMetadata(resolvedVideoId);
        const aiInfo = smartClassifyTrackMetadata(
          {
            title: meta.title,
            artist: meta.author,
            playlistTitle: data.name.trim(),
          },
          nextArtists
        );
        const trackSec: HomeSection = useAI ? aiInfo.section : chosenSec;
        const trackGenre: Genre = useAI ? aiInfo.genre : genreForPl;
        const trackArtistObj =
          findMatchingArtist(aiInfo.singerName, nextArtists) || targetArtist;
        const fallbackTrack: Track = {
          id: `track-yt-pl-${resolvedVideoId}`,
          title: aiInfo.cleanTitle || meta.title,
          artist: trackArtistObj?.name || aiInfo.singerName || meta.author,
          artistId: trackArtistObj?.id,
          section: trackSec,
          album: data.name.trim() || 'YouTube Playlist',
          duration: 235,
          audioUrl: '',
          coverUrl: getYouTubeThumbnail(resolvedVideoId),
          youtubeId: resolvedVideoId,
          genre: trackGenre,
          language: aiInfo.language,
          releaseYear: new Date().getFullYear(),
          playCount: 150000,
          gradient: 'from-emerald-600 via-teal-800 to-slate-950',
          isOfficial: true,
          createdAt: uploadTs,
        };
        const existingIdx = mergedTracks.findIndex(
          (t) => t.youtubeId === resolvedVideoId || t.id === fallbackTrack.id
        );
        if (existingIdx >= 0) {
          const updatedExisting = {
            ...mergedTracks[existingIdx],
            createdAt: uploadTs,
          };
          mergedTracks.splice(existingIdx, 1);
          mergedTracks.unshift(updatedExisting);
          plTrackIds.push(updatedExisting.id);
        } else {
          mergedTracks.unshift(fallbackTrack);
          plTrackIds.push(fallbackTrack.id);
        }
        aiDetails.push({
          title: fallbackTrack.title,
          singer: fallbackTrack.artist,
          category: aiInfo.categoryLabel,
        });
      }

      // If still empty (e.g. pure playlist ID on offline/serverless without backend scraping), populate with matching singer/section tracks so creation always works
      if (plTrackIds.length === 0) {
        const artistMatches = targetArtist
          ? getStrictArtistTracks(mergedTracks, targetArtist).slice(0, 12)
          : [];
        const sectionMatches = getSectionTracks(mergedTracks, chosenSec).slice(0, 12);
        const fallbackPool = artistMatches.length > 0 ? artistMatches : sectionMatches;
        for (const ft of fallbackPool) {
          if (!plTrackIds.includes(ft.id)) {
            plTrackIds.push(ft.id);
          }
        }
      }

      if (plTrackIds.length === 0) {
        return {
          success: false,
          error:
            'Could not resolve songs from this YouTube Playlist. Please select at least one song or enter a valid YouTube link.',
        };
      }

      // Also bump createdAt of any manually selected trackIds so they show at the front of Home Page Song Cards
      for (let idx = 0; idx < plTrackIds.length; idx++) {
        const tid = plTrackIds[idx];
        const foundIdx = mergedTracks.findIndex((t) => t.id === tid);
        if (foundIdx >= 0 && (mergedTracks[foundIdx].createdAt || 0) < uploadTs - 5000) {
          mergedTracks[foundIdx] = {
            ...mergedTracks[foundIdx],
            createdAt: uploadTs - idx,
          };
        }
      }

      if (useAI && sectionCounts.size > 0) {
        let maxCnt = -1;
        for (const [sec, cnt] of sectionCounts.entries()) {
          if (cnt > maxCnt) {
            maxCnt = cnt;
            chosenSec = sec;
          }
        }
      }

      if (useAI && singerCounts.size > 0) {
        let bestSinger = '';
        let maxCnt = -1;
        for (const [sName, cnt] of singerCounts.entries()) {
          if (cnt > maxCnt) {
            maxCnt = cnt;
            bestSinger = sName;
          }
        }
        const matchedDominant = findMatchingArtist(bestSinger, nextArtists);
        if (matchedDominant) {
          targetArtist = matchedDominant;
        }
      }

      const resolvedName =
        data.name.trim() ||
        (serverPl?.title
          ? `${serverPl.title}`
          : resolvedPlaylistId
          ? `YouTube Playlist (${resolvedPlaylistId.slice(0, 12)})`
          : 'Curated YouTube Mix');

      const latestPls = playlistsRef.current.length > 0 ? playlistsRef.current : currentPls;
      const existingPl = resolvedPlaylistId
        ? latestPls.find(
            (p) =>
              p.id.startsWith('playlist-yt-') &&
              p.youtubePlaylistId === resolvedPlaylistId &&
              (!data.name.trim() ||
                p.name.trim().toLowerCase() === data.name.trim().toLowerCase())
          )
        : undefined;

      const detectedSingersList = Array.from(singerCounts.keys()).slice(0, 4);
      const aiSummary =
        detectedSingersList.length > 0
          ? `Singer: ${detectedSingersList.join(', ')} · Category: ${
              secToCategory[chosenSec]
            } Song`
          : `Category: ${secToCategory[chosenSec]} Song`;

      const newPlaylistId = existingPl
        ? existingPl.id
        : `playlist-yt-${Date.now()}`;
      const newPlaylist: Playlist = {
        id: newPlaylistId,
        name: resolvedName,
        description:
          data.description.trim() ||
          `AI Organized Playlist · ${aiSummary} · ${plTrackIds.length} Songs`,
        trackIds: plTrackIds,
        coverGradient:
          existingPl?.coverGradient ||
          gradients[latestPls.length % gradients.length],
        isCustom: false,
        category: secToCategory[chosenSec] || data.category,
        section: chosenSec,
        artistId: targetArtist?.id,
        artistName: targetArtist?.name,
        youtubePlaylistId: resolvedPlaylistId,
        createdAt: uploadTs + 1000,
      };

      const updatedPlaylists = [
        newPlaylist,
        ...latestPls.filter((p) => p.id !== newPlaylistId),
      ];

      artistsRef.current = nextArtists;
      setArtists(nextArtists);

      tracksRef.current = mergedTracks;
      setTracks(mergedTracks);

      playlistsRef.current = updatedPlaylists;
      setPlaylistsStore((prev) => {
        const next = saveUserPlaylists(prev, targetUser, updatedPlaylists);
        next.guest = updatedPlaylists;
        next['user-alex-demo'] = updatedPlaylists;
        return next;
      });
      safeSaveCatalogToLocalStorage(mergedTracks, updatedPlaylists, nextArtists);
      await persistCatalogToServer(mergedTracks, updatedPlaylists, nextArtists);
      showToast(
        `AI Added Playlist "${newPlaylist.name}" (${plTrackIds.length} songs) → ${aiSummary}!`
      );

      return {
        success: true,
        playlist: newPlaylist,
        aiSummary,
        aiDetails,
      };
    },
    [currentUser, playlistsStore, safeSaveCatalogToLocalStorage, persistCatalogToServer, showToast]
  );

  const updatePlaylistPlacement = useCallback(
    (playlistId: string, section: HomeSection, artistId: string) => {
      const targetUser = currentUser ? currentUser.id : 'guest';
      const currentPls = getUserPlaylists(playlistsStore, targetUser, INITIAL_PLAYLISTS);
      const matchedArtist = artists.find((a) => a.id === artistId) || artists[0];
      const secToCategory: Record<HomeSection, Playlist['category']> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };
      const secToGenre: Record<HomeSection, Genre> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };

      let targetTrackIds = new Set<string>();
      const updatedPlaylists = currentPls.map((pl) => {
        if (pl.id === playlistId) {
          targetTrackIds = new Set(pl.trackIds);
          return {
            ...pl,
            section,
            category: secToCategory[section],
            artistId: matchedArtist?.id,
            artistName: matchedArtist?.name,
          };
        }
        return pl;
      });

      const updatedTracks = tracks.map((t) => {
        if (targetTrackIds.has(t.id)) {
          return {
            ...t,
            section,
            genre: secToGenre[section],
            artistId: matchedArtist?.id || t.artistId,
          };
        }
        return t;
      });

      setTracks(updatedTracks);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updatedTracks));
      } catch {}

      setPlaylistsStore((prev) => {
        const next = saveUserPlaylists(prev, targetUser, updatedPlaylists);
        next.guest = updatedPlaylists;
        next['user-alex-demo'] = updatedPlaylists;
        return next;
      });
      persistCatalogToServer(updatedTracks, updatedPlaylists);
      showToast(
        `Assigned playlist & its songs to Section (${section.toUpperCase()}) and Singer (${matchedArtist?.name || 'Section 5'}) for all users!`
      );
    },
    [currentUser, playlistsStore, artists, tracks, persistCatalogToServer, showToast]
  );

  const resetPlaylistsToDefault = useCallback(() => {
    const targetUser = currentUser ? currentUser.id : 'guest';
    setPlaylistsStore((prev) => saveUserPlaylists(prev, targetUser, INITIAL_PLAYLISTS));
    persistCatalogToServer(tracks, INITIAL_PLAYLISTS);
    showToast('Reset playlists to default official collection.');
  }, [currentUser, tracks, persistCatalogToServer, showToast]);

  const playPlaylist = useCallback(
    (playlist: Playlist, mode?: 'sequential' | 'shuffle') => {
      setActivePlaylistId(playlist.youtubePlaylistId || playlist.id);
      // Ensure continuous non-stop playback across the playlist
      setRepeatMode('all');

      const useShuffle = mode === 'shuffle' ? true : mode === 'sequential' ? false : shuffle;
      if (mode === 'shuffle') {
        setShuffle(true);
      } else if (mode === 'sequential') {
        setShuffle(false);
      }

      // Strictly play ONLY tracks belonging to this specific playlist
      const playlistTracks = getStrictPlaylistTracks(playlist.trackIds, tracks);

      if (playlistTracks.length > 0) {
        const startIdx =
          useShuffle && playlistTracks.length > 1
            ? Math.floor(Math.random() * playlistTracks.length)
            : 0;
        const startTrack = playlistTracks[startIdx] || playlistTracks[0];
        playTrack(startTrack, playlistTracks);
        showToast(
          useShuffle
            ? `Playing random songs from "${playlist.name}" (${playlistTracks.length} songs)`
            : `Playing "${playlist.name}" one after another (${playlistTracks.length} songs)`
        );
      } else if (playlist.youtubePlaylistId) {
        loadYouTubeInput(playlist.youtubePlaylistId);
      }
    },
    [tracks, shuffle, playTrack, loadYouTubeInput, showToast]
  );

  const playArtist = useCallback(
    (artist: Artist, mode?: 'sequential' | 'shuffle') => {
      setActivePlaylistId(`artist-${artist.id}`);
      setRepeatMode('all');

      const useShuffle = mode === 'shuffle' ? true : mode === 'sequential' ? false : shuffle;
      if (mode === 'shuffle') {
        setShuffle(true);
      } else if (mode === 'sequential') {
        setShuffle(false);
      }

      const artistTracks = getStrictArtistTracks(tracks, artist);
      if (artistTracks.length > 0) {
        const startIdx =
          useShuffle && artistTracks.length > 1
            ? Math.floor(Math.random() * artistTracks.length)
            : 0;
        const startTrack = artistTracks[startIdx] || artistTracks[0];
        playTrack(startTrack, artistTracks);
        showToast(
          useShuffle
            ? `Playing random songs by ${artist.name} (${artistTracks.length} songs)`
            : `Playing only ${artist.name} songs (${artistTracks.length} songs)`
        );
      } else {
        showToast(`No songs found for ${artist.name} yet.`);
      }
    },
    [tracks, shuffle, playTrack, showToast]
  );

  const playSection = useCallback(
    (section: HomeSection, mode?: 'sequential' | 'shuffle') => {
      setActivePlaylistId(`section-${section}`);
      setRepeatMode('all');

      const useShuffle = mode === 'shuffle' ? true : mode === 'sequential' ? false : shuffle;
      if (mode === 'shuffle') {
        setShuffle(true);
      } else if (mode === 'sequential') {
        setShuffle(false);
      }

      const sectionTracks = getSectionTracks(tracks, section);
      const sectionLabels: Record<HomeSection, string> = {
        hindi: 'Bollywood & Hindi Superhits',
        bhojpuri: 'Bhojpuri Desi Dhamaka & Folk Beats',
        bhakti: 'Bhakti Bhavana (Devotional Songs)',
        english: 'English Songs',
      };

      if (sectionTracks.length > 0) {
        const startIdx =
          useShuffle && sectionTracks.length > 1
            ? Math.floor(Math.random() * sectionTracks.length)
            : 0;
        const startTrack = sectionTracks[startIdx] || sectionTracks[0];
        playTrack(startTrack, sectionTracks);
        showToast(
          useShuffle
            ? `Playing random songs from ${sectionLabels[section]} (${sectionTracks.length} songs)`
            : `Playing only ${sectionLabels[section]} (${sectionTracks.length} songs)`
        );
      }
    },
    [tracks, shuffle, playTrack, showToast]
  );

  const addTrack = useCallback(
    (trackData: Omit<Track, 'id'> & { id?: string }) => {
      const currentArtists = [...artistsRef.current];
      const aiCheck = smartClassifyTrackMetadata(
        {
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
        },
        currentArtists
      );

      const resolvedSingerName =
        trackData.artist?.trim() && !isGenericChannelOrLabel(trackData.artist.trim())
          ? trackData.artist.trim()
          : aiCheck.singerName;

      let matchedArtist =
        (trackData.artistId
          ? currentArtists.find((a) => a.id === trackData.artistId)
          : undefined) ||
        findMatchingArtist(resolvedSingerName, currentArtists) ||
        findMatchingArtist(aiCheck.singerName, currentArtists);

      if (
        !matchedArtist &&
        resolvedSingerName &&
        resolvedSingerName !== 'Various Artists' &&
        isVerifiedRealSingerName(resolvedSingerName)
      ) {
        matchedArtist = createSingerObjectFromAI(
          resolvedSingerName,
          aiCheck,
          trackData.coverUrl
        );
        currentArtists.unshift(matchedArtist);
      }

      const chosenSec =
        trackData.section || aiCheck.section || resolveTrackSection(trackData);

      const cleanTitle = aiCheck.cleanTitle || trackData.title.trim();
      const finalArtistName =
        matchedArtist?.name || resolvedSingerName || trackData.artist;
      const candidateKey = getCanonicalSongKey({
        title: cleanTitle,
        artist: finalArtistName,
        youtubeId: trackData.youtubeId,
      });

      const existingTrack = tracksRef.current.find(
        (t) =>
          (trackData.id && t.id === trackData.id) ||
          (trackData.youtubeId && t.youtubeId === trackData.youtubeId) ||
          getCanonicalSongKey(t) === candidateKey
      );

      const nextTs = getNextCatalogTimestamp(
        tracksRef.current,
        playlistsRef.current,
        artistsRef.current
      );
      const newTrack: Track = {
        ...(existingTrack || {}),
        ...trackData,
        title: cleanTitle,
        artist: finalArtistName,
        id: existingTrack?.id || trackData.id || `track-custom-${Date.now()}`,
        playCount:
          trackData.playCount ||
          existingTrack?.playCount ||
          Math.floor(Math.random() * 500000) + 10000,
        gradient:
          trackData.gradient ||
          existingTrack?.gradient ||
          'from-emerald-500 via-teal-600 to-indigo-950',
        isOfficial: trackData.isOfficial ?? true,
        section: chosenSec,
        genre: trackData.genre || aiCheck.genre,
        language: trackData.language || aiCheck.language,
        artistId: matchedArtist?.id || trackData.artistId || existingTrack?.artistId,
        createdAt: nextTs,
      };

      let updatedArtists = currentArtists;
      if (matchedArtist) {
        updatedArtists = currentArtists.map((a) => {
          if (a.id === matchedArtist!.id) {
            const topIds = a.topTrackIds || [];
            return topIds.includes(newTrack.id)
              ? a
              : { ...a, topTrackIds: [newTrack.id, ...topIds] };
          }
          return a;
        });
        artistsRef.current = updatedArtists;
        setArtists(updatedArtists);
        try {
          localStorage.setItem(
            'aurastream_artists',
            JSON.stringify(updatedArtists)
          );
        } catch {}
      }

      const updatedTracks = [
        newTrack,
        ...tracksRef.current.filter(
          (t) =>
            t.id !== newTrack.id &&
            (!newTrack.youtubeId || t.youtubeId !== newTrack.youtubeId) &&
            getCanonicalSongKey(t) !== candidateKey
        ),
      ];
      tracksRef.current = updatedTracks;
      setTracks(updatedTracks);
      safeSaveCatalogToLocalStorage(updatedTracks, playlistsRef.current, updatedArtists);
      void persistCatalogToServer(updatedTracks, playlistsRef.current, updatedArtists);

      const secLabel =
        chosenSec === 'english'
          ? 'English Song'
          : chosenSec === 'bhojpuri'
          ? 'Bhojpuri Song'
          : chosenSec === 'bhakti'
          ? 'Bhakti Song'
          : 'Hindi Song';

      showToast(
        `AI Saved "${newTrack.title}" → Singer: ${
          matchedArtist?.name || newTrack.artist
        } | Category: ${secLabel}!`
      );
      return newTrack;
    },
    [safeSaveCatalogToLocalStorage, persistCatalogToServer, showToast]
  );

  const updateTrackSection = useCallback(
    (trackId: string, section: HomeSection) => {
      const sectionToGenre: Record<HomeSection, Genre> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };
      const sectionNames: Record<HomeSection, string> = {
        hindi: 'Section 1: Bollywood & Hindi Superhits',
        bhojpuri: 'Section 2: Bhojpuri Desi Dhamaka',
        bhakti: 'Section 3: Bhakti Bhavana',
        english: 'Section 4: English Songs',
      };

      let movedTitle = '';
      const updated = tracksRef.current.map((t) => {
        if (t.id === trackId) {
          movedTitle = t.title;
          return {
            ...t,
            section,
            genre: sectionToGenre[section],
          };
        }
        return t;
      });
      tracksRef.current = updated;
      setTracks(updated);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save tracks to localStorage', e);
      }
      void persistCatalogToServer(updated, playlistsRef.current, artistsRef.current);

      if (movedTitle) {
        showToast(`Moved "${movedTitle}" to ${sectionNames[section]}`);
      }
    },
    [persistCatalogToServer, showToast]
  );

  const updateTrackSinger = useCallback(
    (trackId: string, artistId: string) => {
      const targetArtist = artistsRef.current.find((a) => a.id === artistId);
      if (!targetArtist) return;

      let movedTitle = '';
      const updatedTracks = tracksRef.current.map((t) => {
        if (t.id === trackId) {
          movedTitle = t.title;
          return {
            ...t,
            artistId: targetArtist.id,
            artist: targetArtist.name,
          };
        }
        return t;
      });
      const updatedArtists = artistsRef.current.map((a) => {
        if (a.id === targetArtist.id) {
          const topIds = a.topTrackIds || [];
          return topIds.includes(trackId) ? a : { ...a, topTrackIds: [trackId, ...topIds] };
        }
        return a;
      });

      tracksRef.current = updatedTracks;
      artistsRef.current = updatedArtists;
      setTracks(updatedTracks);
      setArtists(updatedArtists);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updatedTracks));
        localStorage.setItem('aurastream_artists', JSON.stringify(updatedArtists));
      } catch (e) {
        console.warn('Failed to save tracks to localStorage', e);
      }
      void persistCatalogToServer(updatedTracks, playlistsRef.current, updatedArtists);

      if (movedTitle) {
        showToast(`Assigned "${movedTitle}" to Singer: ${targetArtist.name} (Section 5)`);
      }
    },
    [persistCatalogToServer, showToast]
  );

  const removeTrack = useCallback(
    (trackId: string) => {
      const trackToRemove = tracksRef.current.find((t) => t.id === trackId);
      const removedTitle = trackToRemove?.title || '';
      const updatedTracks = tracksRef.current.filter((t) => t.id !== trackId);
      const updatedPlaylists = playlistsRef.current.map((pl) => ({
        ...pl,
        trackIds: (pl.trackIds || []).filter((id) => id !== trackId),
      }));
      const updatedArtists = artistsRef.current.map((a) => ({
        ...a,
        topTrackIds: (a.topTrackIds || []).filter((id) => id !== trackId),
      }));

      tracksRef.current = updatedTracks;
      playlistsRef.current = updatedPlaylists;
      artistsRef.current = updatedArtists;
      setTracks(updatedTracks);
      setArtists(updatedArtists);
      setPlaylistsStore((prev) => {
        const next: Record<string, Playlist[]> = {
          ...prev,
          'user-alex-demo': updatedPlaylists,
          guest: updatedPlaylists,
        };
        for (const k of Object.keys(prev)) {
          next[k] = updatedPlaylists;
        }
        return next;
      });
      setLikedStore((prev) => {
        const next: Record<string, string[]> = {};
        for (const [k, ids] of Object.entries(prev)) {
          next[k] = (ids || []).filter((id) => id !== trackId);
        }
        return next;
      });

      safeSaveCatalogToLocalStorage(updatedTracks, updatedPlaylists, updatedArtists);
      void persistCatalogToServer(updatedTracks, updatedPlaylists, updatedArtists);

      if (currentTrack?.id === trackId) {
        if (queue.length > 1) {
          playNext();
        } else {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          setPlayerStatus('Paused');
          setCurrentTrack(null);
        }
      }

      setQueue((prevQueue) => prevQueue.filter((t) => t.id !== trackId));
      if (removedTitle) {
        showToast(`Permanently deleted "${removedTitle}" everywhere.`);
      } else {
        showToast('Track permanently deleted everywhere.');
      }
    },
    [
      currentTrack,
      queue,
      playNext,
      safeSaveCatalogToLocalStorage,
      persistCatalogToServer,
      showToast,
    ]
  );

  const resetTracksToDefault = useCallback(() => {
    setTracks(INITIAL_TRACKS);
    setQueue(INITIAL_TRACKS);
    try {
      localStorage.removeItem('aurastream_tracks');
    } catch (e) {
      console.warn(e);
    }
    persistCatalogToServer(INITIAL_TRACKS, playlists);
    showToast('Reset songs to default official track collection.');
  }, [playlists, persistCatalogToServer, showToast]);

  const saveCatalogPermanently = useCallback(async () => {
    const ok = await persistCatalogToServer(tracks, playlists, artists);
    if (ok) {
      showToast('All songs, playlists & singers saved permanently on server for every user & APK!');
    } else {
      showToast('Saved locally; server sync will retry when online.');
    }
    return ok;
  }, [tracks, playlists, artists, persistCatalogToServer, showToast]);

  const importCatalogFromBackup = useCallback(
    async (importedTracks: Track[], importedPlaylists: Playlist[], importedArtists?: Artist[]) => {
      const nextTracks = importedTracks.length > 0 ? importedTracks : tracks;
      const nextPlaylists = importedPlaylists.length > 0 ? importedPlaylists : playlists;
      const nextArtists = Array.isArray(importedArtists) && importedArtists.length > 0 ? importedArtists : artists;

      setTracks(nextTracks);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(nextTracks));
      } catch {}

      if (Array.isArray(importedArtists) && importedArtists.length > 0) {
        setArtists(nextArtists);
        try {
          localStorage.setItem('aurastream_artists', JSON.stringify(nextArtists));
        } catch {}
      }

      const targetUser = currentUser ? currentUser.id : 'guest';
      setPlaylistsStore((prev) => saveUserPlaylists(prev, targetUser, nextPlaylists));

      const ok = await persistCatalogToServer(nextTracks, nextPlaylists, nextArtists);
      showToast(
        `Imported ${nextTracks.length} songs, ${nextPlaylists.length} playlists & ${nextArtists.length} singers into permanent storage!`
      );
      return ok;
    },
    [tracks, playlists, artists, currentUser, persistCatalogToServer, showToast]
  );

  const bulkImportYouTubeCatalog = useCallback(
    async (
      rawLines: string,
      defaultGenre: Genre = 'Hindi',
      defaultSection: HomeSection = 'hindi',
      defaultArtistId?: string,
      useAISmartCategorize: boolean = true
    ) => {
      if (isSqlScriptInput(rawLines)) {
        return {
          addedSongs: 0,
          addedPlaylists: 0,
          errors: [
            'Note: That is the Supabase SQL Setup Script! Paste and Run it inside your Supabase Dashboard → SQL Editor (at supabase.com), not in this YouTube Song Importer box.',
          ],
          aiDetails: [],
        };
      }

      const nextArtists = [...artists];
      const targetArtist =
        nextArtists.find((a) => defaultArtistId && a.id === defaultArtistId) ||
        nextArtists[0];

      const items = parseBulkYouTubeLines(rawLines);
      let addedSongs = 0;
      let addedPlaylists = 0;
      const errors: string[] = [];
      const aiDetails: Array<{ title: string; singer: string; category: string }> = [];

      const newTracks: Track[] = [];
      const newPlaylists: Playlist[] = [];
      const updatedExistingMap = new Map<string, Track>();
      const bulkBaseTs =
        getNextCatalogTimestamp(
          tracksRef.current,
          playlistsRef.current,
          artistsRef.current
        ) + 20000;
      let tsCursor = bulkBaseTs;

      for (const item of items) {
        if (item.type === 'invalid') {
          errors.push(
            `Line ${item.lineNumber}: ${item.error || 'Invalid YouTube link/ID'}`
          );
          continue;
        }

        if (item.type === 'video' && item.videoId) {
          const meta = await fetchNoembedMetadata(item.videoId);
          const rawTitle = item.customTitle || meta.title;
          const rawArtist = item.customArtist || meta.author;

          const [aiRes] = await classifyBatchWithAI([
            { title: rawTitle, artist: rawArtist },
          ]);
          const aiInfo =
            aiRes ||
            smartClassifyTrackMetadata({ title: rawTitle, artist: rawArtist });

          const effectiveSection: HomeSection = useAISmartCategorize
            ? aiInfo.section
            : defaultSection;
          const effectiveGenre: Genre = useAISmartCategorize
            ? aiInfo.genre
            : defaultGenre;

          let matchedArtist = useAISmartCategorize
            ? findMatchingArtist(
                item.customArtist || aiInfo.singerName,
                nextArtists
              )
            : targetArtist;

          const itemTs = tsCursor--;

          if (
            useAISmartCategorize &&
            !matchedArtist &&
            aiInfo.singerName &&
            aiInfo.singerName !== 'Various Artists' &&
            isVerifiedRealSingerName(item.customArtist || aiInfo.singerName)
          ) {
            matchedArtist = {
              ...createSingerObjectFromAI(
                item.customArtist || aiInfo.singerName,
                aiInfo,
                getYouTubeThumbnail(item.videoId)
              ),
              createdAt: itemTs,
            };
            nextArtists.unshift(matchedArtist);
          }

          const finalSingerName =
            matchedArtist?.name ||
            item.customArtist ||
            aiInfo.singerName ||
            targetArtist?.name ||
            meta.author;

          const trackId = `track-yt-bulk-${item.videoId}-${Date.now()}-${addedSongs}`;
          if (matchedArtist) {
            const topIds = matchedArtist.topTrackIds || [];
            if (!topIds.includes(trackId)) {
              matchedArtist.topTrackIds = [trackId, ...topIds];
            }
          }

          const finalTitle = item.customTitle || aiInfo.cleanTitle || meta.title;
          const candidateKey = getCanonicalSongKey({
            title: finalTitle,
            artist: finalSingerName,
            youtubeId: item.videoId,
          });
          const existingInCatalog = tracksRef.current.find(
            (t) =>
              t.youtubeId === item.videoId || getCanonicalSongKey(t) === candidateKey
          );
          const alreadyInNew = newTracks.some(
            (t) =>
              t.youtubeId === item.videoId || getCanonicalSongKey(t) === candidateKey
          );

          if (existingInCatalog) {
            updatedExistingMap.set(existingInCatalog.id, {
              ...existingInCatalog,
              title: finalTitle || existingInCatalog.title,
              artist: finalSingerName || existingInCatalog.artist,
              artistId: matchedArtist?.id || existingInCatalog.artistId,
              section: effectiveSection,
              genre: effectiveGenre,
              createdAt: itemTs,
            });
            aiDetails.push({
              title: finalTitle,
              singer: finalSingerName,
              category: aiInfo.categoryLabel,
            });
            addedSongs++;
          } else if (!alreadyInNew) {
            newTracks.push({
              id: trackId,
              title: finalTitle,
              artist: finalSingerName,
              artistId: matchedArtist?.id,
              section: effectiveSection,
              album: 'YouTube Official Audio',
              duration: 240,
              audioUrl: '',
              coverUrl: getYouTubeThumbnail(item.videoId),
              youtubeId: item.videoId,
              genre: effectiveGenre,
              language: useAISmartCategorize
                ? aiInfo.language
                : effectiveSection === 'bhojpuri'
                ? 'Bhojpuri'
                : effectiveSection === 'english'
                ? 'English'
                : 'Hindi',
              releaseYear: new Date().getFullYear(),
              playCount: Math.floor(Math.random() * 400000) + 50000,
              gradient: 'from-amber-600 via-rose-600 to-indigo-950',
              isOfficial: true,
              createdAt: itemTs,
            });
            aiDetails.push({
              title: finalTitle,
              singer: finalSingerName,
              category: aiInfo.categoryLabel,
            });
            addedSongs++;
          }
        } else if (item.type === 'playlist' && item.playlistId) {
          const serverPl = await fetchServerPlaylistTracks(
            item.playlistId,
            defaultGenre
          );
          const plTrackIds: string[] = [];
          const sectionCounts = new Map<HomeSection, number>();
          const singerCounts = new Map<string, number>();

          if (serverPl && serverPl.tracks.length > 0) {
            const aiResults = await classifyBatchWithAI(
              serverPl.tracks.map((st) => ({
                id: st.id,
                title: st.title,
                artist: st.artist,
                playlistTitle: item.customTitle || serverPl.title,
              }))
            );

            for (let i = 0; i < serverPl.tracks.length; i++) {
              const st = serverPl.tracks[i];
              const itemTs = tsCursor--;
              const aiInfo =
                aiResults[i] ||
                smartClassifyTrackMetadata({
                  title: st.title,
                  artist: st.artist,
                  playlistTitle: item.customTitle || serverPl.title,
                });

              const effectiveSec: HomeSection = useAISmartCategorize
                ? aiInfo.section
                : defaultSection;
              sectionCounts.set(
                effectiveSec,
                (sectionCounts.get(effectiveSec) || 0) + 1
              );

              let matchedArt = useAISmartCategorize
                ? findMatchingArtist(aiInfo.singerName, nextArtists)
                : targetArtist;

              if (
                useAISmartCategorize &&
                !matchedArt &&
                aiInfo.singerName &&
                aiInfo.singerName !== 'Various Artists' &&
                isVerifiedRealSingerName(aiInfo.singerName)
              ) {
                matchedArt = {
                  ...createSingerObjectFromAI(
                    aiInfo.singerName,
                    aiInfo,
                    st.coverUrl
                  ),
                  createdAt: itemTs,
                };
                nextArtists.unshift(matchedArt);
              }

              const sName =
                matchedArt?.name ||
                aiInfo.singerName ||
                targetArtist?.name ||
                st.artist;
              if (sName && sName !== 'Various Artists') {
                singerCounts.set(sName, (singerCounts.get(sName) || 0) + 1);
              }

              const cleanStTitle = aiInfo.cleanTitle || st.title;
              const stKey = getCanonicalSongKey({
                title: cleanStTitle,
                artist: sName,
                youtubeId: st.youtubeId,
              });
              const existingInNew = newTracks.find(
                (t) =>
                  (st.youtubeId && t.youtubeId === st.youtubeId) ||
                  getCanonicalSongKey(t) === stKey
              );
              const existingInCatalog = tracksRef.current.find(
                (t) =>
                  (st.youtubeId && t.youtubeId === st.youtubeId) ||
                  getCanonicalSongKey(t) === stKey
              );
              const existing = existingInNew || existingInCatalog;
              if (existing) {
                if (existingInCatalog) {
                  updatedExistingMap.set(existingInCatalog.id, {
                    ...existingInCatalog,
                    title: cleanStTitle || existingInCatalog.title,
                    artist: sName || existingInCatalog.artist,
                    artistId: matchedArt?.id || existingInCatalog.artistId,
                    section: effectiveSec,
                    createdAt: itemTs,
                  });
                }
                if (!plTrackIds.includes(existing.id))
                  plTrackIds.push(existing.id);
              } else {
                const enrichedSt: Track = {
                  ...st,
                  title: cleanStTitle,
                  artist: sName,
                  artistId: matchedArt?.id,
                  section: effectiveSec,
                  genre: useAISmartCategorize ? aiInfo.genre : st.genre,
                  language: useAISmartCategorize ? aiInfo.language : st.language,
                  createdAt: itemTs,
                };
                if (matchedArt) {
                  const topIds = matchedArt.topTrackIds || [];
                  if (!topIds.includes(enrichedSt.id)) {
                    matchedArt.topTrackIds = [enrichedSt.id, ...topIds];
                  }
                }
                newTracks.push(enrichedSt);
                plTrackIds.push(enrichedSt.id);
                aiDetails.push({
                  title: enrichedSt.title,
                  singer: sName,
                  category: aiInfo.categoryLabel,
                });
                addedSongs++;
              }
            }
          }

          let plSection: HomeSection = defaultSection;
          if (useAISmartCategorize && sectionCounts.size > 0) {
            let maxCnt = -1;
            for (const [sec, cnt] of sectionCounts.entries()) {
              if (cnt > maxCnt) {
                maxCnt = cnt;
                plSection = sec;
              }
            }
          }

          let plSingerName = item.customArtist || targetArtist?.name || '';
          if (useAISmartCategorize && singerCounts.size > 0) {
            let maxCnt = -1;
            for (const [sName, cnt] of singerCounts.entries()) {
              if (cnt > maxCnt) {
                maxCnt = cnt;
                plSingerName = sName;
              }
            }
          }
          const plArtistObj =
            findMatchingArtist(plSingerName, nextArtists) || targetArtist;

          const secToCat: Record<HomeSection, Playlist['category']> = {
            hindi: 'Hindi',
            bhojpuri: 'Bhojpuri',
            bhakti: 'Bhakti',
            english: 'English',
          };

          const plTitle =
            item.customTitle ||
            (serverPl?.title
              ? `${serverPl.title}`
              : `YouTube Music Playlist (${item.playlistId.slice(0, 10)})`);

          newPlaylists.push({
            id: `playlist-yt-bulk-${Date.now()}-${addedPlaylists}`,
            name: plTitle,
            description: `AI Organized YouTube Playlist · Singer: ${
              plArtistObj?.name || plSingerName || 'Various'
            } · Category: ${secToCat[plSection]} Song · ${
              plTrackIds.length > 0 ? `${plTrackIds.length} Songs` : item.playlistId
            }`,
            trackIds:
              plTrackIds.length > 0
                ? plTrackIds
                : tracks.slice(0, 4).map((t) => t.id),
            coverGradient: 'from-emerald-500 to-teal-700',
            isCustom: false,
            category: secToCat[plSection],
            section: plSection,
            artistId: plArtistObj?.id,
            artistName: plArtistObj?.name || plSingerName,
            youtubePlaylistId: item.playlistId,
            createdAt: bulkBaseTs + 1000 - addedPlaylists,
          });
          addedPlaylists++;
        }
      }

      if (
        newTracks.length > 0 ||
        newPlaylists.length > 0 ||
        updatedExistingMap.size > 0
      ) {
        const bumpedExisting = Array.from(updatedExistingMap.values());
        const remainingTracks = tracksRef.current.filter(
          (t) => !updatedExistingMap.has(t.id)
        );
        const updatedTracks = [...newTracks, ...bumpedExisting, ...remainingTracks];
        const targetUser = currentUser ? currentUser.id : 'guest';
        const currentPls =
          playlistsRef.current.length > 0
            ? playlistsRef.current
            : getUserPlaylists(playlistsStore, targetUser, INITIAL_PLAYLISTS);
        const updatedPlaylists = [...newPlaylists, ...currentPls];

        artistsRef.current = nextArtists;
        setArtists(nextArtists);

        tracksRef.current = updatedTracks;
        setTracks(updatedTracks);

        playlistsRef.current = updatedPlaylists;
        setPlaylistsStore((prev) => {
          const next = saveUserPlaylists(prev, targetUser, updatedPlaylists);
          next.guest = updatedPlaylists;
          next['user-alex-demo'] = updatedPlaylists;
          return next;
        });
        safeSaveCatalogToLocalStorage(updatedTracks, updatedPlaylists, nextArtists);
        await persistCatalogToServer(
          updatedTracks,
          updatedPlaylists,
          nextArtists
        );
        showToast(
          `AI Imported & Organized ${addedSongs} song(s) & ${addedPlaylists} playlist(s) into their specific Singer & Category!`
        );
      }

      return { addedSongs, addedPlaylists, errors, aiDetails };
    },
    [
      tracks,
      artists,
      currentUser,
      playlistsStore,
      safeSaveCatalogToLocalStorage,
      persistCatalogToServer,
      showToast,
    ]
  );

  const aiAutoOrganizeCatalog = useCallback(async () => {
    const nextArtists = artistsRef.current.filter(
      (a) =>
        INITIAL_ARTISTS.some((ia) => ia.id === a.id) ||
        (!isGenericChannelOrLabel(a.name) && isVerifiedRealSingerName(a.name))
    );
    const newSingersCreated: string[] = [];
    const summary: Array<{ title: string; singer: string; category: string }> = [];
    let organizedTracks = 0;

    // Classify custom/unorganized tracks via AI endpoint + smart knowledge base
    const batchItems = tracksRef.current.slice(0, 50).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
    }));
    const aiBatchResults = await classifyBatchWithAI(batchItems);
    const aiMap = new Map<string, AIClassifiedTrackResult>();
    batchItems.forEach((item, idx) => {
      if (item.id && aiBatchResults[idx]) {
        aiMap.set(item.id, aiBatchResults[idx]);
      }
    });

    const mappedTracks = tracksRef.current.map((t) => {
      const aiInfo =
        aiMap.get(t.id) ||
        smartClassifyTrackMetadata(
          {
            title: t.title,
            artist: t.artist,
            album: t.album,
          },
          nextArtists
        );

      let matchedArtist =
        findMatchingArtist(aiInfo.singerName, nextArtists) ||
        (t.artistId ? nextArtists.find((a) => a.id === t.artistId) : undefined);

      if (
        !matchedArtist &&
        aiInfo.singerName &&
        aiInfo.singerName !== 'Various Artists' &&
        isVerifiedRealSingerName(aiInfo.singerName)
      ) {
        matchedArtist = createSingerObjectFromAI(
          aiInfo.singerName,
          aiInfo,
          t.coverUrl
        );
        nextArtists.unshift(matchedArtist);
        newSingersCreated.push(matchedArtist.name);
      }

      const targetSection = aiInfo.section || resolveTrackSection(t);
      const targetArtistId = matchedArtist?.id || t.artistId;
      const targetArtistName =
        matchedArtist?.name ||
        (aiInfo.singerName !== 'Various Artists' ? aiInfo.singerName : t.artist);

      if (matchedArtist) {
        const topIds = matchedArtist.topTrackIds || [];
        if (!topIds.includes(t.id)) {
          matchedArtist.topTrackIds = [t.id, ...topIds];
        }
      }

      const changed =
        t.section !== targetSection ||
        t.artistId !== targetArtistId ||
        t.artist !== targetArtistName;

      if (changed) {
        organizedTracks++;
      }

      if (summary.length < 25) {
        summary.push({
          title: t.title,
          singer: targetArtistName,
          category: aiInfo.categoryLabel,
        });
      }

      return {
        ...t,
        title: aiInfo.cleanTitle || t.title,
        artist: targetArtistName,
        artistId: targetArtistId,
        section: targetSection,
        genre: aiInfo.genre || t.genre,
        language: aiInfo.language || t.language,
      };
    });

    const deduped = deduplicateCatalogTracks(mappedTracks, playlistsRef.current, nextArtists);
    const updatedTracks = deduped.tracks;

    let organizedPlaylists = 0;
    const secToCat: Record<HomeSection, Playlist['category']> = {
      hindi: 'Hindi',
      bhojpuri: 'Bhojpuri',
      bhakti: 'Bhakti',
      english: 'English',
    };

    const updatedPlaylists = deduped.playlists.map((pl) => {
      const resolvedSec = resolvePlaylistSection(pl, updatedTracks);
      const resolvedArt = resolvePlaylistArtist(pl, deduped.artists, updatedTracks);
      if (
        pl.section !== resolvedSec ||
        pl.artistId !== resolvedArt?.id ||
        pl.category !== secToCat[resolvedSec]
      ) {
        organizedPlaylists++;
      }
      return {
        ...pl,
        section: resolvedSec,
        category: secToCat[resolvedSec] || pl.category,
        artistId: resolvedArt?.id || pl.artistId,
        artistName: resolvedArt?.name || pl.artistName,
      };
    });

    artistsRef.current = deduped.artists;
    tracksRef.current = updatedTracks;
    playlistsRef.current = updatedPlaylists;
    setArtists(deduped.artists);
    setTracks(updatedTracks);
    const targetUser = currentUser ? currentUser.id : 'guest';
    setPlaylistsStore((prev) => {
      const next = saveUserPlaylists(prev, targetUser, updatedPlaylists);
      next.guest = updatedPlaylists;
      next['user-alex-demo'] = updatedPlaylists;
      return next;
    });

    safeSaveCatalogToLocalStorage(updatedTracks, updatedPlaylists, deduped.artists);
    await persistCatalogToServer(updatedTracks, updatedPlaylists, deduped.artists);
    showToast(
      `AI Cleaned & Organized ${updatedTracks.length} unique songs, ${updatedPlaylists.length} playlists & ${deduped.artists.length} verified singers!`
    );

    return {
      organizedTracks: organizedTracks || updatedTracks.length,
      organizedPlaylists: organizedPlaylists || updatedPlaylists.length,
      newSingersCreated,
      summary,
    };
  }, [currentUser, safeSaveCatalogToLocalStorage, persistCatalogToServer, showToast]);

  const cleanFalseSingersAndDeduplicateCatalog = useCallback(async () => {
    // 1. Identify and purge false singers (movies, actors, YouTube channels)
    const currentArt = artistsRef.current;
    const removedFalseSingers: string[] = [];
    const removedSingerIds = new Set<string>();

    const verifiedArtists = currentArt.filter((a) => {
      const isDefault = INITIAL_ARTISTS.some((ia) => ia.id === a.id);
      if (isDefault) return true;
      const isGeneric = isGenericChannelOrLabel(a.name);
      const isVerified = isVerifiedRealSingerName(a.name);
      if (isGeneric || !isVerified) {
        removedFalseSingers.push(a.name);
        removedSingerIds.add(a.id);
        return false;
      }
      return true;
    });

    // 2. Reassign tracks belonging to removed artists to genuine singers or proper sections
    const rawTracks = tracksRef.current;
    const mappedTracks = rawTracks.map((t) => {
      if (t.artistId && removedSingerIds.has(t.artistId)) {
        const classified = smartClassifyTrackMetadata(
          { title: t.title, artist: t.artist, album: t.album },
          verifiedArtists
        );
        const realMatched =
          findMatchingArtist(classified.singerName, verifiedArtists) ||
          (classified.singerName && isVerifiedRealSingerName(classified.singerName)
            ? findMatchingArtist(classified.singerName, verifiedArtists)
            : undefined);
        return {
          ...t,
          artist: realMatched?.name || classified.cleanTitle ? t.artist : t.artist,
          artistId: realMatched?.id || undefined,
          section: classified.section || t.section,
          genre: classified.genre || t.genre,
        };
      }
      return t;
    });

    // 3. Deduplicate tracks across entire catalog and remap playlists & artists
    const initialTrackCount = mappedTracks.length;
    const deduped = deduplicateCatalogTracks(
      mappedTracks,
      playlistsRef.current,
      verifiedArtists
    );
    const dedupedSongsCount = initialTrackCount - deduped.tracks.length;

    artistsRef.current = deduped.artists;
    tracksRef.current = deduped.tracks;
    playlistsRef.current = deduped.playlists;

    setArtists(deduped.artists);
    setTracks(deduped.tracks);
    const targetUser = currentUser ? currentUser.id : 'guest';
    setPlaylistsStore((prev) => {
      const next = saveUserPlaylists(prev, targetUser, deduped.playlists);
      next.guest = deduped.playlists;
      next['user-alex-demo'] = deduped.playlists;
      return next;
    });

    // 4. Save permanently to server with authoritative flag so deleted singers/duplicates are never restored
    safeSaveCatalogToLocalStorage(deduped.tracks, deduped.playlists, deduped.artists);
    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: deduped.tracks,
          playlists: deduped.playlists,
          artists: deduped.artists,
          authoritative: true,
        }),
      });
    } catch {}

    showToast(
      `Cleaned ${removedFalseSingers.length} false singers & merged ${dedupedSongsCount} duplicate songs permanently!`
    );

    return {
      removedFalseSingers,
      dedupedSongsCount,
      totalUniqueSongs: deduped.tracks.length,
      totalVerifiedSingers: deduped.artists.length,
    };
  }, [currentUser, safeSaveCatalogToLocalStorage, showToast]);

  const addArtist = useCallback(
    (artistData: Omit<Artist, 'id'> & { id?: string }) => {
      const cleanName = artistData.name.trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const nextTs = getNextCatalogTimestamp(
        tracksRef.current,
        playlistsRef.current,
        artistsRef.current
      );
      const newArtist: Artist = {
        ...artistData,
        id: artistData.id || `artist-${slug || Date.now()}`,
        name: cleanName,
        topTrackIds: artistData.topTrackIds || [],
        gradient: artistData.gradient || 'from-amber-600 via-rose-600 to-indigo-950',
        verified: artistData.verified ?? true,
        monthlyListeners: artistData.monthlyListeners || '1.2M',
        bio: artistData.bio || `${cleanName} official playback artist profile on AuraStream.`,
        createdAt: nextTs,
      };

      const updated = [newArtist, ...artistsRef.current.filter((a) => a.id !== newArtist.id)];
      artistsRef.current = updated;
      setArtists(updated);
      try {
        localStorage.setItem('aurastream_artists', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save artists to localStorage', e);
      }
      void persistCatalogToServer(tracksRef.current, playlistsRef.current, updated);

      showToast(`Singer profile "${newArtist.name}" created & saved permanently for all users!`);
      return newArtist;
    },
    [persistCatalogToServer, showToast]
  );

  const updateArtist = useCallback(
    (artistId: string, updates: Partial<Artist>) => {
      const updated = artistsRef.current.map((a) => (a.id === artistId ? { ...a, ...updates } : a));
      artistsRef.current = updated;
      setArtists(updated);
      try {
        localStorage.setItem('aurastream_artists', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save artists to localStorage', e);
      }
      void persistCatalogToServer(tracksRef.current, playlistsRef.current, updated);
      showToast('Singer profile updated & saved permanently for all users!');
    },
    [persistCatalogToServer, showToast]
  );

  const deleteArtist = useCallback(
    (artistId: string) => {
      let removedName = '';
      const found = artistsRef.current.find((a) => a.id === artistId);
      if (found) removedName = found.name;
      const updatedArtists = artistsRef.current.filter((a) => a.id !== artistId);
      const updatedTracks = tracksRef.current.map((t) =>
        t.artistId === artistId ? { ...t, artistId: undefined } : t
      );
      const updatedPlaylists = playlistsRef.current.map((pl) =>
        pl.artistId === artistId ? { ...pl, artistId: undefined, artistName: undefined } : pl
      );

      artistsRef.current = updatedArtists;
      tracksRef.current = updatedTracks;
      playlistsRef.current = updatedPlaylists;
      setArtists(updatedArtists);
      setTracks(updatedTracks);
      setPlaylistsStore((prev) => {
        const next: Record<string, Playlist[]> = {
          ...prev,
          'user-alex-demo': updatedPlaylists,
          guest: updatedPlaylists,
        };
        for (const k of Object.keys(prev)) {
          next[k] = updatedPlaylists;
        }
        return next;
      });

      safeSaveCatalogToLocalStorage(updatedTracks, updatedPlaylists, updatedArtists);
      void persistCatalogToServer(updatedTracks, updatedPlaylists, updatedArtists);
      showToast(
        removedName
          ? `Singer "${removedName}" permanently deleted everywhere.`
          : 'Singer profile permanently deleted everywhere.'
      );
    },
    [safeSaveCatalogToLocalStorage, persistCatalogToServer, showToast]
  );

  const addTrackToArtist = useCallback(
    (artistId: string, trackId: string) => {
      const targetArtist = artistsRef.current.find((a) => a.id === artistId);
      if (!targetArtist) return;

      const updatedTracks = tracksRef.current.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            artistId: targetArtist.id,
            artist: t.artist.toLowerCase().includes(targetArtist.name.toLowerCase())
              ? t.artist
              : `${targetArtist.name} · ${t.artist}`,
          };
        }
        return t;
      });
      tracksRef.current = updatedTracks;
      setTracks(updatedTracks);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updatedTracks));
      } catch {}

      const updatedArtists = artistsRef.current.map((a) => {
        if (a.id === artistId) {
          const currentIds = a.topTrackIds || [];
          if (!currentIds.includes(trackId)) {
            return { ...a, topTrackIds: [trackId, ...currentIds] };
          }
        }
        return a;
      });
      artistsRef.current = updatedArtists;
      setArtists(updatedArtists);
      try {
        localStorage.setItem('aurastream_artists', JSON.stringify(updatedArtists));
      } catch {}

      void persistCatalogToServer(updatedTracks, playlistsRef.current, updatedArtists);
      showToast(`Added song to ${targetArtist.name}'s profile permanently!`);
    },
    [persistCatalogToServer, showToast]
  );

  const removeTrackFromArtist = useCallback(
    (artistId: string, trackId: string) => {
      const targetArtist = artistsRef.current.find((a) => a.id === artistId);

      const updatedArtists = artistsRef.current.map((a) => {
        if (a.id === artistId) {
          return {
            ...a,
            topTrackIds: (a.topTrackIds || []).filter((id) => id !== trackId),
          };
        }
        return a;
      });
      artistsRef.current = updatedArtists;
      setArtists(updatedArtists);
      try {
        localStorage.setItem('aurastream_artists', JSON.stringify(updatedArtists));
      } catch {}

      const updatedTracks = tracksRef.current.map((t) => {
        if (t.id === trackId && t.artistId === artistId) {
          return { ...t, artistId: undefined };
        }
        return t;
      });
      tracksRef.current = updatedTracks;
      setTracks(updatedTracks);
      try {
        localStorage.setItem('aurastream_tracks', JSON.stringify(updatedTracks));
      } catch {}

      void persistCatalogToServer(updatedTracks, playlistsRef.current, updatedArtists);
      showToast(targetArtist ? `Removed song from ${targetArtist.name}'s profile.` : 'Song unlinked from singer.');
    },
    [persistCatalogToServer, showToast]
  );

  return (
    <MusicContext.Provider
      value={{
        tracks,
        playlists,
        artists,
        currentTrack,
        isPlaying,
        playerStatus,
        activePlaylistId,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        shuffle,
        likedTrackIds,
        activeView,
        searchQuery,
        selectedGenre,
        queue,
        isQueueOpen,
        isLyricsOpen,
        isCreatePlaylistOpen,
        isAuthModalOpen,
        isManageSongsOpen,
        isAdminModalOpen,
        isAdminAuthenticated,
        adminEmail: ADMIN_EMAIL,
        isPlayerOpen,
        setIsPlayerOpen,
        togglePlayerOpen,
        adminLogin,
        adminLogout,
        triggerLogoClick,
        setIsAdminModalOpen,
        currentUser,
        toastMessage,
        dailyPlayCounts,
        top10TodayTracks,
        login,
        signup,
        logout,
        setIsAuthModalOpen,
        setIsManageSongsOpen,
        loadYouTubeInput,
        playQueueIndex,
        playTrack,
        togglePlayPause,
        playNext,
        playPrev,
        seek,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        toggleLike,
        setActiveView,
        setSearchQuery,
        setSelectedGenre,
        toggleQueue,
        toggleLyrics,
        setIsCreatePlaylistOpen,
        addTrack,
        removeTrack,
        updateTrackSection,
        updateTrackSinger,
        resetTracksToDefault,
        fetchYouTubeTrackInfo,
        aiClassifySingleInput,
        aiAutoOrganizeCatalog,
        cleanFalseSingersAndDeduplicateCatalog,
        createPlaylist,
        addAdminYouTubePlaylist,
        updatePlaylistPlacement,
        resetPlaylistsToDefault,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        deletePlaylist,
        editPlaylist,
        playPlaylist,
        playArtist,
        playSection,
        lastServerSyncAt,
        storageMode,
        saveCatalogPermanently,
        importCatalogFromBackup,
        bulkImportYouTubeCatalog,
        addArtist,
        updateArtist,
        deleteArtist,
        addTrackToArtist,
        removeTrackFromArtist,
      }}
    >
      {/* Off-Screen 200x200 YouTube IFrame Player (meets YouTube API minimum 200x200 viewport size) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          right: '0px',
          bottom: '0px',
          width: '200px',
          height: '200px',
          opacity: 0.001,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div id="yt-hidden-audio-player" />
      </div>
      {children}
    </MusicContext.Provider>
  );
};

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
