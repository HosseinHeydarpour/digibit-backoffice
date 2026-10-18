// src/app/shared/models/session.model.ts
import type { EntityId } from './id.model';

/**
 * The signed-in user, reduced to what the panel actually renders.
 *
 * `Session` rather than `User` on purpose: the backend's user record carries far
 * more (password hash, two-factor state, audit columns) and copying that surface
 * into a shared model would make every field a thing the UI has to not-leak.
 * This is what the topbar dropdown, the profile page (BO-F*) and the permission
 * store (BO-C08) need, and nothing else.
 */
export interface SessionUser {
  readonly id: EntityId;

  /** Display name, already localised by the server (e.g. «مدیر سیستم»). */
  readonly fullName: string;

  /** Shown in the profile menu when the avatar is an image; may be null. */
  readonly email: string | null;

  /**
   * Remote avatar image. `null` when the user has none, which is the common
   * case — the UI then falls back to initials instead of rendering a broken
   * image (tc 9).
   */
  readonly avatarUrl: string | null;
}

/**
 * Avatar initials for a `SessionUser` — the fallback glyph when there is no
 * `avatarUrl`.
 *
 * Persian names are commonly two words («مدیر سیستم»), so the first letter of
 * each of the first two words is what fits a 32px circle. A single-word name
 * yields one letter rather than a doubled one.
 *
 * Pure and exported so the topbar, a future profile page and the spec all share
 * one definition of what an initial is.
 */
export function toInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}
