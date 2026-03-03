/**
 * 後端 API 基底網址，全專案統一由此設定。
 */
export const API_BASE = 'http://127.0.0.1:8000';//'https://aiquiz-backend-z4mo.onrender.com';

/** 產生 quiz API 路徑與後端 response/request key（後端尚未改名前由此集中設定） */
export const API_GENERATE_QUIZ = '/rag/generate-question';
export const API_RESPONSE_QUIZ_CONTENT = 'question_content';
export const API_RESPONSE_QUIZ_LEGACY = 'question';
export const API_REQUEST_QUIZ_TEXT = 'question_text';
