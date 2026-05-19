/**
 * 建立測驗題庫（稿）頁面用示範資料，不呼叫後端 API。
 */

export const DESIGN_MOCK_RAG_LIST = [
  {
    rag_id: 9001,
    rag_tab_id: 'design_demo_001',
    tab_name: '示範題庫 A',
    rag_name: '示範題庫 A',
    filename: 'demo_a_rag.zip',
    for_exam: false,
    file_metadata: {
      second_folders: ['Chapter_01', 'Chapter_02', 'Chapter_03'],
    },
    units: [
      {
        rag_unit_id: 101,
        unit_name: 'Chapter_01',
        unit_type: 1,
        quizzes: [
          {
            rag_quiz_id: 1001,
            quiz_name: '選擇題範例',
            quiz_content: 'What is the capital of Taiwan?',
            quiz_hint: 'Think about the island.',
            quiz_reference_answer: 'Taipei',
            for_exam: false,
          },
        ],
      },
    ],
  },
  {
    rag_id: 9002,
    rag_tab_id: 'design_demo_002',
    tab_name: '示範題庫 B（測驗用）',
    rag_name: '示範題庫 B',
    filename: 'demo_b_rag.zip',
    for_exam: true,
    file_metadata: {
      second_folders: ['Unit_A', 'Unit_B'],
    },
    units: [],
  },
];

export const DESIGN_MOCK_UNITS = [
  {
    rag_unit_id: 201,
    unit_name: 'Chapter_01',
    unit_type: 1,
    transcription: '',
    quizzes: [
      {
        rag_quiz_id: 2001,
        quiz_name: '閱讀理解',
        quiz_content: 'According to the passage, what is the main idea?',
        quiz_hint: 'Look at the first paragraph.',
        quiz_reference_answer: 'Urban planning affects daily life.',
        quiz_user_prompt_text: '出題規則：依教材出閱讀理解題。',
        for_exam: false,
      },
      {
        rag_quiz_id: 2002,
        quiz_name: '未命名題型',
        quiz_content: '',
        quiz_hint: '',
        quiz_reference_answer: '',
        for_exam: true,
      },
    ],
  },
  {
    rag_unit_id: 202,
    unit_name: 'Chapter_02',
    unit_type: 2,
    transcription: '## 示範逐字稿\n\nThis is sample markdown for a text unit.',
    quizzes: [],
  },
];

export const DESIGN_MOCK_QUIZ_GENERATE = {
  quiz_content: '（稿）示範題目：請簡述本單元重點。',
  quiz_hint: '可參考教材第一段。',
  quiz_reference_answer: '示範參考答案。',
  quiz_name: '示範題型',
};

export const DESIGN_MOCK_TRANSCRIPT_MD =
  '## 示範逐字稿\n\nThis is **design-only** sample text loaded without calling the API.';
