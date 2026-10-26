import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Music,
  Play,
  Pause,
  Sparkles,
  Link as LinkIcon,
  Image as ImageIcon,
  BookOpen,
  RotateCcw,
  CheckCircle,
  FileText,
  Search,
  Shield,
  Lock,
  Unlock,
  Key,
  LogOut,
  Check,
  Eye,
  EyeOff,
  BarChart3,
  Sliders,
  Youtube,
  ListMusic,
  Copy,
  Download,
  Upload,
  Database,
  HardDrive,
  CloudCheck,
  Mic2,
  UserCheck,
  Camera,
  TrendingUp,
  Users,
  Radio,
  Award,
  Activity,
  Flame,
  Edit2,
  PlusCircle,
  Layers,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import type { Genre, HomeSection, Playlist, Artist } from '../types/music.ts';
import {
  formatTime,
  resolveTrackSection,
  resolveTrackArtist,
  resolvePlaylistSection,
  resolvePlaylistArtist,
  getStrictArtistTracks,
  type AIClassifiedTrackResult,
} from '../utils/audioUtils.ts';
import { FEATURED_YOUTUBE_PLAYLISTS, getYouTubeThumbnail } from '../utils/youtubeUtils.ts';
import {
  estimateCatalogStorageUsage,
  validateCatalogBackup,
  SUPABASE_SQL_SETUP_SCRIPT,
} from '../utils/storageUtils.ts';
import { CoverArt } from './CoverArt.tsx';

// Default audio stream preset uses clean YouTube official audio without noisy fallback MP3s
const AUDIO_PRESETS = [
  {
    label: 'YouTube Official Audio Stream (Default)',
    url: '',
    duration: 240,
  },
];

const COVER_PRESETS = [
  {
    label: 'Classical Sitar / Music',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Desi Folk & Lights',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Bollywood Glamour',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Studio Guitar & Amp',
    url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80',
  },
];

const AVATAR_PRESETS = [
  {
    label: 'Studio Melody Singer',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Live Stage Performer',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Soulful Playback Vocalist',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Desi Folk & Stage Superstar',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Pop & Urban Star',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Classical Maestro',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Golden Mic Balladeer',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Devotional & Spiritual Voice',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  },
];

const FAMOUS_INDIAN_SINGERS = [
  'Arijit Singh',
  'Yo Yo Honey Singh',
  'Shreya Ghoshal',
  'Pawan Singh',
  'Khesari Lal Yadav',
  'Jubin Nautiyal',
  'Sonu Nigam',
  'Badshah',
  'Neha Kakkar',
  'Diljit Dosanjh',
  'Udit Narayan',
  'Kumar Sanu',
  'Lata Mangeshkar',
  'Kishore Kumar',
  'Atif Aslam',
  'B Praak',
  'AP Dhillon',
  'Karan Aujla',
  'Darshan Raval',
  'Armaan Malik',
  'Vishal Mishra',
  'A. R. Rahman',
  'Shilpi Raj',
  'Manoj Tiwari',
  'Hariharan',
  'Sachet Tandon',
  'Shankar Mahadevan',
  'The Weeknd',
  'Ed Sheeran',
  'Imagine Dragons',
  'Dua Lipa',
  'The Chainsmokers',
  'Taylor Swift',
  'Justin Bieber',
  'Bruno Mars',
  'Coldplay',
];

export const AdminPanelModal: React.FC = () => {
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    isAdminAuthenticated,
    adminLogin,
    adminLogout,
    tracks,
    playlists,
    artists,
    addTrack,
    removeTrack,
    updateTrackSection,
    updateTrackSinger,
    fetchYouTubeTrackInfo,
    addAdminYouTubePlaylist,
    updatePlaylistPlacement,
    deletePlaylist,
    removeTrackFromPlaylist,
    playPlaylist,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlayPause,
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
    likedTrackIds,
    dailyPlayCounts,
    top10TodayTracks,
    aiClassifySingleInput,
    aiAutoOrganizeCatalog,
    cleanFalseSingersAndDeduplicateCatalog,
  } = useMusic();

  const [activeTab, setActiveTab] = useState<
    | 'add'
    | 'playlists'
    | 'ai_manager'
    | 'singers'
    | 'list'
    | 'guide'
    | 'security'
  >('add');
  const [searchFilter, setSearchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'all' | HomeSection>('all');
  const [visibleManageCount, setVisibleManageCount] = useState<number>(80);
  const [managingPlaylistSongsId, setManagingPlaylistSongsId] = useState<string | null>(null);
  const [isCleaningCatalog, setIsCleaningCatalog] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<string | null>(null);

  // Singer Management Tab State
  const [singerSearch, setSingerSearch] = useState('');
  const [singerLangFilter, setSingerLangFilter] = useState<string>('All');
  const [isAddSingerOpen, setIsAddSingerOpen] = useState(false);
  const [newSingerName, setNewSingerName] = useState('');
  const [newSingerHindiName, setNewSingerHindiName] = useState('');
  const [newSingerRole, setNewSingerRole] = useState('Playback Singer & Music Icon');
  const [newSingerLang, setNewSingerLang] = useState<
    'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country'
  >('Hindi');
  const [newSingerImageUrl, setNewSingerImageUrl] = useState(AVATAR_PRESETS[0].url);
  const [newSingerBio, setNewSingerBio] = useState('');
  const [newSingerGradient, setNewSingerGradient] = useState('from-amber-600 via-rose-600 to-indigo-950');
  const [isUploadingSingerPhoto, setIsUploadingSingerPhoto] = useState(false);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);

  // Inline Singer Actions & Editors
  const [editingPhotoSingerId, setEditingPhotoSingerId] = useState<string | null>(null);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [editingInfoSingerId, setEditingInfoSingerId] = useState<string | null>(null);
  const [editInfoName, setEditInfoName] = useState('');
  const [editInfoHindiName, setEditInfoHindiName] = useState('');
  const [editInfoRole, setEditInfoRole] = useState('');
  const [editInfoBio, setEditInfoBio] = useState('');
  const [editInfoLang, setEditInfoLang] = useState<
    'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country'
  >('Hindi');
  const [managingSongsSingerId, setManagingSongsSingerId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignYtUrl, setAssignYtUrl] = useState('');
  const [assignYtTitle, setAssignYtTitle] = useState('');
  const [isAddingYtForSinger, setIsAddingYtForSinger] = useState(false);
  const [assignYtError, setAssignYtError] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<'catalog' | 'youtube'>('catalog');

  // Authentication State
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New Custom Passkey State
  const [newCustomKey, setNewCustomKey] = useState('');
  const [keyUpdateNotice, setKeyUpdateNotice] = useState<string | null>(null);

  // YouTube Song Importer State
  const [ytSongUrl, setYtSongUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [ytFetchStatus, setYtFetchStatus] = useState<string | null>(null);
  const [ytFetchError, setYtFetchError] = useState<string | null>(null);
  const [isFetchingYt, setIsFetchingYt] = useState(false);

  // Song Form State
  const [title, setTitle] = useState('');
  const [hindiTitle, setHindiTitle] = useState('');
  const [artist, setArtist] = useState('Arijit Singh');
  const [customArtist, setCustomArtist] = useState('');
  const [userSelectedSinger, setUserSelectedSinger] = useState(false);
  const [userSelectedSection, setUserSelectedSection] = useState(false);
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState<Genre>('Hindi');
  const [songSection, setSongSection] = useState<HomeSection>('hindi');
  const [language, setLanguage] = useState<'Hindi' | 'Bhojpuri' | 'Punjabi' | 'English' | 'Sanskrit'>('Hindi');
  const [audioUrl, setAudioUrl] = useState(AUDIO_PRESETS[0].url);
  const [duration, setDuration] = useState(AUDIO_PRESETS[0].duration);
  const [coverUrl, setCoverUrl] = useState(COVER_PRESETS[0].url);
  const [isUploadingSongCover, setIsUploadingSongCover] = useState(false);
  const [isOfficial, setIsOfficial] = useState(true);
  const [lyricsText, setLyricsText] = useState('');
  const [devanagariLyricsText, setDevanagariLyricsText] = useState('');

  // YouTube Playlist Manager State (with Place 1: Section 1-4 and Place 2: Singer in Section 5)
  const [plName, setPlName] = useState('');
  const [plDesc, setPlDesc] = useState('');
  const [plYtInput, setPlYtInput] = useState('');
  const [plCategory, setPlCategory] = useState<Playlist['category']>('Hindi');
  const [plSection, setPlSection] = useState<HomeSection>('hindi');
  const [plArtistId, setPlArtistId] = useState<string>(
    artists[0]?.id || 'artist-arijit-singh'
  );
  const [plError, setPlError] = useState<string | null>(null);
  const [plSuccess, setPlSuccess] = useState<string | null>(null);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const [plUseAISmart, setPlUseAISmart] = useState(true);
  const [plAiDetectedDetails, setPlAiDetectedDetails] = useState<
    Array<{ title: string; singer: string; category: string }>
  >([]);

  // AI Detection State for Single Song & AI Manager Tab
  const [songAiResult, setSongAiResult] = useState<AIClassifiedTrackResult | null>(
    null
  );
  const [isCheckingSongAi, setIsCheckingSongAi] = useState(false);
  const [aiSmartUploadInput, setAiSmartUploadInput] = useState('');
  const [isAiSmartUploading, setIsAiSmartUploading] = useState(false);
  const [aiSmartUploadResults, setAiSmartUploadResults] = useState<
    Array<{ title: string; singer: string; category: string }>
  >([]);
  const [aiSmartUploadNotice, setAiSmartUploadNotice] = useState<string | null>(
    null
  );
  const [isAiOrganizingCatalog, setIsAiOrganizingCatalog] = useState(false);

  // Code Export & Permanent Storage State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [serverSaveNotice, setServerSaveNotice] = useState<string | null>(null);
  const [bulkLines, setBulkLines] = useState('');
  const [bulkGenre, setBulkGenre] = useState<Genre>('Hindi');
  const [bulkSection, setBulkSection] = useState<HomeSection>('hindi');
  const [bulkArtistId, setBulkArtistId] = useState<string>(
    artists[0]?.id || 'artist-arijit-singh'
  );
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [backupImportNotice, setBackupImportNotice] = useState<string | null>(null);

  const filteredSingers = useMemo(() => {
    return artists.filter((artist) => {
      if (singerLangFilter !== 'All' && artist.language !== singerLangFilter) return false;
      if (!singerSearch.trim()) return true;
      const q = singerSearch.toLowerCase();
      return (
        artist.name.toLowerCase().includes(q) ||
        (artist.hindiName && artist.hindiName.toLowerCase().includes(q)) ||
        artist.role.toLowerCase().includes(q)
      );
    });
  }, [artists, singerSearch, singerLangFilter]);

  const top10StreamedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10);
  }, [tracks]);

  const topSingersByCatalog = useMemo(() => {
    return [...artists]
      .map((a) => ({
        ...a,
        songCount: getStrictArtistTracks(tracks, a).length,
      }))
      .sort((a, b) => b.songCount - a.songCount)
      .slice(0, 6);
  }, [artists, tracks]);

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const result = adminLogin(adminPasscode);
    if (!result.success) {
      setAuthError(result.error || 'Invalid passcode');
    } else {
      setAdminPasscode('');
      setAuthError(null);
    }
  };

  const handleUpdateCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomKey.trim()) return;
    localStorage.setItem('aurastream_admin_custom_key', newCustomKey.trim());
    setKeyUpdateNotice(`Custom Admin Master Key updated successfully!`);
    setNewCustomKey('');
    setTimeout(() => setKeyUpdateNotice(null), 3500);
  };

  const allAvailableSingerNames = useMemo(() => {
    const names = new Set<string>(FAMOUS_INDIAN_SINGERS);
    artists.forEach((a) => {
      if (a.name) names.add(a.name);
    });
    return Array.from(names);
  }, [artists]);

  const applyAiClassificationToSongForm = (aiInfo: AIClassifiedTrackResult) => {
    setSongAiResult(aiInfo);
    if (aiInfo.cleanTitle) {
      setTitle(aiInfo.cleanTitle);
    }
    if (aiInfo.singerName && aiInfo.singerName !== 'Various Artists') {
      const matchedInList = allAvailableSingerNames.find(
        (s) => s.toLowerCase() === aiInfo.singerName.toLowerCase()
      );
      if (matchedInList) {
        setArtist(matchedInList);
        setCustomArtist('');
      } else {
        setArtist('Custom');
        setCustomArtist(aiInfo.singerName);
      }
      setUserSelectedSinger(true);
    }
    setSongSection(aiInfo.section);
    setGenre(aiInfo.genre);
    setLanguage(aiInfo.language);
    setUserSelectedSection(true);
  };

  const handleManualAiCheckSong = async () => {
    if (!title.trim() && !ytSongUrl.trim()) {
      setYtFetchError('Enter a Song Title or paste a YouTube URL first for AI to check.');
      return;
    }
    setIsCheckingSongAi(true);
    setYtFetchError(null);
    try {
      if (ytSongUrl.trim() && !title.trim()) {
        await handleFetchFromYouTube();
      } else {
        const currentArtist =
          artist === 'Custom'
            ? customArtist.trim()
            : userSelectedSinger
            ? artist
            : '';
        const aiRes = await aiClassifySingleInput({
          title: title.trim(),
          artist: currentArtist,
          album: album.trim(),
        });
        applyAiClassificationToSongForm(aiRes);
        setYtFetchStatus(
          `AI Checked → Singer Name: ${aiRes.singerName} | Category: ${aiRes.categoryLabel}`
        );
      }
    } finally {
      setIsCheckingSongAi(false);
    }
  };

  const handleFetchFromYouTube = async () => {
    setYtFetchError(null);
    setYtFetchStatus(null);
    if (!ytSongUrl.trim()) {
      setYtFetchError('Paste a YouTube Video URL or 11-character Video ID first.');
      return;
    }
    setIsFetchingYt(true);
    const info = await fetchYouTubeTrackInfo(ytSongUrl);
    setIsFetchingYt(false);

    if (!info.success || !info.videoId) {
      setYtFetchError(info.error || 'Could not parse YouTube Video ID.');
      return;
    }

    setYoutubeId(info.videoId);
    if (info.title) setTitle(info.title);
    if (info.thumbnail) setCoverUrl(info.thumbnail);

    if (info.aiClassification) {
      applyAiClassificationToSongForm(info.aiClassification);
      setAlbum('YouTube Official Audio');
      setYtFetchStatus(
        `AI Detected (${info.videoId}) → Singer Name: ${info.aiClassification.singerName} | Category: ${info.aiClassification.categoryLabel}`
      );
      return;
    }

    if (info.author) {
      const matchedSinger = allAvailableSingerNames.find((s) =>
        info.author!.toLowerCase().includes(s.toLowerCase())
      );
      if (matchedSinger) {
        setArtist(matchedSinger);
      } else {
        setArtist('Custom');
        setCustomArtist(info.author);
      }
    }
    setAlbum('YouTube Official Audio');
    setYtFetchStatus(`Fetched YouTube Video (${info.videoId}): "${info.title}"`);
  };

  const resolvedArtist = artist === 'Custom' ? customArtist.trim() || 'Indian Artist' : artist;

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setYtFetchError(null);

    let finalTitle = title.trim();
    let finalYoutubeId = youtubeId.trim();
    let finalCoverUrl = coverUrl.trim() || COVER_PRESETS[0].url;
    let finalArtist = resolvedArtist;
    let finalAlbum = album.trim() || 'Official Single';
    let finalSection = songSection;
    let finalGenre = genre;
    let finalLanguage = language;

    // If user pasted a YouTube link/ID into ytSongUrl without clicking "Fetch from YouTube" first, auto-fetch & AI-classify it now
    if (ytSongUrl.trim() && !finalYoutubeId) {
      setIsFetchingYt(true);
      const info = await fetchYouTubeTrackInfo(ytSongUrl.trim());
      setIsFetchingYt(false);
      if (!info.success || !info.videoId) {
        // If user pasted a YouTube Playlist URL into the Song box, automatically upload it as a Playlist!
        if (ytSongUrl.includes('list=')) {
          setIsFetchingYt(true);
          const plRes = await addAdminYouTubePlaylist({
            name: finalTitle,
            description: finalAlbum,
            youtubeInput: ytSongUrl.trim(),
            section: finalSection,
            useAISmartCategorize: true,
          });
          setIsFetchingYt(false);
          if (plRes.success && plRes.playlist) {
            setYtSongUrl('');
            setTitle('');
            setYtFetchStatus(
              `Uploaded Full YouTube Playlist "${plRes.playlist.name}" (${plRes.playlist.trackIds.length} songs) permanently!`
            );
            return;
          }
        }
        setYtFetchError(info.error || 'Could not parse YouTube Video ID.');
        return;
      }
      finalYoutubeId = info.videoId;
      if (!finalTitle && info.title) finalTitle = info.title;
      if (info.thumbnail) finalCoverUrl = info.thumbnail;
      if (info.aiClassification) {
        if (info.aiClassification.cleanTitle && !title.trim()) {
          finalTitle = info.aiClassification.cleanTitle;
        }
        if (!userSelectedSinger) {
          finalArtist = info.aiClassification.singerName || info.author || finalArtist;
        }
        if (!userSelectedSection) {
          finalSection = info.aiClassification.section;
          finalGenre = info.aiClassification.genre;
          finalLanguage = info.aiClassification.language;
        }
      } else if (info.author && !userSelectedSinger) {
        finalArtist = info.author;
      }
      if (!album.trim()) finalAlbum = 'YouTube Official Audio';
    } else if (finalTitle) {
      // Run AI classification on the song title & artist before saving unless already checked
      const aiRes =
        songAiResult ||
        (await aiClassifySingleInput({
          title: finalTitle,
          artist: userSelectedSinger ? finalArtist : '',
          album: finalAlbum,
        }));
      if (aiRes.cleanTitle && !songAiResult) {
        finalTitle = aiRes.cleanTitle;
      }
      if (
        !userSelectedSinger &&
        aiRes.singerName &&
        aiRes.singerName !== 'Various Artists'
      ) {
        finalArtist = aiRes.singerName;
      }
      if (!userSelectedSection) {
        finalSection = aiRes.section;
        finalGenre = aiRes.genre;
        finalLanguage = aiRes.language;
      }
    }

    if (finalCoverUrl.startsWith('data:')) {
      try {
        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: finalCoverUrl, filename: `${finalTitle || 'song'}-cover.jpg` }),
        });
        const json = await res.json();
        if (json.success && json.url) {
          finalCoverUrl = json.url;
        }
      } catch {}
    }

    if (!finalTitle || (!finalYoutubeId && !audioUrl.trim())) {
      setYtFetchError('Please enter a Song Title or paste a YouTube Video URL above.');
      return;
    }

    const lyricsArray = lyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const devanagariLyricsArray = devanagariLyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const matchedArtistObj = artists.find(
      (a) => a.name.trim().toLowerCase() === finalArtist.trim().toLowerCase()
    );

    const createdTrack = addTrack({
      title: finalTitle,
      hindiTitle: hindiTitle.trim() || undefined,
      artist: finalArtist,
      artistId: matchedArtistObj?.id,
      section: finalSection,
      album: finalAlbum,
      duration: Number(duration) || 240,
      audioUrl: audioUrl.trim(),
      coverUrl: finalCoverUrl,
      youtubeId: finalYoutubeId || undefined,
      genre: finalGenre,
      language: finalLanguage,
      releaseYear: new Date().getFullYear(),
      playCount: Math.floor(Math.random() * 500000) + 50000,
      gradient: 'from-amber-600 via-rose-600 to-indigo-950',
      isOfficial,
      lyrics: lyricsArray.length > 0 ? lyricsArray : undefined,
      devanagariLyrics: devanagariLyricsArray.length > 0 ? devanagariLyricsArray : undefined,
    });

    setTitle('');
    setHindiTitle('');
    setYtSongUrl('');
    setYoutubeId('');
    setSongAiResult(null);
    setUserSelectedSinger(false);
    setUserSelectedSection(false);
    setLyricsText('');
    setDevanagariLyricsText('');
    setYtFetchStatus(
      `Uploaded "${createdTrack.title}" by ${createdTrack.artist} (${finalSection.toUpperCase()}) permanently!`
    );
  };

  const handleAddYouTubePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlError(null);
    setPlSuccess(null);
    setPlAiDetectedDetails([]);
    setIsAddingPlaylist(true);

    const matchedPlArtist = artists.find((a) => a.id === plArtistId) || artists[0];

    const res = await addAdminYouTubePlaylist({
      name: plName,
      description: plDesc,
      youtubeInput: plYtInput,
      category: plCategory,
      section: plSection,
      artistId: matchedPlArtist?.id,
      artistName: matchedPlArtist?.name,
      useAISmartCategorize: plUseAISmart,
    });
    setIsAddingPlaylist(false);

    if (!res.success) {
      setPlError(res.error || 'Could not add playlist.');
    } else {
      if (res.aiDetails && res.aiDetails.length > 0) {
        setPlAiDetectedDetails(res.aiDetails);
      }
      setPlSuccess(
        `AI Uploaded "${res.playlist?.name}" (${
          res.playlist?.trackIds.length || 0
        } songs) → ${
          res.aiSummary ||
          `Section (${plSection.toUpperCase()}) & Singer (${matchedPlArtist?.name})`
        }!`
      );
      setPlName('');
      setPlDesc('');
      setPlYtInput('');
    }
  };

  const handleCopyCodeForRepo = () => {
    const codeSnippet = `// Copy and paste into src/data/mockTracks.ts\nexport const INITIAL_TRACKS = ${JSON.stringify(
      tracks,
      null,
      2
    )};\n\nexport const INITIAL_PLAYLISTS = ${JSON.stringify(
      playlists,
      null,
      2
    )};\n\nexport const INITIAL_ARTISTS = ${JSON.stringify(artists, null, 2)};`;
    navigator.clipboard?.writeText(codeSnippet).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleCopySupabaseSql = () => {
    navigator.clipboard?.writeText(SUPABASE_SQL_SETUP_SCRIPT).catch(() => {});
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDownloadJsonBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      tracks,
      playlists,
      artists,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurastream-catalog-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToPermanentServer = async () => {
    setIsSavingServer(true);
    setServerSaveNotice(null);
    const ok = await saveCatalogPermanently();
    setIsSavingServer(false);
    setServerSaveNotice(
      ok
        ? `Saved ${tracks.length} songs, ${playlists.length} playlists & ${artists.length} singers permanently to server for all users & APK!`
        : 'Saved locally in browser.'
    );
    setTimeout(() => setServerSaveNotice(null), 4000);
  };

  const SAMPLE_BULK_LINES = [
    'Kesariya | Arijit Singh | https://www.youtube.com/watch?v=BddP6PYo2gs',
    'Heeriye | Jasleen Royal & Arijit Singh | https://www.youtube.com/watch?v=RLzC55ai0eo',
    'Bollywood Top Hits Jukebox | PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK',
  ].join('\n');

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputToProcess = bulkLines.trim() || SAMPLE_BULK_LINES;
    if (!bulkLines.trim()) {
      setBulkLines(SAMPLE_BULK_LINES);
    }
    setIsBulkImporting(true);
    setBulkStatus(null);
    setBulkErrors([]);
    const res = await bulkImportYouTubeCatalog(
      inputToProcess,
      bulkGenre,
      bulkSection,
      bulkArtistId
    );
    setIsBulkImporting(false);
    setBulkErrors(res.errors);
    if (res.addedSongs > 0 || res.addedPlaylists > 0) {
      setBulkStatus(
        `Imported & permanently saved ${res.addedSongs} song(s) and ${res.addedPlaylists} playlist(s) for all users!`
      );
      setBulkLines('');
    }
  };

  const handleUploadJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupImportNotice(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        const validated = validateCatalogBackup(parsed);
        if (!validated.valid) {
          setBackupImportNotice(validated.error || 'Invalid backup JSON file.');
          return;
        }
        await importCatalogFromBackup(validated.tracks, validated.playlists, validated.artists);
        setBackupImportNotice(
          `Restored ${validated.tracks.length} songs, ${validated.playlists.length} playlists & ${validated.artists?.length || 0} singers to permanent server storage!`
        );
      } catch {
        setBackupImportNotice('Could not parse JSON file. Please select a valid backup .json file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const storageEstimate = estimateCatalogStorageUsage(tracks.length, playlists.length, 0);

  const filteredTracks = tracks.filter((t) => {
    if (sectionFilter !== 'all' && resolveTrackSection(t) !== sectionFilter) {
      return false;
    }
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.hindiTitle && t.hindiTitle.toLowerCase().includes(q)) ||
      t.genre.toLowerCase().includes(q)
    );
  });

  // Calculate statistics & analytics
  const hindiCount = tracks.filter((t) => resolveTrackSection(t) === 'hindi' || t.genre === 'Hindi' || t.language === 'Hindi').length;
  const bhojpuriCount = tracks.filter((t) => resolveTrackSection(t) === 'bhojpuri' || t.genre === 'Bhojpuri' || t.language === 'Bhojpuri').length;
  const bhaktiCount = tracks.filter((t) => resolveTrackSection(t) === 'bhakti' || t.genre === 'Bhakti' || t.language === 'Sanskrit').length;
  const englishCount = tracks.filter((t) => resolveTrackSection(t) === 'english' || t.genre === 'English' || t.language === 'English').length;
  const officialCount = tracks.filter((t) => t.isOfficial).length;
  const ytCount = tracks.filter((t) => Boolean(t.youtubeId)).length;
  const totalStreams = tracks.reduce((acc, t) => acc + (t.playCount || 0), 0);

  if (!isAdminModalOpen) return null;

  // GATEWAY: If not yet authenticated, render the secure passcode login (no default key or autofill shown)
  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-[#0f111a] border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

          <button
            onClick={() => setIsAdminModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Admin Gateway"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-xl shadow-amber-500/20 mb-4 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#0c0e17] flex items-center justify-center">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 mb-1">
              Protected Owner Access
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              AuraStream Admin Gateway
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Exclusive YouTube Song & Playlist Manager · Protected Owner Access
            </p>
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Enter Admin Master Key</span>
                <span className="text-[10px] text-slate-500">Encrypted</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Enter admin passcode..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN PANEL
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-[#090c14] border-0 sm:border border-emerald-500/30 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Recreated Spotify-Grade Admin Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0e1422] to-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  AuraStream Admin Studio
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {tracks.length} Songs · {playlists.length} Playlists · {artists.length} Singers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveToPermanentServer}
              disabled={isSavingServer}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Save current songs and playlists permanently to server for every user"
            >
              <CloudCheck className="w-3.5 h-3.5" />
              <span>{isSavingServer ? 'Saving...' : 'Save All'}</span>
            </button>
            <button
              onClick={adminLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Lock Admin Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Admin Panel"
              aria-label="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontally Slideable Mobile & Desktop Tab Navigation Menu */}
        <div
          role="tablist"
          aria-label="Admin Menu Sections"
          className="shrink-0 flex items-center gap-2 overflow-x-auto flex-nowrap scrollbar-none px-4 sm:px-6 py-2.5 border-b border-slate-800/90 bg-slate-950/95 z-20 touch-pan-x"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'add'}
            onClick={() => setActiveTab('add')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add YouTube Song</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'playlists'}
            onClick={() => setActiveTab('playlists')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>YouTube Playlists ({playlists.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'ai_manager'}
            onClick={() => setActiveTab('ai_manager')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'ai_manager'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/90 border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Smart Upload</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'singers'}
            onClick={() => setActiveTab('singers')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'singers'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Manage Singers ({artists.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'list'}
            onClick={() => setActiveTab('list')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Manage Songs ({tracks.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'guide'}
            onClick={() => setActiveTab('guide')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Permanent Save</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: ADD OFFICIAL YOUTUBE SONG */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddSong} className="space-y-6 max-w-3xl mx-auto">
              {/* Step 1: Import from YouTube Video URL or ID */}
              <div className="bg-slate-900/90 border border-rose-500/30 p-4 sm:p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <span>1-Click Import Song from YouTube (URL or 11-Char Video ID)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Auto-fills Title, Artist & Thumbnail
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={ytSongUrl}
                    onChange={(e) => {
                      setYtSongUrl(e.target.value);
                      if (ytFetchError) setYtFetchError(null);
                    }}
                    placeholder="Paste YouTube Video URL (https://youtube.com/watch?v=...) or 11-char ID (e.g. 4NRXx6U8ABQ)"
                    aria-label="YouTube Video URL or ID to import"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromYouTube}
                    disabled={isFetchingYt}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isFetchingYt ? 'AI Checking...' : 'Fetch & AI Detect Singer'}</span>
                  </button>
                </div>

                {ytFetchError && (
                  <p className="text-xs text-rose-400 font-medium">{ytFetchError}</p>
                )}
                {ytFetchStatus && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{ytFetchStatus}</span>
                  </p>
                )}
                {songAiResult && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-cyan-200 font-semibold">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        AI Classification:{' '}
                        <strong className="text-white">
                          (Singer Name :- {songAiResult.singerName} ,{' '}
                          {songAiResult.categoryLabel})
                        </strong>
                      </span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                      Auto-Placed in {songAiResult.section.toUpperCase()} & Singer Profile
                    </span>
                  </div>
                )}
              </div>

              {/* Basic Song Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Song Title (Roman / English) {ytSongUrl.trim() ? '(Auto-filled if left blank)' : '*'}
                    </label>
                    <button
                      type="button"
                      onClick={handleManualAiCheckSong}
                      disabled={isCheckingSongAi}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isCheckingSongAi ? 'AI Checking...' : 'AI Check Singer & Category'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required={!ytSongUrl.trim()}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Blinding Lights - The Weeknd, Kesariya, Lollipop Lagelu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Regional / Hindi Devanagari Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={hindiTitle}
                    onChange={(e) => setHindiTitle(e.target.value)}
                    placeholder="e.g. केसरिया, मान मेरी जान"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Singer & Album & Genre */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Singer / Artist *
                  </label>
                  <select
                    value={artist}
                    onChange={(e) => {
                      setArtist(e.target.value);
                      setUserSelectedSinger(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    {allAvailableSingerNames.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-slate-100">
                        {s}
                      </option>
                    ))}
                    <option value="Custom" className="bg-slate-900 text-slate-100">
                      + Other / YouTube Artist
                    </option>
                  </select>
                </div>

                {artist === 'Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Custom Artist / Channel Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customArtist}
                      onChange={(e) => {
                        setCustomArtist(e.target.value);
                        setUserSelectedSinger(true);
                      }}
                      placeholder="e.g. King, T-Series, Sony Music"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Album / Movie Name
                  </label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    placeholder="e.g. Brahmāstra, Single, YouTube Stream"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Home Genre Category *
                  </label>
                  <select
                    value={songSection}
                    onChange={(e) => {
                      const sec = e.target.value as HomeSection;
                      setSongSection(sec);
                      setUserSelectedSection(true);
                      const mapGenre: Record<HomeSection, Genre> = {
                        hindi: 'Hindi',
                        bhojpuri: 'Bhojpuri',
                        bhakti: 'Bhakti',
                        english: 'English',
                      };
                      setGenre(mapGenre[sec]);
                      setLanguage(
                        sec === 'bhojpuri'
                          ? 'Bhojpuri'
                          : sec === 'english'
                          ? 'English'
                          : 'Hindi'
                      );
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="hindi" className="bg-slate-900 text-slate-100">
                      Section 1: Bollywood & Hindi Superhits
                    </option>
                    <option value="bhojpuri" className="bg-slate-900 text-slate-100">
                      Section 2: Bhojpuri Desi Dhamaka & Folk Beats
                    </option>
                    <option value="bhakti" className="bg-slate-900 text-slate-100">
                      Section 3: Bhakti Bhavana (Religious / God Songs)
                    </option>
                    <option value="english" className="bg-slate-900 text-slate-100">
                      Section 4: English Songs
                    </option>
                  </select>
                </div>
              </div>

              {/* Cover Image & Presets */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    Cover Art / YouTube Thumbnail URL
                  </label>
                  {youtubeId && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      YouTube ID: {youtubeId}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-14 h-11 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                      <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>

                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingSongCover ? 'Uploading...' : 'Upload Cover'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingSongCover}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setIsUploadingSongCover(true);
                              const reader = new FileReader();
                              reader.onload = async () => {
                                try {
                                  const base64 = reader.result as string;
                                  const res = await fetch('/api/upload-photo', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ dataUrl: base64, filename: file.name }),
                                  });
                                  const json = await res.json();
                                  if (json.success && json.url) {
                                    setCoverUrl(json.url);
                                  } else {
                                    setCoverUrl(base64);
                                  }
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsUploadingSongCover(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            } catch {
                              setIsUploadingSongCover(false);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Cover URL (https://... or /uploads/...)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Cover Presets */}
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                    Or select cover preset:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {COVER_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverUrl(p.url)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          coverUrl === p.url
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Song to Website Catalog</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: YOUTUBE PLAYLISTS MANAGER */}
          {activeTab === 'playlists' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Add New YouTube Playlist Form */}
              <form
                onSubmit={handleAddYouTubePlaylist}
                className="bg-slate-900/80 border border-emerald-500/30 p-5 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-rose-500" />
                      <span>Add Official YouTube Playlist to Website</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Playlists added here appear on the Home page, Library, and Side Menu for every user.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Playlist Title (Auto-filled if left blank)
                    </label>
                    <input
                      type="text"
                      value={plName}
                      onChange={(e) => setPlName(e.target.value)}
                      placeholder="e.g. Arijit Singh Non-Stop Jukebox"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      YouTube Playlist or Video URL / ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={plYtInput}
                      onChange={(e) => setPlYtInput(e.target.value)}
                      placeholder="Paste YouTube Playlist URL (?list=PL...), PL... ID, or Video URL"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">
                      1. Genre Category *
                    </label>
                    <select
                      value={plSection}
                      onChange={(e) => {
                        const sec = e.target.value as HomeSection;
                        setPlSection(sec);
                        const secCat: Record<HomeSection, Playlist['category']> = {
                          hindi: 'Hindi',
                          bhojpuri: 'Bhojpuri',
                          bhakti: 'Bhakti',
                          english: 'English',
                        };
                        setPlCategory(secCat[sec]);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="hindi" className="bg-slate-900 text-slate-100">
                        Bollywood & Hindi Superhits
                      </option>
                      <option value="bhojpuri" className="bg-slate-900 text-slate-100">
                        Bhojpuri Desi Dhamaka
                      </option>
                      <option value="bhakti" className="bg-slate-900 text-slate-100">
                        Bhakti Bhavana 🪔
                      </option>
                      <option value="english" className="bg-slate-900 text-slate-100">
                        English Songs 🌍
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-300 mb-1">
                      2. Featured Singer *
                    </label>
                    <select
                      value={plArtistId}
                      onChange={(e) => setPlArtistId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-400"
                    >
                      {artists.map((art) => (
                        <option key={art.id} value={art.id} className="bg-slate-900 text-slate-100">
                          {art.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Playlist Description
                    </label>
                    <input
                      type="text"
                      value={plDesc}
                      onChange={(e) => setPlDesc(e.target.value)}
                      placeholder="e.g. Non-stop romantic Hindi & Bollywood songs stream"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Quick Fill Verified YouTube Playlists:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FEATURED_YOUTUBE_PLAYLISTS.map((fp) => (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => {
                          setPlName(fp.title);
                          setPlYtInput(fp.id);
                          setPlDesc(fp.description);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      >
                        + {fp.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Smart Categorize Toggle for Playlist Songs */}
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        AI Auto-Check Singer & Category for Every Song in Playlist
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Automatically detects who is the singer (e.g. The Weeknd, Arijit Singh, Pawan Singh) and category (English Song, Hindi Song, Bhojpuri Song, Bhakti Song) and places each song in its specific place.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={plUseAISmart}
                      onChange={(e) => setPlUseAISmart(e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-300">
                      {plUseAISmart ? 'AI Active' : 'Manual'}
                    </span>
                  </label>
                </div>

                {plError && <p className="text-xs text-rose-400 font-medium">{plError}</p>}
                {plSuccess && <p className="text-xs text-emerald-400 font-medium">{plSuccess}</p>}

                {plAiDetectedDetails.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2">
                    <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        AI Categorized {plAiDetectedDetails.length} Playlist Songs into Specific Places:
                      </span>
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {plAiDetectedDetails.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-slate-900/80 text-slate-200"
                        >
                          <span className="truncate font-medium">{item.title}</span>
                          <span className="shrink-0 font-mono text-cyan-300">
                            (Singer Name :- {item.singer} , {item.category})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingPlaylist}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isAddingPlaylist
                        ? 'AI Checking Singer & Uploading Playlist Songs...'
                        : 'AI Check & Add Official YouTube Playlist'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Existing Website Playlists List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Active Website Playlists ({playlists.length})
                  </h4>
                </div>

                <div className="divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                  {playlists.map((pl) => {
                    const currentPlSec = resolvePlaylistSection(pl);
                    const currentPlArt =
                      resolvePlaylistArtist(pl, artists, tracks) || artists[0];
                    return (
                      <div key={pl.id} className="transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-800/40">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-white truncate">
                              {pl.name}
                            </p>
                            {pl.youtubePlaylistId && (
                              <span className="text-[10px] font-mono text-emerald-400">
                                · YT: {pl.youtubePlaylistId.slice(0, 14)}...
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {pl.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            aria-label={`Section for playlist ${pl.name}`}
                            value={currentPlSec}
                            onChange={(e) =>
                              updatePlaylistPlacement(
                                pl.id,
                                e.target.value as HomeSection,
                                currentPlArt.id
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value="hindi">Bollywood & Hindi</option>
                            <option value="bhojpuri">Bhojpuri Dhamaka</option>
                            <option value="bhakti">Bhakti Bhavana</option>
                            <option value="english">English Songs</option>
                          </select>

                          <select
                            aria-label={`Singer for playlist ${pl.name}`}
                            value={currentPlArt.id}
                            onChange={(e) =>
                              updatePlaylistPlacement(pl.id, currentPlSec, e.target.value)
                            }
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                          >
                            {artists.map((art) => (
                              <option key={art.id} value={art.id}>
                                {art.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => playPlaylist(pl)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Stream ({pl.trackIds.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setManagingPlaylistSongsId(
                                managingPlaylistSongsId === pl.id ? null : pl.id
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                              managingPlaylistSongsId === pl.id
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title="Manage & remove songs in playlist"
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>Songs ({pl.trackIds.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePlaylist(pl.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Playlist Songs Management (Admin Only) */}
                      {managingPlaylistSongsId === pl.id && (
                        <div className="p-3 bg-slate-950/70 border-t border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1 border-b border-slate-800/60">
                            <span className="font-semibold text-slate-300">
                              Songs in {pl.name} ({pl.trackIds.length})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Click trash icon to remove song from playlist
                            </span>
                          </div>
                          {pl.trackIds.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2 text-center">
                              No songs currently assigned to this playlist.
                            </p>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {pl.trackIds.map((tid) => {
                                const trk = tracks.find((t) => t.id === tid);
                                if (!trk) return null;
                                return (
                                  <div
                                    key={trk.id}
                                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 text-xs"
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                      <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="font-medium text-white truncate">
                                        {trk.title}
                                      </span>
                                      <span className="text-[11px] text-slate-400 truncate">
                                        · {trk.artist}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTrackFromPlaylist(pl.id, trk.id)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Remove song from this playlist"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

          {/* TAB: AI SONG & PLAYLIST MANAGER */}
          {activeTab === 'ai_manager' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* AI Smart Upload Banner */}
              <div className="bg-gradient-to-br from-cyan-950/70 via-slate-900 to-indigo-950/70 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Auto Singer & Category Classifier</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-extrabold text-white">
                      AI Smart Song & Playlist Uploader
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Paste any YouTube Song URL, YouTube Playlist URL (or multiple links, one per line). The AI automatically checks who is the singer and which category each song belongs to — e.g.{' '}
                      <span className="text-cyan-300 font-mono font-semibold">
                        (Singer Name :- The Weeknd , English Song)
                      </span>{' '}
                      — creates missing singer profiles, and adds every song & playlist to its specific place.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isCleaningCatalog}
                      onClick={async () => {
                        setIsCleaningCatalog(true);
                        setAiSmartUploadNotice(null);
                        try {
                          const res = await cleanFalseSingersAndDeduplicateCatalog();
                          setAiSmartUploadNotice(
                            `Removed ${res.removedFalseSingers.length} false singers & merged ${res.dedupedSongsCount} duplicate songs permanently!`
                          );
                        } catch {
                          setAiSmartUploadNotice('Failed to clean catalog.');
                        } finally {
                          setIsCleaningCatalog(false);
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Purge false AI singers and merge duplicate songs across all playlists"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isCleaningCatalog ? 'Cleaning...' : 'Purge False Singers & Deduplicate'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAiOrganizingCatalog}
                      onClick={async () => {
                        setIsAiOrganizingCatalog(true);
                        setAiSmartUploadNotice(null);
                        try {
                          const report = await aiAutoOrganizeCatalog();
                          setAiSmartUploadResults(report.summary);
                          setAiSmartUploadNotice(
                            `AI Scanned & Organized ${tracks.length} songs & ${playlists.length} playlists into their specific Singer & Category${
                              report.newSingersCreated.length > 0
                                ? ` (Created new singers: ${report.newSingersCreated.join(', ')})`
                                : ''
                            }!`
                          );
                        } finally {
                          setIsAiOrganizingCatalog(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isAiOrganizingCatalog
                          ? 'AI Organizing All Songs...'
                          : '1-Click AI Organize All Existing Songs'}
                      </span>
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const sampleAiLines = [
                      'Blinding Lights | The Weeknd | https://www.youtube.com/watch?v=4NRXx6U8ABQ',
                      'Kesariya | Arijit Singh | https://www.youtube.com/watch?v=BddP6PYo2gs',
                      'Lollipop Lagelu | Pawan Singh | https://www.youtube.com/watch?v=Gr8G_ldltDE',
                      'Shree Hanuman Chalisa | Hariharan | https://www.youtube.com/watch?v=AETFvQonfV8',
                    ].join('\n');

                    const toProcess = aiSmartUploadInput.trim() || sampleAiLines;
                    if (!aiSmartUploadInput.trim()) {
                      setAiSmartUploadInput(sampleAiLines);
                    }
                    setIsAiSmartUploading(true);
                    setAiSmartUploadNotice(null);
                    try {
                      const res = await bulkImportYouTubeCatalog(
                        toProcess,
                        'Hindi',
                        'hindi',
                        undefined,
                        true
                      );
                      if (res.aiDetails && res.aiDetails.length > 0) {
                        setAiSmartUploadResults(res.aiDetails);
                      }
                      setAiSmartUploadNotice(
                        `AI Checked & Uploaded ${res.addedSongs} song(s) and ${res.addedPlaylists} playlist(s) to their specific Singer & Category!`
                      );
                      setAiSmartUploadInput('');
                    } finally {
                      setIsAiSmartUploading(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <textarea
                    rows={4}
                    value={aiSmartUploadInput}
                    onChange={(e) => setAiSmartUploadInput(e.target.value)}
                    placeholder={`Paste any Song or Playlist YouTube links (1 per line), e.g.:\nhttps://www.youtube.com/watch?v=4NRXx6U8ABQ\nBlinding Lights | The Weeknd | 4NRXx6U8ABQ\nhttps://www.youtube.com/playlist?list=PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK`}
                    className="w-full p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAiSmartUploadInput(
                            'Blinding Lights | The Weeknd | https://www.youtube.com/watch?v=4NRXx6U8ABQ'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 cursor-pointer"
                      >
                        + Demo: The Weeknd (English Song)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiSmartUploadInput(
                            'Kesariya | Arijit Singh | https://www.youtube.com/watch?v=BddP6PYo2gs'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 cursor-pointer"
                      >
                        + Demo: Arijit Singh (Hindi Song)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiSmartUploadInput(
                            'Lollipop Lagelu | Pawan Singh | https://www.youtube.com/watch?v=Gr8G_ldltDE'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-orange-300 cursor-pointer"
                      >
                        + Demo: Pawan Singh (Bhojpuri Song)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiSmartUploadInput(
                            'Shree Hanuman Chalisa | Hariharan | https://www.youtube.com/watch?v=AETFvQonfV8'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-yellow-300 cursor-pointer"
                      >
                        + Demo: Hariharan (Bhakti Song)
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isAiSmartUploading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isAiSmartUploading
                          ? 'AI Checking Singer & Category...'
                          : 'AI Check & Upload to Specific Place'}
                      </span>
                    </button>
                  </div>
                </form>

                {aiSmartUploadNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{aiSmartUploadNotice}</span>
                  </div>
                )}

                {aiSmartUploadResults.length > 0 && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Singer & Category Placement Report ({aiSmartUploadResults.length} items)</span>
                      </h4>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/70">
                      {aiSmartUploadResults.map((row, idx) => (
                        <div
                          key={idx}
                          className="py-2 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-semibold text-white truncate">
                            {row.title}
                          </span>
                          <span className="font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg shrink-0">
                            (Singer Name :- {row.singer} , {row.category})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MANAGE SINGERS & ARTIST PROFILES */}
          {activeTab === 'singers' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Header & Create Toggle */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Mic2 className="w-5 h-5 text-amber-400" />
                      Singers & Artist Profiles Manager
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add new singers, customize profile pictures, and assign songs directly to any singer.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddSingerOpen((prev) => !prev);
                      if (!isAddSingerOpen) {
                        setNewSingerName('');
                        setNewSingerHindiName('');
                        setNewSingerRole('Playback Singer & Music Icon');
                        setNewSingerBio('');
                        setNewSingerImageUrl(AVATAR_PRESETS[0].url);
                      }
                    }}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddSingerOpen ? 'Close Form' : '+ Add New Singer'}</span>
                  </button>
                </div>

                {/* AI Singer Quality Filter & Catalog Deduplicator Control System */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        AI Singer Quality Control & Song Deduplicator
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Removes false AI singer names (movie titles like <em>Pushpa, Kabir Singh</em>, actors, and YouTube channels), safely reassigns songs to real singers, merges duplicate songs across all playlists, and permanently saves for all website & APK users.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isCleaningCatalog}
                    onClick={async () => {
                      setIsCleaningCatalog(true);
                      setCleanupReport(null);
                      try {
                        const res = await cleanFalseSingersAndDeduplicateCatalog();
                        setCleanupReport(
                          `Successfully removed ${res.removedFalseSingers.length} false singer profiles, merged ${res.dedupedSongsCount} duplicate songs! Now ${res.totalUniqueSongs} unique songs & ${res.totalVerifiedSingers} verified singers remain permanently.`
                        );
                      } catch {
                        setCleanupReport('Failed to clean catalog.');
                      } finally {
                        setIsCleaningCatalog(false);
                      }
                    }}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {isCleaningCatalog
                        ? 'Filtering & Deduplicating...'
                        : 'Clean False Singers & Deduplicate'}
                    </span>
                  </button>
                </div>

                {cleanupReport && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{cleanupReport}</span>
                  </div>
                )}

                {/* ADD NEW SINGER FORM */}
                {isAddSingerOpen && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newSingerName.trim()) return;
                      let finalImg = newSingerImageUrl.trim() || AVATAR_PRESETS[0].url;
                      if (finalImg.startsWith('data:')) {
                        try {
                          const res = await fetch('/api/upload-photo', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dataUrl: finalImg, filename: `${newSingerName}-photo.jpg` }),
                          });
                          const json = await res.json();
                          if (json.success && json.url) {
                            finalImg = json.url;
                          }
                        } catch {}
                      }
                      addArtist({
                        name: newSingerName.trim(),
                        hindiName: newSingerHindiName.trim() || undefined,
                        role: newSingerRole.trim() || 'Playback Singer & Artist',
                        language: newSingerLang,
                        imageUrl: finalImg,
                        bio: newSingerBio.trim() || `${newSingerName.trim()} official playback profile.`,
                        gradient: newSingerGradient,
                        monthlyListeners: '2.5M',
                        topTrackIds: [],
                      });
                      setNewSingerName('');
                      setNewSingerHindiName('');
                      setNewSingerBio('');
                      setIsAddSingerOpen(false);
                    }}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-4 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        Create New Singer Profile
                      </h4>
                      <span className="text-[11px] text-amber-400 font-medium">All fields & photos saved permanently for every user</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Singer's Name (English) *
                        </label>
                        <input
                          type="text"
                          required
                          value={newSingerName}
                          onChange={(e) => setNewSingerName(e.target.value)}
                          placeholder="e.g. Neha Kakkar, Atif Aslam, Pawan Singh..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Hindi / Devanagari Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={newSingerHindiName}
                          onChange={(e) => setNewSingerHindiName(e.target.value)}
                          placeholder="e.g. नेहा कक्कड़, पवन सिंह..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={newSingerRole}
                          onChange={(e) => setNewSingerRole(e.target.value)}
                          placeholder="e.g. Playback Singer & Music Icon"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Category / Language *
                        </label>
                        <select
                          value={newSingerLang}
                          onChange={(e) =>
                            setNewSingerLang(
                              e.target.value as 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country'
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="Hindi">Hindi & Bollywood</option>
                          <option value="Bhojpuri">Bhojpuri Desi</option>
                          <option value="Pan-Indian">Pan-Indian (Tamil, Telugu, Hindi)</option>
                          <option value="Punjabi">Punjabi Hits</option>
                          <option value="Other Country">Other Country (International / Global)</option>
                        </select>
                      </div>
                    </div>

                    {/* Profile Picture URL & File Upload Picker */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-300">
                          Singer Photo / Profile Document *
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Upload file or paste image URL
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/60 bg-slate-900 shrink-0 shadow-md">
                            <img
                              src={newSingerImageUrl || AVATAR_PRESETS[0].url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = AVATAR_PRESETS[0].url;
                              }}
                            />
                          </div>

                          {/* Upload Photo File from Device / Camera */}
                          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0">
                            <Upload className="w-4 h-4" />
                            <span>{isUploadingSingerPhoto ? 'Saving to Server...' : 'Upload Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingSingerPhoto}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    setIsUploadingSingerPhoto(true);
                                    const reader = new FileReader();
                                    reader.onload = async () => {
                                      try {
                                        const base64 = reader.result as string;
                                        const res = await fetch('/api/upload-photo', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ dataUrl: base64, filename: file.name }),
                                        });
                                        const json = await res.json();
                                        if (json.success && json.url) {
                                          setNewSingerImageUrl(json.url);
                                        } else {
                                          setNewSingerImageUrl(base64);
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setIsUploadingSingerPhoto(false);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  } catch {
                                    setIsUploadingSingerPhoto(false);
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            value={newSingerImageUrl}
                            onChange={(e) => setNewSingerImageUrl(e.target.value)}
                            placeholder="Image URL (https://... or /uploads/...)"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                          Or pick from 1-click curated photo presets:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {AVATAR_PRESETS.map((preset, idx) => (
                            <button
                              key={`new-avatar-preset-${idx}`}
                              type="button"
                              onClick={() => setNewSingerImageUrl(preset.url)}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                                newSingerImageUrl === preset.url
                                  ? 'border-amber-400 bg-amber-500/20 text-white'
                                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                              <span className="text-[10px] font-medium truncate">{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Short Bio / Description
                      </label>
                      <textarea
                        rows={2}
                        value={newSingerBio}
                        onChange={(e) => setNewSingerBio(e.target.value)}
                        placeholder="Brief summary of singer's accolades, popular hits, and legacy..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddSingerOpen(false)}
                        className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                      >
                        Save & Create Singer Profile
                      </button>
                    </div>
                  </form>
                )}

                {/* Filter and Search Bar for Existing Singers */}
                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={singerSearch}
                      onChange={(e) => setSingerSearch(e.target.value)}
                      placeholder="Search singers by name..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {['All', 'Hindi', 'Bhojpuri', 'Pan-Indian', 'Punjabi', 'Other Country'].map((lang) => (
                      <button
                        key={`singer-lang-${lang}`}
                        onClick={() => setSingerLangFilter(lang)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          singerLangFilter === lang
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* LIST / CARDS OF ALL SINGERS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Showing {filteredSingers.length} of {artists.length} verified singers
                  </span>
                  <span>Click Manage Songs or Change Photo on any singer below</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredSingers.map((singer) => {
                    const singerTracks = getStrictArtistTracks(tracks, singer);
                    const isEditingPhoto = editingPhotoSingerId === singer.id;
                    const isEditingInfo = editingInfoSingerId === singer.id;
                    const isManagingSongs = managingSongsSingerId === singer.id;

                    return (
                      <div
                        key={`admin-singer-${singer.id}`}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 transition-all hover:border-slate-700"
                      >
                        {/* Main Singer Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/50 bg-slate-950 shrink-0 shadow-md">
                              <img
                                src={singer.imageUrl}
                                alt={singer.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = AVATAR_PRESETS[0].url;
                                }}
                              />
                              <div className="absolute bottom-0 right-0 p-0.5 bg-emerald-500 rounded-full text-slate-950">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                  {singer.name}
                                </h4>
                                {singer.hindiName && (
                                  <span className="text-xs text-amber-300/90 font-medium">
                                    ({singer.hindiName})
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                  {singer.language}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-0.5">{singer.role}</p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span className="text-amber-400 font-mono font-bold">
                                  {singerTracks.length} song(s) linked
                                </span>
                                <span>·</span>
                                <span>{singer.monthlyListeners || '1.5M'} listeners</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons Toolbar */}
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                            <button
                              onClick={() => {
                                if (isEditingPhoto) {
                                  setEditingPhotoSingerId(null);
                                } else {
                                  setEditingPhotoSingerId(singer.id);
                                  setNewAvatarUrl(singer.imageUrl);
                                  setEditingInfoSingerId(null);
                                }
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isEditingPhoto
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Change Photo</span>
                            </button>

                            <button
                              onClick={() => {
                                if (isManagingSongs) {
                                  setManagingSongsSingerId(null);
                                } else {
                                  setManagingSongsSingerId(singer.id);
                                  setAssignSearch('');
                                  setAssignYtUrl('');
                                  setAssignYtTitle('');
                                }
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isManagingSongs
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              <Music className="w-3.5 h-3.5" />
                              <span>Manage Songs ({singerTracks.length})</span>
                            </button>

                            <button
                              onClick={() => {
                                if (isEditingInfo) {
                                  setEditingInfoSingerId(null);
                                } else {
                                  setEditingInfoSingerId(singer.id);
                                  setEditInfoName(singer.name);
                                  setEditInfoHindiName(singer.hindiName || '');
                                  setEditInfoRole(singer.role);
                                  setEditInfoBio(singer.bio || '');
                                  setEditInfoLang((singer.language as any) || 'Hindi');
                                  setEditingPhotoSingerId(null);
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                                isEditingInfo
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                              }`}
                              title="Edit Singer Name & Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => deleteArtist(singer.id)}
                              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                              title="Delete Singer Profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* INLINE PHOTO EDITOR */}
                        {isEditingPhoto && (
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Camera className="w-4 h-4" />
                                Change Profile Picture for {singer.name}
                              </h5>
                              <button
                                onClick={() => setEditingPhotoSingerId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-900 shadow-lg">
                                  <img
                                    src={newAvatarUrl || singer.imageUrl}
                                    alt="New Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = AVATAR_PRESETS[0].url;
                                    }}
                                  />
                                </div>

                                {/* Upload Photo File from Device */}
                                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{isUploadingEditPhoto ? 'Uploading...' : 'Upload File'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isUploadingEditPhoto}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          setIsUploadingEditPhoto(true);
                                          const reader = new FileReader();
                                          reader.onload = async () => {
                                            try {
                                              const base64 = reader.result as string;
                                              const res = await fetch('/api/upload-photo', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ dataUrl: base64, filename: file.name }),
                                              });
                                              const json = await res.json();
                                              if (json.success && json.url) {
                                                setNewAvatarUrl(json.url);
                                              } else {
                                                setNewAvatarUrl(base64);
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            } finally {
                                              setIsUploadingEditPhoto(false);
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        } catch {
                                          setIsUploadingEditPhoto(false);
                                        }
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <div className="flex-1 space-y-1.5">
                                <label className="block text-[11px] text-slate-300 font-medium">
                                  Image URL:
                                </label>
                                <input
                                  type="text"
                                  value={newAvatarUrl}
                                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                                  placeholder="Paste new photo URL (https://... or /uploads/...)"
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            {/* Photo presets for instant 1-click update */}
                            <div>
                              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                                Or choose a curated music photo preset:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {AVATAR_PRESETS.map((p, idx) => (
                                  <button
                                    key={`change-photo-preset-${idx}`}
                                    type="button"
                                    onClick={() => setNewAvatarUrl(p.url)}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                                      newAvatarUrl === p.url
                                        ? 'border-amber-400 bg-amber-500/20 text-white'
                                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                                    }`}
                                  >
                                    <img
                                      src={p.url}
                                      alt={p.label}
                                      className="w-6 h-6 rounded-full object-cover shrink-0"
                                    />
                                    <span className="text-[10px] truncate">{p.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!newAvatarUrl.trim()) return;
                                  let finalImg = newAvatarUrl.trim();
                                  if (finalImg.startsWith('data:')) {
                                    try {
                                      const res = await fetch('/api/upload-photo', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ dataUrl: finalImg, filename: `singer-${singer.id}.jpg` }),
                                      });
                                      const json = await res.json();
                                      if (json.success && json.url) {
                                        finalImg = json.url;
                                      }
                                    } catch {}
                                  }
                                  updateArtist(singer.id, { imageUrl: finalImg });
                                  setEditingPhotoSingerId(null);
                                }}
                                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                              >
                                Save Profile Picture
                              </button>
                            </div>
                          </div>
                        )}

                        {/* INLINE DETAILS EDITOR */}
                        {isEditingInfo && (
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Edit2 className="w-4 h-4" />
                                Edit Singer Information
                              </h5>
                              <button
                                onClick={() => setEditingInfoSingerId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                                  Singer's Name
                                </label>
                                <input
                                  type="text"
                                  value={editInfoName}
                                  onChange={(e) => setEditInfoName(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                                  Hindi / Devanagari Name
                                </label>
                                <input
                                  type="text"
                                  value={editInfoHindiName}
                                  onChange={(e) => setEditInfoHindiName(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                                  Role / Title
                                </label>
                                <input
                                  type="text"
                                  value={editInfoRole}
                                  onChange={(e) => setEditInfoRole(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                                  Category / Language
                                </label>
                                <select
                                  value={editInfoLang}
                                  onChange={(e) =>
                                    setEditInfoLang(
                                      e.target.value as 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country'
                                    )
                                  }
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                >
                                  <option value="Hindi">Hindi & Bollywood</option>
                                  <option value="Bhojpuri">Bhojpuri Desi</option>
                                  <option value="Pan-Indian">Pan-Indian (Tamil, Telugu, Hindi)</option>
                                  <option value="Punjabi">Punjabi Hits</option>
                                  <option value="Other Country">Other Country (International / Global)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                                Bio / Description
                              </label>
                              <textarea
                                rows={2}
                                value={editInfoBio}
                                onChange={(e) => setEditInfoBio(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  updateArtist(singer.id, {
                                    name: editInfoName.trim() || singer.name,
                                    hindiName: editInfoHindiName.trim() || undefined,
                                    role: editInfoRole.trim() || singer.role,
                                    bio: editInfoBio.trim() || singer.bio,
                                    language: editInfoLang,
                                  });
                                  setEditingInfoSingerId(null);
                                }}
                                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        )}

                        {/* INLINE SONGS MANAGER & ASSIGNER */}
                        {isManagingSongs && (
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-4 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                              <div>
                                <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                  <Music className="w-4 h-4" />
                                  Manage & Add Songs for {singer.name}
                                </h5>
                                <p className="text-[11px] text-slate-400">
                                  Assign existing songs from your catalog or add new songs directly for this singer.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAssignMode('catalog')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                    assignMode === 'catalog'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  From Catalog
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAssignMode('youtube')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                    assignMode === 'youtube'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  + Direct YouTube Song
                                </button>
                              </div>
                            </div>

                            {/* Option 1: Assign from catalog */}
                            {assignMode === 'catalog' && (
                              <div className="space-y-2">
                                <label className="block text-[11px] text-slate-300 font-medium">
                                  Search song to link to {singer.name}:
                                </label>
                                <input
                                  type="text"
                                  value={assignSearch}
                                  onChange={(e) => setAssignSearch(e.target.value)}
                                  placeholder="Search by title, album, or lyrics..."
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                                />

                                <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                                  {tracks
                                    .filter((t) => {
                                      // Exclude tracks already assigned to this singer
                                      if (t.artistId === singer.id) return false;
                                      if (!assignSearch.trim()) return true;
                                      const q = assignSearch.toLowerCase();
                                      return (
                                        t.title.toLowerCase().includes(q) ||
                                        t.artist.toLowerCase().includes(q) ||
                                        (t.hindiTitle && t.hindiTitle.toLowerCase().includes(q))
                                      );
                                    })
                                    .slice(0, 8)
                                    .map((t) => (
                                      <div
                                        key={`assign-track-${t.id}`}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <img
                                            src={t.coverUrl}
                                            alt={t.title}
                                            className="w-7 h-7 rounded-md object-cover shrink-0"
                                          />
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">
                                              {t.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                              Current Artist: {t.artist}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => addTrackToArtist(singer.id, t.id)}
                                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Link Song</span>
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Option 2: Direct Add from YouTube for this singer */}
                            {assignMode === 'youtube' && (
                              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2.5">
                                <label className="block text-[11px] text-slate-300 font-medium">
                                  Paste YouTube Video URL or Video ID for {singer.name}:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={assignYtUrl}
                                    onChange={(e) => setAssignYtUrl(e.target.value)}
                                    placeholder="https://youtu.be/... or 11-char ID"
                                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                                  />
                                  <input
                                    type="text"
                                    value={assignYtTitle}
                                    onChange={(e) => setAssignYtTitle(e.target.value)}
                                    placeholder="Song Title (optional, auto-detected)"
                                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                                  />
                                </div>
                                {assignYtError && (
                                  <p className="text-[11px] text-rose-400 font-medium">{assignYtError}</p>
                                )}
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    disabled={isAddingYtForSinger || !assignYtUrl.trim()}
                                    onClick={async () => {
                                      if (!assignYtUrl.trim()) return;
                                      setAssignYtError(null);
                                      setIsAddingYtForSinger(true);
                                      const info = await fetchYouTubeTrackInfo(assignYtUrl.trim());
                                      setIsAddingYtForSinger(false);
                                      if (!info.success || !info.videoId) {
                                        setAssignYtError(info.error || 'Could not parse YouTube video.');
                                        return;
                                      }
                                      const songTitle =
                                        assignYtTitle.trim() ||
                                        info.aiClassification?.cleanTitle ||
                                        info.title ||
                                        'Official Song';
                                      const langSec: HomeSection =
                                        singer.language === 'Other Country'
                                          ? 'english'
                                          : singer.language === 'Bhojpuri'
                                          ? 'bhojpuri'
                                          : info.aiClassification?.section === 'bhakti'
                                          ? 'bhakti'
                                          : 'hindi';
                                      const trackGenre: Genre =
                                        langSec === 'english'
                                          ? 'English'
                                          : langSec === 'bhojpuri'
                                          ? 'Bhojpuri'
                                          : langSec === 'bhakti'
                                          ? 'Bhakti'
                                          : 'Hindi';
                                      addTrack({
                                        title: songTitle,
                                        artist: singer.name,
                                        artistId: singer.id,
                                        album: 'Official Single',
                                        genre: trackGenre,
                                        language:
                                          langSec === 'english'
                                            ? 'English'
                                            : langSec === 'bhojpuri'
                                            ? 'Bhojpuri'
                                            : 'Hindi',
                                        section: langSec,
                                        duration: 240,
                                        audioUrl: '',
                                        youtubeId: info.videoId,
                                        coverUrl: info.thumbnail || getYouTubeThumbnail(info.videoId),
                                        releaseYear: new Date().getFullYear(),
                                        createdAt: Date.now(),
                                        playCount: Math.floor(Math.random() * 200000) + 50000,
                                        gradient: singer.gradient || 'from-amber-600 via-rose-600 to-indigo-950',
                                      });
                                      setAssignYtUrl('');
                                      setAssignYtTitle('');
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md"
                                  >
                                    {isAddingYtForSinger ? 'Fetching...' : '+ Add Song to Singer'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Current Songs Linked to this Singer */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              <h6 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                <span>All Songs Linked to {singer.name} ({singerTracks.length})</span>
                                <span className="text-slate-500 font-normal">Plays preview or remove</span>
                              </h6>

                              {singerTracks.length === 0 ? (
                                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-900/40 rounded-xl">
                                  No songs linked yet. Search above to link songs or add from YouTube!
                                </p>
                              ) : (
                                <div className="max-h-52 overflow-y-auto space-y-1 p-1 bg-slate-900/40 rounded-xl border border-slate-800">
                                  {singerTracks.map((song) => {
                                    const isThisSongPlaying = isPlaying && currentTrack?.id === song.id;
                                    return (
                                      <div
                                        key={`singer-song-${song.id}`}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isThisSongPlaying) {
                                                togglePlayPause();
                                              } else {
                                                playTrack(song);
                                              }
                                            }}
                                            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                          >
                                            {isThisSongPlaying ? (
                                              <Pause className="w-3.5 h-3.5 fill-current" />
                                            ) : (
                                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                            )}
                                          </button>
                                          <img
                                            src={song.coverUrl}
                                            alt={song.title}
                                            className="w-7 h-7 rounded-md object-cover shrink-0"
                                          />
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">
                                              {song.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                              {formatTime(song.duration)} · {(song.playCount / 1000).toFixed(0)}K plays
                                            </p>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => removeTrackFromArtist(singer.id, song.id)}
                                          className="shrink-0 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          title="Remove from this singer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE SONGS & SECTION ASSIGNMENT (SECTIONS 1 TO 4) */}
          {activeTab === 'list' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Song Category & Placement Manager
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Assign any song to Bollywood & Hindi, Bhojpuri Desi Dhamaka, Bhakti Bhavana, or English Songs.
                    </p>
                  </div>
                </div>

                {/* Section Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `All Songs (${tracks.length})` },
                    {
                      id: 'hindi',
                      label: `1. Bollywood & Hindi (${tracks.filter((t) => resolveTrackSection(t) === 'hindi').length})`,
                    },
                    {
                      id: 'bhojpuri',
                      label: `2. Bhojpuri Dhamaka (${tracks.filter((t) => resolveTrackSection(t) === 'bhojpuri').length})`,
                    },
                    {
                      id: 'bhakti',
                      label: `3. Bhakti Bhavana (${tracks.filter((t) => resolveTrackSection(t) === 'bhakti').length})`,
                    },
                    {
                      id: 'english',
                      label: `4. English Songs (${tracks.filter((t) => resolveTrackSection(t) === 'english').length})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSectionFilter(tab.id as 'all' | HomeSection)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        sectionFilter === tab.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search songs by title, singer, or section..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="divide-y divide-slate-800/60">
                  {filteredTracks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No songs match your search filter.
                    </div>
                  ) : (
                    filteredTracks.slice(0, visibleManageCount).map((t) => {
                      const isCurrent = currentTrack?.id === t.id;
                      const currentSec = resolveTrackSection(t);
                      const currentArt = resolveTrackArtist(t, artists) || artists[0];
                      return (
                        <div
                          key={t.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 group">
                              <CoverArt
                                src={t.coverUrl}
                                alt={t.title}
                                gradient={t.gradient}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() =>
                                  isCurrent ? togglePlayPause() : playTrack(t, filteredTracks)
                                }
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4 text-white fill-white" />
                                ) : (
                                  <Play className="w-4 h-4 text-white fill-white" />
                                )}
                              </button>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm font-bold text-white truncate">
                                  {t.title}
                                </p>
                                {t.youtubeId && (
                                  <span className="text-[10px] font-mono text-rose-400 shrink-0">
                                    · YT: {t.youtubeId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">
                                {t.artist} · {t.album}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                            <select
                              aria-label={`Assign section for ${t.title}`}
                              value={currentSec}
                              onChange={(e) =>
                                updateTrackSection(t.id, e.target.value as HomeSection)
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              <option value="hindi">Bollywood & Hindi</option>
                              <option value="bhojpuri">Bhojpuri Dhamaka</option>
                              <option value="bhakti">Bhakti Bhavana 🪔</option>
                              <option value="english">English Songs 🌍</option>
                            </select>

                            <select
                              aria-label={`Assign singer for ${t.title}`}
                              value={currentArt.id}
                              onChange={(e) => updateTrackSinger(t.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-semibold text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                            >
                              {artists.map((art) => (
                                <option key={art.id} value={art.id}>
                                  {art.name}
                                </option>
                              ))}
                            </select>

                            <span className="text-xs text-slate-400 font-mono hidden md:inline">
                              {formatTime(t.duration)}
                            </span>
                            <button
                              onClick={() => removeTrack(t.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Song from Website"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {filteredTracks.length > visibleManageCount && (
                  <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      Showing {visibleManageCount} of {filteredTracks.length.toLocaleString()} songs
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibleManageCount((prev) => prev + 150)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                    >
                      Show {Math.min(150, filteredTracks.length - visibleManageCount)} More Songs
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PERMANENT STORAGE, BULK IMPORTER & SUPABASE 1GB GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6 max-w-4xl mx-auto text-xs text-slate-300 leading-relaxed">
              {/* 1. One-Click Permanent Server Storage Control */}
              <div className="bg-slate-900/90 p-5 rounded-2xl border border-emerald-500/35 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <CloudCheck className="w-4 h-4 text-emerald-400" />
                      <span>Automatic Permanent Storage (Live for Every User)</span>
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Every song or YouTube playlist you add in this Admin Panel is now{' '}
                      <strong className="text-white">automatically saved to the backend server</strong>{' '}
                      (<code className="text-emerald-300">data/catalog.json</code> via{' '}
                      <code className="text-emerald-300">/api/catalog</code>). Any visitor opening your
                      website on any phone or computer immediately gets your latest catalog!
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block text-[11px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      {storageMode === 'supabase+server'
                        ? 'Supabase + Server Sync Active'
                        : 'Server Permanent Storage Active'}
                    </span>
                    {lastServerSyncAt && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Last synced: {new Date(lastServerSyncAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live Catalog Footprint Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Permanent Songs</span>
                    <p className="text-base font-extrabold text-white mt-0.5">{tracks.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Permanent Playlists</span>
                    <p className="text-base font-extrabold text-emerald-300 mt-0.5">
                      {playlists.length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Catalog DB Size</span>
                    <p className="text-base font-extrabold text-amber-300 mt-0.5">
                      {storageEstimate.metadataFormatted}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                    <span className="text-[11px] text-slate-400">500MB DB Capacity</span>
                    <p className="text-base font-extrabold text-sky-300 mt-0.5">
                      750,000+ Songs
                    </p>
                  </div>
                </div>

                {serverSaveNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{serverSaveNotice}</span>
                  </div>
                )}

                {backupImportNotice && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{backupImportNotice}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveToPermanentServer}
                    disabled={isSavingServer}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <CloudCheck className="w-4 h-4" />
                    <span>
                      {isSavingServer
                        ? 'Saving to Server...'
                        : 'Save & Publish Catalog for Every User'}
                    </span>
                  </button>

                  <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Import JSON Backup</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleUploadJsonBackup}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadJsonBackup}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download JSON Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCodeForRepo}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-400" />
                    )}
                    <span>
                      {copiedCode
                        ? 'Copied TypeScript Code!'
                        : 'Copy Code for src/data/mockTracks.ts'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Fast Bulk YouTube Song & Playlist Importer */}
              <form
                onSubmit={handleBulkImportSubmit}
                className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Easy 1-Click Bulk YouTube Song & Playlist Importer</span>
                    </h3>
                    <p className="text-slate-400 mt-0.5">
                      Paste multiple YouTube Video links/IDs or Playlist IDs (one per line). Titles
                      and thumbnails are fetched automatically and saved permanently for all users!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label="Bulk import target section"
                      value={bulkSection}
                      onChange={(e) => {
                        const sec = e.target.value as HomeSection;
                        setBulkSection(sec);
                        const secToG: Record<HomeSection, Genre> = {
                          hindi: 'Hindi',
                          bhojpuri: 'Bhojpuri',
                          bhakti: 'Bhakti',
                          english: 'English',
                        };
                        setBulkGenre(secToG[sec]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-amber-300"
                    >
                      <option value="hindi">Bollywood & Hindi</option>
                      <option value="bhojpuri">Bhojpuri Dhamaka</option>
                      <option value="bhakti">Bhakti Bhavana</option>
                      <option value="english">English Songs</option>
                    </select>

                    <select
                      aria-label="Bulk import target singer"
                      value={bulkArtistId}
                      onChange={(e) => setBulkArtistId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-emerald-300"
                    >
                      {artists.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={bulkLines}
                  onChange={(e) => setBulkLines(e.target.value)}
                  placeholder={`Examples (one per line):\nhttps://www.youtube.com/watch?v=JFcgOboQZ08\nKesariya | Arijit Singh | BddP6PYo2gs\nArijit Superhits Playlist | PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />

                {bulkStatus && (
                  <p className="text-xs text-emerald-400 font-semibold">{bulkStatus}</p>
                )}
                {bulkErrors.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                    {bulkErrors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkLines(SAMPLE_BULK_LINES);
                        setBulkErrors([]);
                        setBulkStatus(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Fill Sample YouTube Songs & Playlist
                    </button>
                    {bulkLines.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkLines('');
                          setBulkErrors([]);
                          setBulkStatus(null);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isBulkImporting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {isBulkImporting
                        ? 'Importing & Saving...'
                        : bulkLines.trim()
                        ? 'Bulk Import & Save Permanently'
                        : 'Import Sample Songs & Save Permanently'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Step-by-Step Guide: How to Connect Your Website with Supabase */}
              <div className="bg-slate-900/85 p-5 rounded-2xl border border-sky-500/35 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <Database className="w-4 h-4 text-sky-400" />
                      <span>How to Connect Your Website with Supabase (3 Easy Steps)</span>
                    </h3>
                    <p className="text-slate-400 mt-0.5">
                      Your backend (<code className="text-sky-300">server.ts</code>) is already
                      pre-wired to sync automatically with Supabase as soon as your environment
                      variables are set.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySupabaseSql}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>
                      {copiedSql ? 'Copied SQL Script!' : 'Copy Supabase SQL Setup Script'}
                    </span>
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-2.5 text-slate-300">
                  <li>
                    <strong className="text-white">
                      Step 1 — Create Table in Supabase SQL Editor:
                    </strong>{' '}
                    Create a free project at <code className="text-sky-300">supabase.com</code>,
                    open <strong>SQL Editor → New Query</strong>, paste the SQL script below (click{' '}
                    <strong>Copy Supabase SQL Setup Script</strong>), and click <strong>Run</strong>.
                  </li>
                  <li>
                    <strong className="text-white">
                      Step 2 — Copy Your Project URL & API Key:
                    </strong>{' '}
                    In your Supabase Dashboard, go to{' '}
                    <strong>Project Settings (Gear Icon) → API</strong> and copy your{' '}
                    <strong>Project URL</strong> (<code className="text-sky-300">https://xxxx.supabase.co</code>)
                    and your <strong>service_role</strong> (or <strong>anon public</strong>) key.
                  </li>
                  <li>
                    <strong className="text-white">
                      Step 3 — Add to Environment Variables:
                    </strong>{' '}
                    Set <code className="text-emerald-300">SUPABASE_URL</code> and{' '}
                    <code className="text-emerald-300">SUPABASE_SERVICE_ROLE_KEY</code> (or{' '}
                    <code className="text-emerald-300">SUPABASE_ANON_KEY</code>) in the{' '}
                    <strong>Secrets / Environment Variables</strong> panel (or in your{' '}
                    <code className="text-emerald-300">.env</code> file). Once added, every song and
                    playlist you add or edit in this Admin Panel automatically syncs to your
                    Supabase PostgreSQL table!
                  </li>
                </ol>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  {SUPABASE_SQL_SETUP_SCRIPT}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN SETTINGS & KEY UPDATE */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl mx-auto text-xs text-slate-300">
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Admin Passkey Configuration
                </h3>
                <p className="text-slate-400 text-xs">
                  Change the secret passcode required to open this Admin Panel when tapping the
                  website logo 3 times in 2 seconds.
                </p>

                <form onSubmit={handleUpdateCustomKey} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Custom Master Passkey
                    </label>
                    <input
                      type="text"
                      required
                      value={newCustomKey}
                      onChange={(e) => setNewCustomKey(e.target.value)}
                      placeholder="Enter new custom master passkey..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  {keyUpdateNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{keyUpdateNotice}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Save New Master Passkey
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
