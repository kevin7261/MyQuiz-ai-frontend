/** 0–360° 任意方向的線性漸層向量（對應 CSS linear-gradient 角度） */
function createRandomGradientDirection() {
  const angleDeg = Math.floor(Math.random() * 360);
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

function mixHue(a, b, t) {
  const delta = ((b - a + 540) % 360) - 180;
  return clampHue(a + delta * t, 0, 360);
}

/** 中央菱形：隨機鮮豔二色線性漸層（系統 header、按鈕 LogoCenterMark 共用） */
export function createRandomLogoDiamondGradient(options = {}) {
  const { tone } = options;
  const sat = 96 + Math.floor(Math.random() * 4);
  const dir = createRandomGradientDirection();

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

  const light1 = 50 + Math.floor(Math.random() * 8);
  const light2 = 44 + Math.floor(Math.random() * 10);
  const color1 = `hsl(${hue1}, ${sat}%, ${light1}%)`;
  const color2 = `hsl(${hue2}, ${sat}%, ${light2}%)`;

  /** 約 35% 加入中間色標，讓過渡更不規則 */
  const stops =
    Math.random() < 0.35
      ? [
          { offset: '0%', color: color1 },
          {
            offset: `${20 + Math.floor(Math.random() * 60)}%`,
            color: `hsl(${mixHue(hue1, hue2, 0.25 + Math.random() * 0.5)}, ${sat}%, ${light1 + Math.floor((light2 - light1) * 0.4)}%)`,
          },
          { offset: '100%', color: color2 },
        ]
      : [
          { offset: '0%', color: color1 },
          { offset: '100%', color: color2 },
        ];

  return {
    ...dir,
    stops,
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

/** 左右各 50% 並列，兩側各一組隨機線性漸層（系統 header 頂部用） */
export function createRandomLogoDiamondSplitHorizontalGradients() {
  return {
    left: logoDiamondGradientToCssLinear(createRandomLogoDiamondGradient()),
    right: logoDiamondGradientToCssLinear(createRandomLogoDiamondGradient()),
  };
}
