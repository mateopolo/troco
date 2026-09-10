export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  create_listing: { max: 5, windowSeconds: 3600 },
  send_message: { max: 30, windowSeconds: 60 },
  initiate_payment: { max: 5, windowSeconds: 60 },
  api_call: { max: 60, windowSeconds: 60 },
};

export function getWindowStart(nowMs: number, windowSeconds: number): number {
  const windowMs = windowSeconds * 1000;
  return Math.floor(nowMs / windowMs) * windowMs;
}
