/**
 * Token bucket rate limiter.
 * Fills at `ratePerSecond` tokens/sec up to `capacity`.
 * Each request consumes 1 token; if empty, wait until refilled.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly ratePerSecond: number;

  constructor(ratePerSecond: number, capacity?: number) {
    this.ratePerSecond = ratePerSecond;
    this.capacity = capacity ?? ratePerSecond;
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerSecond);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait for next token
    const waitMs = ((1 - this.tokens) / this.ratePerSecond) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitMs));
    this.tokens -= 1;
  }
}
