import type { User, Playlist } from '../types/music.ts';

/**
 * Validates email format.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

/**
 * Registers a new user into the users array.
 */
export function registerUser(
  users: User[],
  newUser: { name: string; email: string; password?: string }
): { success: boolean; user?: User; error?: string } {
  const cleanEmail = newUser.email.trim().toLowerCase();
  const cleanName = newUser.name.trim();

  if (!cleanName) {
    return { success: false, error: 'Full name is required.' };
  }

  if (!validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (newUser.password && newUser.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const user: User = {
    id: `user-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: newUser.password || 'password123',
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
  };

  return { success: true, user };
}

/**
 * Authenticates user credentials against users list.
 */
export function authenticateUser(
  users: User[],
  email: string,
  password?: string
): { success: boolean; user?: User; error?: string } {
  const cleanEmail = email.trim().toLowerCase();

  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return { success: false, error: 'No account found with this email.' };
  }

  if (password && user.password && user.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  return { success: true, user };
}

/**
 * Retrieves liked songs for a specific user.
 */
export function getUserLikedSongs(
  store: Record<string, string[]>,
  userId: string,
  fallback: string[] = ['track-1', 'track-3']
): string[] {
  if (store && store[userId]) {
    return store[userId];
  }
  return fallback;
}

/**
 * Immutably updates liked songs for a user in the store.
 */
export function saveUserLikedSongs(
  store: Record<string, string[]>,
  userId: string,
  likedIds: string[]
): Record<string, string[]> {
  return {
    ...store,
    [userId]: likedIds,
  };
}

/**
 * Retrieves playlists for a specific user.
 */
export function getUserPlaylists(
  store: Record<string, Playlist[]>,
  userId: string,
  fallback: Playlist[] = []
): Playlist[] {
  if (store && store[userId]) {
    return store[userId];
  }
  return fallback;
}

/**
 * Immutably updates playlists for a user in the store.
 */
export function saveUserPlaylists(
  store: Record<string, Playlist[]>,
  userId: string,
  playlists: Playlist[]
): Record<string, Playlist[]> {
  return {
    ...store,
    [userId]: playlists,
  };
}
