export type Genre =
  | 'All'
  | 'Hindi'
  | 'Bhojpuri'
  | 'Bhakti'
  | 'English'
  | 'Bollywood'
  | 'Punjabi'
  | 'Pop'
  | 'Lo-Fi'
  | 'Electronic'
  | 'Rock'
  | 'Ambient'
  | 'Indie';

export type HomeSection = 'hindi' | 'bhojpuri' | 'bhakti' | 'english';

export interface Track {
  id: string;
  title: string;
  hindiTitle?: string; // Hindi / Bhojpuri / Sanskrit script or subtitle
  artist: string;
  artistId?: string;
  album: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  genre: Genre;
  section?: HomeSection; // Explicit assignment to Section 1 (hindi), 2 (bhojpuri), 3 (bhakti), or 4 (english)
  language?: 'Hindi' | 'Bhojpuri' | 'Punjabi' | 'English' | 'Sanskrit';
  releaseYear: number;
  playCount: number;
  gradient: string; // fallback CSS gradient
  lyrics?: string[]; // Roman / English lyrics
  devanagariLyrics?: string[]; // Devanagari Hindi / Bhojpuri / Bhakti lyrics
  isOfficial?: boolean;
  youtubeId?: string; // 11-char YouTube Video ID for YouTube Audio-First streaming
  createdAt?: number; // Timestamp of upload for latest-first display
}

export type PlayerStatus = 'Now Playing' | 'Buffering' | 'Paused' | 'Ready';

export interface Artist {
  id: string;
  name: string;
  hindiName?: string;
  role: string;
  language: 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country' | string;
  imageUrl: string;
  monthlyListeners: string;
  bio: string;
  topTrackIds: string[];
  gradient: string;
  verified?: boolean;
  createdAt?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  coverGradient: string;
  isCustom?: boolean;
  category?: 'General' | 'Hindi' | 'Bhojpuri' | 'Bhakti' | 'English' | 'Artist';
  section?: HomeSection; // Place 1: Specific section between 1 to 4 ('hindi' | 'bhojpuri' | 'bhakti' | 'english')
  artistId?: string; // Place 2: Specific singer ID in Section 5
  artistName?: string; // Place 2: Specific singer name in Section 5
  youtubePlaylistId?: string;
  createdAt?: number; // Timestamp of upload for latest-first display
}

export type RepeatMode = 'off' | 'all' | 'one';

export type ActiveView =
  | 'home'
  | 'search'
  | 'library'
  | 'liked'
  | 'hindi'
  | 'bhojpuri'
  | 'bhakti'
  | 'english'
  | 'artists'
  | `artist-${string}`
  | `playlist-${string}`;

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserDataStore {
  users: User[];
  likedSongsByUser: Record<string, string[]>;
  playlistsByUser: Record<string, Playlist[]>;
}
