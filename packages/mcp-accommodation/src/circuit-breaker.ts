type CircuitState = 'closed' | 'open' | 'half-open';
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  constructor(failureThreshold = 3, resetTimeoutMs = 30_000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) { this.state = 'half-open'; }
      else { throw new Error('Circuit breaker OPEN — upstream service unavailable'); }
    }
    try { const r = await fn(); this.onSuccess(); return r; }
    catch (err) { this.onFailure(); throw err; }
  }
  private onSuccess(): void { this.failureCount = 0; this.state = 'closed'; }
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) { this.state = 'open'; }
  }
}
