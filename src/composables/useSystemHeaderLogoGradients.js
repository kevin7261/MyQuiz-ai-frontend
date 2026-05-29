import { shallowRef } from 'vue';
import {
  createRandomLogoDiamondSplitHorizontalGradients,
  logoColorsToSplitHeaderStyles,
} from '../utils/logoDiamondGradient.js';

const STORAGE_KEY = 'myquiz-system-header-logo-gradients';

const systemHeaderGradientLeftStyle = shallowRef({});
const systemHeaderGradientRightStyle = shallowRef({});
/** 與 header 左半漸層同色盤（開始出題） */
const generateButtonGradientCss = shallowRef('');
/** 與 header 右半漸層同色盤（開始批改） */
const gradeButtonGradientCss = shallowRef('');

function readPersistedGradients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.left?.backgroundImage || !data?.right?.backgroundImage) return null;
    return data;
  } catch {
    return null;
  }
}

function persistGradients(left, right) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        left,
        right,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function applySplitFromStyles(split) {
  systemHeaderGradientLeftStyle.value = split.left;
  systemHeaderGradientRightStyle.value = split.right;
  generateButtonGradientCss.value = split.left.backgroundImage ?? '';
  gradeButtonGradientCss.value = split.right.backgroundImage ?? '';
}

function applySplitGradients() {
  const split = createRandomLogoDiamondSplitHorizontalGradients();
  applySplitFromStyles(split);
  persistGradients(split.left, split.right);
}

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const persisted = readPersistedGradients();
  if (persisted) {
    applySplitFromStyles({
      left: persisted.left,
      right: persisted.right,
    });
    initialized = true;
    return;
  }
  applySplitGradients();
  initialized = true;
}

/**
 * 登入成功時寫入登入頁當下 Logo 漸層，系統 header 左上與之同色盤並持久化。
 * @param {{ primaryGradient?: object, secondaryGradient?: object }} logoColors
 */
export function setSystemHeaderLogoGradientsFromLogin(logoColors) {
  const split = logoColorsToSplitHeaderStyles(logoColors);
  if (!split) return;
  applySplitFromStyles(split);
  persistGradients(split.left, split.right);
  initialized = true;
}

/** 登出時清除已儲存的 header 漸層 */
export function clearSystemHeaderLogoGradients() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  initialized = false;
}

/** 系統 header 左上角左右漸層；work3 開始出題／開始批改與其同色盤 */
export function useSystemHeaderLogoGradients() {
  ensureInitialized();

  return {
    systemHeaderGradientLeftStyle,
    systemHeaderGradientRightStyle,
    generateButtonGradientCss,
    gradeButtonGradientCss,
    regenerateSystemHeaderLogoGradients: applySplitGradients,
  };
}
