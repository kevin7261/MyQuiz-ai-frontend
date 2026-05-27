/** 中央菱形：隨機鮮豔二色線性漸層（系統 header、按鈕 LogoCenterMark 共用） */
export function createRandomLogoDiamondGradient(options = {}) {
  const { tone } = options;
  const sat = 96 + Math.floor(Math.random() * 4);
  const dirs = [
    { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
    { x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
    { x1: '0%', y1: '50%', x2: '100%', y2: '50%' },
    { x1: '50%', y1: '0%', x2: '50%', y2: '100%' },
  ];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];

  let hue1;
  let hue2;
  if (tone === 'generate') {
    if (options.bias === 'work3') {
      /** work3 開始出題：藍色漸層（青藍～藍） */
      hue1 = 210 + Math.floor(Math.random() * 28);
      hue2 = clampHue(hue1 - 18 - Math.floor(Math.random() * 22), 195, 240);
    } else {
      /** 產生題目：偏藍綠（青～藍綠） */
      hue1 = 155 + Math.floor(Math.random() * 45);
      hue2 = clampHue(hue1 + 20 + Math.floor(Math.random() * 35), 140, 215);
    }
  } else if (tone === 'grade') {
    if (options.bias === 'work3') {
      /** work3 開始批改：紅色漸層（玫紅～紅） */
      if (Math.random() < 0.5) {
        hue1 = 352 + Math.floor(Math.random() * 8);
        hue2 = clampHue(hue1 - 10 - Math.floor(Math.random() * 14), 335, 360);
      } else {
        hue1 = 2 + Math.floor(Math.random() * 14);
        hue2 = clampHue(hue1 + 12 + Math.floor(Math.random() * 16), 0, 28);
      }
    } else {
      /** 開始批改：偏紅橘 */
      hue1 = 5 + Math.floor(Math.random() * 38);
      hue2 = clampHue(hue1 + 18 + Math.floor(Math.random() * 32), 0, 55);
    }
  } else {
    const vividHues = [0, 18, 32, 48, 120, 155, 195, 220, 265, 290, 315, 340];
    hue1 = vividHues[Math.floor(Math.random() * vividHues.length)]
      + Math.floor(Math.random() * 14) - 7;
    hue2 = (hue1 + 55 + Math.floor(Math.random() * 95)) % 360;
  }

  return {
    ...dir,
    stops: [
      { offset: '0%', color: `hsl(${hue1}, ${sat}%, ${50 + Math.floor(Math.random() * 8)}%)` },
      { offset: '100%', color: `hsl(${hue2}, ${sat}%, ${44 + Math.floor(Math.random() * 10)}%)` },
    ],
  };
}

function clampHue(hue, min, max) {
  let h = ((hue % 360) + 360) % 360;
  if (h < min) h = min;
  if (h > max) h = max;
  return h;
}

/** 將 {@link createRandomLogoDiamondGradient} 轉為 CSS linear-gradient（按鈕背景用） */
export function logoDiamondGradientToCssLinear(gradient) {
  if (!gradient?.stops?.length) return 'transparent';
  const parsePct = (v) => Number.parseFloat(String(v ?? '0').replace('%', '')) || 0;
  const x1 = parsePct(gradient.x1);
  const y1 = parsePct(gradient.y1);
  const x2 = parsePct(gradient.x2);
  const y2 = parsePct(gradient.y2);
  const angle = Math.round((Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI);
  const stops = gradient.stops.map((s) => `${s.color} ${s.offset}`).join(', ');
  return `linear-gradient(${angle}deg, ${stops})`;
}
