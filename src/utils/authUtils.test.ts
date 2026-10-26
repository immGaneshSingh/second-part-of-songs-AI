import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  registerUser,
  authenticateUser,
  getUserLikedSongs,
  saveUserLikedSongs,
  getUserPlaylists,
  saveUserPlaylists,
} from './authUtils.ts';
import type { User, Playlist } from '../types/music.ts';

const existingUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice Wonder',
    email: 'alice@example.com',
    password: 'securepassword',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

test('validateEmail validates correctly', () => {
  assert.equal(validateEmail('test@example.com'), true);
  assert.equal(validateEmail('user.name+tag@domain.co.uk'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail(''), false);
  assert.equal(validateEmail('@domain.com'), false);
  assert.equal(validateEmail('user@'), false);
});

test('registerUser registers a valid user', () => {
  const result = registerUser(existingUsers, {
    name: 'Bob Ross',
    email: 'bob@example.com',
    password: 'happytrees123',
  });

  assert.equal(result.success, true);
  assert.ok(result.user);
  assert.equal(result.user?.name, 'Bob Ross');
  assert.equal(result.user?.email, 'bob@example.com');
  assert.ok(result.user?.id.startsWith('user-'));
});

test('registerUser rejects duplicate email', () => {
  const result = registerUser(existingUsers, {
    name: 'Alice Imposter',
    email: 'ALICE@example.com',
    password: 'password123',
  });

  assert.equal(result.success, false);
  assert.match(result.error || '', /already exists/i);
});

test('registerUser enforces validation checks', () => {
  const emptyName = registerUser(existingUsers, {
    name: '   ',
    email: 'new@example.com',
    password: 'password123',
  });
  assert.equal(emptyName.success, false);

  const shortPassword = registerUser(existingUsers, {
    name: 'Shorty',
    email: 'short@example.com',
    password: '123',
  });
  assert.equal(shortPassword.success, false);
  assert.match(shortPassword.error || '', /at least 6 characters/i);
});

test('authenticateUser verifies credentials', () => {
  // Successful auth
  const success = authenticateUser(existingUsers, 'alice@example.com', 'securepassword');
  assert.equal(success.success, true);
  assert.equal(success.user?.id, 'user-1');

  // Wrong password
  const badPass = authenticateUser(existingUsers, 'alice@example.com', 'wrongpassword');
  assert.equal(badPass.success, false);
  assert.match(badPass.error || '', /incorrect password/i);

  // Unknown email
  const notFound = authenticateUser(existingUsers, 'nobody@example.com', 'password123');
  assert.equal(notFound.success, false);
  assert.match(notFound.error || '', /no account found/i);
});

test('per-user liked songs store persists independently across users', () => {
  let store: Record<string, string[]> = {};

  // User 1 likes track-1, track-2
  store = saveUserLikedSongs(store, 'user-1', ['track-1', 'track-2']);
  // User 2 likes track-3
  store = saveUserLikedSongs(store, 'user-2', ['track-3']);

  assert.deepEqual(getUserLikedSongs(store, 'user-1'), ['track-1', 'track-2']);
  assert.deepEqual(getUserLikedSongs(store, 'user-2'), ['track-3']);

  // Logout/switch back to User 1
  assert.deepEqual(getUserLikedSongs(store, 'user-1'), ['track-1', 'track-2']);
});

test('per-user playlist store persists independently across users', () => {
  let store: Record<string, Playlist[]> = {};

  const pl1: Playlist = {
    id: 'pl-1',
    name: 'Alice Mix',
    description: 'Favorites',
    trackIds: ['track-1'],
    coverGradient: 'from-emerald-500 to-teal-700',
    isCustom: true,
  };

  store = saveUserPlaylists(store, 'user-1', [pl1]);
  assert.equal(getUserPlaylists(store, 'user-1').length, 1);
  assert.equal(getUserPlaylists(store, 'user-2').length, 0);
});
