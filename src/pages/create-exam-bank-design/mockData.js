/**
 * 建立測驗題庫（稿）頁面用示範資料，不呼叫後端 API。
 */

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

/** 示範用單元列（GET /rag/tab/units、build 回傳等） */
export function buildDesignDemoUnits() {
  return DESIGN_DEMO_FOLDER_NAMES.map((folder, i) => {
    const unit = {
      rag_unit_id: 101 + i,
      unit_name: folder,
      unit_type: DESIGN_DEMO_UNIT_TYPES[i] ?? 1,
      folder_combination: folder,
      quizzes: [],
    };
    if (i === 0) {
      unit.quizzes = [
        {
          rag_quiz_id: 1001,
          quiz_name: '選擇題範例',
          quiz_content: 'What is the capital of Taiwan?',
          quiz_hint: 'Think about the island.',
          quiz_reference_answer: 'Taipei',
          for_exam: false,
        },
      ];
    }
    if (i === 1) {
      unit.transcription = '## 示範逐字稿\n\nChapter 02 文字單元示範內容。';
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
      second_folders: [...DESIGN_DEMO_FOLDER_NAMES],
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

export const DESIGN_MOCK_TRANSCRIPT_MD =
  '## 示範逐字稿\n\nThis is **design-only** sample text loaded without calling the API.';
