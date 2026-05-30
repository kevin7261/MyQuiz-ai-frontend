import { shallowRef } from 'vue';
import {
  buildRandomLogoGradientPayload,
} from '../utils/loginPageGradients.js';
import {
  diamondGradientFromCssLinear,
} from '../utils/logoDiamondGradient.js';
import {
  readLogoGradientCookie,
  writeLogoGradientCookie,
} from '../utils/logoGradientCookie.js';
import { applyFaviconFromLogoColors } from '../utils/faviconGradient.js';

const loginLogoColors = shallowRef(null);
const loginPageBgGradientCss = shallowRef('');
const systemHeaderGradientLeftStyle = shallowRef({});
const systemHeaderGradientRightStyle = shallowRef({});
/** 與 header 左半漸層同色盤（開始出題） */
const generateButtonGradientCss = shallowRef('');
/** 與 header 右半漸層同色盤（開始批改） */
const gradeButtonGradientCss = shallowRef('');
/** 開始出題 pill 漸層 → 規則 tab icon 菱形 SVG 用 */
const generateButtonDiamondGradient = shallowRef(null);
/** 開始批改 pill 漸層 → 規則 tab icon 菱形 SVG 用 */
const gradeButtonDiamondGradient = shallowRef(null);

function applyHeaderSplit(headerSplit) {
  if (!headerSplit?.left || !headerSplit?.right) return;
  systemHeaderGradientLeftStyle.value = headerSplit.left;
  systemHeaderGradientRightStyle.value = headerSplit.right;
  generateButtonGradientCss.value = headerSplit.left.backgroundImage ?? '';
  gradeButtonGradientCss.value = headerSplit.right.backgroundImage ?? '';
  generateButtonDiamondGradient.value =
    diamondGradientFromCssLinear(generateButtonGradientCss.value);
  gradeButtonDiamondGradient.value =
    diamondGradientFromCssLinear(gradeButtonGradientCss.value);
}

/**
 * @param {{ logoColors: object, pageBgCss: string, headerSplit: object }} payload
 */
function applyLogoGradientPayload(payload) {
  loginLogoColors.value = payload.logoColors;
  loginPageBgGradientCss.value = payload.pageBgCss;
  applyHeaderSplit(payload.headerSplit);
  applyFaviconFromLogoColors(payload.logoColors);
}

function persistLogoGradientPayload(payload) {
  writeLogoGradientCookie(payload);
}

export function loadOrCreateLogoGradientPayload() {
  const cached = readLogoGradientCookie();
  if (cached) return cached;
  const next = buildRandomLogoGradientPayload();
  writeLogoGradientCookie(next);
  return next;
}

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  applyLogoGradientPayload(loadOrCreateLogoGradientPayload());
  initialized = true;
}

/** 點擊 logo 或 cookie 不存在時：重新隨機並寫入 cookie */
function regenerateAndPersistLogoGradients() {
  const next = buildRandomLogoGradientPayload();
  applyLogoGradientPayload(next);
  persistLogoGradientPayload(next);
  initialized = true;
}

/** 系統 header／登入頁 Logo 漸層；work3 開始出題／開始批改與 header 左／右半同色盤 */
export function useSystemHeaderLogoGradients() {
  ensureInitialized();

  return {
    loginLogoColors,
    loginPageBgGradientCss,
    systemHeaderGradientLeftStyle,
    systemHeaderGradientRightStyle,
    generateButtonGradientCss,
    gradeButtonGradientCss,
    generateButtonDiamondGradient,
    gradeButtonDiamondGradient,
    regenerateSystemHeaderLogoGradients: regenerateAndPersistLogoGradients,
  };
}
