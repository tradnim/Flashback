const AUDIO_DATA_URL = /^data:audio\/[a-z0-9][a-z0-9.+-]*(?:;[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)*;base64,(?=[a-z0-9+/])(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i;

export function resolveAudioUrl(value, origin) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid audio URL.');
  }

  if (AUDIO_DATA_URL.test(value)) return value;

  try {
    const url = new URL(value, origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    // Report every invalid URL through the same error path below.
  }

  throw new Error('Invalid audio URL.');
}
