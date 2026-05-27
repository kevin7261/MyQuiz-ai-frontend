function mixHue(a, b, t) {
  const delta = ((b - a + 540) % 360) - 180;
  return clampHue(a + delta * t, 0, 360);
}

function clampHue(hue, min, max) {
  let h = ((hue % 360) + 360) % 360;
  if (h < min) h = min;
  if (h > max) h = max;
  return h;
}

/** 隨機鮮豔二色（含可選中間色標） */
function pickRandomGradientColors(options = {}) {
  const { tone } = options;
  const sat = 96 + Math.floor(Math.random() * 4);

  let hue1;
  let hue2;
  if (tone === 'generate') {
    if (options.bias === 'work3') {
      hue1 = 210 + Math.floor(Math.random() * 28);
      hue2 = clampHue(hue1 - 18 - Math.floor(Math.random() * 22), 195, 240);
    } else {
      hue1 = 155 + Math.floor(Math.random() * 45);
      hue2 = clampHue(hue1 + 20 + Math.floor(Math.random() * 35), 140, 215);
    }
  } else if (tone === 'grade') {
    if (options.bias === 'work3') {
      if (Math.random() < 0.5) {
        hue1 = 352 + Math.floor(Math.random() * 8);
        hue2 = clampHue(hue1 - 10 - Math.floor(Math.random() * 14), 335, 360);
      } else {
        hue1 = 2 + Math.floor(Math.random() * 14);
        hue2 = clampHue(hue1 + 12 + Math.floor(Math.random() * 16), 0, 28);
      }
    } else {
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

  return { color1, color2, stops };
}

function stopsToCssList(stops) {
  return stops.map((s) => `${s.color} ${s.offset}`).join(', ');
}

/** 0–359° 任意方向線性漸層 */
function createRandomLinearGradientCss(stops) {
  const angleDeg = Math.floor(Math.random() * 360);
  return `linear-gradient(${angleDeg}deg, ${stopsToCssList(stops)})`;
}

/** 橢圓徑向漸層（中心與軸長隨機） */
function createRandomRadialGradientCss(stops, { color1, color2 }) {
  const cx = Math.floor(Math.random() * 100);
  const cy = Math.floor(Math.random() * 100);
  const rx = 45 + Math.floor(Math.random() * 95);
  const ry = 35 + Math.floor(Math.random() * 110);
  if (Math.random() < 0.5) {
    return `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%, ${stopsToCssList(stops)})`;
  }
  const mid = `hsl(${mixHue(
    parseHueFromHsl(color1),
    parseHueFromHsl(color2),
    0.35 + Math.random() * 0.3,
  )}, 96%, 48%)`;
  const r = 40 + Math.floor(Math.random() * 70);
  return `radial-gradient(circle ${r}% at ${cx}% ${cy}%, ${color1} 0%, ${mid} 42%, ${color2} 100%)`;
}

function parseHueFromHsl(hsl) {
  const m = /hsl\(\s*([\d.]+)/.exec(String(hsl ?? ''));
  return m ? Number(m[1]) : 0;
}

/** 錐形漸層（起始角 0–359°） */
function createRandomConicGradientCss(stops) {
  const fromDeg = Math.floor(Math.random() * 360);
  const cx = 15 + Math.floor(Math.random() * 70);
  const cy = 15 + Math.floor(Math.random() * 70);
  return `conic-gradient(from ${fromDeg}deg at ${cx}% ${cy}%, ${stopsToCssList(stops)})`;
}

/** 多點徑向疊加（非線性、隨機分布） */
function createRandomMeshGradientCss({ color1, color2, stops }) {
  const blobCount = 2 + Math.floor(Math.random() * 2);
  const layers = [];
  const base = stops[0]?.color ?? color1;
  for (let i = 0; i < blobCount; i += 1) {
    const cx = Math.floor(Math.random() * 100);
    const cy = Math.floor(Math.random() * 100);
    const r = 35 + Math.floor(Math.random() * 55);
    const c = i % 2 === 0 ? color1 : color2;
    const fade = 38 + Math.floor(Math.random() * 28);
    layers.push(`radial-gradient(circle ${r}% at ${cx}% ${cy}%, ${c} 0%, transparent ${fade}%)`);
  }
  if (Math.random() < 0.6 && stops.length > 2) {
    const cx = Math.floor(Math.random() * 100);
    const cy = Math.floor(Math.random() * 100);
    layers.push(
      `radial-gradient(circle 30% at ${cx}% ${cy}%, ${stops[1].color} 0%, transparent 70%)`,
    );
  }
  layers.push(base);
  return layers.join(', ');
}

/**
 * 隨機 CSS 漸層：線性（0–359°）、徑向、錐形或多點徑向疊加
 * @param {{ tone?: string, bias?: string, linearOnly?: boolean }} [options]
 * @returns {string}
 */
export function createRandomLogoGradientCss(options = {}) {
  const colors = pickRandomGradientColors(options);
  if (options.linearOnly) {
    return createRandomLinearGradientCss(colors.stops);
  }
  const roll = Math.random();
  if (roll < 0.38) {
    return createRandomLinearGradientCss(colors.stops);
  }
  if (roll < 0.68) {
    return createRandomRadialGradientCss(colors.stops, colors);
  }
  if (roll < 0.84) {
    return createRandomConicGradientCss(colors.stops);
  }
  return createRandomMeshGradientCss(colors);
}

/** 0–360° 任意方向的線性漸層向量（SVG linearGradient 用） */
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

/** 中央菱形：隨機鮮豔漸層（含 css 字串；系統 header、按鈕共用） */
export function createRandomLogoDiamondGradient(options = {}) {
  const colors = pickRandomGradientColors(options);
  const dir = createRandomGradientDirection();
  return {
    ...dir,
    stops: colors.stops,
    css: createRandomLogoGradientCss(options),
  };
}

/** 將漸層物件轉為 CSS background（優先使用預先產生的 css） */
export function logoDiamondGradientToCssLinear(gradient) {
  if (gradient?.css) return gradient.css;
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

/**
 * 系統 header 半區（約 32×N px）：獨立色盤，且保證填滿（不用 transparent／錐形）
 * @returns {Record<string, string>}
 */
function createSystemHeaderHalfGradientStyle() {
  const { color1, color2, stops } = pickRandomGradientColors();
  const stopStr = stopsToCssList(stops);
  const cx = 15 + Math.floor(Math.random() * 70);
  const cy = 10 + Math.floor(Math.random() * 80);

  const roll = Math.random();
  let backgroundImage;
  if (roll < 0.45) {
    backgroundImage = createRandomLinearGradientCss(stops);
  } else if (roll < 0.85) {
    const rx = 140 + Math.floor(Math.random() * 90);
    const ry = 130 + Math.floor(Math.random() * 100);
    backgroundImage = `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%, ${stopStr})`;
  } else {
    const r1 = 100 + Math.floor(Math.random() * 80);
    const r2 = 90 + Math.floor(Math.random() * 85);
    const cx2 = Math.floor(Math.random() * 100);
    const cy2 = Math.floor(Math.random() * 100);
    backgroundImage = [
      `radial-gradient(ellipse ${r1}% ${r1}% at ${cx}% ${cy}%, ${color2} 0%, ${color1} 78%)`,
      `radial-gradient(ellipse ${r2}% ${r2}% at ${cx2}% ${cy2}%, ${color1} 0%, ${color2} 72%)`,
    ].join(', ');
  }

  return {
    backgroundColor: color1,
    backgroundImage,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
  };
}

/** 系統 header 左上角：左右各 50%，各自獨立隨機色與漸層型態 */
export function createRandomLogoDiamondSplitHorizontalGradients() {
  return {
    left: createSystemHeaderHalfGradientStyle(),
    right: createSystemHeaderHalfGradientStyle(),
  };
}

/** @deprecated 請改用 createRandomLogoDiamondSplitHorizontalGradients */
export function createRandomSystemHeaderGradientCss() {
  return createRandomLogoGradientCss();
}
