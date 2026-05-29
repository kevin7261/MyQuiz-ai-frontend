import { shallowRef } from 'vue';
import { createRandomLogoDiamondSplitHorizontalGradients } from '../utils/logoDiamondGradient.js';

const systemHeaderGradientLeftStyle = shallowRef({});
const systemHeaderGradientRightStyle = shallowRef({});
/** 與 header 左半漸層同色盤（開始出題） */
const generateButtonGradientCss = shallowRef('');
/** 與 header 右半漸層同色盤（開始批改） */
const gradeButtonGradientCss = shallowRef('');

function applySplitGradients() {
  const split = createRandomLogoDiamondSplitHorizontalGradients();
  systemHeaderGradientLeftStyle.value = split.left;
  systemHeaderGradientRightStyle.value = split.right;
  generateButtonGradientCss.value = split.left.backgroundImage ?? '';
  gradeButtonGradientCss.value = split.right.backgroundImage ?? '';
}

let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    applySplitGradients();
    initialized = true;
  }
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
