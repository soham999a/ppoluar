const cache = new Map<string, { data: unknown; timestamp: number }>()
const TTL = 30000

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < TTL) return entry.data as T
  return null
}

export function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache(key?: string) {
  if (key) cache.delete(key); else cache.clear()
}
