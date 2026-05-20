/**
 * 建立測驗題庫（稿）— 批改（不呼叫後端，僅更新題卡 UI）
 */
import {
  DESIGN_DEMO_GRADING_CRITIQUE_JSON,
  DESIGN_DEMO_GRADING_RESULT_SAMPLE,
} from '../mockData.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} item - 題目卡片
 */
export async function submitGrade(item) {
  if (!item || typeof item !== 'object') return;
  item.confirmed = false;
  item.gradingResult = '';
  await delay(400);
  item.gradingResult = DESIGN_DEMO_GRADING_RESULT_SAMPLE;
  item.gradingResponseJson = { ...DESIGN_DEMO_GRADING_CRITIQUE_JSON };
  item.confirmed = true;
}
