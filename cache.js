// Performance Cache System
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttlMap = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
        this.maxSize = 1000;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    // Set cache with TTL
    set(key, value, ttl = this.defaultTTL) {
        // Remove oldest item if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.delete(oldestKey);
        }

        this.cache.set(key, value);
        this.ttlMap.set(key, Date.now() + ttl);
        this.stats.sets++;
    }

    // Get cache value
    get(key) {
        const ttl = this.ttlMap.get(key);
        
        // Check if expired
        if (ttl && Date.now() > ttl) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }

        const value = this.cache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            return value;
        }

        this.stats.misses++;
        return null;
    }

    // Delete cache entry
    delete(key) {
        const deleted = this.cache.delete(key);
        this.ttlMap.delete(key);
        if (deleted) {
            this.stats.deletes++;
        }
        return deleted;
    }

    // Clear all cache
    clear() {
        this.cache.clear();
        this.ttlMap.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    // Check if key exists and not expired
    has(key) {
        const ttl = this.ttlMap.get(key);
        if (ttl && Date.now() > ttl) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    // Get cache statistics
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
            size: this.cache.size
        };
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, ttl] of this.ttlMap.entries()) {
            if (now > ttl) {
                this.delete(key);
            }
        }
    }

    // Start automatic cleanup
    startCleanup(interval = 60000) {
        setInterval(() => this.cleanup(), interval);
    }
}

// Memory cache instance
const memoryCache = new CacheManager();

// Redis cache (if available)
class RedisCache {
    constructor(redisClient) {
        this.redis = redisClient;
        this.defaultTTL = 300; // 5 minutes
    }

    async set(key, value, ttl = this.defaultTTL) {
        try {
            const serialized = JSON.stringify(value);
            await this.redis.setex(key, ttl, serialized);
            return true;
        } catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }

    async get(key) {
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async delete(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    async clear() {
        try {
            await this.redis.flushdb();
            return true;
        } catch (error) {
            console.error('Redis clear error:', error);
            return false;
        }
    }

    async exists(key) {
        try {
            const exists = await this.redis.exists(key);
            return exists === 1;
        } catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }
}

// Unified cache interface
class UnifiedCache {
    constructor(redisClient = null) {
        this.memoryCache = memoryCache;
        this.redisCache = redisClient ? new RedisCache(redisClient) : null;
        this.useRedis = !!redisClient;
    }

    async set(key, value, ttl) {
        if (this.useRedis) {
            const success = await this.redisCache.set(key, value, ttl);
            if (success) return true;
        }
        
        // Fallback to memory cache
        this.memoryCache.set(key, value, ttl * 1000);
        return true;
    }

    async get(key) {
        if (this.useRedis) {
            const value = await this.redisCache.get(key);
            if (value !== null) return value;
        }
        
        // Fallback to memory cache
        return this.memoryCache.get(key);
    }

    async delete(key) {
        let deleted = false;
        
        if (this.useRedis) {
            deleted = await this.redisCache.delete(key);
        }
        
        // Always delete from memory cache too
        const memoryDeleted = this.memoryCache.delete(key);
        
        return deleted || memoryDeleted;
    }

    async clear() {
        if (this.useRedis) {
            await this.redisCache.clear();
        }
        
        this.memoryCache.clear();
    }

    async exists(key) {
        if (this.useRedis) {
            const exists = await this.redisCache.exists(key);
            if (exists) return true;
        }
        
        return this.memoryCache.has(key);
    }

    getStats() {
        return this.memoryCache.getStats();
    }
}

// Cache middleware for Express
function cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
        
        try {
            // Try to get from cache
            const cached = await cache.get(cacheKey);
            
            if (cached) {
                res.set('X-Cache', 'HIT');
                return res.json(cached);
            }
            
            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = function(data) {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    cache.set(cacheKey, data, ttl);
                }
                res.set('X-Cache', 'MISS');
                return originalJson.call(this, data);
            };
            
            next();
            
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
}

// Cache invalidation middleware
function invalidateCache(pattern) {
    return async (req, res, next) => {
        // Continue with the request
        next();
        
        // Invalidate cache after request completes
        res.on('finish', async () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Clear cache entries matching pattern
                    const cacheKey = pattern.replace(':id', req.params.id || '');
                    await cache.delete(cacheKey);
                }
            } catch (error) {
                console.error('Cache invalidation error:', error);
            }
        });
    };
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            responseTime: [],
            errors: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.startTime = Date.now();
    }

    recordRequest(responseTime, isError = false) {
        this.metrics.requests++;
        this.metrics.responseTime.push(responseTime);
        
        if (isError) {
            this.metrics.errors++;
        }
        
        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    getMetrics() {
        const responseTimes = this.metrics.responseTime;
        const avgResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
            : 0;
        
        const uptime = Date.now() - this.startTime;
        const requestsPerSecond = this.metrics.requests / (uptime / 1000);
        
        return {
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            errorRate: this.metrics.requests > 0 
                ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' 
                : '0%',
            avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
            requestsPerSecond: requestsPerSecond.toFixed(2),
            uptime: uptime,
            cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
                ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

// Performance monitoring middleware
function performanceMiddleware() {
    return (req, res, next) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            performanceMonitor.recordRequest(responseTime, res.statusCode >= 400);
        });
        
        next();
    };
}

// Asset optimization
class AssetOptimizer {
    constructor() {
        this.compressionEnabled = true;
        this.etagEnabled = true;
        this.maxAge = 86400000; // 24 hours
    }

    // Compress response if possible
    compress(req, res, next) {
        if (!this.compressionEnabled) {
            return next();
        }

        const acceptEncoding = req.headers['accept-encoding'] || '';
        const contentType = res.getHeader('Content-Type') || '';

        // Only compress text-based content
        if (!contentType.includes('text/') && !contentType.includes('application/json')) {
            return next();
        }

        if (acceptEncoding.includes('gzip')) {
            res.setHeader('Content-Encoding', 'gzip');
        } else if (acceptEncoding.includes('deflate')) {
            res.setHeader('Content-Encoding', 'deflate');
        }

        next();
    }

    // Set cache headers for static assets
    setCacheHeaders(req, res, next) {
        const url = req.url;
        
        // Different cache durations for different file types
        let maxAge = this.maxAge;
        
        if (url.includes('.js') || url.includes('.css')) {
            maxAge = 86400000; // 1 day
        } else if (url.includes('.png') || url.includes('.jpg') || url.includes('.gif')) {
            maxAge = 2592000000; // 30 days
        } else if (url.includes('.html')) {
            maxAge = 3600000; // 1 hour
        }

        res.setHeader('Cache-Control', `public, max-age=${maxAge / 1000}`);
        
        if (this.etagEnabled) {
            // Generate simple ETag
            const etag = `"${Date.now()}-${url.length}"`;
            res.setHeader('ETag', etag);
            
            // Check If-None-Match
            if (req.headers['if-none-match'] === etag) {
                return res.status(304).end();
            }
        }

        next();
    }
}

// Initialize instances
const assetOptimizer = new AssetOptimizer();
const performanceMonitor = new PerformanceMonitor();

// Try to initialize Redis if available
let redisClient = null;
try {
    const redis = require('redis');
    redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
} catch (error) {
    console.log('Redis not available, using memory cache only');
}

// Create unified cache instance
const cache = new UnifiedCache(redisClient);

// Start automatic cleanup
memoryCache.startCleanup();

// Export modules
module.exports = {
    CacheManager,
    UnifiedCache,
    cacheMiddleware,
    invalidateCache,
    performanceMiddleware,
    PerformanceMonitor,
    AssetOptimizer,
    assetOptimizer,
    performanceMonitor,
    cache,
    memoryCache
};
