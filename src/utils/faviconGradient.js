/**
 * 動態 favicon：與 LogoCenterMark 菱形相同，填色為 cookie 內 primary／secondary 四色漸層。
 */

const CENTER_DIAMOND_PATH =
  'M 120 80 A 40 40 0 0 0 160 120 A 40 40 0 0 0 120 160 A 40 40 0 0 0 80 120 A 40 40 0 0 0 120 80 Z';

const FULL_LOGO_GRADIENT_METRICS = { minX: 0, minY: 0, width: 240, height: 180 };

function parsePctCoord(val) {
  return Number.parseFloat(String(val ?? '0').replace('%', '')) || 0;
}

function linearGradientAttrs(gradient, metrics) {
  const { minX, minY, width, height } = metrics;
  return {
    x1: minX + (parsePctCoord(gradient.x1) / 100) * width,
    y1: minY + (parsePctCoord(gradient.y1) / 100) * height,
    x2: minX + (parsePctCoord(gradient.x2) / 100) * width,
    y2: minY + (parsePctCoord(gradient.y2) / 100) * height,
  };
}

function stopsMarkup(gradient) {
  return (gradient?.stops ?? [])
    .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
    .join('');
}

function linearGradientDef(id, gradient, metrics) {
  const { x1, y1, x2, y2 } = linearGradientAttrs(gradient, metrics);
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsMarkup(gradient)}</linearGradient>`;
}

/**
 * @param {{ primaryGradient?: object, secondaryGradient?: object } | null | undefined} logoColors
 */
export function buildFaviconSvgString(logoColors) {
  const primary = logoColors?.primaryGradient;
  const secondary = logoColors?.secondaryGradient;
  if (!primary?.stops?.length || !secondary?.stops?.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 80 80 80" role="img" aria-label="MyQuiz.ai"><path fill="#000000" d="${CENTER_DIAMOND_PATH}"/></svg>`;
  }

  const metrics = FULL_LOGO_GRADIENT_METRICS;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 80 80 80" role="img" aria-label="MyQuiz.ai"><defs>${linearGradientDef('favicon-sec', secondary, metrics)}${linearGradientDef('favicon-pri', primary, metrics)}<clipPath id="favicon-clip-l"><rect x="80" y="80" width="40" height="80"/></clipPath><clipPath id="favicon-clip-r"><rect x="120" y="80" width="40" height="80"/></clipPath></defs><path d="${CENTER_DIAMOND_PATH}" fill="url(#favicon-sec)" clip-path="url(#favicon-clip-l)"/><path d="${CENTER_DIAMOND_PATH}" fill="url(#favicon-pri)" clip-path="url(#favicon-clip-r)"/></svg>`;
}

/**
 * @param {{ primaryGradient?: object, secondaryGradient?: object } | null | undefined} logoColors
 */
export function applyFaviconFromLogoColors(logoColors) {
  if (typeof document === 'undefined') return;
  const svg = buildFaviconSvgString(logoColors);
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let link = document.querySelector('link[data-myquiz-dynamic-favicon]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.setAttribute('data-myquiz-dynamic-favicon', 'true');
    document.head.appendChild(link);
  }
  link.href = href;
}
