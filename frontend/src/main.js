import './styles.css';
import { resolveAudioUrl } from './audio-url.js';

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
const demoMode = document.querySelector('#demo-mode');
const timelineStatus = document.querySelector('#timeline-status');
let modeVersion = 0;
let lastLiveEvents = null;

// A tiny offline presentation sample copied from James's initial event dataset.
const DEMO_EVENTS = [
  {
    eventId: 'CHER-1986-0425-01',
    title: 'Preparation for Safety Test on Reactor Unit 4',
    description: 'Preparations begin for testing the turbogenerator rundown safety system under low-power operating conditions.',
    timestamp: '1986-04-25T01:00:00Z',
    category: 'OPERATIONAL',
    importance: 'Medium',
    isVerified: true,
    citations: [
      {
        sourceName: 'IAEA INSAG-7 Summary Report',
        referenceId: 'INSAG-7, Section 2.2',
        url: 'https://www-pub.iaea.org/MTCD/publications/PDF/Pub913e_web.pdf',
      },
    ],
  },
  {
    eventId: 'CHER-1986-0425-02',
    title: 'Shutdown Postponed by Kiev Grid Controller',
    description: 'The electricity grid controller in Kiev requests a delay in reactor shutdown due to high power demands across the region.',
    timestamp: '1986-04-25T14:00:00Z',
    category: 'OPERATIONAL',
    importance: 'High',
    isVerified: true,
    citations: [
      {
        sourceName: 'Soviet State Committee Report',
        referenceId: 'Vienna Conference Document 1986',
        url: 'https://www.iaea.org/',
      },
    ],
  },
];

let simulationTime = Date.UTC(1986, 3, 25, 23, 45, 0);
let simulationSpeed = 1;
let running = true;
let lastTick = Date.now();
let timelineLoading = false;
let lastTimelineRefresh = Date.now();
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

function unlockedDemoEvents() {
  return DEMO_EVENTS.filter((event) => Date.parse(event.timestamp) <= simulationTime);
}

function demoSources(events) {
  return events.flatMap((event) => event.citations.map((citation) => ({
    label: citation.sourceName,
    url: citation.url,
    eventId: event.eventId,
    eventTitle: event.title,
  })));
}

function demoHistorianResponse() {
  const events = unlockedDemoEvents();
  if (events.length === 0) {
    return {
      answer: 'The offline demo has no sample events unlocked at this simulation time.',
      sources: [],
    };
  }

  const summaries = events.map((event) => `${formatTime(event.timestamp)}: ${event.title}. ${event.description}`);
  return {
    answer: `Offline demo response (not AI-generated). The sample record available by ${formatTime(simulationTime)} says: ${summaries.join(' ')}`,
    sources: demoSources(events),
  };
}

function demoBriefingText() {
  const events = unlockedDemoEvents();
  if (events.length === 0) {
    return 'Demo briefing (text only): no sample events are unlocked at this simulation time.';
  }

  const headlines = events.map((event) => `${formatTime(event.timestamp)} — ${event.title}`);
    return `Demo briefing (text only): ${headlines.join('. ')}.`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(path.startsWith('/api/events') ? 12000 : 90000),
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
    throw new Error(response.status >= 500 ? 'The service could not be reached. Check that its backend is running.' : 'The server returned an invalid response.');
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
    if (!source) continue;
    if (typeof source.url !== 'string') {
      if (source.referenceId || source.title) {
        const item = document.createElement('li');
        item.textContent = `${source.label || 'Source'} · ${source.referenceId || source.title}`;
        container.append(item);
      }
      continue;
    }
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
    .filter((event) => event.isVerified === true)
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
  if (demoMode.checked) {
    renderEvents(DEMO_EVENTS);
    connectionStatus.textContent = 'OFFLINE DEMO';
    connectionStatus.classList.add('is-offline');
    timelineStatus.textContent = 'Sample events only. Live services are not being used.';
    return;
  }
  if (timelineLoading) return;
  timelineLoading = true;
  const version = modeVersion;
  const requestedTime = isoSimulationTime();
  const query = new URLSearchParams({ simulationTime: requestedTime });

  try {
    const result = await requestJson(`/api/events?${query.toString()}`);
    if (version !== modeVersion) return;
    const events = result.events ?? result.data;
    if (!Array.isArray(events)) throw new Error('The event response is missing its event list.');
    renderEvents(events);
    lastLiveEvents = events;
    timelineStatus.textContent = '';
    connectionStatus.classList.remove('is-offline');
    connectionStatus.innerHTML = '<i></i> API connected';
  } catch (error) {
    if (version !== modeVersion) return;
    connectionStatus.classList.add('is-offline');
    connectionStatus.textContent = 'TIMELINE DISCONNECTED';
    timelineStatus.textContent = `Timeline unavailable. ${error.message} ${lastLiveEvents ? 'Showing the last successful timeline.' : 'No live events have loaded.'} Retrying automatically.`;
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
  const version = modeVersion;

  answerArea.hidden = false;
  answerStatus.textContent = 'Asking with information available at this time…';
  answerText.textContent = '';
  answerSources.replaceChildren();
  setButtonBusy(askButton, true, 'Asking…', 'Ask');

  if (demoMode.checked) {
    const result = demoHistorianResponse();
    answerText.textContent = result.answer;
    answerStatus.textContent = 'Offline demo · not AI-generated';
    addSourceLinks(answerSources, result.sources);
    setButtonBusy(askButton, false, 'Asking…', 'Ask');
    return;
  }

  try {
    const result = await requestJson('/api/ask', {
      method: 'POST',
      body: JSON.stringify({ question, simulationTime: isoSimulationTime() }),
    });
    if (version !== modeVersion) return;
    answerText.textContent = result.answer || 'No answer was returned.';
    answerStatus.textContent = result.known === false ? 'The outcome is not known at this simulation time.' : 'Historian response';
    addSourceLinks(answerSources, result.sources);
  } catch (error) {
    if (version !== modeVersion) return;
    answerStatus.textContent = `Question unavailable. ${error.message}`;
  } finally {
    setButtonBusy(askButton, false, 'Asking…', 'Ask');
  }
});

broadcastButton.addEventListener('click', async () => {
  const version = modeVersion;
  broadcastStatus.textContent = 'Generating briefing…';
  broadcastPlayer.hidden = true;
  broadcastPlayer.removeAttribute('src');
  setButtonBusy(broadcastButton, true, 'Generating…', 'Generate briefing');

  if (demoMode.checked) {
    broadcastStatus.textContent = demoBriefingText();
    setButtonBusy(broadcastButton, false, 'Generating…', 'Generate briefing');
    return;
  }

  try {
    const result = await requestJson('/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({ simulationTime: isoSimulationTime() }),
    });
    if (version !== modeVersion) return;
    if (typeof result.audioUrl !== 'string') throw new Error('The response is missing audioUrl.');
    broadcastPlayer.src = resolveAudioUrl(result.audioUrl, window.location.origin);
    broadcastPlayer.hidden = false;
    broadcastStatus.textContent = result.script || 'Briefing ready.';
  } catch (error) {
    if (version !== modeVersion) return;
    broadcastStatus.textContent = `Audio unavailable. ${error.message}`;
  } finally {
    setButtonBusy(broadcastButton, false, 'Generating…', 'Generate briefing');
  }
});

demoMode.addEventListener('change', () => {
  modeVersion += 1;
  answerArea.hidden = true;
  broadcastPlayer.pause();
  broadcastPlayer.removeAttribute('src');
  broadcastPlayer.hidden = true;
  broadcastStatus.textContent = '';
  if (!demoMode.checked) {
    renderEvents(lastLiveEvents || []);
    connectionStatus.textContent = 'CONNECTING';
    timelineStatus.textContent = 'Connecting to the live timeline…';
  }
  loadEvents();
});

broadcastPlayer.addEventListener('error', () => {
  if (broadcastPlayer.hasAttribute('src')) broadcastStatus.textContent = 'Audio could not be played. The link may have expired; create a new briefing.';
});

updateClock();
loadEvents();
