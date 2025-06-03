import QuickLRU from 'quick-lru'

/**
 * Time Aware Least Recent Used Cache
 *
 * @see https://arxiv.org/pdf/1801.00390
 */
export class TLRU<T> {
  private readonly lru: QuickLRU<string, T>

  constructor (maxSize: number) {
    this.lru = new QuickLRU({ maxSize })
  }

  get (key: string): T | undefined {
    return this.lru.get(key)
  }

  set (key: string, value: T, ttlMs: number): void {
    this.lru.set(key, value, {
      maxAge: Date.now() + ttlMs
    })
  }

  has (key: string): boolean {
    const value = this.get(key)

    if (value != null) {
      return true
    }

    return false
  }

  remove (key: string): void {
    this.lru.delete(key)
  }

  clear (): void {
    this.lru.clear()
  }
}
