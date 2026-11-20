import { environment } from '@env/environment';

const ACCESS_KEY = environment.TOKEN_STORAGE_KEY;
const REFRESH_KEY = `${environment.TOKEN_STORAGE_KEY}.refresh`;

/**
 * Tokens live in `localStorage`, next to the key the environment already
 * declared. Reading is defensive: a blocked storage (private mode, a policy)
 * throws on access, and an exception here would break boot before the user can
 * even see the login page.
 */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // A storage that refuses to persist only means this session is in memory.
  }
}

export function readAccessToken(): string | null {
  return read(ACCESS_KEY);
}

export function readRefreshToken(): string | null {
  return read(REFRESH_KEY);
}

export function writeTokens(accessToken: string, refreshToken: string): void {
  write(ACCESS_KEY, accessToken);
  write(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
}
