// ============================================================
// 静的データ: タイプ相性・タイプ名・色・ポケモン一覧
// ============================================================

// タイプ相性表(攻撃側 → 防御側)。記載のない組み合わせは等倍(1)。
const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

const TYPE_JA = {
  normal: 'ノーマル', fire: 'ほのお', water: 'みず', electric: 'でんき',
  grass: 'くさ', ice: 'こおり', fighting: 'かくとう', poison: 'どく',
  ground: 'じめん', flying: 'ひこう', psychic: 'エスパー', bug: 'むし',
  rock: 'いわ', ghost: 'ゴースト', dragon: 'ドラゴン', dark: 'あく',
  steel: 'はがね', fairy: 'フェアリー',
};

const TYPE_COLOR = {
  normal: '#9fa19f', fire: '#e6603e', water: '#3f8fdd', electric: '#f2c63a',
  grass: '#52a83b', ice: '#6fc7e0', fighting: '#cc4d3f', poison: '#9e4e9c',
  ground: '#b8935a', flying: '#8aa2dd', psychic: '#e26a8d', bug: '#94a93a',
  rock: '#aa9a66', ghost: '#6c5a93', dragon: '#5663c2', dark: '#5a504e',
  steel: '#7f8e9c', fairy: '#e791c9',
};

// パートナーとして選べるポケモン(名前とタイプは表示用にあらかじめ持っておく)
const STARTER_ROSTER = [
  { id: 25,  ja: 'ピカチュウ',  types: ['electric'] },
  { id: 6,   ja: 'リザードン',  types: ['fire', 'flying'] },
  { id: 9,   ja: 'カメックス',  types: ['water'] },
  { id: 3,   ja: 'フシギバナ',  types: ['grass', 'poison'] },
  { id: 133, ja: 'イーブイ',    types: ['normal'] },
  { id: 94,  ja: 'ゲンガー',    types: ['ghost', 'poison'] },
  { id: 448, ja: 'ルカリオ',    types: ['fighting', 'steel'] },
  { id: 149, ja: 'カイリュー',  types: ['dragon', 'flying'] },
  { id: 59,  ja: 'ウインディ',  types: ['fire'] },
];

// 相手としてあらわれるポケモン(全国図鑑ID。第5世代までならアニメスプライトあり)
const ENEMY_POOL = [
  25, 6, 9, 3, 133, 94, 448, 149, 59,
  65,  // フーディン
  130, // ギャラドス
  143, // カビゴン
  196, // エーフィ
  197, // ブラッキー
  212, // ハッサム
  248, // バンギラス
  254, // ジュカイン
  257, // バシャーモ
  260, // ラグラージ
  282, // サーナイト
  373, // ボーマンダ
  445, // ガブリアス
  468, // トゲキッス
  547, // エルフーン
  609, // シャンデラ
];

// 公式アートワークのURL(選択画面用。APIを呼ばずに表示できる)
function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// 通信に失敗したときなどの保険のわざ
const FALLBACK_MOVE = {
  ja: 'たいあたり', type: 'normal', power: 40, accuracy: 100,
  pp: 35, maxPp: 35, damageClass: 'physical',
};
