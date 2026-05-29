import {
  LOGO_GRADIENT_PALETTES,
  pickDistinctRandomLogoGradientPalettes,
  pickRandomLogoGradientPalette,
} from '../constants/logoGradientPalettes.js';

export {
  LOGO_GRADIENT_PALETTES,
  pickDistinctRandomLogoGradientPalettes,
  pickRandomLogoGradientPalette,
};

function paletteToDiamondGradient(palette) {
  return {
    x1: palette.x1,
    y1: palette.y1,
    x2: palette.x2,
    y2: palette.y2,
    stops: palette.stops,
    css: palette.css,
    paletteId: palette.id,
  };
}

/**
 * 隨機 CSS 漸層（僅從 20 組雙色色盤中選取）
 * @param {{ tone?: string, bias?: string, linearOnly?: boolean, excludeIds?: string[] }} [options]
 * @returns {string}
 */
export function createRandomLogoGradientCss(options = {}) {
  const palette = pickRandomLogoGradientPalette(options);
  return palette.css;
}

/** 中央菱形：隨機漸層（含 css；系統 header、按鈕共用） */
export function createRandomLogoDiamondGradient(options = {}) {
  return paletteToDiamondGradient(pickRandomLogoGradientPalette(options));
}

/**
 * Logo 雙層（primary／secondary）各選一組，保證 paletteId 不重複
 * @param {{ tone?: string, bias?: string, excludeIds?: string[] }} [options]
 * @returns {{ primary: ReturnType<typeof paletteToDiamondGradient>, secondary: ReturnType<typeof paletteToDiamondGradient> }}
 */
export function createRandomLogoDiamondGradientPair(options = {}) {
  const [primaryPalette, secondaryPalette] = pickDistinctRandomLogoGradientPalettes(2, options);
  return {
    primary: paletteToDiamondGradient(primaryPalette),
    secondary: paletteToDiamondGradient(secondaryPalette),
  };
}

/**
 * LogoGridSvg colors：primary／secondary 各一組漸層（Q／A 分層標誌等）
 * @param {{ tone?: string, bias?: string, excludeIds?: string[] }} [options]
 */
export function createLogoGridGradientColors(options = {}) {
  const { primary, secondary } = createRandomLogoDiamondGradientPair(options);
  return {
    background: 'transparent',
    primaryGradient: {
      x1: primary.x1,
      y1: primary.y1,
      x2: primary.x2,
      y2: primary.y2,
      stops: primary.stops,
    },
    secondaryGradient: {
      x1: secondary.x1,
      y1: secondary.y1,
      x2: secondary.x2,
      y2: secondary.y2,
      stops: secondary.stops,
    },
  };
}

/**
 * @param {object} [gradient]
 * @param {{ useStopsOnly?: boolean }} [options] useStopsOnly：依 x1–y2 與 stops（與 SVG 一致），忽略 css
 */
export function logoDiamondGradientToCssLinear(gradient, options = {}) {
  if (!options.useStopsOnly && gradient?.css) return gradient.css;
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

function gradientToHeaderHalfStyle(gradient) {
  const color1 = gradient?.stops?.[0]?.color ?? '#000000';
  const backgroundImage = gradient?.css ?? logoDiamondGradientToCssLinear(gradient);
  return {
    backgroundColor: color1,
    backgroundImage,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
  };
}

function paletteToHeaderHalfStyle(palette) {
  return gradientToHeaderHalfStyle(palette);
}

/**
 * 登入頁 Logo 雙漸層 → 系統 header 左上左右半（secondary 左、primary 右）
 * @param {{ primaryGradient?: object, secondaryGradient?: object }} logoColors
 */
export function logoColorsToSplitHeaderStyles(logoColors) {
  const secondary = logoColors?.secondaryGradient;
  const primary = logoColors?.primaryGradient;
  if (!secondary?.stops?.length || !primary?.stops?.length) return null;
  return {
    left: gradientToHeaderHalfStyle(secondary),
    right: gradientToHeaderHalfStyle(primary),
  };
}

/** 系統 header 左上角：左右各 50%，互不重複的兩組色盤 */
export function createRandomLogoDiamondSplitHorizontalGradients() {
  const [leftPalette, rightPalette] = pickDistinctRandomLogoGradientPalettes(2);
  return {
    left: paletteToHeaderHalfStyle(leftPalette),
    right: paletteToHeaderHalfStyle(rightPalette),
  };
}

/** @deprecated 請改用 createRandomLogoDiamondSplitHorizontalGradients */
export function createRandomSystemHeaderGradientCss() {
  return createRandomLogoGradientCss();
}
