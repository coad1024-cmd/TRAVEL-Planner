import type { AgentMessage, Money } from './types.js';
export declare function createCorrelationId(): string;
export declare function createAgentMessage(from: string, to: string, type: AgentMessage['type'], payload: unknown, options?: Partial<Pick<AgentMessage, 'confidence' | 'requires_human_confirmation' | 'errors'>>): AgentMessage;
export declare function addMoney(a: Money, b: Money): Money;
export declare function zeroCurrency(currency: string): Money;
export declare function formatMoney(money: Money): string;
/** Parse "lat,lng" string into {lat, lng} */
export declare function parseLatLng(str: string): {
    lat: number;
    lng: number;
};
/** ISO date (YYYY-MM-DD) → Date object (UTC midnight) */
export declare function parseISODate(dateStr: string): Date;
/** Days between two ISO dates */
export declare function daysBetween(start: string, end: string): number;
/** Sleep for ms milliseconds */
export declare function sleep(ms: number): Promise<void>;
/** Exponential backoff retry */
export declare function withRetry<T>(fn: () => Promise<T>, maxAttempts?: number, baseDelayMs?: number): Promise<T>;
//# sourceMappingURL=utils.d.ts.map