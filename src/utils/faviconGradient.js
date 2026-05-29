/**
 * 動態 favicon：與 LogoCenterMark 51–54 相同（左 secondary、右 primary、中央白菱形）；
 * 漸層向量與系統 header 左右半 CSS（logoColorsToSplitHeaderStyles）一致，各半 objectBoundingBox 填色。
 * 以 Canvas 轉 PNG 套用，避免 SVG data URL／漸層在部分瀏覽器分頁 icon 無法更新。
 */

const CENTER_DIAMOND_PATH =
  'M 120 80 A 40 40 0 0 0 160 120 A 40 40 0 0 0 120 160 A 40 40 0 0 0 80 120 A 40 40 0 0 0 120 80 Z';

const DEFAULT_SECONDARY = '#666666';
const DEFAULT_PRIMARY = '#333333';
const DEFAULT_DIAMOND = '#ffffff';
const FAVICON_PNG_SIZE = 32;

/** @type {string | null} */
let activeFaviconObjectUrl = null;

function buildCenterQuadSvg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 80 80 80" role="img" aria-label="MyQuiz.ai">${body}</svg>`;
}

function buildCenterQuadSolidSvg() {
  return buildCenterQuadSvg(
    `<rect x="80" y="80" width="40" height="80" fill="${DEFAULT_SECONDARY}"/>`
    + `<rect x="120" y="80" width="40" height="80" fill="${DEFAULT_PRIMARY}"/>`
    + `<path fill="${DEFAULT_DIAMOND}" d="${CENTER_DIAMOND_PATH}"/>`,
  );
}

function stopsMarkup(gradient) {
  return (gradient?.stops ?? [])
    .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
    .join('');
}

/** 與 header 半幅 CSS linear-gradient 相同：各 rect 獨立以 x1–y2 百分比填色 */
function linearGradientDefObjectBBox(id, gradient) {
  const x1 = gradient?.x1 ?? '0%';
  const y1 = gradient?.y1 ?? '0%';
  const x2 = gradient?.x2 ?? '100%';
  const y2 = gradient?.y2 ?? '100%';
  return `<linearGradient id="${id}" gradientUnits="objectBoundingBox" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsMarkup(gradient)}</linearGradient>`;
}

function buildCenterQuadGradientSvg(secondary, primary) {
  return buildCenterQuadSvg(
    `<defs>${linearGradientDefObjectBBox('favicon-sec', secondary)}${linearGradientDefObjectBBox('favicon-pri', primary)}</defs>`
    + `<rect x="80" y="80" width="40" height="80" fill="url(#favicon-sec)"/>`
    + `<rect x="120" y="80" width="40" height="80" fill="url(#favicon-pri)"/>`
    + `<path fill="${DEFAULT_DIAMOND}" d="${CENTER_DIAMOND_PATH}"/>`,
  );
}

/**
 * @param {{ primaryGradient?: object, secondaryGradient?: object } | null | undefined} logoColors
 */
export function buildFaviconSvgString(logoColors) {
  const primary = logoColors?.primaryGradient;
  const secondary = logoColors?.secondaryGradient;
  if (!primary?.stops?.length || !secondary?.stops?.length) {
    return buildCenterQuadSolidSvg();
  }

  return buildCenterQuadGradientSvg(secondary, primary);
}

function removeAllFaviconLinks() {
  document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"], link[rel="shortcut icon"]').forEach((el) => {
    el.remove();
  });
}

function revokeActiveFaviconObjectUrl() {
  if (activeFaviconObjectUrl) {
    URL.revokeObjectURL(activeFaviconObjectUrl);
    activeFaviconObjectUrl = null;
  }
}

/**
 * @param {string} svg
 * @param {number} [size]
 * @returns {Promise<string>}
 */
function svgToPngObjectUrl(svg, size = FAVICON_PNG_SIZE) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(svgUrl);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(
        (pngBlob) => {
          if (!pngBlob) {
            reject(new Error('PNG blob unavailable'));
            return;
          }
          resolve(URL.createObjectURL(pngBlob));
        },
        'image/png',
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('SVG favicon render failed'));
    };

    img.src = svgUrl;
  });
}

function appendFaviconLink(href, type) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = type;
  link.sizes = `${FAVICON_PNG_SIZE}x${FAVICON_PNG_SIZE}`;
  link.href = href;
  link.setAttribute('data-myquiz-dynamic-favicon', 'true');
  document.head.appendChild(link);
}

/**
 * @param {{ primaryGradient?: object, secondaryGradient?: object } | null | undefined} logoColors
 */
export async function applyFaviconFromLogoColors(logoColors) {
  if (typeof document === 'undefined') return;

  const svg = buildFaviconSvgString(logoColors);
  removeAllFaviconLinks();
  revokeActiveFaviconObjectUrl();

  try {
    activeFaviconObjectUrl = await svgToPngObjectUrl(svg);
    appendFaviconLink(activeFaviconObjectUrl, 'image/png');
    return;
  } catch {
    /* fall through */
  }

  appendFaviconLink(`data:image/svg+xml,${encodeURIComponent(svg)}`, 'image/svg+xml');
}
