import { kv } from '@vercel/kv';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

// Global in-memory cache as a second layer/fallback
const memoryCache = new Map<string, CacheEntry<any>>();
const IN_MEMORY_TTL = 60 * 1000; // 60 seconds

// Request deduplication to prevent "Thundering Herd"
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Checks if Vercel KV environment variables are configured.
 */
export function isKVConfigured(): boolean {
    return Boolean(
        process.env.KV_REST_API_URL &&
        process.env.KV_REST_API_TOKEN
    );
}

/**
 * Purges a specific key from both KV and memory cache.
 */
export async function purgeCache(key: string): Promise<void> {
    const fullKey = `cache:${key}`;
    memoryCache.delete(key);
    if (isKVConfigured()) {
        await kv.del(fullKey).catch(e => console.warn(`[KV] Purge failed for ${key}: ${e.message}`));
    }
}

/**
 * Purges all keys matching a prefix pattern.
 * Note: Memory cache is cleared by prefix, KV is cleared using the keys pattern.
 */
export async function purgePattern(pattern: string): Promise<void> {
    // Clear Memory Cache
    for (const key of memoryCache.keys()) {
        if (key.startsWith(pattern)) {
            memoryCache.delete(key);
        }
    }

    // Clear KV Cache
    if (isKVConfigured()) {
        try {
            const keys = await kv.keys(`cache:${pattern}*`);
            if (keys.length > 0) {
                await kv.del(...keys);
            }
        } catch (e: any) {
            console.warn(`[KV] Purge pattern failed for ${pattern}: ${e.message}`);
        }
    }
}

/**
 * Fetches data with a Stale-While-Revalidate (SWR) pattern.
 * Multi-layer: Check Memory -> Check KV -> Fetch Source.
 * 
 * @param key Unique key for the cache entry.
 * @param fetcher Async function to fetch fresh data.
 * @param ttl Seconds before the cache is completely expired.
 * @param staleThreshold Seconds before expiry where data is considered "stale".
 */
export async function getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 30,
    staleThreshold: number = 10
): Promise<T> {
    const fullKey = `cache:${key}`;
    const now = Date.now();

    // 1. Layer 1: Memory Cache (Zero Latency Fallback)
    const memCached = memoryCache.get(key);
    if (memCached && memCached.expiresAt > now + 2000) {
        console.log(`[Cache] Memory HIT for ${key}`);
        return memCached.data;
    }

    // Deduplicate concurrent requests for the same key
    if (pendingRequests.has(key)) {
        console.log(`[Cache] DEDUP for ${key}. Waiting for pending request...`);
        return pendingRequests.get(key);
    }

    const fetchPromise = (async () => {
        try {
            // 2. Layer 2: Vercel KV
            if (isKVConfigured()) {
                const cached = await kv.get<CacheEntry<T>>(fullKey).catch(e => {
                    console.warn(`[KV] GET error for ${key}: ${e.message}`);
                    return null;
                });

                if (cached) {
                    const remainingSec = (cached.expiresAt - now) / 1000;

                    // Background revalidation if stale
                    if (remainingSec < staleThreshold) {
                        console.log(`[KV] STALE hit for ${key}. Revalidating...`);

                        fetcher().then(async (newData) => {
                            const entry = { data: newData, expiresAt: Date.now() + ttl * 1000 };
                            await kv.set(fullKey, entry, { ex: ttl }).catch(e => console.warn(`[KV] Background SET failed: ${e.message}`));
                            memoryCache.set(key, { data: newData, expiresAt: Date.now() + IN_MEMORY_TTL });
                        }).catch(err => {
                            console.warn(`[KV] Background FETCH failed: ${err.message}`);
                        });
                    } else {
                        console.log(`[KV] FRESH hit for ${key}`);
                    }

                    // Update memory cache for even faster subsequent hits
                    memoryCache.set(key, { data: cached.data, expiresAt: Date.now() + IN_MEMORY_TTL });
                    return cached.data;
                }
            }

            // 3. Layer 3: Fetch from Source (Google Sheets)
            console.log(`[Cache] MISS for ${key}. Fetching fresh...`);
            const freshData = await fetcher();

            const newEntry = { data: freshData, expiresAt: Date.now() + ttl * 1000 };

            // Save to KV if possible
            if (isKVConfigured()) {
                await kv.set(fullKey, newEntry, { ex: ttl }).catch(e => console.warn(`[KV] SET failed: ${e.message}`));
            }

            // Always save to memory
            memoryCache.set(key, { data: freshData, expiresAt: Date.now() + IN_MEMORY_TTL });

            return freshData;

        } catch (error: any) {
            // 4. Emergency Fallback: If EVERYTHING fails but we have stale memory data, use it
            if (memCached) {
                console.warn(`[Cache] Error fetching ${key}: ${error.message}. Returning STALE memory data.`);
                return memCached.data;
            }

            console.error(`[Cache] FATAL for ${key}: ${error.message}`);
            throw error;
        } finally {
            pendingRequests.delete(key);
        }
    })();

    pendingRequests.set(key, fetchPromise);
    return fetchPromise;
}
