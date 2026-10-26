import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateCatalogStorageUsage,
  parseBulkYouTubeLines,
  validateCatalogBackup,
} from './storageUtils.ts';

test('estimateCatalogStorageUsage computes metadata vs MP3 storage accurately', () => {
  const est = estimateCatalogStorageUsage(100, 10, 0);
  assert.equal(est.metadataBytes, 100 * 650 + 10 * 450);
  assert.equal(est.mp3Bytes, 0);
  assert.ok(est.maxYoutubeSongsIn500MB > 700000);
  assert.ok(est.maxMp3FilesIn1GB >= 240 && est.maxMp3FilesIn1GB <= 250);
});

test('parseBulkYouTubeLines parses single URLs, titled URLs, and playlists', () => {
  const input = [
    'JFcgOboQZ08',
    'Kesariya | Arijit Singh | https://www.youtube.com/watch?v=BddP6PYo2gs',
    'Arijit Jukebox | PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK',
  ].join('\n');

  const parsed = parseBulkYouTubeLines(input);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].type, 'video');
  assert.equal(parsed[0].videoId, 'JFcgOboQZ08');

  assert.equal(parsed[1].type, 'video');
  assert.equal(parsed[1].customTitle, 'Kesariya');
  assert.equal(parsed[1].customArtist, 'Arijit Singh');
  assert.equal(parsed[1].videoId, 'BddP6PYo2gs');

  assert.equal(parsed[2].type, 'playlist');
  assert.equal(parsed[2].customTitle, 'Arijit Jukebox');
  assert.equal(parsed[2].playlistId, 'PL9bw4S5ePsEEqCMJSiYZ-KTtEjzVy0YvK');
});

test('validateCatalogBackup validates tracks and playlists arrays', () => {
  const bad = validateCatalogBackup({ foo: 'bar' });
  assert.equal(bad.valid, false);

  const good = validateCatalogBackup({
    tracks: [{ id: 't1', title: 'Song 1', artist: 'Arijit' }],
    playlists: [{ id: 'p1', name: 'Playlist 1', trackIds: ['t1'] }],
  });
  assert.equal(good.valid, true);
  assert.equal(good.tracks.length, 1);
  assert.equal(good.playlists.length, 1);
});

test('SUPABASE_SQL_SETUP_SCRIPT defines site_catalog table and RLS policies', async () => {
  const { SUPABASE_SQL_SETUP_SCRIPT, isSqlScriptInput } = await import('./storageUtils.ts');
  assert.ok(SUPABASE_SQL_SETUP_SCRIPT.includes('create table if not exists public.site_catalog'));
  assert.ok(SUPABASE_SQL_SETUP_SCRIPT.includes('tracks jsonb not null'));
  assert.ok(SUPABASE_SQL_SETUP_SCRIPT.includes('playlists jsonb not null'));
  assert.equal(isSqlScriptInput(SUPABASE_SQL_SETUP_SCRIPT), true);
  assert.equal(isSqlScriptInput('https://www.youtube.com/watch?v=BddP6PYo2gs'), false);
});

test('parseBulkYouTubeLines handles embedded URLs without pipes and plain song titles', () => {
  const input = [
    '1. Kesariya https://youtu.be/BddP6PYo2gs',
    'Tum Hi Ho - Arijit Singh',
  ].join('\n');

  const parsed = parseBulkYouTubeLines(input);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].type, 'video');
  assert.equal(parsed[0].videoId, 'BddP6PYo2gs');
  assert.equal(parsed[0].customTitle, 'Kesariya');

  assert.equal(parsed[1].type, 'video');
  assert.equal(parsed[1].customTitle, 'Tum Hi Ho');
  assert.equal(parsed[1].customArtist, 'Arijit Singh');
  assert.equal(parsed[1].videoId, 'Umqb9KENgmk');
});


