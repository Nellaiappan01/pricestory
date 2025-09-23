// src/lib/sitemapCache.js

// Simple in-memory cache for sitemap pages. Fine for single-instance dev or small deployments.
// Replace with Redis / CDN purge in production for multi-instance setups.

const CACHE = new Map();
const DEFAULT_TTL_MS = 1000 * 60; // 1 minute

export function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearAll() {
  CACHE.clear();
}
