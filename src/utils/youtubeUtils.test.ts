import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseYouTubeInput,
  getYouTubeThumbnail,
  getNoembedUrl,
  shouldSkipOnYouTubeError,
  isCustomDirectAudioUrl,
  getFallbackAudioUrl,
  DEFAULT_YOUTUBE_QUEUE,
} from './youtubeUtils.ts';

test('parseYouTubeInput parses raw 11-character video IDs', () => {
  const res = parseYouTubeInput('JFcgOboQZ08');
  assert.deepEqual(res, { type: 'video', videoId: 'JFcgOboQZ08' });
});

test('parseYouTubeInput parses standard YouTube watch URLs and short youtu.be URLs', () => {
  const res1 = parseYouTubeInput('https://www.youtube.com/watch?v=Umqb9KENgmk');
  assert.deepEqual(res1, { type: 'video', videoId: 'Umqb9KENgmk' });

  const res2 = parseYouTubeInput('https://youtu.be/RLzC55ai0eo?si=12345');
  assert.deepEqual(res2, { type: 'video', videoId: 'RLzC55ai0eo' });

  const res3 = parseYouTubeInput('https://www.youtube.com/shorts/VuG7ge_8I2Y');
  assert.deepEqual(res3, { type: 'video', videoId: 'VuG7ge_8I2Y' });
});

test('parseYouTubeInput parses raw Playlist IDs starting with PL and playlist URLs', () => {
  const res1 = parseYouTubeInput('PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
  assert.deepEqual(res1, {
    type: 'playlist',
    playlistId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
  });

  const res2 = parseYouTubeInput(
    'https://www.youtube.com/playlist?list=PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK'
  );
  assert.deepEqual(res2, {
    type: 'playlist',
    playlistId: 'PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK',
    videoId: undefined,
  });

  const res3 = parseYouTubeInput(
    'https://www.youtube.com/watch?v=JFcgOboQZ08&list=PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK'
  );
  assert.deepEqual(res3, {
    type: 'playlist',
    playlistId: 'PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK',
    videoId: 'JFcgOboQZ08',
  });
  const res4 = parseYouTubeInput(
    'Check out this playlist: https://youtube.com/playlist?list=PLu3kj2ETwgOT7exmIG1sguodDLvX6PcGG&si=abc123'
  );
  assert.deepEqual(res4, {
    type: 'playlist',
    playlistId: 'PLu3kj2ETwgOT7exmIG1sguodDLvX6PcGG',
    videoId: undefined,
  });

  const res5 = parseYouTubeInput(
    'https://www.youtube.com/watch?v=dnKiwOY7mCo&list=RDMM'
  );
  assert.deepEqual(res5, {
    type: 'playlist',
    playlistId: 'RDdnKiwOY7mCo',
    videoId: 'dnKiwOY7mCo',
  });
});

test('parseYouTubeInput rejects empty or invalid inputs cleanly', () => {
  const emptyRes = parseYouTubeInput('   ');
  assert.equal(emptyRes.type, 'invalid');

  const badRes = parseYouTubeInput('not-a-valid-id!!');
  assert.equal(badRes.type, 'invalid');
});

test('getYouTubeThumbnail and getNoembedUrl build expected endpoints', () => {
  assert.equal(
    getYouTubeThumbnail('JFcgOboQZ08'),
    'https://img.youtube.com/vi/JFcgOboQZ08/mqdefault.jpg'
  );
  assert.equal(
    getNoembedUrl('JFcgOboQZ08'),
    'https://noembed.com/embed?url=https://www.youtube.com/watch?v=JFcgOboQZ08'
  );
});

test('shouldSkipOnYouTubeError returns true for restricted/removed error codes (100, 101, 150)', () => {
  assert.equal(shouldSkipOnYouTubeError(100), true);
  assert.equal(shouldSkipOnYouTubeError(101), true);
  assert.equal(shouldSkipOnYouTubeError(150), true);
  assert.equal(shouldSkipOnYouTubeError(2), true);
  assert.equal(shouldSkipOnYouTubeError(5), true);
  assert.equal(shouldSkipOnYouTubeError(0), false);
});

test('DEFAULT_YOUTUBE_QUEUE is pre-populated with valid 11-character video IDs', () => {
  assert.ok(DEFAULT_YOUTUBE_QUEUE.length >= 5);
  for (const item of DEFAULT_YOUTUBE_QUEUE) {
    assert.equal(item.videoId.length, 11);
    assert.ok(item.thumbnail.includes(item.videoId));
  }
});

test('isCustomDirectAudioUrl rejects noisy SoundHelix and CodeSkulptor placeholder URLs', () => {
  assert.equal(isCustomDirectAudioUrl(''), false);
  assert.equal(isCustomDirectAudioUrl(undefined), false);
  assert.equal(
    isCustomDirectAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
    false
  );
  assert.equal(
    isCustomDirectAudioUrl(
      'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3'
    ),
    false
  );
  assert.equal(isCustomDirectAudioUrl('https://cdn.example.com/music/custom-song.mp3'), true);
  assert.equal(getFallbackAudioUrl('eLjmQ0aGC1U'), '');
});

