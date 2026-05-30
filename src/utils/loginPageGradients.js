import {
  createRandomLogoDiamondGradientPair,
  logoColorsToSplitHeaderStyles,
  pickDistinctRandomLogoGradientPalettes,
} from './logoDiamondGradient.js';

/** 登入頁漸層僅線性（不用徑向／錐形／mesh） */
export const LOGIN_GRADIENT_OPTIONS = { linearOnly: true };

const LOGIN_CORNER_GRADIENT_POSITIONS = [
  'top left',
  'top right',
  'bottom left',
  'bottom right',
];

function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? '').replace('#', '');
  if (normalized.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 四角徑向漸層：角落 20% 不透明，往中心漸變至 0%（全透明） */
export function buildLoginCornerGradientsCss(excludeIds = []) {
  const palettes = pickDistinctRandomLogoGradientPalettes(4, {
    ...LOGIN_GRADIENT_OPTIONS,
    excludeIds,
  });
  return LOGIN_CORNER_GRADIENT_POSITIONS.map((at, index) => {
    const color = palettes[index]?.stops?.[0]?.color ?? '#93c5fd';
    const cornerColor = hexToRgba(color, 0.2);
    return `radial-gradient(ellipse 85% 85% at ${at}, ${cornerColor} 0%, transparent 70%)`;
  }).join(', ');
}

export function buildLoginLogoColors() {
  const { primary, secondary } = createRandomLogoDiamondGradientPair(LOGIN_GRADIENT_OPTIONS);
  return {
    background: 'transparent',
    diamondFill: '#ffffff',
    primaryGradient: {
      x1: primary.x1,
      y1: primary.y1,
      x2: primary.x2,
      y2: primary.y2,
      stops: primary.stops,
      css: primary.css,
      paletteId: primary.paletteId,
    },
    secondaryGradient: {
      x1: secondary.x1,
      y1: secondary.y1,
      x2: secondary.x2,
      y2: secondary.y2,
      stops: secondary.stops,
      css: secondary.css,
      paletteId: secondary.paletteId,
    },
  };
}

/** @returns {{ logoColors: object, pageBgCss: string, headerSplit: { left: object, right: object } }} */
export function buildRandomLogoGradientPayload() {
  const logoColors = buildLoginLogoColors();
  const excludeIds = [
    logoColors.primaryGradient.paletteId,
    logoColors.secondaryGradient.paletteId,
  ].filter(Boolean);
  const pageBgCss = buildLoginCornerGradientsCss(excludeIds);
  const headerSplit = logoColorsToSplitHeaderStyles(logoColors);
  return {
    logoColors,
    pageBgCss,
    headerSplit,
  };
}
