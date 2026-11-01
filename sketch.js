const STORAGE_KEY = 'classroom-lottery-names';
const ROLL_DURATION = 2000;

let confettiPieces = [];
let confettiUntil = 0;
let audioContext;
let isDrawing = false;
let drawnKeys = new Set();
let historyEntries = [];
let rollInterval;
let rollTimeout;

function setup() {
  const app = document.createElement('main');
  app.className = 'app-shell';
  app.innerHTML = `
    <header class="page-header">
      <div class="brand-mark" aria-hidden="true">✦</div>
      <div>
        <p class="eyebrow">CLASSROOM RANDOM PICKER</p>
        <h1>課堂抽籤機</h1>
        <p class="subtitle">公平抽選每一位，讓課堂互動更有趣。</p>
      </div>
    </header>

    <div class="workspace">
      <section class="panel setup-panel" aria-labelledby="setup-title">
        <div class="panel-heading">
          <div>
            <p class="section-label">STEP 01</p>
            <h2 id="setup-title">設定抽籤名單</h2>
          </div>
          <span class="heading-icon" aria-hidden="true">☷</span>
        </div>

        <div class="mode-switch" role="group" aria-label="抽籤模式">
          <button class="mode-button active" id="number-mode" type="button" aria-pressed="true">
            <span aria-hidden="true">#</span> 號碼模式
          </button>
          <button class="mode-button" id="name-mode" type="button" aria-pressed="false">
            <span aria-hidden="true">Aa</span> 姓名模式
          </button>
        </div>

        <div id="number-fields" class="number-fields">
          <label class="field-label" for="range-start">抽選號碼範圍</label>
          <div class="range-inputs">
            <label class="number-field">
              <span>從</span>
              <input id="range-start" type="number" value="1" step="1" inputmode="numeric" aria-label="起始號碼">
            </label>
            <span class="range-divider" aria-hidden="true">—</span>
            <label class="number-field">
              <span>到</span>
              <input id="range-end" type="number" value="30" step="1" inputmode="numeric" aria-label="結束號碼">
            </label>
          </div>
        </div>

        <div id="name-fields" class="name-fields" hidden>
          <label class="field-label" for="roster">班級名單 <span class="field-hint">一行一個姓名</span></label>
          <textarea id="roster" rows="7" placeholder="王小明&#10;陳小華&#10;林同學" spellcheck="false"></textarea>
          <p class="save-note"><span class="save-dot" aria-hidden="true"></span><span id="save-status">名單會自動儲存在這台裝置</span></p>
        </div>

        <div class="field-group">
          <label class="field-label" for="excluded">排除對象 <span class="field-hint">選填，以逗號分隔</span></label>
          <input id="excluded" type="text" placeholder="例如：5, 12 或 王小明">
        </div>

        <div class="draw-options">
          <label class="field-label" for="draw-count">每次抽出</label>
          <div class="draw-count-row">
            <input id="draw-count" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="每次抽出人數">
            <span>位</span>
          </div>
        </div>

        <label class="repeat-option" for="no-repeat">
          <span class="toggle-copy">
            <strong>不重複抽籤</strong>
            <small>抽過的對象不會再次出現</small>
          </span>
          <span class="toggle">
            <input id="no-repeat" type="checkbox">
            <span class="toggle-track" aria-hidden="true"></span>
          </span>
        </label>

        <div class="availability" aria-live="polite">
          <span class="availability-dot" aria-hidden="true"></span>
          <span id="availability-text">可抽 30 位</span>
        </div>
      </section>

      <section class="panel draw-panel" aria-labelledby="draw-title">
        <div class="panel-heading">
          <div>
            <p class="section-label">STEP 02</p>
            <h2 id="draw-title">準備好了嗎？</h2>
          </div>
          <span class="heading-icon sparkle" aria-hidden="true">✧</span>
        </div>

        <div class="stage" aria-live="polite" aria-atomic="true">
          <p class="stage-caption" id="stage-caption">幸運的人會是……</p>
          <div id="result" class="result" aria-label="抽籤結果">?</div>
          <div id="result-list" class="result-list" aria-label="本次抽籤結果"></div>
        </div>

        <p id="error-message" class="error-message" role="alert" hidden></p>
        <p id="sound-status" class="sound-status" aria-live="polite">&nbsp;</p>

        <button id="draw-button" class="draw-button" type="button">
          <span class="button-spark" aria-hidden="true">✦</span>
          <span id="draw-button-text">開始抽籤</span>
          <span class="button-arrow" aria-hidden="true">→</span>
        </button>
        <p class="draw-hint">按下按鈕，看看今天的幸運之星</p>
      </section>
    </div>

    <section class="panel history-panel" aria-labelledby="history-title">
      <div class="history-heading">
        <div class="panel-heading">
          <div>
            <p class="section-label">PICK HISTORY</p>
            <h2 id="history-title">抽籤紀錄 <span id="history-count" class="history-count">0</span></h2>
          </div>
        </div>
        <button id="reset-button" class="reset-button" type="button">
          <span aria-hidden="true">↻</span> 重置紀錄
        </button>
      </div>
      <div id="history-empty" class="history-empty">
        <span aria-hidden="true">◷</span>
        <p>抽籤紀錄會顯示在這裡</p>
      </div>
      <ol id="history-list" class="history-list" aria-label="抽籤紀錄"></ol>
    </section>
    <footer class="page-footer">每一次抽選，都是一個新的開始。</footer>
  `;
  document.body.appendChild(app);

  const sketch = createCanvas(windowWidth, windowHeight);
  sketch.elt.classList.add('confetti-canvas');
  bindControls();
  loadRoster();
  updateAvailability();
}

function draw() {
  clear();
  if (millis() > confettiUntil && confettiPieces.length === 0) return;

  for (let index = confettiPieces.length - 1; index >= 0; index -= 1) {
    const piece = confettiPieces[index];
    piece.x += piece.speedX;
    piece.y += piece.speedY;
    piece.speedY += 0.13;
    piece.rotation += piece.spin;

    push();
    translate(piece.x, piece.y);
    rotate(piece.rotation);
    noStroke();
    fill(piece.color);
    rectMode(CENTER);
    rect(0, 0, piece.size, piece.size * 0.62, 2);
    pop();

    if (piece.y > height + 24) confettiPieces.splice(index, 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function bindControls() {
  document.getElementById('number-mode').addEventListener('click', () => setMode('number'));
  document.getElementById('name-mode').addEventListener('click', () => setMode('name'));
  document.getElementById('range-start').addEventListener('input', updateAvailability);
  document.getElementById('range-end').addEventListener('input', updateAvailability);
  document.getElementById('excluded').addEventListener('input', updateAvailability);
  document.getElementById('draw-count').addEventListener('input', updateAvailability);
  document.getElementById('no-repeat').addEventListener('change', updateAvailability);
  document.getElementById('roster').addEventListener('input', () => {
    saveRoster();
    updateAvailability();
  });
  document.getElementById('draw-button').addEventListener('click', startDraw);
  document.getElementById('reset-button').addEventListener('click', resetDraw);
}

function setMode(mode) {
  const isNumberMode = mode === 'number';
  document.getElementById('number-mode').classList.toggle('active', isNumberMode);
  document.getElementById('number-mode').setAttribute('aria-pressed', String(isNumberMode));
  document.getElementById('name-mode').classList.toggle('active', !isNumberMode);
  document.getElementById('name-mode').setAttribute('aria-pressed', String(!isNumberMode));
  document.getElementById('number-fields').hidden = !isNumberMode;
  document.getElementById('name-fields').hidden = isNumberMode;
  clearError();
  updateAvailability();
}

function getCandidates() {
  const isNumberMode = !document.getElementById('number-fields').hidden;
  if (isNumberMode) {
    const startText = document.getElementById('range-start').value.trim();
    const endText = document.getElementById('range-end').value.trim();
    const start = Number(startText);
    const end = Number(endText);
    if (startText === '' || endText === '' || !Number.isInteger(start) || !Number.isInteger(end)) {
      return { candidates: [], error: '請輸入有效的整數起訖號碼。' };
    }
    if (end < start) return { candidates: [], error: '結束號碼必須大於或等於起始號碼。' };
    if (end - start > 9999) return { candidates: [], error: '號碼範圍最多可設定 10,000 位。' };

    const excluded = new Set(parseExcludedValues().map((value) => value.trim()));
    const candidates = [];
    for (let number = start; number <= end; number += 1) {
      const label = String(number);
      if (!excluded.has(label)) candidates.push({ key: `number:${number}`, label });
    }
    return { candidates, error: '' };
  }

  const names = document.getElementById('roster').value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) return { candidates: [], error: '請先貼上名單，每行輸入一個姓名。' };
  const excluded = new Set(parseExcludedValues());
  const candidates = names
    .map((label, index) => ({ key: `name:${index}:${label}`, label }))
    .filter((candidate) => !excluded.has(candidate.label));
  return { candidates, error: '' };
}

function parseExcludedValues() {
  return document.getElementById('excluded').value
    .split(/[,，、\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getAvailableCandidates() {
  const result = getCandidates();
  if (result.error) return result;
  const noRepeat = document.getElementById('no-repeat').checked;
  const candidates = noRepeat
    ? result.candidates.filter((candidate) => !drawnKeys.has(candidate.key))
    : result.candidates;
  return { candidates, error: '' };
}

function updateAvailability() {
  const { candidates, error } = getAvailableCandidates();
  const text = document.getElementById('availability-text');
  if (error) {
    text.textContent = '請檢查名單或號碼範圍';
    return;
  }
  text.textContent = `可抽 ${candidates.length} 位`;
}

function startDraw() {
  if (isDrawing) return;
  clearError();
  const { candidates, error } = getAvailableCandidates();
  if (error) {
    showError(error);
    return;
  }

  const countText = document.getElementById('draw-count').value.trim();
  const count = Number(countText);
  if (countText === '' || !Number.isInteger(count) || count < 1) {
    showError('每次抽出人數請輸入 1 位以上的整數。');
    return;
  }
  if (candidates.length === 0) {
    showError('目前沒有可抽對象，請調整排除名單或重置抽籤紀錄。');
    return;
  }
  if (count > candidates.length) {
    showError(`可抽人數不足：你設定抽出 ${count} 位，目前只有 ${candidates.length} 位可抽。`);
    return;
  }

  const selected = pickRandom(candidates, count);
  isDrawing = true;
  setDrawingState(true);
  document.getElementById('stage-caption').textContent = '幸運的人會是……';
  document.getElementById('result-list').replaceChildren();
  const result = document.getElementById('result');
  result.classList.remove('result-final');
  result.textContent = '…';
  clearError();

  rollInterval = window.setInterval(() => {
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    result.textContent = candidate.label;
    result.classList.remove('result-final');
  }, 70);

  rollTimeout = window.setTimeout(() => {
    window.clearInterval(rollInterval);
    rollInterval = undefined;
    finishDraw(selected);
  }, ROLL_DURATION);
}

function finishDraw(selected) {
  isDrawing = false;
  setDrawingState(false);
  document.getElementById('stage-caption').textContent = selected.length === 1 ? '本次幸運之星' : `本次抽出 ${selected.length} 位`;

  const result = document.getElementById('result');
  result.textContent = selected.length === 1 ? selected[0].label : '抽選完成！';
  result.classList.add('result-final');

  const resultList = document.getElementById('result-list');
  resultList.replaceChildren(...selected.map((candidate) => {
    const chip = document.createElement('span');
    chip.className = 'result-chip';
    chip.textContent = candidate.label;
    return chip;
  }));

  if (document.getElementById('no-repeat').checked) {
    selected.forEach((candidate) => drawnKeys.add(candidate.key));
  }
  historyEntries.unshift({
    labels: selected.map((candidate) => candidate.label),
    time: new Date()
  });
  renderHistory();
  updateAvailability();
  launchConfetti();
  playCelebration();
  rollTimeout = undefined;
}

function pickRandom(candidates, count) {
  const shuffled = candidates.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function setDrawingState(drawing) {
  document.querySelectorAll('.setup-panel input, .setup-panel textarea, .setup-panel button')
    .forEach((element) => { element.disabled = drawing; });
  document.getElementById('draw-button').disabled = drawing;
  document.getElementById('draw-button-text').textContent = drawing ? '抽選中…' : '開始抽籤';
  document.getElementById('stage-caption').classList.toggle('rolling', drawing);
}

function showError(message) {
  const error = document.getElementById('error-message');
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  const error = document.getElementById('error-message');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.replaceChildren(...historyEntries.map((entry, index) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const number = document.createElement('span');
    number.className = 'history-index';
    number.textContent = String(historyEntries.length - index).padStart(2, '0');

    const names = document.createElement('span');
    names.className = 'history-names';
    names.textContent = entry.labels.join('、');

    const time = document.createElement('time');
    time.className = 'history-time';
    time.dateTime = entry.time.toISOString();
    time.textContent = entry.time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    item.append(number, names, time);
    return item;
  }));
  document.getElementById('history-count').textContent = String(historyEntries.length);
  document.getElementById('history-empty').hidden = historyEntries.length > 0;
}

function resetDraw() {
  if (isDrawing) {
    window.clearInterval(rollInterval);
    window.clearTimeout(rollTimeout);
    rollInterval = undefined;
    rollTimeout = undefined;
    isDrawing = false;
    setDrawingState(false);
  }
  drawnKeys.clear();
  historyEntries = [];
  renderHistory();
  updateAvailability();
  clearError();
  document.getElementById('stage-caption').textContent = '幸運的人會是……';
  document.getElementById('result').textContent = '?';
  document.getElementById('result').classList.remove('result-final');
  document.getElementById('result-list').replaceChildren();
  document.getElementById('sound-status').textContent = '\u00a0';
}

function saveRoster() {
  try {
    localStorage.setItem(STORAGE_KEY, document.getElementById('roster').value);
    document.getElementById('save-status').textContent = '名單已自動儲存在這台裝置';
  } catch (error) {
    console.error('無法儲存抽籤名單至 localStorage。', error);
    document.getElementById('save-status').textContent = '無法儲存名單，請確認瀏覽器儲存空間設定';
  }
}

function loadRoster() {
  try {
    const savedRoster = localStorage.getItem(STORAGE_KEY);
    if (savedRoster !== null) {
      document.getElementById('roster').value = savedRoster;
      document.getElementById('save-status').textContent = '已載入這台裝置儲存的名單';
    }
  } catch (error) {
    console.error('無法從 localStorage 載入抽籤名單。', error);
    document.getElementById('save-status').textContent = '無法讀取已儲存名單，請確認瀏覽器儲存空間設定';
  }
}

function launchConfetti() {
  const colors = ['#ffc857', '#ff6b6b', '#56d6c9', '#a88bff', '#f78fb3', '#ffffff'];
  confettiPieces = Array.from({ length: 150 }, () => ({
    x: random(width),
    y: random(-height * 0.4, -10),
    speedX: random(-2.8, 2.8),
    speedY: random(2.2, 6.4),
    size: random(6, 12),
    rotation: random(TWO_PI),
    spin: random(-0.12, 0.12),
    color: random(colors)
  }));
  confettiUntil = millis() + 4500;
}

function playCelebration() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const status = document.getElementById('sound-status');
  if (!AudioContextClass) {
    status.textContent = '此瀏覽器不支援音效播放';
    return;
  }

  try {
    if (!audioContext) audioContext = new AudioContextClass();
    const playNotes = () => {
      const now = audioContext.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.11;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.44);
      });
      status.textContent = '♪ 抽選完成音效';
    };

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(playNotes).catch((error) => {
        console.error('瀏覽器未能啟用 Web Audio 音效。', error);
        status.textContent = '瀏覽器未能播放音效';
      });
    } else {
      playNotes();
    }
  } catch (error) {
    console.error('無法播放抽籤完成音效。', error);
    status.textContent = '無法播放音效，仍可正常抽籤';
  }
}
