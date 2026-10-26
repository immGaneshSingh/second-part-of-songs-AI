import express from 'express';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_TRACKS, INITIAL_PLAYLISTS, INITIAL_ARTISTS } from './src/data/mockTracks.ts';
import {
  smartClassifyTrackMetadata,
  resolveTrackSection,
  resolveTrackArtist,
  resolvePlaylistSection,
  resolvePlaylistArtist,
  isGenericChannelOrLabel,
  isVerifiedRealSingerName,
  deduplicateCatalogTracks,
  createSingerObjectFromAI,
  type AIClassifiedTrackResult,
} from './src/utils/audioUtils.ts';
import type { Track, Playlist, Artist, HomeSection, Genre } from './src/types/music.ts';

dotenv.config({ quiet: true });

process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('Uncaught exception:', err);
});

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const CATALOG_BACKUP_FILE = path.join(DATA_DIR, 'catalog.backup.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

interface StoredCatalog {
  tracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  deletedTrackIds?: string[];
  deletedPlaylistIds?: string[];
  deletedArtistIds?: string[];
  updatedAt: string;
}

function saveBase64ImageIfPresent(dataUrl?: string, prefix = 'photo'): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl || '';
  if (!dataUrl.startsWith('data:')) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return dataUrl;
    const mime = matches[1].toLowerCase();
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('svg')) ext = 'svg';
    else if (mime.includes('pdf')) ext = 'pdf';

    const buffer = Buffer.from(matches[2], 'base64');
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to convert base64 image to file:', err);
    return dataUrl;
  }
}

function ensureCatalogFile(): StoredCatalog {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    let parsed: Partial<StoredCatalog> | null = null;
    if (fs.existsSync(CATALOG_FILE)) {
      try {
        parsed = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8')) as Partial<StoredCatalog>;
      } catch (readErr) {
        console.warn('Error parsing catalog.json:', readErr);
      }
    }

    if (
      parsed &&
      Array.isArray(parsed.tracks) &&
      Array.isArray(parsed.playlists)
    ) {
      const storedArtists =
        Array.isArray(parsed.artists) && parsed.artists.length > 0
          ? parsed.artists
          : INITIAL_ARTISTS;
      const rawCatalog: StoredCatalog = {
        tracks: parsed.tracks,
        playlists: parsed.playlists,
        artists: storedArtists,
        deletedTrackIds: Array.isArray(parsed.deletedTrackIds) ? parsed.deletedTrackIds : [],
        deletedPlaylistIds: Array.isArray(parsed.deletedPlaylistIds) ? parsed.deletedPlaylistIds : [],
        deletedArtistIds: Array.isArray(parsed.deletedArtistIds) ? parsed.deletedArtistIds : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
      try {
        const synced = healCatalogStructureSync(rawCatalog);
        if (synced.changed) {
          try {
            fs.writeFileSync(CATALOG_FILE, JSON.stringify(synced.catalog, null, 2), 'utf-8');
          } catch {}
        }
        return synced.catalog;
      } catch (healErr) {
        console.warn('Non-fatal warning during healCatalogStructureSync:', healErr);
        return rawCatalog;
      }
    }
  } catch (err) {
    console.warn('Could not read catalog file:', err);
  }

  const initial: StoredCatalog = {
    tracks: INITIAL_TRACKS,
    playlists: INITIAL_PLAYLISTS,
    artists: INITIAL_ARTISTS,
    deletedTrackIds: [],
    deletedPlaylistIds: [],
    deletedArtistIds: [],
    updatedAt: new Date().toISOString(),
  };

  if (!fs.existsSync(CATALOG_FILE)) {
    try {
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write initial catalog file:', err);
    }
  }
  return initial;
}

function saveCatalogFile(
  tracks: Track[],
  playlists: Playlist[],
  artists?: Artist[],
  deletions?: {
    deletedTrackIds?: string[];
    deletedPlaylistIds?: string[];
    deletedArtistIds?: string[];
  }
): StoredCatalog {
  const current = (() => {
    try {
      if (fs.existsSync(CATALOG_FILE)) {
        return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8')) as Partial<StoredCatalog>;
      }
    } catch {}
    return null;
  })();

  const rawArtists =
    Array.isArray(artists) && artists.length > 0
      ? artists
      : Array.isArray(current?.artists) && current!.artists.length > 0
      ? current!.artists
      : INITIAL_ARTISTS;

  // Clean any base64 images in artists and tracks by saving them permanently to disk as /uploads/...
  const resolvedArtists = rawArtists.map((a) => {
    if (a.imageUrl && a.imageUrl.startsWith('data:')) {
      const safePrefix = `singer-${a.name.slice(0, 12).replace(/[^a-zA-Z0-9]/g, '_')}`;
      return { ...a, imageUrl: saveBase64ImageIfPresent(a.imageUrl, safePrefix) };
    }
    return a;
  });

  const resolvedTracks = tracks.map((t) => {
    if (t.coverUrl && t.coverUrl.startsWith('data:')) {
      const safePrefix = `cover-${t.title.slice(0, 12).replace(/[^a-zA-Z0-9]/g, '_')}`;
      return { ...t, coverUrl: saveBase64ImageIfPresent(t.coverUrl, safePrefix) };
    }
    return t;
  });

  const updated: StoredCatalog = {
    tracks: resolvedTracks,
    playlists,
    artists: resolvedArtists,
    deletedTrackIds: deletions?.deletedTrackIds ?? current?.deletedTrackIds ?? [],
    deletedPlaylistIds: deletions?.deletedPlaylistIds ?? current?.deletedPlaylistIds ?? [],
    deletedArtistIds: deletions?.deletedArtistIds ?? current?.deletedArtistIds ?? [],
    updatedAt: new Date().toISOString(),
  };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    if (fs.existsSync(CATALOG_BACKUP_FILE)) {
      try {
        fs.unlinkSync(CATALOG_BACKUP_FILE);
      } catch {}
    }
  } catch (err) {
    console.error('Error saving catalog to disk:', err);
  }
  return updated;
}

function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

async function fetchFromSupabaseIfConfigured(): Promise<StoredCatalog | null> {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  const endpoints = [
    `${creds.url}/rest/v1/site_catalog?id=eq.global_catalog&select=tracks,playlists,artists,updated_at`,
    `${creds.url}/rest/v1/site_catalog?id=eq.global_catalog&select=tracks,playlists,updated_at`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<{
        tracks?: Track[];
        playlists?: Playlist[];
        artists?: Artist[];
        updated_at?: string;
      }>;
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        if (Array.isArray(row.tracks) && row.tracks.length > 0 && Array.isArray(row.playlists)) {
          return {
            tracks: row.tracks,
            playlists: row.playlists,
            artists:
              Array.isArray(row.artists) && row.artists.length > 0
                ? row.artists
                : INITIAL_ARTISTS,
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        }
      }
    } catch {
      // try fallback select without artists column
    }
  }
  return null;
}

async function syncToSupabaseIfConfigured(catalog: StoredCatalog): Promise<boolean> {
  const creds = getSupabaseCredentials();
  if (!creds) return false;

  const endpoint = `${creds.url}/rest/v1/site_catalog`;
  const headers = {
    apikey: creds.key,
    Authorization: `Bearer ${creds.key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  try {
    // First attempt with artists column; if the user's Supabase table only has (id, tracks, playlists, updated_at), fallback without artists
    const resWithArtists = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'global_catalog',
        tracks: catalog.tracks,
        playlists: catalog.playlists,
        artists: catalog.artists || INITIAL_ARTISTS,
        updated_at: catalog.updatedAt,
      }),
    });
    if (resWithArtists.ok) return true;

    const resBase = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'global_catalog',
        tracks: catalog.tracks,
        playlists: catalog.playlists,
        updated_at: catalog.updatedAt,
      }),
    });
    return resBase.ok;
  } catch {
    return false;
  }
}

function isLegacyPlaceholderAudio(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('soundhelix.com') || lower.includes('codeskulptor-demos');
}

function cleanTrackTitle(rawTitle: string): string {
  return rawTitle
    .trim()
    .replace(/^["']+|["',]+$/g, '')
    .trim();
}

async function fetchServerYouTubeOembed(
  videoId: string
): Promise<{ title: string; author: string } | null> {
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const urls = [
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        if (data && data.title) {
          return {
            title: cleanTrackTitle(String(data.title)),
            author: String(data.author_name || 'YouTube Music').trim(),
          };
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

async function searchPlayableYouTubeVideoIds(
  query: string,
  excludeIds: Set<string>
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const candidates = [
      ...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1])),
    ].filter((id) => !excludeIds.has(id));
    return candidates.slice(0, 6);
  } catch {
    return [];
  }
}

interface ResolvedPlaylistVideo {
  videoId: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
}

function parseDurationTextToSeconds(text?: string, fallbackIndex = 0): number {
  if (!text) return 240 + ((fallbackIndex * 17) % 60);
  const parts = String(text)
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 240 + ((fallbackIndex * 17) % 60);
}

function extractPlaylistItemsFromYtData(
  root: unknown,
  seenIds: Set<string>,
  videos: ResolvedPlaylistVideo[],
  continuations: string[],
  maxItems: number
) {
  function walk(obj: any) {
    if (!obj || typeof obj !== 'object' || videos.length >= maxItems) return;

    if (obj.lockupViewModel) {
      const l = obj.lockupViewModel;
      const candidateVid = String(
        l.contentId ||
          l.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
          ''
      ).trim();
      const rawTitle =
        l.metadata?.lockupMetadataViewModel?.title?.content ||
        l.metadata?.lockupMetadataViewModel?.title?.runs?.[0]?.text ||
        '';
      const a11y =
        l.metadata?.lockupMetadataViewModel?.image?.decoratedAvatarViewModel?.a11yLabel || '';
      const artist =
        String(a11y)
          .replace(/^Go to channel\s+/i, '')
          .trim() || 'YouTube Music';

      if (
        candidateVid &&
        /^[a-zA-Z0-9_-]{11}$/.test(candidateVid) &&
        rawTitle &&
        !seenIds.has(candidateVid)
      ) {
        seenIds.add(candidateVid);
        let duration = 240 + ((videos.length * 17) % 60);
        try {
          const jsonStr = JSON.stringify(l.contentImage || {});
          const minSecMatch = jsonStr.match(/(\d+)\s+minutes?,\s+(\d+)\s+seconds?/i);
          if (minSecMatch) {
            duration = Number(minSecMatch[1]) * 60 + Number(minSecMatch[2]);
          }
        } catch {}

        videos.push({
          videoId: candidateVid,
          title: cleanTrackTitle(String(rawTitle)),
          artist,
          coverUrl: `https://img.youtube.com/vi/${candidateVid}/mqdefault.jpg`,
          audioUrl: '',
          duration,
        });
      }
    }

    if (obj.playlistVideoRenderer) {
      const r = obj.playlistVideoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
      const artist = r.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
      const duration =
        Number(r.lengthSeconds) ||
        parseDurationTextToSeconds(r.lengthText?.simpleText, videos.length);

      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seenIds.has(vid)) {
        seenIds.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(String(rawTitle)),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration,
        });
      }
    }

    if (obj.playlistPanelVideoRenderer) {
      const r = obj.playlistPanelVideoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.simpleText || r.title?.runs?.[0]?.text || '';
      const artist =
        r.shortBylineText?.runs?.[0]?.text ||
        r.longBylineText?.runs?.[0]?.text ||
        'YouTube Music';
      const duration = parseDurationTextToSeconds(r.lengthText?.simpleText, videos.length);

      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seenIds.has(vid)) {
        seenIds.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(String(rawTitle)),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration,
        });
      }
    }

    if (obj.videoRenderer) {
      const r = obj.videoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
      const artist =
        r.ownerText?.runs?.[0]?.text ||
        r.longBylineText?.runs?.[0]?.text ||
        r.shortBylineText?.runs?.[0]?.text ||
        'YouTube Music';
      const duration = parseDurationTextToSeconds(r.lengthText?.simpleText, videos.length);

      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seenIds.has(vid)) {
        seenIds.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(String(rawTitle)),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration,
        });
      }
    }

    if (
      obj.continuationCommand?.token &&
      typeof obj.continuationCommand.token === 'string' &&
      !continuations.includes(obj.continuationCommand.token)
    ) {
      continuations.push(obj.continuationCommand.token);
    }

    for (const k of Object.keys(obj)) {
      walk(obj[k]);
    }
  }

  walk(root);
}

function parseYtInitialDataFromHtml(html: string): any | null {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start !== -1) {
      const end = html.indexOf(';</script>', start);
      if (end !== -1) {
        try {
          return JSON.parse(html.slice(start + marker.length, end));
        } catch {}
      }
    }
  }
  return null;
}

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyNDA1MTQtMF9SQzIaAmVuIAEaBgiAo_CmBg',
};

async function fetchServerYouTubePlaylist(
  playlistId: string,
  maxItems = 500,
  seedVideoId?: string,
  fallbackTitle?: string
): Promise<{
  playlistId: string;
  title: string;
  videos: ResolvedPlaylistVideo[];
} | null> {
  const cleanId = playlistId.trim();
  if (!cleanId) return null;

  const seenIds = new Set<string>();
  const videos: ResolvedPlaylistVideo[] = [];
  const continuations: string[] = [];
  let playlistTitle = fallbackTitle?.trim() || '';

  try {
    // 1. If this is NOT a Radio/Mix ID (RD...), try the official YouTube playlist page + continuations first
    if (!cleanId.startsWith('RD') && /^[a-zA-Z0-9_-]{8,}$/.test(cleanId)) {
      const res = await fetch(
        `https://www.youtube.com/playlist?list=${encodeURIComponent(cleanId)}`,
        { headers: YT_HEADERS }
      );
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const rawPlaylistTitle = titleMatch?.[1]?.trim() || '';
        if (rawPlaylistTitle && rawPlaylistTitle !== 'YouTube') {
          playlistTitle = rawPlaylistTitle;
        }

        const parsedData = parseYtInitialDataFromHtml(html);
        if (parsedData) {
          extractPlaylistItemsFromYtData(parsedData, seenIds, videos, continuations, maxItems);
        }

        // Follow continuation tokens to load remaining songs (100 -> 500 songs)
        const processedTokens = new Set<string>();
        let pageCount = 0;
        while (continuations.length > 0 && videos.length < maxItems && pageCount < 4) {
          const token = continuations.shift()!;
          if (!token || processedTokens.has(token)) continue;
          processedTokens.add(token);
          pageCount++;
          try {
            const contRes = await fetch(
              'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
              {
                method: 'POST',
                headers: {
                  ...YT_HEADERS,
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(3500),
                body: JSON.stringify({
                  context: {
                    client: {
                      clientName: 'WEB',
                      clientVersion: '2.20240726.00.00',
                    },
                  },
                  continuation: token,
                }),
              }
            );
            if (contRes.ok) {
              const contData = await contRes.json();
              extractPlaylistItemsFromYtData(contData, seenIds, videos, continuations, maxItems);
            }
          } catch {
            break;
          }
        }

        // Regex fallback if ytInitialData structure differed
        if (videos.length === 0) {
          const allIds = [
            ...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1])),
          ].slice(0, Math.min(maxItems, 40));

          if (allIds.length > 0) {
            const resolved = await Promise.all(
              allIds.map(async (vid, idx) => {
                const meta = idx < 25 ? await fetchServerYouTubeOembed(vid) : null;
                return {
                  videoId: vid,
                  title: meta?.title || `YouTube Song #${idx + 1} (${vid})`,
                  artist: meta?.author || 'YouTube Music',
                  coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
                  audioUrl: '',
                  duration: 240 + ((idx * 17) % 60),
                };
              })
            );
            for (const item of resolved) {
              if (!seenIds.has(item.videoId)) {
                seenIds.add(item.videoId);
                videos.push(item);
              }
            }
          }
        }
      }
    }

    // 2. If this is a YouTube Mix / Radio ID (RD..., RDMM, RDAMVM..., RDCLAK5uy_...) or Watch+List URL
    if (videos.length === 0) {
      let candidateSeedVid =
        seedVideoId && /^[a-zA-Z0-9_-]{11}$/.test(seedVideoId) ? seedVideoId : undefined;
      if (!candidateSeedVid && cleanId.startsWith('RD')) {
        if (cleanId.length === 13) {
          candidateSeedVid = cleanId.slice(2);
        } else if (cleanId.startsWith('RDAMVM') && cleanId.length === 17) {
          candidateSeedVid = cleanId.slice(6);
        } else if (cleanId.startsWith('RDMM') && cleanId.length === 15) {
          candidateSeedVid = cleanId.slice(4);
        }
      }

      if (candidateSeedVid && /^[a-zA-Z0-9_-]{11}$/.test(candidateSeedVid)) {
        const listForWatch = cleanId.startsWith('RD') ? cleanId : `RD${candidateSeedVid}`;
        const watchRes = await fetch(
          `https://www.youtube.com/watch?v=${encodeURIComponent(
            candidateSeedVid
          )}&list=${encodeURIComponent(listForWatch)}`,
          { headers: YT_HEADERS }
        );
        if (watchRes.ok) {
          const watchHtml = await watchRes.text();
          const parsedWatchData = parseYtInitialDataFromHtml(watchHtml);
          if (parsedWatchData) {
            extractPlaylistItemsFromYtData(
              parsedWatchData,
              seenIds,
              videos,
              continuations,
              maxItems
            );
          }
        }
        if (!playlistTitle && videos.length > 0) {
          playlistTitle = `${videos[0].title} Mix`;
        }
      }
    }

    // 3. Universal Search Fallback: if a playlist is Private, YouTube Music (OLAK5uy_), a Mix (RD...) with < 25 songs, or a search query, fetch songs via YouTube Search so the upload NEVER has 0 or too few songs
    if (videos.length === 0 || (cleanId.startsWith('RD') && videos.length < 25)) {
      const searchTerms =
        playlistTitle ||
        videos[0]?.title ||
        fallbackTitle?.trim() ||
        (cleanId.startsWith('PL') || cleanId.startsWith('OL') || cleanId.startsWith('RD')
          ? 'Bollywood Hindi & Bhojpuri Top Songs Audio'
          : cleanId);
      const searchRes = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${searchTerms} songs official audio`
        )}`,
        { headers: YT_HEADERS }
      );
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        const parsedSearchData = parseYtInitialDataFromHtml(searchHtml);
        if (parsedSearchData) {
          extractPlaylistItemsFromYtData(
            parsedSearchData,
            seenIds,
            videos,
            continuations,
            maxItems
          );
        }
      }
    }

    if (videos.length === 0) {
      return null;
    }

    const finalTitle =
      playlistTitle && playlistTitle !== 'YouTube'
        ? playlistTitle
        : `${videos[0].artist} — ${videos[0].title.slice(0, 32)} Playlist`;

    return {
      playlistId: cleanId,
      title: finalTitle,
      videos,
    };
  } catch (err) {
    console.warn('Error fetching YouTube playlist metadata:', err);
    return null;
  }
}

const expandedPlaylistCache = new Set<string>();

function healCatalogStructureSync(catalog: StoredCatalog): {
  catalog: StoredCatalog;
  changed: boolean;
} {
  let changed = false;

  const defaultArtistIds = new Set(INITIAL_ARTISTS.map((a) => a.id));

  // Respect ALL deleted IDs permanently — never restore anything deleted by the admin
  const deletedTrackIds = new Set(catalog.deletedTrackIds || []);
  const deletedPlaylistIds = new Set(catalog.deletedPlaylistIds || []);
  const deletedArtistIds = new Set(catalog.deletedArtistIds || []);

  let healedArtists: Artist[] =
    Array.isArray(catalog.artists) && catalog.artists.length > 0
      ? catalog.artists
          .filter((a) => !deletedArtistIds.has(a.id))
          .map((a) => ({
            ...a,
            topTrackIds: Array.isArray(a.topTrackIds) ? [...a.topTrackIds] : [],
          }))
      : INITIAL_ARTISTS.filter((a) => !deletedArtistIds.has(a.id)).map((a) => ({
          ...a,
          topTrackIds: [...a.topTrackIds],
        }));

  const existingArtIds = new Set(healedArtists.map((a) => a.id));
  const existingArtNames = new Set(healedArtists.map((a) => a.name.trim().toLowerCase()));
  for (const defArt of INITIAL_ARTISTS) {
    if (
      !deletedArtistIds.has(defArt.id) &&
      !existingArtIds.has(defArt.id) &&
      !existingArtNames.has(defArt.name.trim().toLowerCase())
    ) {
      healedArtists.push({ ...defArt, topTrackIds: [...defArt.topTrackIds] });
      existingArtIds.add(defArt.id);
      existingArtNames.add(defArt.name.trim().toLowerCase());
      changed = true;
    }
  }

  const defaultById = new Map(INITIAL_TRACKS.map((t) => [t.id, t]));
  const rawTracks = Array.isArray(catalog.tracks)
    ? catalog.tracks.filter((t) => !deletedTrackIds.has(t.id))
    : [];
  const existingTrackIds = new Set(rawTracks.map((t) => t.id));
  const existingYtIds = new Set(rawTracks.map((t) => t.youtubeId).filter(Boolean));
  for (const defTrack of INITIAL_TRACKS) {
    if (
      !deletedTrackIds.has(defTrack.id) &&
      !existingTrackIds.has(defTrack.id) &&
      (!defTrack.youtubeId || !existingYtIds.has(defTrack.youtubeId))
    ) {
      rawTracks.push(defTrack);
      existingTrackIds.add(defTrack.id);
      if (defTrack.youtubeId) existingYtIds.add(defTrack.youtubeId);
      changed = true;
    }
  }

  const mapSectionGenre: Record<HomeSection, Genre> = {
    hindi: 'Hindi',
    bhojpuri: 'Bhojpuri',
    bhakti: 'Bhakti',
    english: 'English',
  };

  // Pre-count primary singer occurrences and strictly filter out false singers (movies, actors, YouTube channels)
  const channelNoiseRegex =
    /\b(music|vibes|lofi|records|studio|studios|official|channel|edits|mix|jukebox|production|productions|junction|creation|creations|world|entertainment|media|films|beats|series|audio|video|tv|network|club|hub|zone|waves|sounds|tunes|melody|hit|hits|songs|song|playlist|bollywood|bhojpuri|bhakti|indie|pop|chill|relax|peaceful|acoustic|viral|trending|mashup|reverb|slowed)\b/i;

  // Filter out noisy auto-generated channel/movie/actor artists from healedArtists while preserving INITIAL_ARTISTS and verified singers
  const beforeArtistCount = healedArtists.length;
  const seenSingerLower = new Set<string>();
  healedArtists = healedArtists.filter((a) => {
    const lower = a.name.trim().toLowerCase();
    if (seenSingerLower.has(lower)) {
      changed = true;
      return false;
    }
    if (
      defaultArtistIds.has(a.id) ||
      a.id.startsWith('artist-') ||
      Boolean(a.createdAt)
    ) {
      seenSingerLower.add(lower);
      return true;
    }
    if (channelNoiseRegex.test(a.name) || isGenericChannelOrLabel(a.name) || !isVerifiedRealSingerName(a.name)) {
      changed = true;
      deletedArtistIds.add(a.id);
      return false;
    }
    seenSingerLower.add(lower);
    return true;
  });
  if (healedArtists.length !== beforeArtistCount) {
    changed = true;
  }

  const healedTracks: Track[] = [];
  for (const track of rawTracks) {
    let nextTrack = { ...track };
    const cleanedTitle = cleanTrackTitle(nextTrack.title);
    if (cleanedTitle && cleanedTitle !== nextTrack.title) {
      nextTrack.title = cleanedTitle;
      changed = true;
    }

    if (isLegacyPlaceholderAudio(nextTrack.audioUrl)) {
      nextTrack.audioUrl = '';
      changed = true;
    }

    const matchingDefault = defaultById.get(nextTrack.id);
    if (matchingDefault) {
      if (
        matchingDefault.youtubeId &&
        (!nextTrack.youtubeId ||
          (nextTrack.id === 'track-in-1' && nextTrack.youtubeId === 'JFcgOboQZ08'))
      ) {
        nextTrack.youtubeId = matchingDefault.youtubeId;
        nextTrack.coverUrl = matchingDefault.coverUrl;
        changed = true;
      }
      if (
        nextTrack.section !== matchingDefault.section ||
        nextTrack.genre !== matchingDefault.genre ||
        nextTrack.language !== matchingDefault.language ||
        nextTrack.artist !== matchingDefault.artist
      ) {
        nextTrack.section = matchingDefault.section;
        nextTrack.genre = matchingDefault.genre;
        nextTrack.language = matchingDefault.language;
        nextTrack.artist = matchingDefault.artist;
        changed = true;
      }
    } else {
      const classified = smartClassifyTrackMetadata(
        {
          title: nextTrack.title,
          artist: nextTrack.artist,
          album: nextTrack.album,
        },
        healedArtists
      );

      const isPoisonedArijit =
        nextTrack.artist.trim().toLowerCase() === 'arijit singh' &&
        !/\b(arijit|kesariya|tum hi ho|channa mereya|apna bana le|agar tum saath ho|gerua)\b/i.test(
          `${nextTrack.title} ${nextTrack.album || ''}`
        );

      if (
        classified.singerName &&
        classified.singerName !== 'Various Artists' &&
        (isGenericChannelOrLabel(nextTrack.artist) ||
          isPoisonedArijit ||
          nextTrack.artist === 'YouTube Artist' ||
          nextTrack.artist === 'Indian Artist')
      ) {
        if (nextTrack.artist !== classified.singerName) {
          nextTrack.artist = classified.singerName;
          changed = true;
        }
      }

      if (
        classified.cleanTitle &&
        classified.cleanTitle !== nextTrack.title &&
        (nextTrack.title.includes('|') ||
          nextTrack.title.includes('(with ') ||
          nextTrack.title.includes(' - '))
      ) {
        nextTrack.title = classified.cleanTitle;
        changed = true;
      }

      const hasExplicitAdminSection =
        Boolean(nextTrack.createdAt) &&
        (nextTrack.section === 'hindi' ||
          nextTrack.section === 'bhojpuri' ||
          nextTrack.section === 'bhakti' ||
          nextTrack.section === 'english');
      const resolvedSec = resolveTrackSection(nextTrack);
      const targetSec = hasExplicitAdminSection
        ? (nextTrack.section as HomeSection)
        : classified.section || resolvedSec;
      const targetGenre = mapSectionGenre[targetSec] || nextTrack.genre;
      const targetLang =
        targetSec === 'english'
          ? 'English'
          : targetSec === 'bhojpuri'
          ? 'Bhojpuri'
          : 'Hindi';

      if (
        nextTrack.section !== targetSec ||
        nextTrack.genre !== targetGenre ||
        nextTrack.language !== targetLang
      ) {
        nextTrack.section = targetSec;
        nextTrack.genre = targetGenre;
        nextTrack.language = targetLang;
        changed = true;
      }
    }

    let matchedArt = resolveTrackArtist(nextTrack, healedArtists);
    if (
      !matchedArt &&
      nextTrack.artist &&
      nextTrack.artist !== 'Various Artists' &&
      !isGenericChannelOrLabel(nextTrack.artist)
    ) {
      const primarySinger = nextTrack.artist
        .split(/,|&|\bfeat\.?\b|\bft\.?\b/i)[0]
        .trim();
      if (
        primarySinger &&
        primarySinger.length >= 2 &&
        primarySinger.length <= 35 &&
        !isGenericChannelOrLabel(primarySinger) &&
        !channelNoiseRegex.test(primarySinger)
      ) {
        const existingPrimary = healedArtists.find(
          (a) => a.name.trim().toLowerCase() === primarySinger.toLowerCase()
        );
        if (existingPrimary) {
          matchedArt = existingPrimary;
        } else if (!matchingDefault && isVerifiedRealSingerName(primarySinger)) {
          const sec = nextTrack.section || 'hindi';
          const newSinger = createSingerObjectFromAI(
            primarySinger,
            {
              section: sec,
              categoryLabel:
                sec === 'english'
                  ? 'English Song'
                  : sec === 'bhojpuri'
                  ? 'Bhojpuri Song'
                  : sec === 'bhakti'
                  ? 'Bhakti Song'
                  : 'Hindi Song',
              singerLanguage:
                sec === 'english'
                  ? 'Other Country'
                  : sec === 'bhojpuri'
                  ? 'Bhojpuri'
                  : 'Hindi',
              singerRole:
                sec === 'english'
                  ? 'Global Pop & International Icon'
                  : sec === 'bhakti'
                  ? 'Devotional & Spiritual Legend'
                  : sec === 'bhojpuri'
                  ? 'Bhojpuri Superstar & Singer'
                  : 'Playback Singer & Music Icon',
            },
            nextTrack.coverUrl,
            nextTrack.id
          );
          if (!deletedArtistIds.has(newSinger.id)) {
            healedArtists.push(newSinger);
            matchedArt = newSinger;
            changed = true;
          }
        }
      }
    }

    const desiredArtistId = matchedArt?.id;
    if (nextTrack.artistId !== desiredArtistId) {
      nextTrack.artistId = desiredArtistId;
      changed = true;
    }

    if (matchedArt) {
      if (!matchedArt.topTrackIds.includes(nextTrack.id)) {
        matchedArt.topTrackIds.push(nextTrack.id);
        changed = true;
      }
      // Remove from Arijit Singh's topTrackIds if this song belongs to another singer
      if (matchedArt.id !== 'artist-arijit-singh') {
        const arijit = healedArtists.find((a) => a.id === 'artist-arijit-singh');
        if (arijit && arijit.topTrackIds.includes(nextTrack.id)) {
          arijit.topTrackIds = arijit.topTrackIds.filter((id) => id !== nextTrack.id);
          changed = true;
        }
      }
    }

    healedTracks.push(nextTrack);
  }

  let healedPlaylists: Playlist[] = Array.isArray(catalog.playlists)
    ? catalog.playlists.filter((p) => !deletedPlaylistIds.has(p.id))
    : [];

  const seenAdminYtPlaylists = new Map<string, Playlist>();
  const dedupedPlaylists: Playlist[] = [];
  for (const pl of healedPlaylists) {
    const normNameKey = pl.name.replace(/\s*\(YouTube Playlist\)\s*$/i, '').trim().toLowerCase();
    const key = pl.youtubePlaylistId
      ? `${pl.youtubePlaylistId}::${normNameKey}`
      : `name::${normNameKey}`;
    const existingPl = seenAdminYtPlaylists.get(key);
    if (existingPl) {
      if ((pl.createdAt || 0) > (existingPl.createdAt || 0)) {
        existingPl.createdAt = pl.createdAt;
        existingPl.name = pl.name;
        existingPl.description = pl.description || existingPl.description;
        existingPl.section = pl.section || existingPl.section;
        existingPl.category = pl.category || existingPl.category;
        existingPl.artistId = pl.artistId || existingPl.artistId;
        existingPl.artistName = pl.artistName || existingPl.artistName;
      }
      existingPl.trackIds = Array.from(
        new Set([...(pl.trackIds || []), ...(existingPl.trackIds || [])])
      );
      changed = true;
      continue;
    }
    const clonedPl = { ...pl, trackIds: [...(pl.trackIds || [])] };
    seenAdminYtPlaylists.set(key, clonedPl);
    dedupedPlaylists.push(clonedPl);
  }
  healedPlaylists = dedupedPlaylists.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (healedPlaylists.length === 0 && deletedPlaylistIds.size === 0) {
    healedPlaylists = [...INITIAL_PLAYLISTS];
    changed = true;
  } else {
    const existingPlIds = new Set(healedPlaylists.map((p) => p.id));
    for (const defPl of INITIAL_PLAYLISTS) {
      if (!deletedPlaylistIds.has(defPl.id) && !existingPlIds.has(defPl.id)) {
        healedPlaylists.push(defPl);
        changed = true;
      }
    }
  }

  // Deduplicate songs across the entire catalog and remap playlist trackIds & singer topTrackIds
  const dedupedCatalog = deduplicateCatalogTracks(
    healedTracks,
    healedPlaylists,
    healedArtists
  );
  if (dedupedCatalog.removedCount > 0) {
    changed = true;
  }
  const finalTracks = dedupedCatalog.tracks;
  let finalPlaylists = dedupedCatalog.playlists;
  const finalArtists = dedupedCatalog.artists;

  finalPlaylists = finalPlaylists.map((pl) => {
    const resolvedSec = resolvePlaylistSection(pl, finalTracks);
    const resolvedArt = resolvePlaylistArtist(pl, finalArtists, finalTracks);
    const targetCat: Playlist['category'] =
      resolvedSec === 'english'
        ? 'English'
        : resolvedSec === 'bhakti'
        ? 'Bhakti'
        : resolvedSec === 'bhojpuri'
        ? 'Bhojpuri'
        : 'Hindi';

    if (
      pl.section !== resolvedSec ||
      pl.category !== targetCat ||
      pl.artistId !== resolvedArt?.id ||
      pl.artistName !== resolvedArt?.name
    ) {
      changed = true;
      return {
        ...pl,
        section: resolvedSec,
        category: targetCat,
        artistId: resolvedArt?.id,
        artistName: resolvedArt?.name,
      };
    }
    return pl;
  });

  if (!changed) {
    return { catalog, changed: false };
  }

  return {
    catalog: {
      tracks: finalTracks,
      playlists: finalPlaylists,
      artists: finalArtists,
      deletedTrackIds: Array.from(deletedTrackIds),
      deletedPlaylistIds: Array.from(deletedPlaylistIds),
      deletedArtistIds: Array.from(deletedArtistIds),
      updatedAt: new Date().toISOString(),
    },
    changed: true,
  };
}

async function healCatalogMetadata(catalog: StoredCatalog): Promise<{
  catalog: StoredCatalog;
  changed: boolean;
}> {
  const syncResult = healCatalogStructureSync(catalog);
  let changed = syncResult.changed;
  const healedTracks: Track[] = [...syncResult.catalog.tracks];
  let healedPlaylists: Playlist[] = [...syncResult.catalog.playlists];
  const healedArtists: Artist[] = [...syncResult.catalog.artists];

  for (let i = 0; i < healedTracks.length; i++) {
    const nextTrack = healedTracks[i];
    if (
      nextTrack.youtubeId &&
      (nextTrack.title.startsWith('YouTube Audio Track (') ||
        nextTrack.artist === 'YouTube Stream')
    ) {
      const meta = await fetchServerYouTubeOembed(nextTrack.youtubeId);
      if (meta) {
        healedTracks[i] = {
          ...nextTrack,
          title: meta.title,
          artist: meta.author,
        };
        changed = true;
      }
    }
  }

  // Expand any admin-uploaded YouTube playlist that was previously capped at <= 20 songs so all playlist songs are included
  for (let i = 0; i < healedPlaylists.length; i++) {
    let pl = healedPlaylists[i];
    if (pl.youtubePlaylistId === 'PLofht4PTcKYnaH8w5olJCI-wUVxuoMHqM') {
      pl = { ...pl, youtubePlaylistId: 'PLgxs93BSP-hrI_pMZT28kVmGcvfFq234b' };
      healedPlaylists[i] = pl;
      changed = true;
    }

    if (
      pl.id.startsWith('playlist-yt-') &&
      pl.youtubePlaylistId &&
      !expandedPlaylistCache.has(pl.id) &&
      (pl.name.startsWith('YouTube Playlist (') || pl.trackIds.length <= 20)
    ) {
      expandedPlaylistCache.add(pl.id);
      const resolvedPl = await fetchServerYouTubePlaylist(
        pl.youtubePlaylistId,
        500,
        undefined,
        pl.name
      );
      if (resolvedPl && resolvedPl.videos.length > 0) {
        const plTrackIds: string[] = [];
        for (const v of resolvedPl.videos) {
          let existing = healedTracks.find((t) => t.youtubeId === v.videoId);
          if (!existing) {
            const classified = smartClassifyTrackMetadata(
              {
                title: v.title,
                artist: v.artist,
                playlistTitle: resolvedPl.title || pl.name,
              },
              healedArtists
            );
            const matchedArt = healedArtists.find(
              (a) =>
                a.name.trim().toLowerCase() ===
                (classified.singerName || v.artist).trim().toLowerCase()
            );
            existing = {
              id: `track-yt-pl-${v.videoId}`,
              title: classified.cleanTitle || v.title,
              artist: classified.singerName || v.artist,
              artistId: matchedArt?.id,
              section: classified.section,
              album: resolvedPl.title || 'YouTube Playlist',
              duration: v.duration,
              audioUrl: '',
              coverUrl: v.coverUrl,
              youtubeId: v.videoId,
              genre: classified.genre,
              language: classified.language,
              releaseYear: new Date().getFullYear(),
              playCount: Math.floor(Math.random() * 400000) + 75000,
              gradient: 'from-emerald-600 via-teal-800 to-slate-950',
              isOfficial: true,
            };
            healedTracks.push(existing);
          }
          if (!plTrackIds.includes(existing.id)) {
            plTrackIds.push(existing.id);
          }
        }

        const updatedName =
          pl.name.startsWith('YouTube Playlist (') && resolvedPl.title
            ? `${resolvedPl.title} (YouTube Playlist)`
            : pl.name;

        if (plTrackIds.length !== pl.trackIds.length || updatedName !== pl.name) {
          healedPlaylists[i] = {
            ...pl,
            name: updatedName,
            description: `Official YouTube Playlist · ${plTrackIds.length} Songs (${pl.youtubePlaylistId})`,
            trackIds: plTrackIds,
          };
          changed = true;
        }
      }
    }
  }

  const finalSync = healCatalogStructureSync({
    tracks: healedTracks,
    playlists: healedPlaylists,
    artists: healedArtists,
    deletedTrackIds: syncResult.catalog.deletedTrackIds,
    deletedPlaylistIds: syncResult.catalog.deletedPlaylistIds,
    deletedArtistIds: syncResult.catalog.deletedArtistIds,
    updatedAt: new Date().toISOString(),
  });

  if (!changed && !finalSync.changed) {
    return { catalog, changed: false };
  }

  return { catalog: finalSync.catalog, changed: true };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Initialize permanent catalog on server startup
  ensureCatalogFile();

  // POST /api/upload-photo — Saves uploaded singer photos & cover art permanently on the server
  app.post('/api/upload-photo', async (req, res) => {
    try {
      const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'Missing or invalid dataUrl' });
        return;
      }
      const safePrefix = (filename || 'photo')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const publicUrl = saveBase64ImageIfPresent(dataUrl, safePrefix);
      if (publicUrl && publicUrl.startsWith('/uploads/')) {
        res.json({ success: true, url: publicUrl });
      } else {
        res.status(400).json({ error: 'Invalid or unsupported image data URL' });
      }
    } catch (err) {
      console.error('Failed to save uploaded photo:', err);
      res.status(500).json({ error: 'Failed to save photo on server' });
    }
  });

  // POST /api/ai/classify-music — Gemini AI Music & Playlist Classifier (identifies Singer & Category for each song/playlist)
  app.post('/api/ai/classify-music', async (req, res) => {
    try {
      const { items, playlistTitle, playlistDescription } = req.body as {
        items?: Array<{
          id?: string;
          title: string;
          artist?: string;
          album?: string;
          playlistTitle?: string;
        }>;
        playlistTitle?: string;
        playlistDescription?: string;
      };

      const inputItems = Array.isArray(items) ? items : [];
      const currentCatalog = ensureCatalogFile();
      const existingArtists = currentCatalog.artists || INITIAL_ARTISTS;

      // Always compute fast, accurate baseline classifications first
      const baselineResults: AIClassifiedTrackResult[] = inputItems.map((item) =>
        smartClassifyTrackMetadata(
          {
            id: item.id,
            title: item.title || '',
            artist: item.artist,
            album: item.album,
            playlistTitle: item.playlistTitle || playlistTitle,
          },
          existingArtists
        )
      );

      let finalTrackResults = [...baselineResults];
      let aiPowered = false;

      // Use Gemini 3.8 Flash when GEMINI_API_KEY is available to further refine singer & category classification
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (apiKey && inputItems.length > 0) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const batchForAi = inputItems.slice(0, 40).map((it, idx) => ({
            index: idx,
            title: it.title,
            rawChannelOrArtist: it.artist || '',
            album: it.album || '',
            playlistTitle: it.playlistTitle || playlistTitle || '',
          }));

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze the following songs (and optional playlist context: "${playlistTitle || ''} - ${playlistDescription || ''}") and identify the exact real singer/artist and category for each song:\n${JSON.stringify(
              batchForAi
            )}`,
            config: {
              systemInstruction:
                'You are an expert Music Catalog AI Manager for AuraStream Music. For each song, identify: ' +
                '1) cleanTitle: the clean song title without YouTube clutter like (Official Video) or [Full Audio]. ' +
                '2) singerName: the true primary singer or band name (e.g. "The Weeknd", "Arijit Singh", "Pawan Singh", "Ed Sheeran", "Shreya Ghoshal", "Yo Yo Honey Singh", "Khesari Lal Yadav", "Hariharan", "Dua Lipa", "Taylor Swift"). NEVER return a record label like T-Series, Zee Music, VEVO, or YouTube Music as singerName if the real singer can be identified. Canonicalize "weeknd" to "The Weeknd". ' +
                '3) section: must be one of "hindi" (Bollywood/Hindi/Punjabi secular songs), "bhojpuri" (Bhojpuri folk/pop songs), "bhakti" (Hindu devotional/religious/God bhajans, aartis, chalisas, stotrams), or "english" (English/International pop, rock, R&B, synthwave, global songs like The Weeknd, Ed Sheeran, etc.). ' +
                '4) singerLanguage: must be one of "Hindi", "Bhojpuri", "Pan-Indian", "Punjabi", or "Other Country" (use "Other Country" for English/international artists like The Weeknd). ' +
                '5) singerRole: short 3-6 word description of the singer (e.g. "Global Pop & R&B Superstar").',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  songs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        index: { type: Type.INTEGER },
                        cleanTitle: { type: Type.STRING },
                        singerName: { type: Type.STRING },
                        section: { type: Type.STRING },
                        singerLanguage: { type: Type.STRING },
                        singerRole: { type: Type.STRING },
                      },
                      required: ['index', 'cleanTitle', 'singerName', 'section', 'singerLanguage'],
                    },
                  },
                },
                required: ['songs'],
              },
            },
          });

          const rawJson = response.text?.trim();
          if (rawJson) {
            const parsed = JSON.parse(rawJson) as {
              songs?: Array<{
                index: number;
                cleanTitle?: string;
                singerName?: string;
                section?: string;
                singerLanguage?: string;
                singerRole?: string;
              }>;
            };

            if (Array.isArray(parsed.songs)) {
              aiPowered = true;
              const secToGenre: Record<HomeSection, 'Hindi' | 'Bhojpuri' | 'Bhakti' | 'English'> = {
                hindi: 'Hindi',
                bhojpuri: 'Bhojpuri',
                bhakti: 'Bhakti',
                english: 'English',
              };
              const secToCatLabel: Record<
                HomeSection,
                'Hindi Song' | 'Bhojpuri Song' | 'Bhakti Song' | 'English Song'
              > = {
                hindi: 'Hindi Song',
                bhojpuri: 'Bhojpuri Song',
                bhakti: 'Bhakti Song',
                english: 'English Song',
              };
              const secLabel: Record<HomeSection, string> = {
                hindi: 'Hindi Song (Bollywood & Hindi Superhits)',
                bhojpuri: 'Bhojpuri Song (Bhojpuri Desi Dhamaka)',
                bhakti: 'Bhakti Song (Bhakti Bhavana)',
                english: 'English Song (English Songs)',
              };

              for (const aiSong of parsed.songs) {
                const idx = aiSong.index;
                if (idx >= 0 && idx < finalTrackResults.length) {
                  const base = finalTrackResults[idx];
                  const rawSec = String(aiSong.section || '').toLowerCase().trim();
                  const validSec: HomeSection =
                    rawSec === 'hindi' ||
                    rawSec === 'bhojpuri' ||
                    rawSec === 'bhakti' ||
                    rawSec === 'english'
                      ? rawSec
                      : base.section;

                  const aiSinger = String(aiSong.singerName || '').trim();
                  const isLabel =
                    /^(t-series|zee music|sony music|yrf|vevo|youtube|unknown|various)/i.test(
                      aiSinger
                    );
                  const chosenSinger =
                    aiSinger && !isLabel
                      ? /^weeknd$/i.test(aiSinger)
                        ? 'The Weeknd'
                        : aiSinger
                      : base.singerName;

                  const validSingerLang = (
                    ['Hindi', 'Bhojpuri', 'Pan-Indian', 'Punjabi', 'Other Country'].includes(
                      String(aiSong.singerLanguage || '')
                    )
                      ? aiSong.singerLanguage
                      : validSec === 'english'
                      ? 'Other Country'
                      : validSec === 'bhojpuri'
                      ? 'Bhojpuri'
                      : base.singerLanguage
                  ) as AIClassifiedTrackResult['singerLanguage'];

                  finalTrackResults[idx] = {
                    id: base.id,
                    cleanTitle: String(aiSong.cleanTitle || '').trim() || base.cleanTitle,
                    singerName: chosenSinger,
                    section: validSec,
                    categoryLabel: secToCatLabel[validSec],
                    genre: secToGenre[validSec],
                    language:
                      validSec === 'english'
                        ? 'English'
                        : validSec === 'bhojpuri'
                        ? 'Bhojpuri'
                        : validSingerLang === 'Punjabi'
                        ? 'Punjabi'
                        : base.language,
                    singerLanguage: validSingerLang,
                    singerLanguageCategory: validSingerLang,
                    singerRole: String(aiSong.singerRole || '').trim() || base.singerRole,
                    reason: `AI Verified — Singer Name :- ${chosenSinger} , ${secToCatLabel[validSec]} (${secLabel[validSec]})`,
                  };
                }
              }
            }
          }
        } catch (aiErr) {
          console.warn('Gemini classification fallback to smart rules:', aiErr);
        }
      }

      // Compute dominant playlist section & singer if playlist metadata or multiple tracks were supplied
      const sectionCounts: Record<HomeSection, number> = {
        hindi: 0,
        bhojpuri: 0,
        bhakti: 0,
        english: 0,
      };
      const singerCounts = new Map<string, number>();

      for (const r of finalTrackResults) {
        sectionCounts[r.section] = (sectionCounts[r.section] || 0) + 1;
        if (r.singerName) {
          singerCounts.set(r.singerName, (singerCounts.get(r.singerName) || 0) + 1);
        }
      }

      let playlistSection: HomeSection = 'hindi';
      let maxSecCount = -1;
      for (const sec of ['english', 'bhakti', 'bhojpuri', 'hindi'] as HomeSection[]) {
        if (sectionCounts[sec] > maxSecCount && sectionCounts[sec] > 0) {
          maxSecCount = sectionCounts[sec];
          playlistSection = sec;
        }
      }

      if (finalTrackResults.length === 0 && playlistTitle) {
        const plClassified = smartClassifyTrackMetadata(
          { title: playlistTitle, artist: playlistDescription },
          existingArtists
        );
        playlistSection = plClassified.section;
      }

      let primarySingerName = finalTrackResults[0]?.singerName || 'Arijit Singh';
      let maxSingerCount = 0;
      for (const [sName, count] of singerCounts.entries()) {
        if (count > maxSingerCount) {
          maxSingerCount = count;
          primarySingerName = sName;
        }
      }

      const secToPlCategory: Record<HomeSection, 'Hindi' | 'Bhojpuri' | 'Bhakti' | 'English'> = {
        hindi: 'Hindi',
        bhojpuri: 'Bhojpuri',
        bhakti: 'Bhakti',
        english: 'English',
      };

      res.json({
        success: true,
        aiPowered,
        results: finalTrackResults,
        tracks: finalTrackResults,
        playlistSummary: {
          section: playlistSection,
          category: secToPlCategory[playlistSection],
          primarySingerName,
        },
      });
    } catch (err) {
      console.error('Error in /api/ai/classify-music:', err);
      res.status(500).json({ error: 'Failed to classify music metadata' });
    }
  });

  // GET /api/youtube-oembed — Server-side YouTube metadata resolver (avoids browser CORS/adblock issues)
  app.get('/api/youtube-oembed', async (req, res) => {
    try {
      const videoId = String(req.query.videoId || '').trim();
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        res.status(400).json({ error: 'Invalid 11-character YouTube Video ID' });
        return;
      }
      const meta = await fetchServerYouTubeOembed(videoId);
      if (meta) {
        res.json({
          videoId,
          title: meta.title,
          author: meta.author,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          audioUrl: '',
        });
      } else {
        res.status(404).json({ error: 'Could not fetch YouTube oEmbed metadata' });
      }
    } catch (err) {
      console.error('Error in /api/youtube-oembed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/youtube-playable — Finds alternative embeddable YouTube audio video IDs for a song if the primary videoId has embed restrictions
  app.get('/api/youtube-playable', async (req, res) => {
    try {
      const title = String(req.query.title || '').trim();
      const artist = String(req.query.artist || '').trim();
      const excludeRaw = String(req.query.exclude || '').trim();
      if (!title) {
        res.status(400).json({ error: 'Missing song title' });
        return;
      }
      const excludeIds = new Set(
        excludeRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      const searchQuery = `${title} ${artist} official audio lyric`.trim();
      const videoIds = await searchPlayableYouTubeVideoIds(searchQuery, excludeIds);
      res.json({ videoIds });
    } catch (err) {
      console.error('Error in /api/youtube-playable:', err);
      res.json({ videoIds: [] });
    }
  });

  // GET /api/youtube-playlist — Resolves a YouTube Playlist ID (PL...), Mix (RD...), or query into ALL its actual tracks (up to 500 songs)
  app.get('/api/youtube-playlist', async (req, res) => {
    try {
      const playlistId = String(req.query.playlistId || '').trim();
      const seedVideoId = String(req.query.videoId || '').trim() || undefined;
      const fallbackTitle = String(req.query.title || '').trim() || undefined;
      const maxItems = Math.min(500, Math.max(1, Number(req.query.max || 500)));
      if (!playlistId) {
        res.status(400).json({ error: 'Invalid YouTube Playlist ID' });
        return;
      }
      const resolved = await fetchServerYouTubePlaylist(
        playlistId,
        maxItems,
        seedVideoId,
        fallbackTitle
      );
      if (resolved && resolved.videos.length > 0) {
        res.json(resolved);
      } else if (seedVideoId) {
        const meta = await fetchServerYouTubeOembed(seedVideoId);
        res.json({
          playlistId,
          title: fallbackTitle || (meta ? `${meta.title} Mix` : `YouTube Playlist (${playlistId})`),
          videos: [
            {
              videoId: seedVideoId,
              title: meta?.title || fallbackTitle || `YouTube Song (${seedVideoId})`,
              artist: meta?.author || 'Indian Artist',
              duration: 235,
              coverUrl: `https://i.ytimg.com/vi/${seedVideoId}/hqdefault.jpg`,
            },
          ],
        });
      } else {
        res.status(404).json({ error: 'Could not resolve videos for this YouTube playlist' });
      }
    } catch (err) {
      console.error('Error in /api/youtube-playlist:', err);
      res.status(500).json({ error: 'Failed to resolve YouTube playlist' });
    }
  });

  // GET /api/catalog — Returns permanent songs, playlists, & singers for every user visiting the website & APK
  app.get('/api/catalog', async (_req, res) => {
    try {
      const hasSupabase = Boolean(getSupabaseCredentials());
      let catalog = ensureCatalogFile();

      // Only hydrate from Supabase if local catalog is empty/uninitialized; never resurrect deleted items from remote
      if (
        hasSupabase &&
        catalog.tracks.length <= INITIAL_TRACKS.length &&
        (catalog.deletedTrackIds || []).length === 0 &&
        (catalog.deletedPlaylistIds || []).length === 0
      ) {
        const remoteCatalog = await fetchFromSupabaseIfConfigured();
        if (remoteCatalog && remoteCatalog.tracks.length > catalog.tracks.length) {
          const deletedTracksSet = new Set(catalog.deletedTrackIds || []);
          const deletedPlaylistsSet = new Set(catalog.deletedPlaylistIds || []);
          const deletedArtistsSet = new Set(catalog.deletedArtistIds || []);

          const mergedRaw: StoredCatalog = {
            tracks: remoteCatalog.tracks.filter((t) => !deletedTracksSet.has(t.id)),
            playlists: remoteCatalog.playlists.filter((p) => !deletedPlaylistsSet.has(p.id)),
            artists: (remoteCatalog.artists || INITIAL_ARTISTS).filter(
              (a) => !deletedArtistsSet.has(a.id)
            ),
            deletedTrackIds: catalog.deletedTrackIds || [],
            deletedPlaylistIds: catalog.deletedPlaylistIds || [],
            deletedArtistIds: catalog.deletedArtistIds || [],
            updatedAt: new Date().toISOString(),
          };
          const healedSync = healCatalogStructureSync(mergedRaw);
          catalog = saveCatalogFile(
            healedSync.catalog.tracks,
            healedSync.catalog.playlists,
            healedSync.catalog.artists,
            {
              deletedTrackIds: healedSync.catalog.deletedTrackIds,
              deletedPlaylistIds: healedSync.catalog.deletedPlaylistIds,
              deletedArtistIds: healedSync.catalog.deletedArtistIds,
            }
          );
          void syncToSupabaseIfConfigured(catalog);
        }
      }

      res.json({
        tracks: catalog.tracks,
        playlists: catalog.playlists,
        artists: catalog.artists || INITIAL_ARTISTS,
        deletedTrackIds: catalog.deletedTrackIds || [],
        deletedPlaylistIds: catalog.deletedPlaylistIds || [],
        deletedArtistIds: catalog.deletedArtistIds || [],
        updatedAt: catalog.updatedAt,
        storageMode: hasSupabase ? 'supabase+server' : 'server-permanent',
      });
    } catch (err) {
      console.error('Error serving /api/catalog:', err);
      res.json({
        tracks: INITIAL_TRACKS,
        playlists: INITIAL_PLAYLISTS,
        artists: INITIAL_ARTISTS,
        updatedAt: new Date().toISOString(),
        storageMode: 'server-permanent',
      });
    }
  });

  // POST /api/catalog — Saves songs, playlists, & singers permanently on the server for all users & APK
  app.post('/api/catalog', async (req, res) => {
    try {
      const { tracks, playlists, artists, authoritative } = req.body as {
        tracks?: Track[];
        playlists?: Playlist[];
        artists?: Artist[];
        authoritative?: boolean;
      };
      const current = ensureCatalogFile();

      const nextDeletedTracks = new Set(current.deletedTrackIds || []);
      const nextDeletedPlaylists = new Set(current.deletedPlaylistIds || []);
      const nextDeletedArtists = new Set(current.deletedArtistIds || []);

      // Only treat as accidental unhydrated partial sync if authoritative is NOT set and client sends tiny default payload
      const isAccidentalPartialTrackSync =
        !authoritative &&
        Array.isArray(tracks) &&
        current.tracks.length > 200 &&
        tracks.length <= INITIAL_TRACKS.length + 5;

      const isAccidentalPartialPlaylistSync =
        !authoritative &&
        Array.isArray(playlists) &&
        current.playlists.length > 15 &&
        playlists.length <= INITIAL_PLAYLISTS.length + 2;

      let nextTracks = current.tracks;
      if (Array.isArray(tracks)) {
        if (isAccidentalPartialTrackSync) {
          const mergedMap = new Map<string, Track>();
          for (const t of tracks) mergedMap.set(t.id, t);
          for (const t of current.tracks) {
            if (!mergedMap.has(t.id) && !nextDeletedTracks.has(t.id)) {
              mergedMap.set(t.id, t);
            }
          }
          nextTracks = Array.from(mergedMap.values());
        } else {
          const incomingIds = new Set(tracks.map((t) => t.id));
          for (const t of current.tracks) {
            if (!incomingIds.has(t.id)) {
              nextDeletedTracks.add(t.id);
            }
          }
          for (const id of incomingIds) {
            nextDeletedTracks.delete(id);
          }
          nextTracks = tracks;
        }
      }

      let nextPlaylists = current.playlists;
      if (Array.isArray(playlists)) {
        if (isAccidentalPartialPlaylistSync) {
          const mergedPlMap = new Map<string, Playlist>();
          for (const p of playlists) mergedPlMap.set(p.id, p);
          for (const p of current.playlists) {
            if (!mergedPlMap.has(p.id) && !nextDeletedPlaylists.has(p.id)) {
              mergedPlMap.set(p.id, p);
            }
          }
          nextPlaylists = Array.from(mergedPlMap.values());
        } else {
          const incomingIds = new Set(playlists.map((p) => p.id));
          for (const p of current.playlists) {
            if (!incomingIds.has(p.id)) {
              nextDeletedPlaylists.add(p.id);
            }
          }
          for (const id of incomingIds) {
            nextDeletedPlaylists.delete(id);
          }
          nextPlaylists = playlists;
        }
      }

      let nextArtists =
        current.artists && current.artists.length > 0
          ? current.artists
          : INITIAL_ARTISTS;
      if (Array.isArray(artists) && artists.length > 0) {
        const incomingIds = new Set(artists.map((a) => a.id));
        for (const a of current.artists) {
          if (!incomingIds.has(a.id)) {
            nextDeletedArtists.add(a.id);
          }
        }
        for (const id of incomingIds) {
          nextDeletedArtists.delete(id);
        }
        nextArtists = artists;
      }

      const healed = healCatalogStructureSync({
        tracks: nextTracks,
        playlists: nextPlaylists,
        artists: nextArtists,
        deletedTrackIds: Array.from(nextDeletedTracks),
        deletedPlaylistIds: Array.from(nextDeletedPlaylists),
        deletedArtistIds: Array.from(nextDeletedArtists),
        updatedAt: new Date().toISOString(),
      });

      const saved = saveCatalogFile(
        healed.catalog.tracks,
        healed.catalog.playlists,
        healed.catalog.artists,
        {
          deletedTrackIds: Array.from(nextDeletedTracks),
          deletedPlaylistIds: Array.from(nextDeletedPlaylists),
          deletedArtistIds: Array.from(nextDeletedArtists),
        }
      );
      const syncedSupabase = await syncToSupabaseIfConfigured(saved);

      res.json({
        success: true,
        tracks: saved.tracks,
        playlists: saved.playlists,
        artists: saved.artists,
        updatedAt: saved.updatedAt,
        syncedSupabase,
      });
    } catch (err) {
      console.error('Failed to save permanent catalog:', err);
      res.status(500).json({ error: 'Failed to save permanent catalog on server.' });
    }
  });

  // POST /api/catalog/reset — Restores default official songs, playlists, and singers on the server
  app.post('/api/catalog/reset', async (_req, res) => {
    try {
      const saved = saveCatalogFile(INITIAL_TRACKS, INITIAL_PLAYLISTS, INITIAL_ARTISTS);
      await syncToSupabaseIfConfigured(saved);
      res.json({
        success: true,
        tracks: saved.tracks,
        playlists: saved.playlists,
        artists: saved.artists,
        updatedAt: saved.updatedAt,
      });
    } catch (err) {
      console.error('Failed to reset catalog:', err);
      res.status(500).json({ error: 'Failed to reset catalog.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
