class CacheService {
  constructor(defaultTTL = 300000) {
    // 5 minutes default TTL
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = null) {
    const timeToLive = ttl || this.defaultTTL;

    // Clear existing timer if key already exists
    this.clear(key);

    // Set the value
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl: timeToLive,
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, timeToLive);

    this.timers.set(key, timer);

    return true;
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.createdAt > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    // Clear timer
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    // Remove from cache
    return this.cache.delete(key);
  }

  clear(key = null) {
    if (key) {
      this.delete(key);
    } else {
      // Clear all
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
      this.cache.clear();
    }
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      age: now - item.createdAt,
      ttl: item.ttl,
      timeLeft: item.ttl - (now - item.createdAt),
    }));

    return {
      size: this.cache.size,
      items,
    };
  }
}

// Export singleton instance
module.exports = new CacheService(process.env.CACHE_TTL || 300000);
