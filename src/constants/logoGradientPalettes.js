/** @typedef {'generate' | 'grade' | 'any'} LogoGradientToneTag */

/**
 * Logo 隨機漸層色盤（全站僅能從此 20 組雙色漸層取得）
 * @typedef {object} LogoGradientPalette
 * @property {string} id
 * @property {string} label
 * @property {number} angleDeg
 * @property {Array<{ offset: string, color: string }>} stops
 * @property {string} x1
 * @property {string} y1
 * @property {string} x2
 * @property {string} y2
 * @property {string} css
 * @property {LogoGradientToneTag[]} tones
 * @property {boolean} [work3] exam_3／create-exam-bank_3 色偏專用
 */

function angleDegToSvgDirection(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const halfLen = 70;
  const cx = 50;
  const cy = 50;
  const dx = Math.sin(rad) * halfLen;
  const dy = -Math.cos(rad) * halfLen;
  return {
    x1: `${cx - dx}%`,
    y1: `${cy - dy}%`,
    x2: `${cx + dx}%`,
    y2: `${cy + dy}%`,
  };
}

function buildPalette({ id, label, angleDeg, colorStart, colorEnd, tones, work3 = false }) {
  const stops = [
    { offset: '0%', color: colorStart },
    { offset: '100%', color: colorEnd },
  ];
  const dir = angleDegToSvgDirection(angleDeg);
  const css = `linear-gradient(${angleDeg}deg, ${colorStart} 0%, ${colorEnd} 100%)`;
  return { id, label, angleDeg, stops, ...dir, css, tones, work3 };
}

/**
 * 對比色雙色漸層（互補／分裂互補）；色調偏亮（約 300–400 色階），避免深色系。
 * @type {LogoGradientPalette[]}
 */
export const LOGO_GRADIENT_PALETTES = [
  buildPalette({
    id: 'grad-01',
    label: '藍紅焰',
    angleDeg: 180,
    colorStart: '#60a5fa',
    colorEnd: '#f87171',
    tones: ['generate'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-02',
    label: '藍黃電',
    angleDeg: 180,
    colorStart: '#60a5fa',
    colorEnd: '#fde047',
    tones: ['generate'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-03',
    label: '青橘衝',
    angleDeg: 147,
    colorStart: '#22d3ee',
    colorEnd: '#fb923c',
    tones: ['generate'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-04',
    label: '綠紫對',
    angleDeg: 135,
    colorStart: '#4ade80',
    colorEnd: '#c084fc',
    tones: ['generate'],
  }),
  buildPalette({
    id: 'grad-05',
    label: '靛黃光',
    angleDeg: 140,
    colorStart: '#818cf8',
    colorEnd: '#fde047',
    tones: ['generate'],
  }),
  buildPalette({
    id: 'grad-06',
    label: '紅藍焰',
    angleDeg: 180,
    colorStart: '#f87171',
    colorEnd: '#60a5fa',
    tones: ['grade'],
  }),
  buildPalette({
    id: 'grad-07',
    label: '玫青電',
    angleDeg: 138,
    colorStart: '#fb7185',
    colorEnd: '#22d3ee',
    tones: ['grade'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-08',
    label: '橙藍衝',
    angleDeg: 147,
    colorStart: '#fb923c',
    colorEnd: '#60a5fa',
    tones: ['grade'],
  }),
  buildPalette({
    id: 'grad-09',
    label: '紅綠裂',
    angleDeg: 150,
    colorStart: '#f87171',
    colorEnd: '#4ade80',
    tones: ['grade'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-10',
    label: '黃紅流',
    angleDeg: 147,
    colorStart: '#fde047',
    colorEnd: '#f87171',
    tones: ['grade'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-11',
    label: '藍玫霓',
    angleDeg: 125,
    colorStart: '#60a5fa',
    colorEnd: '#f472b6',
    tones: ['generate'],
  }),
  buildPalette({
    id: 'grad-12',
    label: '海綠紅',
    angleDeg: 155,
    colorStart: '#2dd4bf',
    colorEnd: '#f87171',
    tones: ['generate'],
  }),
  buildPalette({
    id: 'grad-13',
    label: '钴橘裂',
    angleDeg: 132,
    colorStart: '#60a5fa',
    colorEnd: '#fb923c',
    tones: ['generate'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-14',
    label: '柠紫衝',
    angleDeg: 148,
    colorStart: '#a3e635',
    colorEnd: '#c084fc',
    tones: ['generate'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-15',
    label: '青紫電',
    angleDeg: 142,
    colorStart: '#22d3ee',
    colorEnd: '#c084fc',
    tones: ['generate'],
  }),
  buildPalette({
    id: 'grad-16',
    label: '黃紫裂',
    angleDeg: 180,
    colorStart: '#fde047',
    colorEnd: '#c084fc',
    tones: ['grade'],
  }),
  buildPalette({
    id: 'grad-17',
    label: '橘綠對',
    angleDeg: 142,
    colorStart: '#fb923c',
    colorEnd: '#34d399',
    tones: ['any'],
  }),
  buildPalette({
    id: 'grad-18',
    label: '玫藍光',
    angleDeg: 128,
    colorStart: '#f472b6',
    colorEnd: '#38bdf8',
    tones: ['grade'],
  }),
  buildPalette({
    id: 'grad-19',
    label: '橙紫電',
    angleDeg: 136,
    colorStart: '#fb923c',
    colorEnd: '#a78bfa',
    tones: ['grade'],
    work3: true,
  }),
  buildPalette({
    id: 'grad-20',
    label: '黃藍焰',
    angleDeg: 180,
    colorStart: '#fde047',
    colorEnd: '#60a5fa',
    tones: ['grade'],
  }),
];

/**
 * @param {{ tone?: string, bias?: string }} [options]
 * @returns {LogoGradientPalette[]}
 */
export function filterLogoGradientPalettePool(options = {}) {
  const { tone, bias } = options;
  let pool = LOGO_GRADIENT_PALETTES;

  if (tone === 'generate' || tone === 'grade') {
    pool = pool.filter((p) => p.tones.includes(tone) || p.tones.includes('any'));
  }

  if (bias === 'work3') {
    const work3Pool = pool.filter((p) => p.work3);
    if (work3Pool.length) pool = work3Pool;
  } else if (bias === 'default') {
    const defaultPool = pool.filter((p) => !p.work3);
    if (defaultPool.length) pool = defaultPool;
  }

  return pool;
}

/**
 * @param {{ tone?: string, bias?: string, excludeIds?: string[] }} [options]
 * @returns {LogoGradientPalette}
 */
export function pickRandomLogoGradientPalette(options = {}) {
  const excludeIds = options.excludeIds ?? [];
  let pool = filterLogoGradientPalettePool(options).filter((p) => !excludeIds.includes(p.id));
  if (!pool.length) {
    pool = filterLogoGradientPalettePool(options);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 一次選多組互不重複的色盤（Logo 雙層漸層、header 左右半區等）
 * @param {number} count
 * @param {{ tone?: string, bias?: string, excludeIds?: string[] }} [options]
 * @returns {LogoGradientPalette[]}
 */
export function pickDistinctRandomLogoGradientPalettes(count, options = {}) {
  const picked = [];
  const excludeIds = [...(options.excludeIds ?? [])];

  for (let i = 0; i < count; i += 1) {
    const palette = pickRandomLogoGradientPalette({ ...options, excludeIds });
    picked.push(palette);
    excludeIds.push(palette.id);
  }

  return picked;
}
