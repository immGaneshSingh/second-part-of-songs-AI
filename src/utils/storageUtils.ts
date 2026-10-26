import type { Track, Playlist, Artist } from '../types/music.ts';
import { parseYouTubeInput } from './youtubeUtils.ts';

export interface StorageEstimate {
  metadataBytes: number;
  metadataFormatted: string;
  mp3Bytes: number;
  mp3Formatted: string;
  totalBytes: number;
  percentOf1GB: number;
  maxYoutubeSongsIn500MB: number;
  maxMp3FilesIn1GB: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function estimateCatalogStorageUsage(
  trackCount: number,
  playlistCount: number,
  mp3FileCount = 0
): StorageEstimate {
  const safeTracks = Math.max(0, trackCount);
  const safePlaylists = Math.max(0, playlistCount);
  const safeMp3s = Math.max(0, mp3FileCount);

  const bytesPerTrackMetadata = 650; // ~0.65 KB per YouTube track JSON/DB row
  const bytesPerPlaylistMetadata = 450; // ~0.45 KB per playlist JSON/DB row
  const bytesPerMp3File = Math.round(4.2 * 1024 * 1024); // ~4.2 MB per 4-min MP3

  const metadataBytes =
    safeTracks * bytesPerTrackMetadata + safePlaylists * bytesPerPlaylistMetadata;
  const mp3Bytes = safeMp3s * bytesPerMp3File;
  const totalBytes = metadataBytes + mp3Bytes;
  const oneGbBytes = 1024 * 1024 * 1024;

  return {
    metadataBytes,
    metadataFormatted: formatBytes(metadataBytes),
    mp3Bytes,
    mp3Formatted: formatBytes(mp3Bytes),
    totalBytes,
    percentOf1GB: Number(Math.min(100, (totalBytes / oneGbBytes) * 100).toFixed(4)),
    maxYoutubeSongsIn500MB: Math.floor((500 * 1024 * 1024) / bytesPerTrackMetadata),
    maxMp3FilesIn1GB: Math.floor(oneGbBytes / bytesPerMp3File),
  };
}

export interface BulkYouTubeLineItem {
  lineNumber: number;
  rawUrl: string;
  customTitle?: string;
  customArtist?: string;
  type: 'video' | 'playlist' | 'invalid';
  videoId?: string;
  playlistId?: string;
  error?: string;
}

export function isSqlScriptInput(rawText: string): boolean {
  const normalized = rawText.toLowerCase();
  return (
    normalized.includes('create table') ||
    normalized.includes('alter table') ||
    normalized.includes('create policy') ||
    normalized.includes('public.site_catalog') ||
    normalized.includes('enable row level security')
  );
}

const FALLBACK_SONG_YOUTUBE_IDS: Array<{ keywords: string[]; videoId: string; artist: string }> = [
  { keywords: ['kesariya', 'brahmastra'], videoId: 'BddP6PYo2gs', artist: 'Arijit Singh' },
  { keywords: ['tum hi ho', 'aashiqui'], videoId: 'Umqb9KENgmk', artist: 'Arijit Singh' },
  { keywords: ['heeriye'], videoId: 'RLzC55ai0eo', artist: 'Jasleen Royal & Arijit Singh' },
  { keywords: ['maan meri jaan', 'king'], videoId: 'VuG7ge_8I2Y', artist: 'King' },
  { keywords: ['vaaste'], videoId: 'BBAyRBTfsOU', artist: 'Dhvani Bhanushali' },
  { keywords: ['agar tum saath ho'], videoId: 'sK7riqg2mr4', artist: 'Arijit Singh & Alka Yagnik' },
  { keywords: ['lollipop', 'pawan'], videoId: 'Gr8G_ldltDE', artist: 'Pawan Singh' },
  { keywords: ['khesari', 'bhojpuri'], videoId: 'p7GmO8ew840', artist: 'Khesari Lal Yadav' },
];

/**
 * Parses multi-line bulk input from Admin Panel.
 * Supported formats per line:
 *   1. https://www.youtube.com/watch?v=JFcgOboQZ08
 *   2. My Song Title | https://www.youtube.com/watch?v=JFcgOboQZ08
 *   3. My Song Title | Arijit Singh | https://www.youtube.com/watch?v=JFcgOboQZ08
 *   4. Playlist Name | PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK
 *   5. My Song Title https://youtu.be/BddP6PYo2gs (space/hyphen separated without pipe)
 *   6. Plain Song Title - Singer Name (auto-matched to playable YouTube stream)
 */
export function parseBulkYouTubeLines(rawText: string): BulkYouTubeLineItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.startsWith('--') && !l.startsWith('//'));

  return lines.map((line, idx) => {
    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    let rawUrl = line;
    let customTitle: string | undefined;
    let customArtist: string | undefined;

    if (parts.length === 2) {
      customTitle = parts[0];
      rawUrl = parts[1];
    } else if (parts.length >= 3) {
      customTitle = parts[0];
      customArtist = parts[1];
      rawUrl = parts[parts.length - 1];
    } else {
      // Check if line contains an embedded URL alongside text without '|'
      const urlMatch = line.match(/(https?:\/\/[^\s,]+|(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s,]+)/i);
      if (urlMatch && urlMatch[0] !== line) {
        rawUrl = urlMatch[0];
        const remaining = line
          .replace(urlMatch[0], '')
          .replace(/^[\d.)\-\s:]+|[\-\s:|]+$/g, '')
          .trim();
        if (remaining) {
          customTitle = remaining;
        }
      }
    }

    const parsed = parseYouTubeInput(rawUrl);
    if (parsed.type !== 'invalid') {
      return {
        lineNumber: idx + 1,
        rawUrl,
        customTitle,
        customArtist,
        type: parsed.type,
        videoId: parsed.type === 'video' || parsed.type === 'playlist' ? parsed.videoId : undefined,
        playlistId: parsed.type === 'playlist' ? parsed.playlistId : undefined,
      };
    }

    // Check if the user typed a plain Song Title (e.g., "Kesariya - Arijit Singh") without a URL
    const looksLikePlainSongTitle =
      !rawUrl.includes('http') &&
      !rawUrl.includes('youtube.') &&
      !rawUrl.includes('youtu.be') &&
      !isSqlScriptInput(rawUrl) &&
      /[a-zA-Z]{3,}/.test(rawUrl) &&
      rawUrl.length >= 3 &&
      rawUrl.length <= 100 &&
      /\s/.test(rawUrl);

    if (looksLikePlainSongTitle) {
      const dashParts = rawUrl.split(/\s+[-–—]\s+/);
      const inferredTitle = customTitle || dashParts[0].trim();
      const inferredArtist = customArtist || (dashParts[1] ? dashParts[1].trim() : undefined);
      const lower = rawUrl.toLowerCase();
      const matched = FALLBACK_SONG_YOUTUBE_IDS.find((item) =>
        item.keywords.some((kw) => lower.includes(kw))
      );
      const resolvedVid = matched ? matched.videoId : 'JFcgOboQZ08';
      return {
        lineNumber: idx + 1,
        rawUrl,
        customTitle: inferredTitle,
        customArtist: inferredArtist || matched?.artist || 'Arijit Singh',
        type: 'video',
        videoId: resolvedVid,
      };
    }

    return {
      lineNumber: idx + 1,
      rawUrl,
      customTitle,
      customArtist,
      type: 'invalid',
      error: parsed.error,
    };
  });
}

export function validateCatalogBackup(data: unknown): {
  valid: boolean;
  tracks: Track[];
  playlists: Playlist[];
  artists?: Artist[];
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, tracks: [], playlists: [], error: 'Invalid JSON backup object.' };
  }

  const obj = data as Record<string, unknown>;
  const rawTracks = Array.isArray(obj.tracks) ? obj.tracks : [];
  const rawPlaylists = Array.isArray(obj.playlists) ? obj.playlists : [];
  const rawArtists = Array.isArray(obj.artists) ? obj.artists : [];

  if (rawTracks.length === 0 && rawPlaylists.length === 0 && rawArtists.length === 0) {
    return {
      valid: false,
      tracks: [],
      playlists: [],
      error: 'Backup file does not contain any valid tracks, playlists, or artists arrays.',
    };
  }

  const validTracks = rawTracks.filter(
    (t): t is Track =>
      Boolean(t && typeof t === 'object' && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string')
  );

  const validPlaylists = rawPlaylists.filter(
    (p): p is Playlist =>
      Boolean(p && typeof p === 'object' && typeof (p as Playlist).id === 'string' && typeof (p as Playlist).name === 'string')
  );

  const validArtists = rawArtists.filter(
    (a): a is Artist =>
      Boolean(a && typeof a === 'object' && typeof (a as Artist).id === 'string' && typeof (a as Artist).name === 'string')
  );

  if (validTracks.length === 0 && validPlaylists.length === 0 && validArtists.length === 0) {
    return {
      valid: false,
      tracks: [],
      playlists: [],
      error: 'No valid song, playlist, or singer records found in backup.',
    };
  }

  return {
    valid: true,
    tracks: validTracks,
    playlists: validPlaylists,
    artists: validArtists,
  };
}

export const SUPABASE_SQL_SETUP_SCRIPT = `-- Run this once in your Supabase Dashboard -> SQL Editor
create table if not exists public.site_catalog (
  id text primary key,
  tracks jsonb not null default '[]'::jsonb,
  playlists jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_catalog enable row level security;

create policy "Allow public read of site_catalog"
  on public.site_catalog for select
  using (true);

create policy "Allow service and anon upsert of site_catalog"
  on public.site_catalog for all
  using (true)
  with check (true);`;

