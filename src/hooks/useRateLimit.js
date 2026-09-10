import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase';

// In-memory cache for recent checks (avoids spamming the callable)
const rateLimitCache = new Map();

export function useRateLimit() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const timerRef = useRef(null);

  const checkLimit = useCallback(async (action) => {
    const user = auth.currentUser;
    if (!user) return { allowed: true };

    const cacheKey = `${user.uid}_${action}`;
    const cached = rateLimitCache.get(cacheKey);
    const now = Date.now();

    if (cached && now < cached.blockedUntil) {
      const remainingSec = Math.ceil((cached.blockedUntil - now) / 1000);
      setIsRateLimited(true);
      setRetryAfterSeconds(remainingSec);
      return { allowed: false, retryAfterSeconds: remainingSec };
    }

    try {
      const fn = httpsCallable(functions, 'checkRateLimit');
      const res = await fn({ action });
      const data = res.data;

      if (!data.allowed) {
        const sec = data.retryAfterSeconds || 60;
        rateLimitCache.set(cacheKey, { blockedUntil: now + sec * 1000 });
        setIsRateLimited(true);
        setRetryAfterSeconds(sec);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsRateLimited(false);
          setRetryAfterSeconds(0);
        }, sec * 1000);

        return { allowed: false, retryAfterSeconds: sec };
      }

      setIsRateLimited(false);
      setRetryAfterSeconds(0);
      return { allowed: true };
    } catch (err) {
      console.warn('[useRateLimit] checkRateLimit error, allowing action as fallback:', err);
      return { allowed: true };
    }
  }, []);

  const resetRateLimit = useCallback(() => {
    setIsRateLimited(false);
    setRetryAfterSeconds(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {
    isRateLimited,
    retryAfterSeconds,
    checkLimit,
    resetRateLimit,
  };
}
