/**
 * 建立測驗題庫（稿）— 批改（不呼叫後端，僅更新題卡 UI）
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} item - 題目卡片
 */
export async function submitGrade(item) {
  if (!item || typeof item !== 'object') return;
  item.confirmed = false;
  await delay(400);
  item.gradingResult =
    '（稿）示範批改結果\n\n總分：4 / 5\n\n答題方向正確，可再補充細節。';
  item.gradingResponseJson = {
    quiz_score: 4,
    answer_critique: '（稿）示範批改：答題方向正確。',
  };
  item.confirmed = true;
}
