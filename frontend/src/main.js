import './styles.css';

const clock = document.querySelector('#clock');
const playButton = document.querySelector('#play-button');
const speedSelect = document.querySelector('#speed-select');

let simulatedTime = Date.UTC(1986, 3, 26, 0, 0, 0);
let running = true;
let lastTick = Date.now();

function updateClock() {
  const date = new Date(simulatedTime);
  const dateText = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  });
  const timeText = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
  clock.textContent = `${dateText} · ${timeText} UTC`;
}

setInterval(() => {
  const now = Date.now();
  if (running) simulatedTime += (now - lastTick) * Number(speedSelect.value);
  lastTick = now;
  updateClock();
}, 100);

playButton.addEventListener('click', () => {
  running = !running;
  playButton.textContent = running ? 'Pause' : 'Start';
  lastTick = Date.now();
});

updateClock();
