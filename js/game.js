// ============================================================
// 画面の切りかえ・バトル進行・アニメーション
// ============================================================

const $ = sel => document.querySelector(sel);
const wait = ms => new Promise(r => setTimeout(r, ms));

const state = {
  player: null,
  enemy: null,
  playerId: null,
  busy: false,
};

// ---------- 画面切りかえ ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ---------- メッセージ(1文字ずつ表示、タップで送り) ----------
function showMessage(text, { hold = 900 } = {}) {
  return new Promise(resolve => {
    const box = $('#message-box');
    const p = $('#message-text');
    const next = $('#message-next');
    next.classList.add('hidden');
    p.textContent = '';

    let i = 0;
    let finished = false;
    let timer = setInterval(() => {
      p.textContent = text.slice(0, ++i);
      if (i >= text.length) finishTyping();
    }, 28);

    function finishTyping() {
      clearInterval(timer);
      p.textContent = text;
      if (finished) return;
      finished = true;
      next.classList.remove('hidden');
      const holdTimer = setTimeout(done, hold);
      box.addEventListener('pointerdown', onTap);
      function onTap() { clearTimeout(holdTimer); done(); }
      function done() {
        box.removeEventListener('pointerdown', onTap);
        next.classList.add('hidden');
        resolve();
      }
    }
    // タップで全文表示
    box.addEventListener('pointerdown', function skip() {
      box.removeEventListener('pointerdown', skip);
      if (!finished) { i = text.length; finishTyping(); }
    });
  });
}

// ---------- 選択画面 ----------
function renderSelectScreen() {
  const grid = $('#select-grid');
  grid.innerHTML = '';
  STARTER_ROSTER.forEach((p, idx) => {
    const card = document.createElement('button');
    card.className = 'poke-card';
    card.style.animationDelay = `${idx * 70}ms`;
    card.innerHTML = `
      <img src="${artworkUrl(p.id)}" alt="${p.ja}" loading="lazy">
      <span class="card-name">${p.ja}</span>
      <span class="card-types">${p.types.map(t =>
        `<i class="type-badge" style="background:${TYPE_COLOR[t]}">${TYPE_JA[t]}</i>`).join('')}
      </span>`;
    card.addEventListener('click', () => {
      Sound.confirm();
      startBattle(p.id);
    });
    grid.appendChild(card);
  });
}

// ---------- HPバー ----------
function updateHpBar(who) {
  const f = state[who];
  const fill = $(`#${who}-hp-fill`);
  const ratio = Math.max(0, f.hp / f.stats.maxHp);
  fill.style.width = `${ratio * 100}%`;
  fill.classList.toggle('hp-mid', ratio <= 0.5 && ratio > 0.2);
  fill.classList.toggle('hp-low', ratio <= 0.2);
  if (who === 'player') {
    $('#player-hp-text').textContent = `${Math.max(0, f.hp)} / ${f.stats.maxHp}`;
  }
}

function setupBattleUi() {
  const { player, enemy } = state;
  $('#player-name').textContent = player.name;
  $('#player-level').textContent = `Lv.${player.level}`;
  $('#enemy-name').textContent = enemy.name;
  $('#enemy-level').textContent = `Lv.${enemy.level}`;
  $('#player-sprite').src = player.sprites.back;
  $('#enemy-sprite').src = enemy.sprites.front;
  updateHpBar('player');
  updateHpBar('enemy');

  const wraps = ['#player-sprite-wrap', '#enemy-sprite-wrap'];
  wraps.forEach(sel => {
    const el = $(sel);
    el.classList.remove('fainted', 'enter-left', 'enter-right');
    void el.offsetWidth; // 再戦時にもアニメーションを再生し直すためのリフロー
  });
  $('#player-sprite-wrap').classList.add('enter-left');
  $('#enemy-sprite-wrap').classList.add('enter-right');
}

// ---------- わざメニュー ----------
function renderMoveMenu() {
  const grid = $('#move-grid');
  grid.innerHTML = '';
  state.player.moves.forEach(mv => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.style.setProperty('--type-color', TYPE_COLOR[mv.type]);
    btn.disabled = mv.pp <= 0;
    btn.innerHTML = `
      <span class="move-name">${mv.ja}</span>
      <span class="move-meta">
        <i class="type-badge" style="background:${TYPE_COLOR[mv.type]}">${TYPE_JA[mv.type]}</i>
        <span class="move-pp">PP ${mv.pp}/${mv.maxPp}</span>
      </span>`;
    btn.addEventListener('click', () => {
      if (state.busy) return;
      Sound.confirm();
      hideMenus();
      runTurn(mv);
    });
    grid.appendChild(btn);
  });
}

function showCommandMenu() {
  $('#command-menu').classList.remove('hidden');
  $('#move-menu').classList.add('hidden');
  $('#message-text').textContent = `${state.player.name} は どうする？`;
}

function hideMenus() {
  $('#command-menu').classList.add('hidden');
  $('#move-menu').classList.add('hidden');
}

// ---------- 攻撃の見た目 ----------
function spawnDamagePopup(who, text, kind) {
  const wrap = $(`#${who}-sprite-wrap`);
  const pop = document.createElement('span');
  pop.className = `dmg-pop ${kind || ''}`;
  pop.textContent = text;
  wrap.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);
}

async function animateAttack(attackerWho, defenderWho, effectiveness) {
  const attacker = $(`#${attackerWho}-sprite-wrap`);
  const defender = $(`#${defenderWho}-sprite-wrap`);
  const scene = $('#battle-scene');

  attacker.classList.add(attackerWho === 'player' ? 'lunge-fwd' : 'lunge-back');
  await wait(220);

  if (effectiveness >= 2) { Sound.superHit(); scene.classList.add('shake-hard'); }
  else if (effectiveness === 0) { /* 無効はヒット演出なし */ }
  else if (effectiveness < 1) { Sound.weakHit(); }
  else { Sound.hit(); scene.classList.add('shake'); }

  if (effectiveness > 0) defender.classList.add('hit-flash');
  await wait(420);

  attacker.classList.remove('lunge-fwd', 'lunge-back');
  defender.classList.remove('hit-flash');
  scene.classList.remove('shake', 'shake-hard');
}

async function animateFaint(who) {
  Sound.faint();
  $(`#${who}-sprite-wrap`).classList.add('fainted');
  await wait(800);
}

// ---------- 1回の攻撃 ----------
async function performMove(attackerWho, move) {
  const defenderWho = attackerWho === 'player' ? 'enemy' : 'player';
  const attacker = state[attackerWho];
  const defender = state[defenderWho];
  const prefix = attackerWho === 'enemy' ? 'あいての ' : '';

  move.pp = Math.max(0, move.pp - 1);
  await showMessage(`${prefix}${attacker.name} の ${move.ja}！`, { hold: 500 });

  if (!accuracyCheck(move)) {
    Sound.miss();
    spawnDamagePopup(defenderWho, 'MISS', 'pop-miss');
    await showMessage('しかし うまく きまらなかった！');
    return false;
  }

  const result = calcDamage(attacker, defender, move);
  await animateAttack(attackerWho, defenderWho, result.effectiveness);

  if (result.effectiveness > 0) {
    defender.hp = Math.max(0, defender.hp - result.damage);
    spawnDamagePopup(defenderWho, `-${result.damage}`,
      result.effectiveness >= 2 ? 'pop-super' : '');
    updateHpBar(defenderWho);
  }

  if (result.critical && result.effectiveness > 0) {
    await showMessage('きゅうしょに あたった！');
  }
  const effMsg = effectivenessMessage(result.effectiveness);
  if (effMsg) await showMessage(effMsg);

  if (defender.hp <= 0) {
    await animateFaint(defenderWho);
    const defPrefix = defenderWho === 'enemy' ? 'あいての ' : '';
    await showMessage(`${defPrefix}${defender.name} は たおれた！`);
    await endBattle(defenderWho === 'enemy');
    return true; // バトル終了
  }
  return false;
}

// ---------- 1ターンの進行 ----------
async function runTurn(playerMove) {
  state.busy = true;
  const enemyMove = chooseEnemyMove(state.enemy, state.player);
  const order = firstMover(state.player, state.enemy) === 'player'
    ? [['player', playerMove], ['enemy', enemyMove]]
    : [['enemy', enemyMove], ['player', playerMove]];

  for (const [who, move] of order) {
    const finished = await performMove(who, move);
    if (finished) return;
  }

  state.busy = false;
  renderMoveMenu();
  showCommandMenu();
}

// ---------- バトル開始と終了 ----------
async function startBattle(playerId, rematch = false) {
  state.playerId = playerId;
  showScreen('#screen-loading');
  $('#loading-text').textContent = 'バトルの じゅんびちゅう…';

  try {
    let enemyId;
    do {
      enemyId = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
    } while (enemyId === playerId);

    const [player, enemy] = await Promise.all([
      loadFighter(playerId),
      loadFighter(enemyId),
    ]);
    state.player = player;
    state.enemy = enemy;
  } catch (err) {
    console.error(err);
    showScreen('#screen-error');
    return;
  }

  setupBattleUi();
  showScreen('#screen-battle');
  state.busy = true;

  await showMessage(`あいての ${state.enemy.name} が しょうぶを しかけてきた！`);
  await showMessage(`ゆけっ！ ${state.player.name}！`);

  state.busy = false;
  renderMoveMenu();
  showCommandMenu();
}

async function endBattle(playerWon) {
  await wait(400);
  const f = playerWon ? state.player : state.enemy;
  $('#result-title').textContent = playerWon ? '🎉 しょうり！ 🎉' : 'まけちゃった…';
  $('#result-img').src = artworkUrl(f.id);
  $('#result-text').textContent = playerWon
    ? `${state.player.name} は あいての ${state.enemy.name} に かった！`
    : `${state.enemy.name} は つよかった… つぎは きっと かてるよ！`;
  $('#screen-result').classList.toggle('result-win', playerWon);
  showScreen('#screen-result');
  if (playerWon) Sound.victory(); else Sound.lose();
}

// ---------- イベント登録 ----------
function init() {
  renderSelectScreen();

  $('#btn-start').addEventListener('click', () => {
    Sound.confirm();
    showScreen('#screen-select');
  });

  $('#btn-fight').addEventListener('click', () => {
    if (state.busy) return;
    Sound.select();
    $('#command-menu').classList.add('hidden');
    $('#move-menu').classList.remove('hidden');
    $('#message-text').textContent = 'どのわざを つかう？';
  });

  $('#btn-move-back').addEventListener('click', () => {
    Sound.select();
    showCommandMenu();
  });

  $('#btn-run').addEventListener('click', async () => {
    if (state.busy) return;
    state.busy = true;
    Sound.select();
    hideMenus();
    await showMessage('うまく にげきれた！');
    showScreen('#screen-select');
    state.busy = false;
  });

  $('#btn-rematch').addEventListener('click', () => {
    Sound.confirm();
    startBattle(state.playerId, true);
  });

  $('#btn-newpoke').addEventListener('click', () => {
    Sound.confirm();
    showScreen('#screen-select');
  });

  $('#btn-retry').addEventListener('click', () => {
    Sound.confirm();
    if (state.playerId) startBattle(state.playerId);
    else showScreen('#screen-select');
  });

  $('#btn-sound').addEventListener('click', () => {
    const muted = Sound.toggle();
    $('#btn-sound').textContent = muted ? '🔇' : '🔊';
  });
}

document.addEventListener('DOMContentLoaded', init);
