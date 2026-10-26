/**
 * Pure utility functions for parsing YouTube Video & Playlist URLs/IDs,
 * generating thumbnail/noembed endpoints, and handling playback error recovery.
 */

export type YouTubeParsedInput =
  | { type: 'playlist'; playlistId: string; videoId?: string }
  | { type: 'video'; videoId: string }
  | { type: 'invalid'; error: string };

/**
 * Extracts either a YouTube Playlist ID or a 11-character Video ID from raw user input.
 * Supports:
 * - Raw Playlist IDs starting with PL, OLAK5uy_, RD, UU, FL, LL
 * - Full URLs containing ?list=... or &list=...
 * - Raw 11-character Video IDs (e.g., dQw4w9WgXcQ)
 * - Standard watch URLs (youtube.com/watch?v=...)
 * - Short URLs (youtu.be/...)
 * - Embed / Shorts URLs (youtube.com/embed/..., youtube.com/shorts/...)
 */
export function parseYouTubeInput(rawInput: string): YouTubeParsedInput {
  const input = rawInput.trim();
  if (!input) {
    return { type: 'invalid', error: 'Please enter a YouTube URL, Video ID, or Playlist ID.' };
  }

  // Extract embedded URL if user copied mobile share text like "My Playlist https://youtube.com/playlist?list=..."
  const embeddedUrlMatch = input.match(/https?:\/\/[^\s"'<>]+/i);
  const candidateUrlStr = embeddedUrlMatch ? embeddedUrlMatch[0] : input;

  // 1. Check if it's a URL with query parameters or paths
  if (
    candidateUrlStr.includes('youtube.com') ||
    candidateUrlStr.includes('youtu.be') ||
    candidateUrlStr.startsWith('http')
  ) {
    try {
      const urlObj = new URL(
        candidateUrlStr.startsWith('http') ? candidateUrlStr : `https://${candidateUrlStr}`
      );
      const listParam = urlObj.searchParams.get('list')?.trim();
      const vParam = urlObj.searchParams.get('v')?.trim();

      let pathVideoId: string | undefined = undefined;
      if (urlObj.hostname.includes('youtu.be')) {
        const pathId = urlObj.pathname.split('/').filter(Boolean)[0];
        if (pathId && /^[a-zA-Z0-9_-]{11}$/.test(pathId)) {
          pathVideoId = pathId;
        }
      } else {
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        if (
          pathSegments.length >= 2 &&
          ['embed', 'shorts', 'v', 'live'].includes(pathSegments[0]) &&
          /^[a-zA-Z0-9_-]{11}$/.test(pathSegments[1])
        ) {
          pathVideoId = pathSegments[1];
        }
      }

      const validVideoId =
        vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam) ? vParam : pathVideoId;

      // If URL explicitly has a playlist parameter (e.g. youtube.com/playlist?list=PL... or watch?v=...&list=RD...)
      if (listParam && listParam.length >= 2) {
        // If list is a generic 2-4 char mix code like RDMM and we have a videoId, construct RD<videoId>
        const normalizedPlaylistId =
          listParam.length < 10 && validVideoId ? `RD${validVideoId}` : listParam;
        return {
          type: 'playlist',
          playlistId: normalizedPlaylistId,
          videoId: validVideoId,
        };
      }

      // Check single video watch?v=, youtu.be/<id>, /shorts/<id>
      if (validVideoId) {
        return { type: 'video', videoId: validVideoId };
      }
    } catch {
      // Fallback to regex matching below if URL constructor fails
    }
  }

  // 2. Check raw Playlist ID (starts with PL, OL, RD, UU, LL, FL and at least 10 chars)
  if (/^(PL|OLAK5uy_|RD|UU|LL|FL)[a-zA-Z0-9_-]{8,}$/.test(input)) {
    return { type: 'playlist', playlistId: input };
  }

  // 3. Check raw 11-character Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { type: 'video', videoId: input };
  }

  // 4. Regex fallback for list= or v= inside arbitrary strings
  const listMatch = input.match(/[?&]list=([a-zA-Z0-9_-]{6,})/);
  const videoMatch = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (listMatch) {
    return {
      type: 'playlist',
      playlistId: listMatch[1],
      videoId: videoMatch ? videoMatch[1] : undefined,
    };
  }

  if (videoMatch) {
    return { type: 'video', videoId: videoMatch[1] };
  }

  return {
    type: 'invalid',
    error: 'Invalid YouTube format. Paste a valid YouTube URL, 11-character Video ID, or Playlist ID (PL...).',
  };
}

/**
 * Generates the official YouTube mqdefault thumbnail URL for a video ID.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Generates the free public noembed endpoint URL to resolve track title & author without an API key.
 */
export function getNoembedUrl(videoId: string): string {
  return `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Determines whether a YouTube IFrame Player error code should trigger an automatic skip to the next track.
 * YouTube Error Codes:
 * - 2: Invalid parameter
 * - 5: HTML5 player error
 * - 100: Video not found or removed
 * - 101: Video owner does not allow embedding
 * - 150: Video owner does not allow embedding (same as 101)
 */
export function shouldSkipOnYouTubeError(errorCode: number): boolean {
  return [2, 5, 100, 101, 150].includes(errorCode);
}

/**
 * Checks whether an audioUrl is a genuine user-provided direct MP3/audio stream
 * rather than a legacy placeholder demo URL (e.g. SoundHelix or CodeSkulptor).
 */
export function isCustomDirectAudioUrl(audioUrl?: string): boolean {
  if (!audioUrl) return false;
  const trimmed = audioUrl.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('soundhelix.com') || lower.includes('codeskulptor-demos')) {
    return false;
  }
  return lower.startsWith('http://') || lower.startsWith('https://');
}

export function getFallbackAudioUrl(_videoId?: string): string {
  return '';
}

export interface YouTubeQueueItem {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: number;
}

/**
 * Default curated YouTube tracks & playlists so the app works immediately upon launch.
 */
export const DEFAULT_YOUTUBE_QUEUE: YouTubeQueueItem[] = [
  {
    videoId: 'BddP6PYo2gs',
    title: 'Kesariya - Brahmāstra | Arijit Singh & Pritam',
    author: 'Sony Music India',
    thumbnail: getYouTubeThumbnail('BddP6PYo2gs'),
    duration: 268,
  },
  {
    videoId: 'Umqb9KENgmk',
    title: 'Tum Hi Ho - Aashiqui 2 | Arijit Singh',
    author: 'T-Series',
    thumbnail: getYouTubeThumbnail('Umqb9KENgmk'),
    duration: 262,
  },
  {
    videoId: 'RLzC55ai0eo',
    title: 'Heeriye (Official Audio) Jasleen Royal ft. Arijit Singh',
    author: 'Jasleen Royal',
    thumbnail: getYouTubeThumbnail('RLzC55ai0eo'),
    duration: 194,
  },
  {
    videoId: 'VuG7ge_8I2Y',
    title: 'Maan Meri Jaan | King | Champagne Talk',
    author: 'King',
    thumbnail: getYouTubeThumbnail('VuG7ge_8I2Y'),
    duration: 198,
  },
  {
    videoId: 'BBAyRBTfsOU',
    title: 'Vaaste Song | Dhvani Bhanushali & Tanishk Bagchi',
    author: 'T-Series',
    thumbnail: getYouTubeThumbnail('BBAyRBTfsOU'),
    duration: 196,
  },
  {
    videoId: 'sK7riqg2mr4',
    title: 'Agar Tum Saath Ho - Tamasha | Arijit Singh & Alka Yagnik',
    author: 'T-Series',
    thumbnail: getYouTubeThumbnail('sK7riqg2mr4'),
    duration: 341,
  },
];

export const FEATURED_YOUTUBE_PLAYLISTS = [
  {
    id: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
    title: 'Top Global Music Hits',
    description: 'Trending chartbusters on YouTube Music',
  },
  {
    id: 'PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK',
    title: 'Bollywood & Hindi Top Hits',
    description: 'Non-stop Arijit Singh, Shreya Ghoshal & Bollywood anthems',
  },
  {
    id: 'PLGqUOt0CNckJib_vLMdgWzmIRd2X7dG5Z',
    title: 'Bhojpuri Top 50 Superhits',
    description: 'Trending Bhojpuri dance hits, DJ anthems & folk melodies',
  },
  {
    id: 'PLgxs93BSP-hrI_pMZT28kVmGcvfFq234b',
    title: 'Bollywood Lo-Fi Chill',
    description: 'Relaxing slowed & reverb Hindi lo-fi melodies',
  },
];
