import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/v2/https';

export interface CurrencyFromIPResponse {
  currency: string;
  countryCode?: string;
  countryName?: string;
  currencySymbol?: string;
  city?: string;
  ip?: string;
  isGeoLocked?: boolean;
  cached?: boolean;
}

export async function handleGetCurrencyFromIP(
  request: CallableRequest<any>,
  db: Firestore
): Promise<CurrencyFromIPResponse> {
  const fallbackResponse: CurrencyFromIPResponse = {
    currency: 'EUR',
    countryCode: 'FR',
    countryName: 'France',
    currencySymbol: '€',
    isGeoLocked: true,
  };

  try {
    // 1. Lire l'IP depuis request.rawRequest.headers['x-forwarded-for']
    let clientIp = '';
    const forwarded = request.rawRequest?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      clientIp = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded[0]) {
      clientIp = forwarded[0].split(',')[0].trim();
    } else if (request.rawRequest?.ip) {
      clientIp = request.rawRequest.ip;
    }

    // Détection des adresses locales / privées
    const isLocalOrPrivate = !clientIp ||
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === '::ffff:127.0.0.1' ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('172.16.');

    const sanitizedIp = clientIp ? clientIp.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const cacheDocRef = db.doc(`cache/geo_currency_${sanitizedIp}`);

    // 2. Vérifier le cache Firestore 24h (cache/geo_currency_{ip})
    try {
      const cacheSnap = await cacheDocRef.get();
      if (cacheSnap.exists) {
        const cached = cacheSnap.data();
        const cachedAt = cached?.cachedAt?.toMillis ? cached.cachedAt.toMillis() : (cached?.cachedAt || 0);
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        if (Date.now() - cachedAt < twentyFourHoursMs && cached?.currency) {
          return {
            currency: cached.currency || 'EUR',
            countryCode: cached.countryCode || 'FR',
            countryName: cached.countryName || 'France',
            currencySymbol: cached.currencySymbol || '€',
            city: cached.city || '',
            ip: clientIp,
            isGeoLocked: true,
            cached: true,
          };
        }
      }
    } catch (cacheErr) {
      console.warn('[getCurrencyFromIP] Erreur lecture cache Firestore:', cacheErr);
    }

    // 3. Appel serveur vers ipapi.co (sans problème de CORS navigateur)
    const targetUrl = (!isLocalOrPrivate && clientIp)
      ? `https://ipapi.co/${encodeURIComponent(clientIp)}/json/`
      : 'https://ipapi.co/json/';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const apiResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Troco-CloudFunction/1.0',
      },
    });
    clearTimeout(timeout);

    if (apiResponse.ok) {
      const data: any = await apiResponse.json();
      if (!data.error && data.currency) {
        const currency = String(data.currency).toUpperCase();
        const countryCode = String(data.country_code || data.country || 'FR').toUpperCase();
        const countryName = String(data.country_name || countryCode);
        const city = String(data.city || '');
        const currencySymbol = String(data.currency_name || currency);

        const result: CurrencyFromIPResponse = {
          currency,
          countryCode,
          countryName,
          currencySymbol,
          city,
          ip: clientIp || data.ip || '',
          isGeoLocked: true,
          cached: false,
        };

        // Sauvegarder dans Firestore pour 24h
        try {
          await cacheDocRef.set({
            currency,
            countryCode,
            countryName,
            currencySymbol,
            city,
            ip: clientIp || data.ip || '',
            cachedAt: Timestamp.now(),
          }, { merge: true });
        } catch (setErr) {
          console.warn('[getCurrencyFromIP] Erreur écriture cache Firestore:', setErr);
        }

        return result;
      }
    }

    return fallbackResponse;
  } catch (error) {
    console.error('[getCurrencyFromIP] Exception lors de la résolution de devise, repli sur EUR:', error);
    return fallbackResponse;
  }
}
