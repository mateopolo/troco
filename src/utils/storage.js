const timers = new Map();
const pendingValues = new Map();

const writeValue = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Storage failures should not prevent the current UI update.
  }
};

const flushKey = (key) => {
  const timer = timers.get(key);
  if (timer) {
    clearTimeout(timer);
    timers.delete(key);
  }

  if (!pendingValues.has(key)) return;
  writeValue(key, pendingValues.get(key));
  pendingValues.delete(key);
};

const flushAll = () => {
  Array.from(pendingValues.keys()).forEach(flushKey);
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAll);
}

export const setDebounced = (key, value, delay = 500) => {
  const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
  pendingValues.set(key, serializedValue);

  const existingTimer = timers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  timers.set(key, setTimeout(() => flushKey(key), delay));
};

export const setSync = (key, value) => {
  const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  pendingValues.delete(key);
  writeValue(key, serializedValue);
};

export const get = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : value;
  } catch (error) {
    return defaultValue;
  }
};

export const remove = (key) => {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  pendingValues.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Storage failures should not prevent logout or other critical flows.
  }
};

export const flush = flushAll;

