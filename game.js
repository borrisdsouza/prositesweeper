const DIFFICULTIES = {
  easy: { label: "Easy", size: 8, hazards: 10 },
  medium: { label: "Medium", size: 10, hazards: 15 },
  hard: { label: "Hard", size: 12, hazards: 24 },
};
const HAZARD_TYPES = [
  {
    id: "kfc",
    label: "Surprise KFC franchise",
    icon: "🍗",
    lossText: "Yikes! The local KFC is running a Zinger Box deal - all your trades just took 3-hour smoko",
    weight: 1,
  },
  {
    id: "beer",
    label: "Beer truck block party",
    icon: "🍺",
    lossText: "Crew called it a day after finding a carton in the back of their ranger. Project delayed!",
    weight: 1,
  },
  {
    id: "rain",
    label: "Rain storm",
    icon: "🌧️",
    lossText: "Someone said they spotted rain on the radar, tools down everyone heads home.",
    weight: 1,
  },
  {
    id: "strippers",
    label: "Bachelor party of strippers",
    icon: "💃",
    lossText: "New strip club just opened across the road.  All your trades (except the sparkies) just walked off site.",
    weight: 4,
  },
  {
    id: "disease",
    label: "Mystery illness",
    icon: "🦠",
    lossText: "COVID 25 just hit, no one wants another vax so project shut down until further notice.",
    weight: 1,
  },
  {
    id: "CFMEU",
    label: "CFMEU visit",
    icon: "🙅🏻‍♂️",
    lossText: "Those w*nkers from the CFMEU just rocked up, everybody stop work until they’re gone.",
    weight: 1,
  },
];

const boardEl = document.querySelector("#board");
const tilesLeftEl = document.querySelector("#tilesLeft");
const hazardLeftEl = document.querySelector("#hazardLeft");
const statusText = document.querySelector("#statusText");
const newGameBtn = document.querySelector("#newGameBtn");
const hintBtn = document.querySelector("#hintBtn");
const modalEl = document.querySelector("#statusModal");
const modalTitle = document.querySelector("#modalTitle");
const modalMessage = document.querySelector("#modalMessage");
const claimPrompt = document.querySelector("#claimPrompt");
const claimBtn = document.querySelector("#claimBtn");
const restartBtn = document.querySelector("#restartBtn");
const closeModalBtn = document.querySelector("#closeModalBtn");
const difficultyButtons = document.querySelectorAll(".difficulty__btn");
const claimModal = document.querySelector("#claimModal");
const claimForm = document.querySelector("#claimForm");
const claimNameInput = document.querySelector("#claimName");
const claimEmailInput = document.querySelector("#claimEmail");
const claimError = document.querySelector("#claimError");
const claimSubmitBtn = document.querySelector("#claimSubmitBtn");
const claimCancelBtn = document.querySelector("#claimCancelBtn");
const leaderboardModal = document.querySelector("#leaderboardModal");
const leaderboardList = document.querySelector("#leaderboardList");
const leaderboardStatus = document.querySelector("#leaderboardStatus");
const leaderboardCloseBtn = document.querySelector("#leaderboardCloseBtn");

const WIN_STATUSES = [
  () => "Site is clear, paperwork approved, pour the slab!",
  () => "No surprises! Call procurement and start lining up trades.",
  () => "Survey team cheered—this parcel is restaurant-ready.",
];
const SCORES_ENDPOINT = "/scores";

let grid = [];
let safeTilesLeft = 0;
let flaggedTiles = 0;
let gameOver = false;
let hintTimeout;
let currentDifficulty = "medium";
let boardSize = DIFFICULTIES[currentDifficulty].size;
let hazardCount = DIFFICULTIES[currentDifficulty].hazards;
let gameStartTime = Date.now();
let lastResultMeta = null;
const hazardWeightTotal = HAZARD_TYPES.reduce((sum, type) => sum + (type.weight || 1), 0);

newGameBtn.addEventListener("click", initGame);
hintBtn.addEventListener("click", showHint);
restartBtn.addEventListener("click", () => {
  hideModal();
  initGame();
});
closeModalBtn.addEventListener("click", () => {
  hideModal();
});
claimBtn.addEventListener("click", () => {
  if (!lastResultMeta) return;
  hideModal();
  openClaimModal();
});
difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const level = btn.dataset.difficulty;
    if (!level || level === currentDifficulty) return;
    setDifficulty(level);
  });
});
claimForm.addEventListener("submit", handleClaimSubmit);
claimCancelBtn.addEventListener("click", () => {
  closeClaimModal();
});
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-close-modal");
    if (target === "claimModal") {
      closeClaimModal();
    } else if (target === "leaderboardModal") {
      closeLeaderboardModal();
    } else {
      hideModal();
    }
  });
});
leaderboardCloseBtn.addEventListener("click", () => {
  closeLeaderboardModal();
});
modalEl.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    hideModal();
  }
});
claimModal.addEventListener("click", (event) => {
  if (event.target === claimModal) {
    closeClaimModal();
  }
});
leaderboardModal.addEventListener("click", (event) => {
  if (event.target === leaderboardModal) {
    closeLeaderboardModal();
  }
});

updateDifficultyUI();
initGame();

function setDifficulty(level) {
  if (!DIFFICULTIES[level]) return;
  currentDifficulty = level;
  boardSize = DIFFICULTIES[level].size;
  hazardCount = DIFFICULTIES[level].hazards;
  updateDifficultyUI();
  initGame();
}

function updateDifficultyUI() {
  difficultyButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.difficulty === currentDifficulty);
  });
}

function initGame() {
  clearTimeout(hintTimeout);
  hideModal();
  hintBtn.disabled = false;
  boardEl.style.setProperty("--size", boardSize);
  boardEl.innerHTML = "";
  statusText.textContent = "Tap a tile to scout it!";
  hazardLeftEl.textContent = hazardCount;

  grid = [];
  gameOver = false;
  flaggedTiles = 0;
  safeTilesLeft = boardSize * boardSize - hazardCount;
  tilesLeftEl.textContent = safeTilesLeft;
  claimBtn.hidden = true;
  claimBtn.disabled = false;
  claimBtn.textContent = "Claim Score";
  claimPrompt.hidden = true;
  gameStartTime = Date.now();
  lastResultMeta = null;

  const positions = Array.from({ length: boardSize * boardSize }, (_, idx) => idx);
  shuffle(positions);
  const hazardSpots = positions.slice(0, hazardCount);
  const hazardLookup = new Map(hazardSpots.map((spot) => [spot, pickHazardType()]));

  for (let row = 0; row < boardSize; row++) {
    const currentRow = [];
    for (let col = 0; col < boardSize; col++) {
      const id = row * boardSize + col;
      const cell = {
        row,
        col,
        hazard: hazardLookup.get(id) || null,
        adjacentHazards: 0,
        isRevealed: false,
        isFlagged: false,
        element: null,
      };
      currentRow.push(cell);
    }
    grid.push(currentRow);
  }

  grid.flat().forEach((cell) => {
    cell.adjacentHazards = getNeighbors(cell).filter((neighbor) => neighbor.hazard).length;
  });

  grid.flat().forEach((cell) => {
    const tile = document.createElement("button");
    tile.className = "cell";
    tile.setAttribute("aria-label", "Hidden site");
    tile.addEventListener("click", () => handleReveal(cell));
    tile.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleFlag(cell);
    });
    cell.element = tile;
    boardEl.appendChild(tile);
  });
}

function handleReveal(cell) {
  if (gameOver || cell.isRevealed || cell.isFlagged) return;

  if (cell.hazard) {
    const hazard = revealHazard(cell);
    endGame(false, hazard);
  } else {
    revealSafe(cell);
    if (safeTilesLeft === 0) {
      endGame(true);
    }
  }
}

function revealSafe(cell) {
  if (cell.isRevealed) return;

  cell.isRevealed = true;
  safeTilesLeft -= 1;
  tilesLeftEl.textContent = safeTilesLeft;
  cell.element.classList.add("cell--revealed");

  renderParcel(cell);
  if (cell.adjacentHazards === 0) {
    cell.element.classList.add("cell--restaurant");
    floodReveal(cell);
  }
}

function revealHazard(cell) {
  cell.isRevealed = true;
  cell.element.classList.add("cell--hazard", "cell--revealed");
  cell.element.textContent = cell.hazard?.icon || "⚠️";
  return cell.hazard;
}

function floodReveal(origin) {
  const stack = [origin];
  while (stack.length) {
    const cell = stack.pop();
    getNeighbors(cell).forEach((neighbor) => {
      if (neighbor.isRevealed || neighbor.isFlagged || neighbor.hazard) return;
      neighbor.isRevealed = true;
      safeTilesLeft -= 1;
      neighbor.element.classList.add("cell--revealed");
      renderParcel(neighbor);

      if (neighbor.adjacentHazards === 0) {
        neighbor.element.classList.add("cell--restaurant");
        stack.push(neighbor);
      }
    });
  }
  tilesLeftEl.textContent = safeTilesLeft;
}

function toggleFlag(cell) {
  if (gameOver || cell.isRevealed) return;

  cell.isFlagged = !cell.isFlagged;
  if (cell.isFlagged) {
    flaggedTiles += 1;
    cell.element.classList.add("cell--flagged");
  } else {
    flaggedTiles -= 1;
    cell.element.classList.remove("cell--flagged");
  }
  hazardLeftEl.textContent = Math.max(hazardCount - flaggedTiles, 0);
}

function getNeighbors(cell) {
  const neighbors = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      if (r === 0 && c === 0) continue;
      const nr = cell.row + r;
      const nc = cell.col + c;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
      neighbors.push(grid[nr][nc]);
    }
  }
  return neighbors;
}

function revealAllHazards() {
  grid.flat().forEach((cell) => {
    if (cell.hazard) {
      cell.element.classList.add("cell--hazard", "cell--revealed");
      cell.element.textContent = cell.hazard.icon;
    }
  });
}

function pickCountColor(count) {
  const palette = {
    1: "#0c7d4f",
    2: "#0081c6",
    3: "#ec663c",
    4: "#9c27b0",
    5: "#ef476f",
    6: "#00bfa5",
    7: "#a68b00",
    8: "#37474f",
  };
  return palette[count] || "#0f2846";
}

function renderParcel(cell) {
  cell.element.style.color = cell.adjacentHazards ? pickCountColor(cell.adjacentHazards) : "#0f2846";
  cell.element.textContent =
    cell.adjacentHazards > 0 ? `🏗️${cell.adjacentHazards}` : "🏗️";
}

function endGame(won, hazard) {
  gameOver = true;
  hintBtn.disabled = true;
  const durationMs = Date.now() - gameStartTime;
  lastResultMeta = {
    difficulty: currentDifficulty,
    difficultyLabel: DIFFICULTIES[currentDifficulty]?.label || currentDifficulty,
    outcome: won ? "Completed map" : `Hit ${hazard?.label || "hazard"}`,
    won,
    hazardLabel: hazard?.label || null,
    hazardIcon: hazard?.icon || null,
    durationMs,
    finishedAt: new Date().toISOString(),
  };
  if (won) {
    statusText.textContent = "All clear! Time to break ground on restaurants.";
    const winStatus = randomItem(WIN_STATUSES)();
    showModal("🛠️", winStatus, { showClaim: true });
  } else {
    revealAllHazards();
    const lossMessage = hazard?.lossText || "The crew hit a wild hazard. Map reset!";
    statusText.textContent = lossMessage;
    showModal(hazard?.icon || "⚠️", lossMessage, { showClaim: true });
  }
}

function showHint() {
  if (gameOver || hintBtn.disabled) return;

  const safeHidden = grid
    .flat()
    .filter((cell) => !cell.hazard && !cell.isRevealed && !cell.isFlagged);
  if (!safeHidden.length) return;

  hintBtn.disabled = true;
  const pick = safeHidden[Math.floor(Math.random() * safeHidden.length)];
  pick.element.classList.add("cell--hint");

  hintTimeout = setTimeout(() => {
    pick.element.classList.remove("cell--hint");
    if (!gameOver) {
      hintBtn.disabled = false;
    }
  }, 1500);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function randomItem(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}

function pickHazardType() {
  let roll = Math.random() * hazardWeightTotal;
  for (const type of HAZARD_TYPES) {
    roll -= type.weight || 1;
    if (roll <= 0) {
      return type;
    }
  }
  return HAZARD_TYPES[0];
}

function showModal(title, message, options = {}) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  if (options.showClaim) {
    claimPrompt.hidden = false;
    claimPrompt.textContent = "Claim your score and compare it with other builders.";
    claimBtn.hidden = false;
    claimBtn.disabled = false;
    claimBtn.textContent = "Claim Score";
  } else {
    claimPrompt.hidden = true;
    claimBtn.hidden = true;
  }
  modalEl.classList.add("modal--visible");
  modalEl.setAttribute("aria-hidden", "false");
}

function hideModal() {
  modalEl.classList.remove("modal--visible");
  modalEl.setAttribute("aria-hidden", "true");
  claimPrompt.hidden = true;
  claimBtn.hidden = true;
}

function openClaimModal() {
  claimForm.reset();
  claimError.hidden = true;
  claimSubmitBtn.disabled = false;
  claimSubmitBtn.textContent = "Save Score";
  claimModal.classList.add("modal--visible");
  claimModal.setAttribute("aria-hidden", "false");
  claimNameInput.focus();
}

function closeClaimModal() {
  claimModal.classList.remove("modal--visible");
  claimModal.setAttribute("aria-hidden", "true");
}

function openLeaderboardModal(entries) {
  leaderboardList.innerHTML = "";
  if (!entries || !entries.length) {
    leaderboardStatus.textContent = "No claimed scores yet. Be the first builder on the board.";
  } else {
    leaderboardStatus.textContent = "Recent best scouting times across all builders.";
    const sorted = [...entries].sort((a, b) => (a.durationMs || Infinity) - (b.durationMs || Infinity));
    sorted.slice(0, 20).forEach((entry) => {
      const li = document.createElement("li");
      const nameEl = document.createElement("strong");
      nameEl.textContent = entry.name || "Unknown Builder";
      const details = document.createElement("span");
      const durationLabel = entry.prettyDuration || formatDuration(entry.durationMs);
      const diffLabel = entry.difficultyLabel || entry.difficulty || "";
      const outcome = entry.outcome || "";
      details.textContent = ` — ${durationLabel} — ${diffLabel}${outcome ? ` (${outcome})` : ""}`;
      li.appendChild(nameEl);
      li.appendChild(details);
      leaderboardList.appendChild(li);
    });
  }
  leaderboardModal.classList.add("modal--visible");
  leaderboardModal.setAttribute("aria-hidden", "false");
}

function closeLeaderboardModal() {
  leaderboardModal.classList.remove("modal--visible");
  leaderboardModal.setAttribute("aria-hidden", "true");
}

async function handleClaimSubmit(event) {
  event.preventDefault();
  if (!lastResultMeta) {
    claimError.hidden = false;
    claimError.textContent = "Finish a map before claiming a score.";
    return;
  }
  const name = claimNameInput.value.trim();
  const email = claimEmailInput.value.trim();
  if (!name || !email) {
    claimError.hidden = false;
    claimError.textContent = "Name and email are required.";
    return;
  }
  claimError.hidden = true;
  claimSubmitBtn.disabled = true;
  claimSubmitBtn.textContent = "Saving...";
  try {
    const payload = {
      name,
      email,
      ...lastResultMeta,
    };
    const response = await fetch(SCORES_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Unable to save score");
    }
    const leaderboardResponse = await fetch(SCORES_ENDPOINT);
    const leaderboardEntries = leaderboardResponse.ok ? await leaderboardResponse.json() : [];
    closeClaimModal();
    openLeaderboardModal(leaderboardEntries);
  } catch (error) {
    claimSubmitBtn.disabled = false;
    claimSubmitBtn.textContent = "Save Score";
    claimError.hidden = false;
    claimError.textContent = "Could not save score. Make sure the server is running.";
  }
}

function formatDuration(ms = 0) {
  if (!Number.isFinite(ms)) return "—";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
