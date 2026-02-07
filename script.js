const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

const ui = {
  ping: document.getElementById("ping"),
  room: document.getElementById("room"),
  server: document.getElementById("server"),
  modeBadge: document.getElementById("modeBadge"),
  matchMode: document.getElementById("matchMode"),
  score: document.getElementById("score"),
  wave: document.getElementById("wave"),
  ammo: document.getElementById("ammo"),
  hpBar: document.getElementById("hpBar"),
  shieldBar: document.getElementById("shieldBar"),
  roster: document.getElementById("roster"),
  feed: document.getElementById("feed"),
  leaderboard: document.getElementById("leaderboard"),
  overlay: document.getElementById("overlay"),
  startBtn: document.getElementById("startBtn"),
  practiceBtn: document.getElementById("practiceBtn"),
  overlayTitle: document.querySelector(".overlay-card h2"),
  overlayDesc: document.querySelector(".overlay-desc"),
  overlayBadge: document.querySelector(".overlay-badge"),
  overlayActions: document.querySelector(".overlay-actions"),
};

const moveStick = document.getElementById("moveStick");
const stickHandle = moveStick.querySelector(".stick-handle");
const aimPad = document.getElementById("aimPad");
const aimDot = aimPad.querySelector(".aim-dot");
const fireBtn = document.getElementById("fireBtn");
const dashBtn = document.getElementById("dashBtn");

const state = {
  running: false,
  connected: false,
  mode: "online",
  score: 0,
  wave: 1,
  waveKills: 0,
  hp: 100,
  shield: 60,
  time: 0,
  lastHit: 0,
  shake: 0,
  ping: 0,
  room: "—",
  server: "—",
};

const view = {
  w: 1200,
  h: 800,
  pad: 36,
};

const player = {
  x: 0,
  y: 0,
  r: 18,
  speed: 220,
  dashTimer: 0,
  dashCooldown: 0,
  dashVec: { x: 1, y: 0 },
  invuln: 0,
};

const move = {
  active: false,
  id: null,
  centerX: 0,
  centerY: 0,
  radius: 50,
  vx: 0,
  vy: 0,
};

const aim = {
  active: false,
  id: null,
  centerX: 0,
  centerY: 0,
  radius: 60,
  dx: 1,
  dy: 0,
};

const mouseAim = {
  active: false,
  x: 0,
  y: 0,
};

const aimDir = {
  x: 1,
  y: 0,
};

const keys = new Set();
let fireHeld = false;
let shootCooldown = 0;
let spawnTimer = 0;
let uiTimer = 0;
let lastFrame = 0;
let bgGradient = null;
let dotPattern = null;
let feedTimer = null;
let connectionTimer = null;
const defaultStartLabel = ui.startBtn.textContent;
const defaultPracticeLabel = ui.practiceBtn.textContent;

const bullets = [];
const enemies = [];
const particles = [];
const ghosts = [];

const namePool = [
  "Akira",
  "Mika",
  "Ren",
  "Sora",
  "Kaito",
  "Yumi",
  "Noir",
  "Rin",
  "Kaede",
  "Zen",
  "Toshi",
  "Hana",
  "Nagi",
];

const servers = ["Toshkent-07", "Seul-03", "Tokyo-11", "Osaka-02", "Baku-05"];
const rooms = ["Neon-Delta", "Crimson-Grid", "Starlit-Forge", "Ghost-Arc"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const updateStickCenter = () => {
  const rect = moveStick.getBoundingClientRect();
  move.centerX = rect.left + rect.width / 2;
  move.centerY = rect.top + rect.height / 2;
  move.radius = rect.width * 0.35;
};

const updateAimCenter = () => {
  const rect = aimPad.getBoundingClientRect();
  aim.centerX = rect.left + rect.width / 2;
  aim.centerY = rect.top + rect.height / 2;
  aim.radius = Math.min(rect.width, rect.height) * 0.42;
};

const updateStick = (clientX, clientY) => {
  const dx = clientX - move.centerX;
  const dy = clientY - move.centerY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, move.radius);
  const nx = dist ? dx / dist : 0;
  const ny = dist ? dy / dist : 0;
  move.vx = nx * (clamped / move.radius);
  move.vy = ny * (clamped / move.radius);
  stickHandle.style.transform = `translate(-50%, -50%) translate(${nx * clamped}px, ${ny * clamped}px)`;
};

const resetStick = () => {
  move.vx = 0;
  move.vy = 0;
  stickHandle.style.transform = "translate(-50%, -50%)";
};

const updateAimPad = (clientX, clientY) => {
  const dx = clientX - aim.centerX;
  const dy = clientY - aim.centerY;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    return;
  }
  const clamped = Math.min(dist, aim.radius);
  const nx = dx / dist;
  const ny = dy / dist;
  aim.dx = nx;
  aim.dy = ny;
  aimPad.style.setProperty("--aim-x", `${nx * clamped * 0.6}px`);
  aimPad.style.setProperty("--aim-y", `${ny * clamped * 0.6}px`);
};

const resetAimPad = () => {
  aimPad.style.setProperty("--aim-x", "0px");
  aimPad.style.setProperty("--aim-y", "0px");
};

moveStick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  moveStick.setPointerCapture(event.pointerId);
  move.active = true;
  move.id = event.pointerId;
  updateStickCenter();
  updateStick(event.clientX, event.clientY);
});

moveStick.addEventListener("pointermove", (event) => {
  if (!move.active || event.pointerId !== move.id) {
    return;
  }
  updateStick(event.clientX, event.clientY);
});

moveStick.addEventListener("pointerup", (event) => {
  if (event.pointerId !== move.id) {
    return;
  }
  move.active = false;
  move.id = null;
  resetStick();
});

moveStick.addEventListener("pointercancel", () => {
  move.active = false;
  move.id = null;
  resetStick();
});

aimPad.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  aimPad.setPointerCapture(event.pointerId);
  aim.active = true;
  aim.id = event.pointerId;
  updateAimCenter();
  updateAimPad(event.clientX, event.clientY);
});

aimPad.addEventListener("pointermove", (event) => {
  if (!aim.active || event.pointerId !== aim.id) {
    return;
  }
  updateAimPad(event.clientX, event.clientY);
});

aimPad.addEventListener("pointerup", (event) => {
  if (event.pointerId !== aim.id) {
    return;
  }
  aim.active = false;
  aim.id = null;
  resetAimPad();
});

aimPad.addEventListener("pointercancel", () => {
  aim.active = false;
  aim.id = null;
  resetAimPad();
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  mouseAim.active = true;
  mouseAim.x = event.clientX - rect.left;
  mouseAim.y = event.clientY - rect.top;
});

canvas.addEventListener("pointerleave", () => {
  mouseAim.active = false;
});

fireBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  fireHeld = true;
  tryShoot();
});

fireBtn.addEventListener("pointerup", () => {
  fireHeld = false;
});

fireBtn.addEventListener("pointerleave", () => {
  fireHeld = false;
});

dashBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  attemptDash();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.repeat) {
    return;
  }
  keys.add(event.key.toLowerCase());
  if (event.key === " ") {
    fireHeld = true;
  }
  if (event.key.toLowerCase() === "shift") {
    attemptDash();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  if (event.key === " ") {
    fireHeld = false;
  }
});

const resize = () => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = rect.width;
  view.h = rect.height;
  view.pad = Math.max(30, Math.min(view.w, view.h) * 0.06);

  bgGradient = ctx.createLinearGradient(0, 0, view.w, view.h);
  bgGradient.addColorStop(0, "rgba(12, 14, 20, 1)");
  bgGradient.addColorStop(1, "rgba(22, 26, 40, 1)");

  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = 120;
  patternCanvas.height = 120;
  const pctx = patternCanvas.getContext("2d");
  pctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let y = 10; y <= 110; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x <= 110; x += 12) {
      pctx.beginPath();
      pctx.arc(x, y, 1.6, 0, Math.PI * 2);
      pctx.fill();
    }
  }
  dotPattern = ctx.createPattern(patternCanvas, "repeat");

  updateStickCenter();
  updateAimCenter();
};

window.addEventListener("resize", resize);

const updateStatus = () => {
  ui.ping.textContent = state.connected ? `${state.ping}ms` : "—";
  ui.room.textContent = state.room;
  ui.server.textContent = state.server;
  ui.modeBadge.textContent = state.mode === "online" ? "ONLINE" : "PRACTICE";
  ui.matchMode.textContent = state.mode === "online" ? "4v4 Duel" : "Solo Mashq";
};

const updateUI = () => {
  ui.score.textContent = state.score.toString();
  ui.wave.textContent = state.wave.toString();
  ui.hpBar.style.width = `${clamp(state.hp, 0, 100)}%`;
  ui.shieldBar.style.width = `${clamp(state.shield, 0, 100)}%`;
};

const pushFeed = (text) => {
  const items = ui.feed.querySelectorAll("li");
  if (items.length >= 6) {
    ui.feed.removeChild(ui.feed.lastChild);
  }
  const li = document.createElement("li");
  li.textContent = text;
  ui.feed.insertBefore(li, ui.feed.firstChild);
};

const buildRoster = () => {
  ui.roster.innerHTML = "";
  const roster = [
    { name: "YOU", ping: state.connected ? state.ping : 0 },
    { name: pick(namePool), ping: rand(18, 65) },
    { name: pick(namePool), ping: rand(22, 80) },
    { name: pick(namePool), ping: rand(30, 90) },
  ];
  roster.forEach((playerItem) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = playerItem.name;
    const ping = document.createElement("em");
    ping.textContent = `${Math.round(playerItem.ping)}ms`;
    li.appendChild(name);
    li.appendChild(ping);
    ui.roster.appendChild(li);
  });
};

const updateLeaderboard = () => {
  ui.leaderboard.innerHTML = "";
  const key = "mcs2-scores";
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (err) {
    stored = [];
  }
  const bots = [
    { name: pick(namePool), score: Math.round(rand(900, 1400)) },
    { name: pick(namePool), score: Math.round(rand(700, 1200)) },
    { name: pick(namePool), score: Math.round(rand(650, 1000)) },
  ];
  const list = [...stored, ...bots].sort((a, b) => b.score - a.score).slice(0, 6);
  list.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} — ${entry.score}`;
    ui.leaderboard.appendChild(li);
  });
};

const saveScore = () => {
  const key = "mcs2-scores";
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (err) {
    stored = [];
  }
  stored.push({ name: "YOU", score: state.score });
  stored = stored.sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem(key, JSON.stringify(stored));
};

const spawnParticle = (x, y, color = "#ffd400", size = 6, life = 0.5) => {
  particles.push({
    x,
    y,
    vx: rand(-50, 50),
    vy: rand(-50, 50),
    life,
    maxLife: life,
    size,
    color,
  });
};

const spawnBurst = (x, y, color) => {
  for (let i = 0; i < 8; i += 1) {
    spawnParticle(x, y, color, rand(4, 7), rand(0.3, 0.6));
  }
};

const spawnEnemy = (elite = false) => {
  const side = Math.floor(rand(0, 4));
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = rand(view.pad, view.w - view.pad);
    y = view.pad;
  } else if (side === 1) {
    x = view.w - view.pad;
    y = rand(view.pad, view.h - view.pad);
  } else if (side === 2) {
    x = rand(view.pad, view.w - view.pad);
    y = view.h - view.pad;
  } else {
    x = view.pad;
    y = rand(view.pad, view.h - view.pad);
  }
  enemies.push({
    x,
    y,
    r: elite ? 30 : rand(14, 20),
    speed: elite ? 75 : rand(70, 95),
    hp: elite ? 6 + state.wave : 1 + Math.floor(state.wave / 4),
    elite,
  });
};

const spawnWaveBoss = () => {
  spawnEnemy(true);
  pushFeed("BOSS keldi! Elite target yaqinlashmoqda.");
};

const spawnGhosts = () => {
  ghosts.length = 0;
  for (let i = 0; i < 2; i += 1) {
    ghosts.push({
      name: pick(namePool),
      x: rand(view.pad + 60, view.w - view.pad - 60),
      y: rand(view.pad + 60, view.h - view.pad - 60),
      r: 12,
      color: i === 0 ? "#26c6ff" : "#ff7ac8",
      targetX: rand(view.pad + 60, view.w - view.pad - 60),
      targetY: rand(view.pad + 60, view.h - view.pad - 60),
      cooldown: rand(0.5, 1.2),
    });
  }
};

const resetGame = (mode) => {
  state.mode = mode;
  state.running = true;
  state.score = 0;
  state.wave = 1;
  state.waveKills = 0;
  state.hp = 100;
  state.shield = 60;
  state.time = 0;
  state.lastHit = 0;
  state.shake = 0;

  player.x = view.w / 2;
  player.y = view.h / 2;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.dashVec = { x: 1, y: 0 };
  player.invuln = 0;

  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  spawnTimer = 0.4;

  spawnGhosts();
  buildRoster();
  updateLeaderboard();

  ui.feed.innerHTML = "";
  pushFeed("▶ Match boshlandi");
};

const connectSession = (mode) => {
  state.connected = mode === "online";
  state.ping = state.connected ? Math.round(rand(18, 65)) : 0;
  state.room = state.connected ? pick(rooms) : "Practice-01";
  state.server = state.connected ? pick(servers) : "Local";
  updateStatus();
  resetGame(mode);
  lastFrame = performance.now();
  requestAnimationFrame(loop);
};

const startSession = (mode) => {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
  }
  ui.startBtn.textContent = defaultStartLabel;
  ui.practiceBtn.textContent = defaultPracticeLabel;
  ui.overlay.classList.add("show", "loading");
  ui.overlayTitle.textContent = mode === "online" ? "Ulanmoqda..." : "Mashq rejimi";
  ui.overlayDesc.textContent = mode === "online" ? "Server qidirilmoqda..." : "Arena tayyorlanmoqda...";
  ui.overlayBadge.textContent = mode === "online" ? "ONLINE" : "PRACTICE";
  ui.overlayActions.style.opacity = "0.6";
  ui.startBtn.disabled = true;
  ui.practiceBtn.disabled = true;

  connectionTimer = setTimeout(() => {
    ui.overlay.classList.remove("show", "loading");
    ui.overlayTitle.textContent = "Matchmaking boshlansinmi?";
    ui.overlayDesc.textContent = "Joystick bilan yuring, o‘ng padda nishonlang. “Otish” tugmasini bosib turing.";
    ui.overlayBadge.textContent = "Mobile Online";
    ui.overlayActions.style.opacity = "1";
    ui.startBtn.disabled = false;
    ui.practiceBtn.disabled = false;
    connectSession(mode);
  }, mode === "online" ? 1300 : 600);
};

ui.startBtn.addEventListener("click", () => startSession("online"));
ui.practiceBtn.addEventListener("click", () => startSession("practice"));

const getKeyboardMove = () => {
  let x = 0;
  let y = 0;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
};

const resolveAim = (moveX, moveY) => {
  let ax = aimDir.x;
  let ay = aimDir.y;
  if (aim.active) {
    ax = aim.dx;
    ay = aim.dy;
  } else if (mouseAim.active) {
    const dx = mouseAim.x - player.x;
    const dy = mouseAim.y - player.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.5) {
      ax = dx / len;
      ay = dy / len;
    }
  } else if (moveX !== 0 || moveY !== 0) {
    ax = moveX;
    ay = moveY;
  } else if (enemies.length) {
    const target = enemies.reduce((best, enemy) => {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (!best || dist < best.dist) {
        return { enemy, dist };
      }
      return best;
    }, null);
    if (target) {
      const dx = target.enemy.x - player.x;
      const dy = target.enemy.y - player.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.5) {
        ax = dx / len;
        ay = dy / len;
      }
    }
  }
  aimDir.x = ax;
  aimDir.y = ay;
  if (!aim.active) {
    aimPad.style.setProperty("--aim-x", `${ax * 18}px`);
    aimPad.style.setProperty("--aim-y", `${ay * 18}px`);
  }
  return { x: ax, y: ay };
};

const spawnBullet = (x, y, dirX, dirY, speed, owner, color, damage = 1) => {
  bullets.push({
    x,
    y,
    vx: dirX * speed,
    vy: dirY * speed,
    r: owner === "player" ? 4 : 3,
    life: 0.8,
    owner,
    color,
    damage,
  });
};

const tryShoot = () => {
  if (!state.running || shootCooldown > 0) {
    return;
  }
  const dir = resolveAim(move.vx, move.vy);
  shootCooldown = 0.16;
  spawnBullet(
    player.x + dir.x * 18,
    player.y + dir.y * 18,
    dir.x,
    dir.y,
    620,
    "player",
    "#fff",
    1
  );
  spawnParticle(player.x + dir.x * 16, player.y + dir.y * 16, "#ffffff", 4, 0.25);
};

const attemptDash = () => {
  if (!state.running || player.dashCooldown > 0) {
    return;
  }
  const dir = resolveAim(move.vx, move.vy);
  player.dashTimer = 0.18;
  player.dashCooldown = 1.1;
  player.dashVec = { x: dir.x, y: dir.y };
  for (let i = 0; i < 6; i += 1) {
    spawnParticle(player.x, player.y, "#ffd400", rand(4, 7), rand(0.2, 0.4));
  }
};

const applyDamage = (amount) => {
  if (player.invuln > 0) {
    return;
  }
  let remaining = amount;
  if (state.shield > 0) {
    const absorbed = Math.min(state.shield, remaining);
    state.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    state.hp = clamp(state.hp - remaining, 0, 100);
  }
  player.invuln = 0.15;
  state.shake = Math.min(12, state.shake + 6);
  state.lastHit = state.time;
  if (state.hp <= 0) {
    endGame();
  }
};

const endGame = () => {
  state.running = false;
  saveScore();
  updateLeaderboard();
  ui.overlayTitle.textContent = "Match tugadi";
  ui.overlayDesc.textContent = `Score: ${state.score} | Wave: ${state.wave}`;
  ui.overlayBadge.textContent = "SUMMARY";
  ui.startBtn.textContent = "Qayta o'ynash";
  ui.practiceBtn.textContent = "Lobby";
  ui.overlay.classList.remove("loading");
  ui.overlay.classList.add("show");
};

const updateEnemies = (dt) => {
  let totalDamage = 0;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dist ? dx / dist : 0;
    const dirY = dist ? dy / dist : 0;
    enemy.x += dirX * enemy.speed * dt;
    enemy.y += dirY * enemy.speed * dt;
    if (dist < enemy.r + player.r) {
      totalDamage += (enemy.elite ? 26 : 16) * dt;
    }
  }
  if (totalDamage > 0) {
    applyDamage(totalDamage);
  }
};

const updateGhosts = (dt) => {
  ghosts.forEach((ghost) => {
    const dx = ghost.targetX - ghost.x;
    const dy = ghost.targetY - ghost.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 20) {
      ghost.targetX = rand(view.pad + 40, view.w - view.pad - 40);
      ghost.targetY = rand(view.pad + 40, view.h - view.pad - 40);
    } else {
      ghost.x += (dx / dist) * 90 * dt;
      ghost.y += (dy / dist) * 90 * dt;
    }
    ghost.cooldown -= dt;
    if (ghost.cooldown <= 0 && enemies.length) {
      const target = enemies.reduce((best, enemy) => {
        const d = Math.hypot(enemy.x - ghost.x, enemy.y - ghost.y);
        if (!best || d < best.dist) {
          return { enemy, dist: d };
        }
        return best;
      }, null);
      if (target) {
        const tx = target.enemy.x - ghost.x;
        const ty = target.enemy.y - ghost.y;
        const len = Math.hypot(tx, ty);
        const dirX = len ? tx / len : 0;
        const dirY = len ? ty / len : 0;
        spawnBullet(ghost.x, ghost.y, dirX, dirY, 480, "ghost", ghost.color, 1);
        ghost.cooldown = rand(0.6, 1.1);
      }
    }
  });
};

const updateBullets = (dt) => {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    const out =
      bullet.x < view.pad - 60 ||
      bullet.x > view.w - view.pad + 60 ||
      bullet.y < view.pad - 60 ||
      bullet.y > view.h - view.pad + 60;
    if (bullet.life <= 0 || out) {
      bullets.splice(i, 1);
      continue;
    }
    if (bullet.owner === "player" || bullet.owner === "ghost") {
      for (let j = enemies.length - 1; j >= 0; j -= 1) {
        const enemy = enemies[j];
        const dx = enemy.x - bullet.x;
        const dy = enemy.y - bullet.y;
        if (Math.hypot(dx, dy) < enemy.r + bullet.r) {
          enemy.hp -= bullet.damage;
          spawnBurst(bullet.x, bullet.y, "#ffd400");
          bullets.splice(i, 1);
          if (enemy.hp <= 0) {
            enemies.splice(j, 1);
            state.waveKills += 1;
            if (bullet.owner === "player") {
              state.score += enemy.elite ? 160 : 80;
              pushFeed(enemy.elite ? "YOU ▸ Elite target" : "YOU ▸ Bot yo‘q qilindi");
            } else {
              pushFeed("Squad ▸ Bot yo‘q qilindi");
            }
            spawnBurst(enemy.x, enemy.y, enemy.elite ? "#ff7ac8" : "#ff3b30");
          }
          break;
        }
      }
    }
  }
};

const updateParticles = (dt) => {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
};

const updateWave = () => {
  const target = 6 + state.wave * 3;
  if (state.waveKills >= target) {
    state.wave += 1;
    state.waveKills = 0;
    state.shield = clamp(state.shield + 15, 0, 100);
    spawnWaveBoss();
  }
};

const updateSpawns = (dt) => {
  spawnTimer -= dt;
  const desired = 4 + state.wave * 2;
  if (spawnTimer <= 0 && enemies.length < desired) {
    spawnEnemy(false);
    spawnTimer = Math.max(0.35, 1.2 - state.wave * 0.06);
  }
};

const updatePlayer = (dt, moveX, moveY) => {
  const speed = player.speed;
  player.x += moveX * speed * dt;
  player.y += moveY * speed * dt;
  if (player.dashTimer > 0) {
    player.x += player.dashVec.x * speed * 3 * dt;
    player.y += player.dashVec.y * speed * 3 * dt;
    player.dashTimer -= dt;
  }
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.x = clamp(player.x, view.pad, view.w - view.pad);
  player.y = clamp(player.y, view.pad, view.h - view.pad);
};

const update = (dt) => {
  if (!state.running) {
    return;
  }
  state.time += dt;
  if (shootCooldown > 0) {
    shootCooldown -= dt;
  }

  if (fireHeld) {
    tryShoot();
  }

  const keyboardMove = getKeyboardMove();
  const moveX = move.active ? move.vx : keyboardMove.x;
  const moveY = move.active ? move.vy : keyboardMove.y;

  resolveAim(moveX, moveY);
  updatePlayer(dt, moveX, moveY);
  updateEnemies(dt);
  updateGhosts(dt);
  updateBullets(dt);
  updateParticles(dt);
  updateSpawns(dt);
  updateWave();

  if (state.time - state.lastHit > 2 && state.shield < 100) {
    state.shield = clamp(state.shield + 8 * dt, 0, 100);
  }

  uiTimer += dt;
  if (uiTimer > 0.12) {
    uiTimer = 0;
    updateUI();
  }
};

const drawPlayer = () => {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#fefefe";
  ctx.strokeStyle = "#0c0c12";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#26c6ff";
  ctx.beginPath();
  ctx.arc(4, -4, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + aimDir.x * 36, player.y + aimDir.y * 36);
  ctx.stroke();
};

const drawGhosts = () => {
  ghosts.forEach((ghost) => {
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.fillStyle = ghost.color;
    ctx.strokeStyle = "#0b0b0f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ghost.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
};

const drawEnemies = () => {
  enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.elite ? "#ff7ac8" : "#ff3b30";
    ctx.strokeStyle = "#0c0c12";
    ctx.lineWidth = enemy.elite ? 4 : 3;
    ctx.beginPath();
    const spikes = enemy.elite ? 6 : 4;
    for (let i = 0; i < spikes; i += 1) {
      const angle = (Math.PI * 2 * i) / spikes;
      const radius = enemy.r + (i % 2 === 0 ? 6 : -4);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
};

const drawBullets = () => {
  bullets.forEach((bullet) => {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.fillStyle = bullet.color;
    ctx.strokeStyle = "#0c0c12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
};

const drawParticles = () => {
  particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

const drawArena = () => {
  ctx.fillStyle = bgGradient || "#0b0c12";
  ctx.fillRect(0, 0, view.w, view.h);
  if (dotPattern) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = dotPattern;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(view.pad, view.pad, view.w - view.pad * 2, view.h - view.pad * 2);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    ctx.moveTo(view.w * 0.1 + i * 20, view.pad);
    ctx.lineTo(view.w * 0.3 + i * 30, view.h - view.pad);
    ctx.stroke();
  }
  ctx.restore();
};

const render = () => {
  ctx.clearRect(0, 0, view.w, view.h);
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    state.shake = Math.max(0, state.shake - 0.8);
  }
  drawArena();
  drawGhosts();
  drawEnemies();
  drawBullets();
  drawParticles();
  drawPlayer();
  ctx.restore();
};

const loop = (time) => {
  const dt = Math.min(0.033, (time - lastFrame) / 1000 || 0);
  lastFrame = time;
  update(dt);
  render();
  if (state.running) {
    requestAnimationFrame(loop);
  }
};

const startFeedLoop = () => {
  if (feedTimer) {
    clearInterval(feedTimer);
  }
  feedTimer = setInterval(() => {
    if (!state.running) {
      return;
    }
    const entries = [
      `${pick(namePool)} ▸ Bot yo‘q qildi`,
      `${pick(namePool)} ▸ Headshot`,
      `${pick(namePool)} ▸ Double takedown`,
      "Squad ▸ Assist",
    ];
    pushFeed(pick(entries));
  }, 2200);
};

resize();
updateStatus();
updateUI();
startFeedLoop();
