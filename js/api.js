// ============================================================
// PokeAPI からポケモン・わざのデータを取得する
// ============================================================

const API_BASE = 'https://pokeapi.co/api/v2';
const apiCache = new Map();

async function fetchJson(url) {
  if (apiCache.has(url)) return apiCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url} (${res.status})`);
  const json = await res.json();
  apiCache.set(url, json);
  return json;
}

function jaName(names, fallback) {
  const hit = names.find(n => n.language.name === 'ja-Hrkt')
           || names.find(n => n.language.name === 'ja');
  return hit ? hit.name : fallback;
}

// レベル50時点の実数値(性格・個体値・努力値は子供向けに省略)
function calcStats(baseStats, level) {
  const get = key => baseStats.find(s => s.stat.name === key).base_stat;
  return {
    maxHp:  Math.floor(2 * get('hp') * level / 100) + level + 10,
    atk:    Math.floor(2 * get('attack') * level / 100) + 5,
    def:    Math.floor(2 * get('defense') * level / 100) + 5,
    spAtk:  Math.floor(2 * get('special-attack') * level / 100) + 5,
    spDef:  Math.floor(2 * get('special-defense') * level / 100) + 5,
    speed:  Math.floor(2 * get('speed') * level / 100) + 5,
  };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 覚えるわざの中から「ダメージを与えるわざ」を最大4つ選ぶ。
// なるべくタイプ一致を1つ以上、タイプがばらけるように選ぶ。
async function pickMoves(pokemonData) {
  const candidates = shuffle(pokemonData.moves).slice(0, 18);
  const results = await Promise.allSettled(
    candidates.map(m => fetchJson(m.move.url))
  );

  const damaging = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const mv = r.value;
    if (mv.power == null || mv.power < 30) continue;
    if (mv.damage_class.name === 'status') continue;
    damaging.push({
      ja: jaName(mv.names, mv.name),
      type: mv.type.name,
      power: mv.power,
      accuracy: mv.accuracy ?? 100,
      pp: mv.pp,
      maxPp: mv.pp,
      damageClass: mv.damage_class.name,
    });
  }

  if (damaging.length === 0) return [{ ...FALLBACK_MOVE }];

  const myTypes = pokemonData.types.map(t => t.type.name);
  const stab = damaging.filter(m => myTypes.includes(m.type))
                       .sort((a, b) => b.power - a.power);
  const others = damaging.filter(m => !myTypes.includes(m.type))
                         .sort((a, b) => b.power - a.power);

  const picked = [];
  const usedTypes = new Set();
  const tryAdd = mv => {
    if (picked.length >= 4) return;
    if (picked.some(p => p.ja === mv.ja)) return;
    if (usedTypes.has(mv.type) && picked.length < 3) return; // タイプの重複は後回し
    picked.push(mv);
    usedTypes.add(mv.type);
  };
  stab.slice(0, 2).forEach(tryAdd);
  others.forEach(tryAdd);
  // まだ4つに満たなければタイプ重複も許して埋める
  [...stab, ...others].forEach(mv => {
    if (picked.length < 4 && !picked.some(p => p.ja === mv.ja)) picked.push(mv);
  });

  return picked.slice(0, 4);
}

function pickSprites(pokemonData) {
  const s = pokemonData.sprites;
  const animated = s.versions?.['generation-v']?.['black-white']?.animated;
  return {
    front: animated?.front_default || s.front_default || s.other?.['official-artwork']?.front_default,
    back:  animated?.back_default  || s.back_default  || animated?.front_default || s.front_default,
  };
}

// バトルに出すポケモン一体ぶんのデータをまとめて取得
async function loadFighter(id, level = 50) {
  const data = await fetchJson(`${API_BASE}/pokemon/${id}`);
  const [species, moves] = await Promise.all([
    fetchJson(data.species.url),
    pickMoves(data),
  ]);
  const stats = calcStats(data.stats, level);
  return {
    id,
    name: jaName(species.names, data.name),
    level,
    types: data.types.map(t => t.type.name),
    stats,
    hp: stats.maxHp,
    moves,
    sprites: pickSprites(data),
  };
}
