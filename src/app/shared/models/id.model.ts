/**
 * Entity identifiers are strings on the wire (ObjectId/UUID), never numbers.
 * Aliasing it documents that intent and makes the eventual backend contract
 * obvious at every call site.
 */
export type EntityId = string;

/** Every persisted record in phase 1 carries these. Dates are UTC millis. */
export interface BaseEntity {
  id: EntityId;
  createdAt: number;
  updatedAt?: number;
}
