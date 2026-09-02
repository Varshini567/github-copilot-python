// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const LEADERBOARD_KEY = 'sudokuLeaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;
const DIFFICULTY_CLUES = {easy: 45, medium: 35, hard: 25};
let puzzle = [];
let hintCount = 0;
let currentDifficulty = 'medium';
let gameStartedAt = null;
let gameWon = false;
let timerId = null;

function findConflictingCells(inputs) {
  const conflicting = new Set();
  const units = [];

  for (let row = 0; row < SIZE; row++) {
    units.push(Array.from({length: SIZE}, (_, col) => row * SIZE + col));
  }
  for (let col = 0; col < SIZE; col++) {
    units.push(Array.from({length: SIZE}, (_, row) => row * SIZE + col));
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
      const box = [];
      for (let row = boxRow; row < boxRow + 3; row++) {
        for (let col = boxCol; col < boxCol + 3; col++) {
          box.push(row * SIZE + col);
        }
      }
      units.push(box);
    }
  }

  for (const unit of units) {
    const cellsByValue = new Map();
    for (const index of unit) {
      const value = inputs[index].value;
      if (!value) continue;
      if (!cellsByValue.has(value)) cellsByValue.set(value, []);
      cellsByValue.get(value).push(index);
    }
    for (const cells of cellsByValue.values()) {
      if (cells.length > 1) cells.forEach(index => conflicting.add(index));
    }
  }

  return conflicting;
}

function updateConflictStyles() {
  const inputs = Array.from(document.querySelectorAll('#sudoku-board input'));
  const conflicting = findConflictingCells(inputs);
  inputs.forEach((input, index) => {
    input.classList.toggle('conflict', conflicting.has(index));
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function updateTimer() {
  if (gameStartedAt === null) return;
  const elapsed = Math.floor((Date.now() - gameStartedAt) / 1000);
  document.getElementById('timer').innerText = `Time: ${formatTime(elapsed)}`;
}

function startTimer() {
  window.clearInterval(timerId);
  gameStartedAt = Date.now();
  updateTimer();
  timerId = window.setInterval(updateTimer, 1000);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
}

function readLeaderboard() {
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    const entries = JSON.parse(stored || '[]');
    if (!Array.isArray(entries)) return [];
    return entries
      .filter(entry => entry && typeof entry.name === 'string'
        && entry.name.trim() && Number.isFinite(Number(entry.time))
        && typeof entry.difficulty === 'string'
        && Number.isFinite(Number(entry.hints)))
      .map(entry => ({
        name: entry.name.trim(),
        time: Math.max(0, Number(entry.time)),
        difficulty: entry.difficulty,
        hints: Math.max(0, Number(entry.hints))
      }))
      .sort((a, b) => a.time - b.time)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
  } catch (error) {
    return [];
  }
}

function renderLeaderboard(entries = readLeaderboard()) {
  const body = document.getElementById('leaderboard-body');
  body.innerHTML = '';
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    [index + 1, entry.name, formatTime(entry.time), entry.difficulty, entry.hints]
      .forEach(value => {
        const cell = document.createElement('td');
        cell.innerText = value;
        row.appendChild(cell);
      });
    body.appendChild(row);
  });
}

function saveLeaderboardEntry(name, time) {
  const entries = readLeaderboard();
  entries.push({name, time, difficulty: currentDifficulty, hints: hintCount});
  entries.sort((a, b) => a.time - b.time);
  const topEntries = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topEntries));
  } catch (error) {
    // Keep the in-memory table usable when browser storage is unavailable.
  }
  renderLeaderboard(topEntries);
}

function recordWin() {
  if (gameWon || gameStartedAt === null) return;
  gameWon = true;
  stopTimer();
  const elapsed = Math.max(0, Math.floor((Date.now() - gameStartedAt) / 1000));
  const playerName = window.prompt('Enter your name for the leaderboard:');
  saveLeaderboardEntry((playerName || 'Anonymous').trim() || 'Anonymous', elapsed);
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      const blockParity = (Math.floor(i / 3) + Math.floor(j / 3)) % 2;
      input.className = `sudoku-cell block-${blockParity === 0 ? 'a' : 'b'}`;
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        updateConflictStyles();
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  hintCount = 0;
  gameWon = false;
  document.getElementById('sudoku-board').classList.remove('board-disabled');
  document.getElementById('hint').disabled = false;
  document.getElementById('hint-count').innerText = 'Hints used: 0';
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
  updateConflictStyles();
}

async function useHint() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = Array.from(boardDiv.querySelectorAll('input'));
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const input = inputs[i * SIZE + j];
      board[i][j] = input.value ? parseInt(input.value, 10) : 0;
    }
  }

  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  if (data.error) {
    document.getElementById('message').innerText = data.error;
    return;
  }

  const hintedInput = inputs[data.row * SIZE + data.col];
  hintedInput.value = data.value;
  hintedInput.disabled = true;
  hintedInput.classList.add('hinted');
  hintCount++;
  document.getElementById('hint-count').innerText = `Hints used: ${hintCount}`;
  document.getElementById('message').innerText = 'A cell has been filled in for you.';
  updateConflictStyles();
}

async function newGame() {
  currentDifficulty = document.getElementById('difficulty').value;
  const res = await fetch(`/new?clues=${DIFFICULTY_CLUES[currentDifficulty]}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  startTimer();
  document.getElementById('message').innerText = '';
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.classList.remove('incorrect');
    inp.classList.toggle('incorrect', incorrect.has(idx));
  }
  updateConflictStyles();
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
    recordWin();
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('hint').addEventListener('click', useHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('difficulty').addEventListener('change', newGame);
  renderLeaderboard();
  // initialize
  newGame();
});