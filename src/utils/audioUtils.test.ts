import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  formatDynamicDuration,
  decodeHtmlEntities,
  getNextTrackIndex,
  getPrevTrackIndex,
  filterTracks,
  toggleLike,
  clamp,
  shuffleArray,
  addTrackToPlaylistTracks,
  removeTrackFromPlaylistTracks,
  getStrictPlaylistTracks,
  getTopPlayedTodayTracks,
  resolveTrackSection,
  getSectionTracks,
  getStrictArtistTracks,
  resolvePlaylistSection,
  resolvePlaylistArtist,
  getSectionPlaylists,
  getArtistPlaylists,
  resolveTrackArtist,
} from './audioUtils.ts';
import type { Track, Playlist, Artist } from '../types/music.ts';

const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    artist: 'Cyberpulse',
    album: 'Retrograde',
    duration: 185,
    audioUrl: 'https://example.com/1.mp3',
    coverUrl: 'https://example.com/cover1.jpg',
    genre: 'Electronic',
    releaseYear: 2024,
    playCount: 1200,
    gradient: 'from-emerald-500 to-cyan-500',
  },
  {
    id: '2',
    title: 'Rainy Cafe Moments',
    artist: 'Coffee Beats',
    album: 'Study Session',
    duration: 140,
    audioUrl: 'https://example.com/2.mp3',
    coverUrl: 'https://example.com/cover2.jpg',
    genre: 'Lo-Fi',
    releaseYear: 2023,
    playCount: 940,
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: '3',
    title: 'Starlight Symphony',
    artist: 'Aura Collective',
    album: 'Cosmic Vibes',
    duration: 210,
    audioUrl: 'https://example.com/3.mp3',
    coverUrl: 'https://example.com/cover3.jpg',
    genre: 'Pop',
    releaseYear: 2024,
    playCount: 4200,
    gradient: 'from-purple-500 to-pink-500',
  },
];

test('formatTime properly formats seconds to mm:ss', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5), '0:05');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(215), '3:35');
  assert.equal(formatTime(-10), '0:00');
  assert.equal(formatTime(NaN), '0:00');
});

test('getNextTrackIndex handles normal progression, repeat modes and bounds', () => {
  assert.equal(getNextTrackIndex(0, 3, false, 'off'), 1);
  assert.equal(getNextTrackIndex(1, 3, false, 'off'), 2);
  assert.equal(getNextTrackIndex(2, 3, false, 'off'), -1);
  assert.equal(getNextTrackIndex(2, 3, false, 'all'), 0);
  assert.equal(getNextTrackIndex(1, 3, false, 'one'), 1);
  assert.equal(getNextTrackIndex(0, 0, false, 'off'), -1);
});

test('getPrevTrackIndex rewinds if elapsed > 3s, otherwise goes to previous or wraps', () => {
  assert.equal(getPrevTrackIndex(1, 3, 4.5), 1);
  assert.equal(getPrevTrackIndex(2, 3, 1.2), 1);
  assert.equal(getPrevTrackIndex(0, 3, 0.5), 2);
});

test('filterTracks filters by text search and category genre', () => {
  const lofiOnly = filterTracks(mockTracks, '', 'Lo-Fi');
  assert.equal(lofiOnly.length, 1);
  assert.equal(lofiOnly[0].id, '2');

  const neonSearch = filterTracks(mockTracks, 'neon', 'All');
  assert.equal(neonSearch.length, 1);
  assert.equal(neonSearch[0].id, '1');

  const auraSearch = filterTracks(mockTracks, 'aura', 'All');
  assert.equal(auraSearch.length, 1);
  assert.equal(auraSearch[0].id, '3');

  const nonMatch = filterTracks(mockTracks, 'neon', 'Lo-Fi');
  assert.equal(nonMatch.length, 0);

  const indianTracks: Track[] = [
    {
      id: 'h1',
      title: 'Kesariya',
      hindiTitle: 'केसरिया तेरा इश्क़',
      artist: 'Arijit Singh',
      album: 'Brahmastra',
      duration: 268,
      audioUrl: 'https://example.com/k.mp3',
      coverUrl: 'https://example.com/c.jpg',
      genre: 'Hindi',
      language: 'Hindi',
      releaseYear: 2022,
      playCount: 900000,
      gradient: 'from-amber-500 to-rose-700',
    },
    {
      id: 'b1',
      title: 'Lollypop Lagelu',
      hindiTitle: 'कमरिया करे लपालप',
      artist: 'Pawan Singh',
      album: 'Lollypop Hits',
      duration: 254,
      audioUrl: 'https://example.com/l.mp3',
      coverUrl: 'https://example.com/c2.jpg',
      genre: 'Bhojpuri',
      language: 'Bhojpuri',
      releaseYear: 2008,
      playCount: 1500000,
      gradient: 'from-orange-500 to-red-700',
    },
  ];

  const hindiList = filterTracks(indianTracks, '', 'Hindi');
  assert.equal(hindiList.length, 1);
  assert.equal(hindiList[0].id, 'h1');

  const bhojpuriList = filterTracks(indianTracks, '', 'Bhojpuri');
  assert.equal(bhojpuriList.length, 1);
  assert.equal(bhojpuriList[0].id, 'b1');

  const hindiScriptSearch = filterTracks(indianTracks, 'केसरिया', 'All');
  assert.equal(hindiScriptSearch.length, 1);
  assert.equal(hindiScriptSearch[0].id, 'h1');

  const singerSearch = filterTracks(indianTracks, 'Pawan Singh', 'All');
  assert.equal(singerSearch.length, 1);
  assert.equal(singerSearch[0].id, 'b1');
});

test('resolveTrackSection and getSectionTracks strictly isolate Hindi, Bhojpuri, Bhakti, and English songs', () => {
  const catalog: Track[] = [
    {
      ...mockTracks[0],
      id: 'hindi-1',
      title: 'Tum Hi Ho',
      artist: 'Arijit Singh',
      genre: 'Hindi',
      section: 'hindi',
    },
    {
      ...mockTracks[0],
      id: 'bhojpuri-1',
      title: 'Rinkiya Ke Papa',
      artist: 'Manoj Tiwari',
      genre: 'Bhojpuri',
      section: 'bhojpuri',
    },
    {
      ...mockTracks[0],
      id: 'bhakti-1',
      title: 'Shree Hanuman Chalisa',
      artist: 'Hariharan',
      genre: 'Bhakti',
      section: 'bhakti',
    },
    {
      ...mockTracks[0],
      id: 'english-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      genre: 'English',
      section: 'english',
    },
  ];

  const bhaktiSongs = getSectionTracks(catalog, 'bhakti');
  assert.equal(bhaktiSongs.length, 1);
  assert.equal(bhaktiSongs[0].id, 'bhakti-1');

  const englishSongs = getSectionTracks(catalog, 'english');
  assert.equal(englishSongs.length, 1);
  assert.equal(englishSongs[0].id, 'english-1');

  // Explicit section override by Admin moves song to chosen section
  const movedTrack: Track = { ...catalog[0], section: 'bhakti' };
  assert.equal(resolveTrackSection(movedTrack), 'bhakti');

  // Regression: Bollywood songs with substrings like "mata" (Matargashti) or "ram" (Param Sundari) remain 'hindi'
  const matargashti: Track = {
    ...mockTracks[0],
    id: 'hindi-matargashti',
    title: 'Matargashti Full AUDIO Song - Mohit Chauhan',
    artist: 'T-Series',
    genre: 'Hindi',
  };
  assert.equal(resolveTrackSection(matargashti), 'hindi');
});

test('getStrictArtistTracks returns only songs belonging to the selected singer', () => {
  const catalog: Track[] = [
    {
      ...mockTracks[0],
      id: 'honey-1',
      title: 'Blue Eyes',
      artist: 'Yo Yo Honey Singh',
      artistId: 'artist-honey',
      genre: 'Hindi',
    },
    {
      ...mockTracks[0],
      id: 'honey-2',
      title: 'Desi Kalakaar',
      artist: 'Yo Yo Honey Singh',
      artistId: 'artist-honey',
      genre: 'Hindi',
    },
    {
      ...mockTracks[0],
      id: 'arijit-1',
      title: 'Kesariya',
      artist: 'Arijit Singh',
      artistId: 'artist-arijit',
      genre: 'Hindi',
    },
  ];

  const honeySongs = getStrictArtistTracks(catalog, {
    id: 'artist-honey',
    name: 'Yo Yo Honey Singh',
    topTrackIds: ['honey-1', 'honey-2'],
  });
  assert.equal(honeySongs.length, 2);
  assert.ok(honeySongs.every((t) => t.artist.includes('Honey Singh')));
});

test('toggleLike toggles ids correctly in liked array', () => {
  const initial: string[] = ['1', '2'];
  const removed = toggleLike(initial, '1');
  assert.deepEqual(removed, ['2']);

  const added = toggleLike(removed, '3');
  assert.deepEqual(added, ['2', '3']);
});

test('clamp restricts number into range', () => {
  assert.equal(clamp(1.5, 0, 1), 1);
  assert.equal(clamp(-0.2, 0, 1), 0);
  assert.equal(clamp(0.7, 0, 1), 0.7);
});

test('shuffleArray returns array with same elements', () => {
  const original = [1, 2, 3, 4, 5];
  const shuffled = shuffleArray(original);
  assert.equal(shuffled.length, 5);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test('addTrackToPlaylistTracks adds unique track ids and ignores duplicates', () => {
  const list = ['track-1', 'track-2'];
  const added = addTrackToPlaylistTracks(list, 'track-3');
  assert.deepEqual(added, ['track-1', 'track-2', 'track-3']);

  const duplicate = addTrackToPlaylistTracks(added, 'track-2');
  assert.deepEqual(duplicate, ['track-1', 'track-2', 'track-3']);
});

test('removeTrackFromPlaylistTracks removes specified track id', () => {
  const list = ['track-1', 'track-2', 'track-3'];
  const removed = removeTrackFromPlaylistTracks(list, 'track-2');
  assert.deepEqual(removed, ['track-1', 'track-3']);

  const nonExistent = removeTrackFromPlaylistTracks(removed, 'track-99');
  assert.deepEqual(nonExistent, ['track-1', 'track-3']);
});

test('getStrictPlaylistTracks returns only tracks belonging to the specific playlist in order', () => {
  const result = getStrictPlaylistTracks(['3', '1'], mockTracks);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, '3');
  assert.equal(result[1].id, '1');

  assert.deepEqual(getStrictPlaylistTracks([], mockTracks), []);
});

test('getTopPlayedTodayTracks ranks songs by user plays today and caps at limit (10)', () => {
  const manyTracks: Track[] = Array.from({ length: 15 }, (_, i) => ({
    ...mockTracks[0],
    id: `t-${i + 1}`,
    title: `Song ${i + 1}`,
    playCount: (i + 1) * 1000,
  }));

  const dailyCounts = {
    't-2': 5,
    't-5': 12,
  };

  const top10 = getTopPlayedTodayTracks(manyTracks, dailyCounts, 10);
  assert.equal(top10.length, 10);
  assert.equal(top10[0].id, 't-5');
  assert.equal(top10[1].id, 't-2');
  assert.equal(top10[2].id, 't-15');
});

test('resolvePlaylistSection, resolvePlaylistArtist, getSectionPlaylists, and getArtistPlaylists place playlists in 1 specific section (1-4) and 1 specific singer (Section 5)', () => {
  const sampleArtists: Artist[] = [
    {
      id: 'artist-arijit-singh',
      name: 'Arijit Singh',
      role: 'Bollywood King',
      language: 'Hindi',
      imageUrl: 'https://example.com/arijit.jpg',
      monthlyListeners: '42M',
      bio: 'Arijit bio',
      topTrackIds: [],
      gradient: 'from-amber-500 to-rose-700',
    },
    {
      id: 'artist-yo-yo-honey-singh',
      name: 'Yo Yo Honey Singh',
      role: 'Desi Hip-Hop Icon',
      language: 'Hindi',
      imageUrl: 'https://example.com/honey.jpg',
      monthlyListeners: '28M',
      bio: 'Honey Singh bio',
      topTrackIds: [],
      gradient: 'from-amber-600 to-red-800',
    },
    {
      id: 'artist-pawan-singh',
      name: 'Pawan Singh',
      role: 'Bhojpuri Power Star',
      language: 'Bhojpuri',
      imageUrl: 'https://example.com/pawan.jpg',
      monthlyListeners: '19M',
      bio: 'Pawan bio',
      topTrackIds: [],
      gradient: 'from-orange-500 to-red-700',
    },
  ];

  const samplePlaylists: Playlist[] = [
    {
      id: 'pl-1',
      name: 'Yo Yo Honey Singh Party Hits',
      description: 'Non-stop Honey Singh songs',
      trackIds: [],
      coverGradient: 'from-amber-500 to-rose-700',
      section: 'hindi',
      artistId: 'artist-yo-yo-honey-singh',
      artistName: 'Yo Yo Honey Singh',
    },
    {
      id: 'pl-2',
      name: 'Bhojpuri Power Star Dhamaka',
      description: 'Pawan Singh Bhojpuri Hits',
      trackIds: [],
      coverGradient: 'from-orange-500 to-red-700',
      category: 'Bhojpuri',
    },
    {
      id: 'pl-3',
      name: 'Shree Hanuman Chalisa & Bhakti Bhajans',
      description: 'Devotional God songs',
      trackIds: [],
      coverGradient: 'from-yellow-500 to-orange-700',
      section: 'bhakti',
      artistId: 'artist-arijit-singh',
    },
  ];

  assert.equal(resolvePlaylistSection(samplePlaylists[0]), 'hindi');
  assert.equal(resolvePlaylistSection(samplePlaylists[1]), 'bhojpuri');
  assert.equal(resolvePlaylistSection(samplePlaylists[2]), 'bhakti');

  assert.equal(
    resolvePlaylistArtist(samplePlaylists[0], sampleArtists)?.id,
    'artist-yo-yo-honey-singh'
  );
  assert.equal(
    resolvePlaylistArtist(samplePlaylists[1], sampleArtists)?.id,
    'artist-pawan-singh'
  );

  const hindiPlaylists = getSectionPlaylists(samplePlaylists, 'hindi');
  assert.equal(hindiPlaylists.length, 1);
  assert.equal(hindiPlaylists[0].id, 'pl-1');

  const honeyPlaylists = getArtistPlaylists(
    samplePlaylists,
    sampleArtists[1],
    sampleArtists
  );
  assert.equal(honeyPlaylists.length, 1);
  assert.equal(honeyPlaylists[0].id, 'pl-1');

  const trackForHoney: Track = {
    ...mockTracks[0],
    id: 'track-honey-1',
    title: 'Desi Kalakaar',
    artist: 'Yo Yo Honey Singh',
    artistId: 'artist-yo-yo-honey-singh',
    section: 'hindi',
  };
  assert.equal(resolveTrackArtist(trackForHoney, sampleArtists)?.id, 'artist-yo-yo-honey-singh');
});

test('decodeHtmlEntities cleans all HTML entities and numeric codes', () => {
  assert.equal(decodeHtmlEntities("Big Girls Don&#39;t Cry"), "Big Girls Don't Cry");
  assert.equal(decodeHtmlEntities('DJ Chetas - Songs &amp; Remixes'), 'DJ Chetas - Songs & Remixes');
  assert.equal(decodeHtmlEntities('&quot;Shape of You&quot;'), '"Shape of You"');
  assert.equal(decodeHtmlEntities('Rock &#38; Roll'), 'Rock & Roll');
  assert.equal(decodeHtmlEntities('It&#039;s My Life'), "It's My Life");
  assert.equal(decodeHtmlEntities('Song &ndash; Remix'), 'Song – Remix');
  assert.equal(decodeHtmlEntities(''), '');
  assert.equal(decodeHtmlEntities(undefined), '');
  assert.equal(decodeHtmlEntities(null), '');
});

test('formatDynamicDuration formats seconds or provides placeholder for uninitialized duration', () => {
  assert.equal(formatDynamicDuration(240), '4:00');
  assert.equal(formatDynamicDuration(65), '1:05');
  assert.equal(formatDynamicDuration(0), '--:--');
  assert.equal(formatDynamicDuration(undefined), '--:--');
  assert.equal(formatDynamicDuration(null), '--:--');
});
