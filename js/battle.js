// ============================================================
// バトルのルール: ダメージ計算・相性・敵のわざ選び
// ============================================================

function typeMultiplier(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (mult, t) => mult * (TYPE_CHART[moveType]?.[t] ?? 1), 1
  );
}

// 本家第3世代に近いダメージ計算
function calcDamage(attacker, defender, move) {
  const isPhysical = move.damageClass === 'physical';
  const atk = isPhysical ? attacker.stats.atk : attacker.stats.spAtk;
  const def = isPhysical ? defender.stats.def : defender.stats.spDef;

  const base = Math.floor(
    Math.floor(Math.floor(2 * attacker.level / 5 + 2) * move.power * atk / def) / 50
  ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeMultiplier(move.type, defender.types);
  const critical = Math.random() < 1 / 16 ? 2 : 1;
  const random = 0.85 + Math.random() * 0.15;

  const damage = Math.max(
    effectiveness === 0 ? 0 : 1,
    Math.floor(base * stab * effectiveness * critical * random)
  );
  return { damage, effectiveness, critical: critical > 1 };
}

function accuracyCheck(move) {
  return Math.random() * 100 < move.accuracy;
}

function effectivenessMessage(effectiveness) {
  if (effectiveness === 0) return 'こうかは ないみたいだ…';
  if (effectiveness >= 2) return 'こうかは ばつぐんだ！';
  if (effectiveness < 1) return 'こうかは いまひとつのようだ…';
  return null;
}

// 敵AI: 7割は期待ダメージが最大のわざ、3割はランダム(子供向けに少しゆるく)
function chooseEnemyMove(enemy, player) {
  const usable = enemy.moves.filter(m => m.pp > 0);
  if (usable.length === 0) return { ...FALLBACK_MOVE };
  if (Math.random() < 0.3) {
    return usable[Math.floor(Math.random() * usable.length)];
  }
  let best = usable[0];
  let bestScore = -1;
  for (const mv of usable) {
    const stab = enemy.types.includes(mv.type) ? 1.5 : 1;
    const score = mv.power * stab * typeMultiplier(mv.type, player.types)
                * (mv.accuracy / 100);
    if (score > bestScore) { bestScore = score; best = mv; }
  }
  return best;
}

// すばやさで行動順を決める(同速はランダム)
function firstMover(player, enemy) {
  if (player.stats.speed === enemy.stats.speed) {
    return Math.random() < 0.5 ? 'player' : 'enemy';
  }
  return player.stats.speed > enemy.stats.speed ? 'player' : 'enemy';
}
