const DEFAULT_TTL_MS = 60_000;

interface Entry {
  value: boolean;
  checkedAt: number;
}

export class TtlFlagCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async read(
    key: string,
    now: number,
    load: () => Promise<boolean>,
  ): Promise<boolean> {
    const cached = this.entries.get(key);
    if (cached && now - cached.checkedAt < this.ttlMs) {
      return cached.value;
    }

    const value = await load();
    this.entries.set(key, { value, checkedAt: now });
    this.prune(now);
    return value;
  }

  forget(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now - entry.checkedAt >= this.ttlMs) {
        this.entries.delete(key);
      }
    }
  }
}
