import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAudioUrl } from '../src/audio-url.js';

const origin = 'https://flashback.example';

test('accepts base64 audio data URLs', () => {
  const audioDataUrl = 'data:audio/mpeg;base64,SUQz';
  assert.equal(resolveAudioUrl(audioDataUrl, origin), audioDataUrl);
});

test('continues to accept HTTP, HTTPS, and same-origin audio URLs', () => {
  assert.equal(resolveAudioUrl('https://cdn.example/briefing.mp3', origin), 'https://cdn.example/briefing.mp3');
  assert.equal(resolveAudioUrl('/audio/briefing.mp3', origin), 'https://flashback.example/audio/briefing.mp3');
});

test('rejects non-audio data URLs and unsupported protocols', () => {
  assert.throws(() => resolveAudioUrl('data:text/html;base64,PHNjcmlwdD4=', origin), /Invalid audio URL/);
  assert.throws(() => resolveAudioUrl('javascript:alert(1)', origin), /Invalid audio URL/);
});

test('rejects malformed and empty audio data URLs', () => {
  assert.throws(() => resolveAudioUrl('data:audio/mpeg;base64,', origin), /Invalid audio URL/);
  assert.throws(() => resolveAudioUrl('data:audio/mpeg;base64,not valid!', origin), /Invalid audio URL/);
});
