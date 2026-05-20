/**
 * 建立測驗題庫（稿）頁面用示範資料，不呼叫後端 API。
 */
import { formatGradingResult } from '../../utils/grading.js';

/** ZIP 內資料夾／設定單元橫向列表示範（10 筆） */
export const DESIGN_DEMO_FOLDER_NAMES = [
  'Chapter_01',
  'Chapter_02',
  'Chapter_03',
  'Chapter_04',
  'Chapter_05',
  'Chapter_06',
  'Chapter_07',
  'Chapter_08',
  'Chapter_09',
  'Chapter_10',
];

const DESIGN_DEMO_UNIT_TYPES = [1, 2, 1, 3, 4, 1, 2, 1, 1, 2];

export const DESIGN_MOCK_TRANSCRIPT_MD =
  '## 示範逐字稿\n\nThis is **design-only** sample text loaded without calling the API.';

/** 稿頁黑底預覽：出題規則示範 Markdown */
export const DESIGN_DEMO_QUIZ_USER_PROMPT_SAMPLE = `## 出題目標
- 依本單元教材出 **1 題**，題幹須有教材依據
- 題型：閱讀理解或簡答（擇一）

## 格式
1. **題幹**清楚、單一問題
2. **提示**：1–2 句，引導思考、不直接給答案
3. **參考答案**：要點條列即可

## 難度
- 中等；學生約 3–5 分鐘可完成`;

/** 稿頁黑底預覽：批改規則示範 Markdown */
export const DESIGN_DEMO_GRADING_PROMPT_SAMPLE = `## 評分原則
- 滿分 **5 分**；以概念正確性為主

## 給分參考
| 表現 | 分數 |
|------|------|
| 涵蓋主要要點、條理清楚 | 4–5 |
| 方向正確但缺漏 | 2–3 |
| 離題或空白 | 0–1 |

## 回饋
- 先肯定答對部分，再指出可補強處
- 使用繁體中文；**勿**貼上參考答案全文`;

/** 稿頁批改結果示範（answer_critique JSON；經 formatGradingResult 顯示於題卡） */
export const DESIGN_DEMO_GRADING_CRITIQUE_JSON = {
  quiz_score: 4,
  quiz_comments: [
    '能掌握題幹要求，回答有對應教材重點。',
    '優點：概念方向正確，並嘗試區分兩者差異與應用情境。',
    '可補強：建議補充「多層神經網路／特徵學習」等關鍵描述，並以條列整理會更清楚。',
  ],
};
export const DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE = JSON.stringify(
  DESIGN_DEMO_GRADING_CRITIQUE_JSON,
);

/** 稿頁黑底預覽：批改結果示範（題卡尚無真實批改時顯示；不寫入 card.gradingResult） */
export const DESIGN_DEMO_GRADING_RESULT_SAMPLE =
  formatGradingResult(DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE)
  || [
    '4',
    '能掌握題幹要求，回答有對應教材重點。',
    '優點：概念方向正確，並嘗試區分兩者差異與應用情境。',
    '可補強：建議補充「多層神經網路／特徵學習」等關鍵描述，並以條列整理會更清楚。',
  ].join('\n');

/** 稿頁單元內容 Modal：MP3 示範用（不呼叫 API） */
export const DESIGN_DEMO_MP3_SAMPLE_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

let nextDesignDemoQuizId = 1000;

/** 組一筆 Rag_Quiz 示範列（欄位與 GET /rag/tab/units 對齊）；未傳出題／批改規則時套用稿頁 sample */
function demoQuiz(overrides = {}) {
  nextDesignDemoQuizId += 1;
  const quizPrompt = Object.prototype.hasOwnProperty.call(overrides, 'quiz_user_prompt_text')
    ? overrides.quiz_user_prompt_text
    : DESIGN_DEMO_QUIZ_USER_PROMPT_SAMPLE;
  const gradePrompt = Object.prototype.hasOwnProperty.call(overrides, 'answer_user_prompt_text')
    ? overrides.answer_user_prompt_text
    : DESIGN_DEMO_GRADING_PROMPT_SAMPLE;
  return {
    rag_quiz_id: nextDesignDemoQuizId,
    for_exam: false,
    follow_up: false,
    quiz_user_prompt_text: quizPrompt,
    answer_user_prompt_text: gradePrompt,
    ...overrides,
  };
}

/**
 * 各單元題型示範（索引對應 DESIGN_DEMO_FOLDER_NAMES）：
 * 涵蓋「產生題目」按鈕（quiz_content 空）與「題目」區塊（已有題幹）、測驗用、批改、追問等。
 */
const DESIGN_DEMO_QUIZZES_BY_UNIT = [
  [
    demoQuiz({
      rag_quiz_id: 1001,
      quiz_name: '示範｜產生題目按鈕',
      quiz_user_prompt_text:
        '出 1 題選擇題，題幹須來自 Chapter 01 教材。（此列尚未按「產生題目」，僅顯示按鈕）',
      quiz_content: '',
      quiz_hint: '',
      quiz_reference_answer: '',
    }),
    demoQuiz({
      quiz_name: '示範｜題目區塊',
      quiz_content: 'What is the capital of Taiwan?',
      quiz_hint: 'Think about the island.',
      quiz_reference_answer: 'Taipei',
    }),
    demoQuiz({
      quiz_name: '測驗用選擇題',
      quiz_content: 'Which of the following is a renewable energy source?',
      quiz_hint: 'Solar and wind are common examples.',
      quiz_reference_answer: 'Solar power',
      for_exam: true,
    }),
    demoQuiz({
      quiz_name: '簡答題（已產生）',
      quiz_user_prompt_text: '請根據 Chapter 01 教材出 1 題簡答，著重定義與舉例。',
      quiz_content: '請說明「機器學習」與「深度學習」的差異，並各舉一個應用例子。',
      quiz_hint: '可從資料與模型複雜度比較。',
      quiz_reference_answer: '機器學習泛指從資料學習模式；深度學習以多層神經網路為代表。',
      answer_content:
        '機器學習是讓電腦從資料學習規律；深度學習用很多層的神經網路，例如影像辨識。',
      quiz_score: 4,
      answer_critique: DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE,
    }),
    demoQuiz({
      quiz_name: '追問出題',
      follow_up: true,
      quiz_user_prompt_text: '在學生作答後，針對薄弱概念再追問 1 題。',
      quiz_content: '你提到「監督式學習」—請再說明它與非監督式學習在標註資料上的差別。',
      quiz_hint: '聚焦是否有標籤（label）。',
      quiz_reference_answer: '監督式學習需要標註資料；非監督式則從未標註資料找結構。',
      quiz_followup_history_list: [
        {
          quiz_content: '什麼是監督式學習？',
          quiz_answer: '用有標籤的資料訓練模型。',
        },
      ],
    }),
    demoQuiz({
      quiz_name: '示範｜產生題目（未命名）',
      quiz_content: '',
      quiz_hint: '',
      quiz_reference_answer: '',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '示範｜題目區塊（已批改）',
      quiz_user_prompt_text: '依逐字稿出 1 題簡答並附參考答案。',
      quiz_content: 'Chapter 02 中提到的三個重點是什麼？',
      quiz_hint: '參考第二段條列。',
      quiz_reference_answer: '重點一、重點二、重點三（示範）。',
      answer_content: '我記得有提到定義、例子還有練習題，但沒有完整條列三點。',
      quiz_score: 4,
      answer_critique: DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE,
      answer_user_prompt_text: '以鼓勵為主，指出缺漏條目即可。',
    }),
    demoQuiz({
      quiz_name: '示範｜產生題目按鈕',
      quiz_user_prompt_text: '出 1 題是非題，題幹須來自本章逐字稿，不可憑空捏造。',
      quiz_content: '',
      quiz_hint: '',
      quiz_reference_answer: '',
    }),
    demoQuiz({
      quiz_name: '是非題',
      quiz_content: '「文字單元」一定需要上傳 ZIP 才能建立。（示範題）',
      quiz_hint: '回想建立流程與 unit_type。',
      quiz_reference_answer: '否',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '多選概念題',
      quiz_content: '以下哪些屬於「生成式 AI」的應用？（可複選）\nA. 文字摘要\nB. 圖像生成\nC. 資料庫索引\nD. 對話助理',
      quiz_hint: 'C 通常屬於檢索／結構化查詢。',
      quiz_reference_answer: 'A、B、D',
      quiz_user_prompt_text: '出 1 題多選，四個選項，至少兩個正確答案。',
    }),
    demoQuiz({
      quiz_name: '計算題',
      quiz_content: '若學習率為 0.01，迭代 100 次，損失由 2.0 降至 1.0（線性假設），平均每步損失下降多少？',
      quiz_hint: '總下降量除以步數。',
      quiz_reference_answer: '0.01',
    }),
  ],
  [],
  [
    demoQuiz({
      quiz_name: '影片理解題',
      quiz_content: '根據影片內容，說明講者強調的第一個論點。（示範）',
      quiz_hint: '可點「逐字稿」對照。',
      quiz_reference_answer: '（依影片內容填寫）',
      quiz_user_prompt_text: '出 1 題簡答，須能由逐字稿回答。',
    }),
  ],
  [
    demoQuiz({
      quiz_name: 'RAG 檢索題',
      quiz_content: '依本單元 PDF 段落，「梯度下降」的主要目的是什麼？',
      quiz_hint: '關鍵字：損失函數、參數更新。',
      quiz_reference_answer: '最小化損失函數，更新模型參數。',
    }),
    demoQuiz({
      quiz_name: '測驗用申論',
      for_exam: true,
      quiz_content: '請申論本單元核心概念與一個實務應用。（示範）',
      quiz_hint: '字數約 150–300 字。',
      quiz_reference_answer: '（參考講義評分規準）',
      quiz_user_prompt_text: '出 1 題申論，需含評分規準描述。',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '填空題',
      quiz_content: '在監督式學習中，每一筆訓練資料通常包含 ______ 與 ______。',
      quiz_hint: '輸入與正確輸出。',
      quiz_reference_answer: '特徵（輸入）、標籤（輸出）',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '比較題',
      quiz_content: '比較「批次訓練」與「線上學習」各 1 個優缺點。',
      quiz_reference_answer: '批次：穩定但耗記憶體；線上：適應快但雜訊大。',
    }),
    demoQuiz({
      quiz_name: '情境題',
      quiz_content: '若題庫要給期末考使用，你會如何設定「測驗用」題型？說明理由。',
      quiz_hint: '可參考綠點與 for_exam 行為。',
      quiz_reference_answer: '將入考題型標為測驗用，並確認試卷用題庫限制。',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '綜合練習',
      quiz_content: '綜合 Chapter 09 內容，設計一題能同時檢視定義與應用的題目。（示範）',
      quiz_user_prompt_text: '混合簡答與舉例，難度中等。',
    }),
  ],
  [
    demoQuiz({
      quiz_name: '總複習',
      quiz_content: '列出本課程前三章各一個你認為最重要的名詞，並用一句話解釋。',
      quiz_hint: '可自由選章，但須三項皆有解釋。',
      quiz_reference_answer: '（開放作答，示範稿不評分）',
    }),
    demoQuiz({
      quiz_name: '反思題',
      quiz_content: '學完本章後，你還有哪一個概念最不清楚？打算如何補強？',
      quiz_reference_answer: '（開放作答）',
    }),
  ],
];

/** 示範用單元列（GET /rag/tab/units、build 回傳等） */
export function buildDesignDemoUnits() {
  nextDesignDemoQuizId = 1000;
  return DESIGN_DEMO_FOLDER_NAMES.map((folder, i) => {
    const unit = {
      rag_unit_id: 101 + i,
      unit_name: folder,
      unit_type: DESIGN_DEMO_UNIT_TYPES[i] ?? 1,
      folder_combination: folder,
      quizzes: [...(DESIGN_DEMO_QUIZZES_BY_UNIT[i] ?? [])],
    };
    if (i === 1) {
      unit.transcription = '## 示範逐字稿\n\nChapter 02 文字單元示範內容。';
    }
    if (i === 3) {
      unit.transcription = DESIGN_MOCK_TRANSCRIPT_MD;
      unit.mp3_file_name = 'demo_lecture.mp3';
    }
    if (i === 4) {
      unit.transcription = '## 影片單元逐字稿\n\n示範 YouTube 單元逐字稿摘要。';
      unit.youtube_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    }
    return unit;
  });
}

/** 示範 B：每個資料夾一個設定單元（供可編輯區橫向 tag 列表） */
const DESIGN_DEMO_UNIT_LIST = DESIGN_DEMO_FOLDER_NAMES.join(',');

export const DESIGN_MOCK_RAG_LIST = [
  {
    rag_id: 9001,
    rag_tab_id: 'design_demo_001',
    tab_name: '示範題庫 A',
    rag_name: '示範題庫 A',
    filename: 'demo_a_rag.zip',
    for_exam: false,
    file_metadata: {
      second_folders: [],
    },
    rag_metadata: '{"built":true}',
    unit_list: DESIGN_DEMO_UNIT_LIST,
    units: buildDesignDemoUnits(),
  },
  {
    rag_id: 9002,
    rag_tab_id: 'design_demo_002',
    tab_name: '示範題庫 B（測驗用）',
    rag_name: '示範題庫 B',
    filename: 'demo_b_rag.zip',
    for_exam: true,
    file_metadata: {
      second_folders: [...DESIGN_DEMO_FOLDER_NAMES],
    },
    unit_list: DESIGN_DEMO_UNIT_LIST,
    units: [],
  },
];

export const DESIGN_MOCK_UNITS = buildDesignDemoUnits();

export const DESIGN_MOCK_QUIZ_GENERATE = {
  quiz_content: '（稿）示範題目：請簡述本單元重點。',
  quiz_hint: '可參考教材第一段。',
  quiz_reference_answer: '示範參考答案。',
  quiz_name: '示範題型',
};
