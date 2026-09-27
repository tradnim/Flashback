import './styles.css';

const clock = document.querySelector('#clock');
const playButton = document.querySelector('#play-button');
const playIcon = document.querySelector('#play-icon');
const runStatus = document.querySelector('#run-status');
const speedButtons = [...document.querySelectorAll('[data-speed]')];
const connectionStatus = document.querySelector('#connection-status');
const timeline = document.querySelector('#timeline-events');
const eventCount = document.querySelector('#event-count');
const questionForm = document.querySelector('#question-form');
const questionInput = document.querySelector('#question-input');
const askButton = document.querySelector('#ask-button');
const answerArea = document.querySelector('#answer-area');
const answerStatus = document.querySelector('#answer-status');
const answerText = document.querySelector('#answer-text');
const answerSources = document.querySelector('#answer-sources');
const broadcastButton = document.querySelector('#broadcast-button');
const broadcastStatus = document.querySelector('#broadcast-status');
const broadcastPlayer = document.querySelector('#broadcast-player');

let simulationTime = Date.UTC(1986, 3, 25, 23, 45, 0);
let simulationSpeed = 1;
let running = true;
let lastTick = Date.now();
let timelineLoading = false;
let lastTimelineRefresh = 0;
const timelineRefreshInterval = 5000;

function isoSimulationTime() {
  return new Date(simulationTime).toISOString();
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const dateText = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).toUpperCase();
  const timeText = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
  return `${dateText} — ${timeText} UTC`;
}

function updateClock() {
  const timestamp = isoSimulationTime();
  clock.dateTime = timestamp;
  clock.textContent = formatTime(timestamp);
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(body.message || body.error || `Request failed (${response.status}).`);
  }
  return body;
}

function addSourceLinks(container, sources) {
  container.replaceChildren();
  if (!Array.isArray(sources)) return;

  for (const source of sources) {
    if (!source || typeof source.url !== 'string') continue;
    let url;
    try {
      url = new URL(source.url, window.location.origin);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) continue;

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = source.label || source.title || 'Source';
    item.append(link);
    container.append(item);
  }
}

function renderEvents(events) {
  const unlockedEvents = events
    .filter((event) => event && Number.isFinite(Date.parse(event.timestamp)))
    .filter((event) => event.isVerified !== false)
    .filter((event) => Date.parse(event.timestamp) <= simulationTime)
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));

  eventCount.textContent = `${unlockedEvents.length} ${unlockedEvents.length === 1 ? 'event' : 'events'}`;
  timeline.replaceChildren();

  if (unlockedEvents.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No events are unlocked at this time.';
    timeline.append(empty);
    return;
  }

  for (const event of unlockedEvents) {
    const item = document.createElement('li');
    item.className = 'event-entry';

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    const time = document.createElement('time');
    time.dateTime = event.timestamp;
    time.textContent = formatTime(event.timestamp);
    const category = document.createElement('span');
    category.textContent = String(event.category || 'EVENT').replaceAll('_', ' ').toLowerCase();
    meta.append(time, category);

    const title = document.createElement('h3');
    title.textContent = event.title || 'Untitled event';
    const description = document.createElement('p');
    description.textContent = event.description || '';

    const sources = document.createElement('ul');
    sources.className = 'source-list event-sources';
    addSourceLinks(sources, event.sources || event.citations?.map((citation) => ({
      label: citation.sourceName,
      title: citation.referenceId,
      url: citation.url,
    })));

    item.append(meta, title, description);
    if (sources.childElementCount) item.append(sources);
    timeline.append(item);
  }
}

async function loadEvents() {
  if (timelineLoading) return;
  timelineLoading = true;
  const requestedTime = isoSimulationTime();
  const query = new URLSearchParams({ simulationTime: requestedTime });

  try {
    const result = await requestJson(`/api/events?${query.toString()}`);
    const events = result.events ?? result.data;
    if (!Array.isArray(events)) throw new Error('The event response is missing its event list.');
    renderEvents(events);
    connectionStatus.classList.remove('is-offline');
    connectionStatus.innerHTML = '<i></i> API connected';
  } catch {
    timeline.replaceChildren();
    const error = document.createElement('li');
    error.className = 'empty-state';
    error.textContent = 'Timeline unavailable. Check the API connection.';
    timeline.append(error);
    eventCount.textContent = 'offline';
    connectionStatus.classList.add('is-offline');
    connectionStatus.innerHTML = '<i></i> API offline';
  } finally {
    timelineLoading = false;
  }
}

function setButtonBusy(button, busy, busyText, idleText) {
  button.disabled = busy;
  button.classList.toggle('is-loading', busy);
  button.firstChild.textContent = busy ? busyText : idleText;
}

setInterval(() => {
  const now = Date.now();
  if (running) simulationTime += Math.min(now - lastTick, 1000) * simulationSpeed;
  lastTick = now;
  updateClock();

  if (now - lastTimelineRefresh >= timelineRefreshInterval) {
    lastTimelineRefresh = now;
    loadEvents();
  }
}, 100);

playButton.addEventListener('click', () => {
  running = !running;
  playIcon.textContent = running ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', running ? 'Pause simulation' : 'Resume simulation');
  playButton.setAttribute('aria-pressed', String(running));
  runStatus.textContent = running ? 'ACTIVE RUN' : 'PAUSED';
  lastTick = Date.now();
});

for (const button of speedButtons) {
  button.addEventListener('click', () => {
    simulationSpeed = Number(button.dataset.speed);
    for (const option of speedButtons) {
      const selected = option === button;
      option.classList.toggle('is-active', selected);
      option.setAttribute('aria-pressed', String(selected));
    }
    lastTick = Date.now();
  });
}

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;

  answerArea.hidden = false;
  answerStatus.textContent = 'Asking with information available at this time…';
  answerText.textContent = '';
  answerSources.replaceChildren();
  setButtonBusy(askButton, true, 'Asking…', 'Ask');

  try {
    const result = await requestJson('/api/ask', {
      method: 'POST',
      body: JSON.stringify({ question, simulationTime: isoSimulationTime() }),
    });
    answerText.textContent = result.answer || 'No answer was returned.';
    answerStatus.textContent = result.known === false ? 'The outcome is not known at this simulated time.' : 'Historian response';
    addSourceLinks(answerSources, result.sources);
  } catch {
    answerStatus.textContent = 'Historian unavailable. Check the API connection and try again.';
  } finally {
    setButtonBusy(askButton, false, 'Asking…', 'Ask');
  }
});

broadcastButton.addEventListener('click', async () => {
  broadcastStatus.textContent = 'Generating briefing…';
  broadcastPlayer.hidden = true;
  broadcastPlayer.removeAttribute('src');
  setButtonBusy(broadcastButton, true, 'Generating…', 'Generate briefing');

  try {
    const result = await requestJson('/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({ simulationTime: isoSimulationTime() }),
    });
    if (typeof result.audioUrl !== 'string') throw new Error('The response is missing audioUrl.');
    const audioUrl = new URL(result.audioUrl, window.location.origin);
    if (!['http:', 'https:'].includes(audioUrl.protocol)) throw new Error('Invalid audio URL.');

    broadcastPlayer.src = audioUrl.href;
    broadcastPlayer.hidden = false;
    broadcastStatus.textContent = result.script || 'Briefing ready.';
  } catch {
    broadcastStatus.textContent = 'Briefing unavailable. Check the API connection and try again.';
  } finally {
    setButtonBusy(broadcastButton, false, 'Generating…', 'Generate briefing');
  }
});

updateClock();
loadEvents();
