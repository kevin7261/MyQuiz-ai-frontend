/**
 * RAG 相關 API 呼叫模組
 *
 * 集中封裝 tab/create、tab/create-upload-zip、tab/upload-zip、tab/build-rag-zip、tab/quiz/create、PUT tab/tab-name（分頁更名）、tab/delete 等
 * 使用 loggedFetch（會輸出回應內容），錯誤時以 parseFetchError 解析並 throw Error，供呼叫端 catch 顯示。
 */
import {
  API_BASE,
  API_CREATE_UNIT,
  API_CREATE_UPLOAD_ZIP,
  API_UPLOAD_ZIP,
  API_RAG_DELETE,
  API_RAG_UNIT_NAME,
  API_BUILD_RAG_ZIP,
  API_RAG_UNIT_TEXT,
  API_RAG_TRANSCRIPT_AUDIO,
  API_RAG_TRANSCRIPT_YOUTUBE,
  API_RAG_UNIT_MP3_FILE,
  API_RAG_UNIT_YOUTUBE_URL,
  API_RAG_TAB_UNITS,
  API_RAG_TAB_UNIT_MP3_FILE,
  API_RAG_TAB_UNIT_YOUTUBE_URL,
  API_RAG_TAB_UNIT_QUIZ_CREATE,
  API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE,
  API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_DB,
  API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_FOLLOWUP,
  API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_FOLLOWUP_DB,
  API_RAG_TAB_UNIT_QUIZ_QUIZ_NAME,
  API_RAG_TAB_UNIT_QUIZ_FOR_EXAM,
  API_RAG_TAB_UNIT_QUIZ_FOLLOWUP,
  API_RAG_TAB_QUIZ_DELETE,
  API_GENERATE_QUIZ,
  isFrontendLocalHost,
} from '../constants/api.js';
import { getActivePinia } from 'pinia';
import { formatBuildRagZipErrorDetail, parseBuildRagZipError, parseFetchError } from '../utils/apiError.js';
import { formatGradingResult } from '../utils/grading.js';
import { fetchWithRetry, loggedFetch, mergeApiQuery } from '../utils/loggedFetch.js';
import { useAuthStore } from '../stores/authStore.js';

// ─── 工具函式（內部用） ────────────────────────────────────────────────────────

/**
 * @param {object} authStore - Pinia auth store 實例
 * @returns {string | null} 未登入或無 person_id 時為 null
 */
export function getPersonId(authStore) {
  const id = authStore.user?.person_id;
  if (id == null || String(id).trim() === '') return null;
  return String(id);
}

/**
 * @param {object} [authStore] - Pinia auth store；省略時嘗試從 active pinia 讀取
 * @returns {string | null}
 */
export function getCourseId(authStore) {
  try {
    const store = authStore ?? (getActivePinia() ? useAuthStore() : null);
    const id = store?.currentCourse?.course_id;
    if (id == null || String(id).trim() === '') return null;
    return String(id).trim();
  } catch {
    return null;
  }
}

/** 解析 JSON，失敗時回傳空物件（內部用） */
function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * 自 RAG 轉錄／讀檔 API 回傳取出 markdown 字串（相容多種欄位名）
 * @param {unknown} data
 * @returns {string}
 */
export function transcriptResponseMarkdown(data) {
  if (!data || typeof data !== 'object') return '';
  const candidates = [
    data.markdown,
    data.text,
    data.transcript,
    data.transcription,
    data.transcript_plain,
    data.transcriptPlain,
    data.transcript_text,
    data.transcriptText,
    data.transcript_md,
    data.transcriptMd,
    data.content,
    data.body,
    data.data,
    data.result,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c);
  }
  return '';
}

/**
 * GET /rag/unit/text、/rag/unit/mp3-file、/rag/unit/youtube-url 等回傳之 transcript 欄位
 * @param {unknown} data
 * @returns {string}
 */
export function ragUnitTranscriptFromResponse(data) {
  if (!data || typeof data !== 'object') return '';
  const t = data.transcript ?? data.transcription;
  return t != null ? String(t) : '';
}

/**
 * 共用：建立 `/rag/transcript/*`／`/rag/unit/*` 等 GET URL（預設含 `rag_tab_id`、`folder_name`、`person_id`；YouTube 逐字稿可選 `youtube_url`）
 * @param {string} path - API 路徑
 * @param {{ rag_tab_id: string, folder_name: string, personId?: string | null, youtubeUrl?: string | null, youtube_url?: string | null }} params
 * @returns {string}
 */
function buildTranscriptUrl(path, params) {
  const base = String(API_BASE).replace(/\/$/, '');
  const u = new URL(`${base}${path}`);
  u.searchParams.set('rag_tab_id', String(params.rag_tab_id ?? '').trim());
  u.searchParams.set('folder_name', String(params.folder_name ?? '').trim());
  if (params.personId != null && String(params.personId).trim() !== '') {
    u.searchParams.set('person_id', String(params.personId).trim());
  }
  const yuRaw = params.youtubeUrl ?? params.youtube_url;
  const yu = yuRaw != null ? String(yuRaw).trim() : '';
  if (yu) {
    u.searchParams.set('youtube_url', yu);
  }
  return mergeApiQuery(u.toString(), { personId: params.personId });
}

/**
 * Base64 音訊解碼為 Blob（供 GET /rag/tab/unit/mp3-file 等 JSON 回應）
 * @param {string} base64
 * @param {string} [mediaType]
 * @returns {Blob}
 */
function base64ToBlob(base64, mediaType) {
  const raw = String(base64 ?? '').trim();
  if (!raw) return new Blob([], { type: mediaType || 'application/octet-stream' });
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mediaType || 'application/octet-stream' });
}

/**
 * 解析 mp3-file JSON 回應（audio_base64、media_type、filename、transcript）
 * @param {unknown} data
 * @returns {{ blob: Blob | null, transcript: string, filename: string, mediaType: string }}
 */
export function parseRagUnitMp3FilePayload(data) {
  if (!data || typeof data !== 'object') {
    return { blob: null, transcript: '', filename: '', mediaType: 'audio/mpeg' };
  }
  const b64 = data.audio_base64 ?? data.audioBase64;
  const mediaType = String(data.media_type ?? data.mediaType ?? 'audio/mpeg').trim() || 'audio/mpeg';
  const blob =
    b64 != null && String(b64).trim() !== ''
      ? base64ToBlob(String(b64).trim(), mediaType)
      : null;
  return {
    blob,
    transcript: ragUnitTranscriptFromResponse(data),
    filename: String(data.filename ?? '').trim(),
    mediaType,
  };
}

/**
 * 組出 GET /rag/tab/unit/* 含 rag_tab_id、rag_unit_id 的 URL（不需 person_id）
 * @param {string} path
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {string}
 */
function buildRagTabUnitQueryUrl(path, params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const rag_unit_id = Number(params.rag_unit_id);
  if (!rag_tab_id) return '';
  if (!Number.isFinite(rag_unit_id) || rag_unit_id < 1) return '';
  const base = String(API_BASE).replace(/\/$/, '');
  let u;
  try {
    u = new URL(`${base}${path}`);
  } catch {
    return '';
  }
  u.searchParams.set('rag_tab_id', rag_tab_id);
  u.searchParams.set('rag_unit_id', String(rag_unit_id));
  return mergeApiQuery(u.toString(), { omitPersonIdQuery: true });
}

// ─── 逐字稿（Transcript）API ─────────────────────────────────────────────────

/**
 * GET /rag/unit/text — JSON 含 transcript
 * @param {{ rag_tab_id: string, folder_name: string, personId?: string | null }} params
 * @returns {Promise<object>}
 */
export async function apiRagUnitText(params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const folder_name = String(params.folder_name ?? '').trim();
  if (!rag_tab_id) throw new Error('缺少 rag_tab_id');
  if (!folder_name) throw new Error('缺少 folder_name');
  const url = buildTranscriptUrl(API_RAG_UNIT_TEXT, { rag_tab_id, folder_name, personId: params.personId });
  const res = await loggedFetch(url, { method: 'GET' }, { personId: params.personId });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * GET /rag/transcript/audio — ZIP 資料夾內音訊轉為逐字稿 JSON（與 `transcriptResponseMarkdown` 相容欄位為佳）
 */
export async function apiRagTranscriptAudio(params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const folder_name = String(params.folder_name ?? '').trim();
  if (!rag_tab_id) throw new Error('缺少 rag_tab_id');
  if (!folder_name) throw new Error('缺少 folder_name');
  const url = buildTranscriptUrl(API_RAG_TRANSCRIPT_AUDIO, { rag_tab_id, folder_name, personId: params.personId });
  const res = await loggedFetch(url, { method: 'GET' }, { personId: params.personId });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * GET /rag/transcript/youtube — ZIP 資料夾／URL 對應之影片逐字稿；選填 query `youtube_url`
 */
export async function apiRagTranscriptYoutube(params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const folder_name = String(params.folder_name ?? '').trim();
  if (!rag_tab_id) throw new Error('缺少 rag_tab_id');
  if (!folder_name) throw new Error('缺少 folder_name');
  const url = buildTranscriptUrl(API_RAG_TRANSCRIPT_YOUTUBE, {
    rag_tab_id,
    folder_name,
    personId: params.personId,
    youtubeUrl: params.youtubeUrl ?? params.youtube_url,
  });
  const res = await loggedFetch(url, { method: 'GET' }, { personId: params.personId });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * GET /rag/unit/mp3-file — ZIP 內 folder_name 資料夾取音訊；JSON 時含 audio_base64、transcript，否則回傳音訊 Blob。
 * Query：`rag_tab_id`、`folder_name`、`person_id`（與 {@link apiRagUnitText} 等一致）。
 * @param {{ rag_tab_id: string, folder_name: string, personId: string | null | undefined }} params
 * @returns {Promise<{ blob: Blob | null, transcript: string, filename: string, mediaType: string }>}
 */
export async function apiRagUnitMp3FileByFolder(params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const folder_name = String(params.folder_name ?? '').trim();
  const personId = params.personId != null ? String(params.personId).trim() : '';
  if (!rag_tab_id) throw new Error('缺少 rag_tab_id');
  if (!folder_name) throw new Error('缺少 folder_name');
  if (!personId) throw new Error('缺少 person_id');
  const url = buildTranscriptUrl(API_RAG_UNIT_MP3_FILE, { rag_tab_id, folder_name, personId });
  const res = await loggedFetch(url, { method: 'GET' }, { personId });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseFetchError(res, text));
  }
  const contentType = String(res.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('application/json')) {
    const text = await res.text();
    return parseRagUnitMp3FilePayload(parseJson(text));
  }
  const blob = await res.blob();
  return {
    blob: blob instanceof Blob && blob.size > 0 ? blob : null,
    transcript: '',
    filename: '',
    mediaType: blob?.type || contentType || 'audio/mpeg',
  };
}

/**
 * GET /rag/unit/youtube-url — ZIP 內 folder_name 資料夾解析 YouTube 網址與逐字稿（unit_type=4）
 * Query：`rag_tab_id`、`folder_name`、`person_id`。
 * @param {{ rag_tab_id: string, folder_name: string, personId: string | null | undefined }} params
 * @returns {Promise<object>}
 */
export async function apiRagUnitYoutubeUrlByFolder(params) {
  const rag_tab_id = String(params.rag_tab_id ?? '').trim();
  const folder_name = String(params.folder_name ?? '').trim();
  const personId = params.personId != null ? String(params.personId).trim() : '';
  if (!rag_tab_id) throw new Error('缺少 rag_tab_id');
  if (!folder_name) throw new Error('缺少 folder_name');
  if (!personId) throw new Error('缺少 person_id');
  const url = buildTranscriptUrl(API_RAG_UNIT_YOUTUBE_URL, { rag_tab_id, folder_name, personId });
  const res = await loggedFetch(url, { method: 'GET' }, { personId });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

// ─── RAG Tab 管理（CRUD） ─────────────────────────────────────────────────────

/**
 * GET /rag/tab/unit/mp3-file — 音訊單元（Rag_Unit.unit_type=3）。
 * 組出含 query（rag_tab_id、rag_unit_id）的完整 URL（後端不需 person_id）。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {string} 參數不全或 rag_unit_id 非正整數時回傳空字串
 */
export function buildRagTabUnitMp3FileUrl(params) {
  return buildRagTabUnitQueryUrl(API_RAG_TAB_UNIT_MP3_FILE, params);
}

/**
 * GET /rag/tab/unit/youtube-url — YouTube 單元（Rag_Unit.unit_type=4）。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {string}
 */
export function buildRagTabUnitYoutubeUrl(params) {
  return buildRagTabUnitQueryUrl(API_RAG_TAB_UNIT_YOUTUBE_URL, params);
}

/**
 * GET /rag/tab/unit/mp3-file — JSON：audio_base64、media_type、filename、transcript。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {Promise<{ blob: Blob | null, transcript: string, filename: string, mediaType: string }>}
 */
export async function apiRagTabUnitMp3File(params) {
  const url = buildRagTabUnitMp3FileUrl(params);
  if (!url) throw new Error('缺少 rag_tab_id 或 rag_unit_id');
  const res = await loggedFetch(url, { method: 'GET' }, { omitPersonIdQuery: true });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseRagUnitMp3FilePayload(parseJson(text));
}

/**
 * GET /rag/tab/unit/youtube-url — JSON：youtube_url、transcript。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {Promise<object>}
 */
export async function apiRagTabUnitYoutubeUrl(params) {
  const url = buildRagTabUnitYoutubeUrl(params);
  if (!url) throw new Error('缺少 rag_tab_id 或 rag_unit_id');
  const res = await loggedFetch(url, { method: 'GET' }, { omitPersonIdQuery: true });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * GET /rag/tab/unit/mp3-file — 與 {@link apiRagTabUnitMp3File} 相同端點，僅回傳音訊 Blob。
 * 供 `<audio>` 使用 `URL.createObjectURL`：正式站跨網域時比 `:src` 直連更容易通過（{@link loggedFetch} 須 `omitPersonIdQuery`，避免自動附帶 query person_id）。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} params
 * @returns {Promise<Blob>}
 */
export async function apiRagTabUnitMp3FileBlob(params) {
  const payload = await apiRagTabUnitMp3File(params);
  if (!(payload.blob instanceof Blob) || payload.blob.size <= 0) {
    throw new Error('音訊檔為空');
  }
  return payload.blob;
}

/**
 * Create Tab：POST /rag/tab/create（僅建立一筆 Rag；transcript 請於 tab/build-rag-zip 傳入）
 * @param {string} personId
 * @param {string} ragTabId
 * @param {string} tabName
 * @returns {Promise<object>} rag_id、rag_tab_id、person_id、tab_name、local、created_at
 */
export async function apiCreateUnit(personId, ragTabId, tabName) {
  const res = await loggedFetch(`${API_BASE}${API_CREATE_UNIT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_tab_id: ragTabId,
      person_id: personId,
      tab_name: tabName,
      local: isFrontendLocalHost(),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 建立 Rag 並上傳 ZIP：POST /rag/tab/create-upload-zip（先 tab/create，再 tab/upload-zip）
 * @param {File} file
 * @param {string} ragTabId
 * @param {string} personId
 * @param {string} tabName
 * @param {string | number} [courseId] - 省略時取自 authStore.currentCourse（query）
 * @returns {Promise<object>} 含 create 欄位與 file_metadata
 */
export async function apiCreateUploadZip(file, ragTabId, personId, tabName, courseId) {
  const resolvedCourseId = courseId != null && String(courseId).trim() !== '' ? String(courseId).trim() : getCourseId();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('rag_tab_id', String(ragTabId));
  formData.append('person_id', String(personId));
  formData.append('tab_name', String(tabName));
  formData.append('local', isFrontendLocalHost() ? 'true' : 'false');
  const res = await loggedFetch(
    `${API_BASE}${API_CREATE_UPLOAD_ZIP}`,
    {
      method: 'POST',
      body: formData,
    },
    resolvedCourseId ? { courseId: resolvedCourseId, personId } : { personId }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 上傳教材檔：POST /rag/tab/upload-zip（需先 tab/create）
 * @param {File} file - .pdf、.doc、.docx、.ppt、.pptx 等後端可解析格式
 * @param {string} ragTabId
 * @param {string} personId
 * @param {string | number} [courseId] - 省略時取自 authStore.currentCourse
 * @returns {Promise<object>} 後端回傳的 file_metadata
 */
export async function apiUploadZip(file, ragTabId, personId, courseId) {
  const resolvedCourseId = courseId != null && String(courseId).trim() !== '' ? String(courseId).trim() : getCourseId();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('rag_tab_id', String(ragTabId));
  formData.append('person_id', String(personId));
  if (resolvedCourseId) formData.append('course_id', resolvedCourseId);
  const res = await loggedFetch(
    `${API_BASE}${API_UPLOAD_ZIP}`,
    {
      method: 'POST',
      body: formData,
    },
    resolvedCourseId ? { courseId: resolvedCourseId } : undefined
  );
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 刪除 RAG：PUT /rag/tab/delete/{rag_tab_id}（後端依連線／session 識別 person，不需 X-Person-Id）
 * @param {string} ragTabId
 */
export async function apiDeleteRag(ragTabId) {
  const res = await loggedFetch(`${API_BASE}${API_RAG_DELETE}/${encodeURIComponent(String(ragTabId))}`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseFetchError(res, text));
  }
}

/**
 * 更新 RAG 分頁名稱：PUT /rag/tab/tab-name（以 rag_id 比對，僅 deleted=false）
 * @param {string | number} ragId - Rag 主鍵
 * @param {string} tabName
 * @returns {Promise<object>} rag_id、rag_tab_id、person_id、tab_name、updated_at
 */
export async function apiUpdateRagTabName(ragId, tabName) {
  const rid = Number(ragId);
  if (!Number.isInteger(rid) || rid < 1) {
    throw new Error('無效的 rag_id（須為正整數）');
  }
  const res = await loggedFetch(`${API_BASE}${API_RAG_UNIT_NAME}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_id: rid,
      tab_name: String(tabName).trim(),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

// ─── RAG ZIP 建立（串流 NDJSON） ──────────────────────────────────────────────

/**
 * 依後端 DB 欄位順序組裝 POST /rag/tab/build-rag-zip body（選填 course_id 置於末尾）。
 * @param {object} body
 * @returns {object}
 */
function orderBuildRagZipRequestBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const ordered = {
    rag_tab_id: b.rag_tab_id,
    person_id: b.person_id,
    unit_list: b.unit_list,
    unit_names: b.unit_names,
    unit_types: b.unit_types,
    transcripts: b.transcripts,
    rag_chunk_size: b.rag_chunk_size,
    rag_chunk_overlap: b.rag_chunk_overlap,
    rag_chunk_sizes: b.rag_chunk_sizes,
    rag_chunk_overlaps: b.rag_chunk_overlaps,
    build_faiss: b.build_faiss,
  };
  if (b.course_id != null && String(b.course_id).trim() !== '') {
    ordered.course_id = b.course_id;
  }
  return ordered;
}

/**
 * 建 RAG ZIP：POST /rag/tab/build-rag-zip（application/x-ndjson；請用 fetch 讀 response.body 逐行解析，勿對 200 本文使用 response.json()）
 *
 * Body 欄位順序（對應 DB）：rag_tab_id、person_id、unit_list、unit_names、unit_types、transcripts、rag_chunk_*、build_faiss；可另含 course_id。
 * rag_chunk_sizes／rag_chunk_overlaps 為逗號字串或陣列，與 unit_list 群組同序；transcripts 與 unit_list 逗號分段同序，unit_type 2／3／4 索引為 Markdown 全文 UTF-8 原樣，供寫入 Rag_Unit.transcript／transcript.md。
 * Query：person_id（與 body 一致）、course_id（必填，與全站 query 慣例一致）；選填 repack_only=true（強制各 unit 不建 FAISS），請傳第三參數 `streamOptions.repack_only`，勿自行拼進 URL。
 *
 * NDJSON 事件（每行一物件）：start（total、source_rag_tab_id、unit_list、user_type、build_faiss_request、repack_only、allow_faiss）、building（index、total、completed_before、filename）、unit（…、output：rag_mode 為 faiss｜transcript_md｜repack_copy，以及 rag_filename、transcript_plain、text_file_name、mp3_file_name、youtube_url 等）、complete（success、outputs…）。整批成敗以最後一則 complete.success 為準。
 *
 * @param {object} body - JSON body（見上）
 * @param {(ev: object) => void} [onStreamEvent] - 每收到一列事件即呼叫
 * @param {{ repack_only?: boolean }} [streamOptions] - repack_only=true 時於 query 加上 repack_only（強制不建 FAISS）
 * @returns {Promise<object>} 成功時回傳 outputs、rag_tab_id（來源 source_rag_tab_id）、unit_list、total、built_ok、built_failed
 */
export async function apiBuildRagZip(body, onStreamEvent, streamOptions = {}) {
  const personId = body?.person_id;
  if (personId == null || String(personId).trim() === '') {
    throw new Error('person_id 為必填');
  }
  const courseId =
    body?.course_id != null && String(body.course_id).trim() !== ''
      ? String(body.course_id).trim()
      : getCourseId();

  const mergedUrl = mergeApiQuery(`${API_BASE}${API_BUILD_RAG_ZIP}`, {
    personId: String(personId).trim(),
    courseId,
  });
  let u;
  try {
    u = new URL(mergedUrl);
  } catch {
    u = new URL(mergedUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  }
  if (streamOptions?.repack_only === true) {
    u.searchParams.set('repack_only', 'true');
  }

  const mergedBody =
    courseId != null && body?.course_id == null ? { ...body, course_id: courseId } : body;
  const requestBody = orderBuildRagZipRequestBody(mergedBody);

  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  };

  const res = await fetchWithRetry(u.toString(), init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseBuildRagZipError(res, text));
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('無法讀取回應內容（此瀏覽器不支援串流）');
  }

  const dec = new TextDecoder();
  let buf = '';
  /** @type {object | null} */
  let lastComplete = null;

  const dispatch = (ev) => {
    // eslint-disable-next-line no-console -- NDJSON 串流除錯（事件順序／目前第幾個 ZIP）
    console.log('[build-rag-zip stream]', ev?.type, ev);
    if (typeof onStreamEvent === 'function') onStreamEvent(ev);
    if (ev && ev.type === 'complete') lastComplete = ev;
  };

  let chunk = await reader.read();
  while (!chunk.done) {
    buf += dec.decode(chunk.value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      let ev;
      try {
        ev = JSON.parse(t);
      } catch (e) {
        throw new Error(`建置回應格式錯誤：${e?.message ?? e}`);
      }
      dispatch(ev);
    }
    chunk = await reader.read();
  }

  const tail = buf.trim();
  if (tail) {
    let ev;
    try {
      ev = JSON.parse(tail);
    } catch (e) {
      throw new Error(`建置回應格式錯誤：${e?.message ?? e}`);
    }
    dispatch(ev);
  }

  if (!lastComplete) {
    throw new Error('建置未完成：未收到完成事件');
  }

  if (!lastComplete.success) {
    const msg =
      lastComplete.message != null && String(lastComplete.message).trim() !== ''
        ? String(lastComplete.message).trim()
        : '建置失敗';
    const detail = {
      message: msg,
      outputs: lastComplete.outputs,
      source_rag_tab_id: lastComplete.source_rag_tab_id,
      unit_list: lastComplete.unit_list,
    };
    throw new Error(formatBuildRagZipErrorDetail(detail));
  }

  return {
    outputs: Array.isArray(lastComplete.outputs) ? lastComplete.outputs : [],
    rag_tab_id: lastComplete.source_rag_tab_id,
    unit_list: lastComplete.unit_list,
    total: lastComplete.total,
    built_ok: lastComplete.built_ok,
    built_failed: lastComplete.built_failed,
  };
}

// ─── Unit 查詢與 Quiz CRUD ────────────────────────────────────────────────────

/**
 * 依 rag_tab_id 列出該 tab 下所有未刪除 Rag_Unit（含 quizzes），依 created_at 舊→新。
 * GET /rag/tab/units?rag_tab_id=...&person_id=...
 * @param {string | number} ragTabId
 * @param {string | number} personId
 * @returns {Promise<object[]>}
 */
export async function apiGetRagTabUnits(ragTabId, personId) {
  const tabId = String(ragTabId ?? '').trim();
  const pid = String(personId ?? '').trim();
  if (!tabId) throw new Error('缺少 rag_tab_id');
  if (!pid) throw new Error('缺少 person_id');
  const url = new URL(`${API_BASE}${API_RAG_TAB_UNITS}`);
  url.searchParams.set('rag_tab_id', tabId);
  url.searchParams.set('person_id', pid);
  const res = await loggedFetch(mergeApiQuery(url.toString(), { personId: pid }), { method: 'GET' });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  const data = parseJson(text);
  return Array.isArray(data) ? data : (Array.isArray(data?.units) ? data.units : []);
}

/**
 * 建立空白 Rag_Quiz（不呼叫 LLM）：POST /rag/tab/unit/quiz/create；query person_id（必填）
 * Body：{ rag_tab_id, rag_unit_id }；回應會帶出 rag_quiz_id。
 * LLM 出題請改呼叫 {@link apiRagUnitQuizLlmGenerate}。
 * @param {{ rag_tab_id: string, rag_unit_id: number }} body
 */
export async function apiCreateRagUnitQuiz(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const tid = body?.rag_tab_id != null ? String(body.rag_tab_id).trim() : '';
  const uid =
    body?.rag_unit_id != null && body.rag_unit_id !== ''
      ? Number(body.rag_unit_id)
      : 0;
  if (!tid) throw new Error('缺少 rag_tab_id');
  if (!Number.isFinite(uid) || uid < 0) throw new Error('無效的 rag_unit_id');
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_CREATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_tab_id: tid,
      rag_unit_id: uid,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 更新 Rag_Quiz 題名：PUT /rag/tab/unit/quiz/quiz-name；query person_id（必填）。
 * Body：`rag_quiz_id`、`quiz_name`。
 * @param {{ rag_quiz_id: number, quiz_name: string }} body
 * @param {string | number} personId
 * @returns {Promise<object>}
 */
export async function apiUpdateRagQuizName(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const qname = body?.quiz_name != null ? String(body.quiz_name).trim() : '';
  if (!qname) throw new Error('請輸入題型');
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_QUIZ_NAME}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_quiz_id: rqid,
      quiz_name: qname,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 軟刪除 Rag_Quiz：PUT /rag/tab/quiz/delete/{rag_quiz_id}；query person_id（必填）。
 * @param {number | string} ragQuizId
 * @param {string | number} personId
 */
export async function apiDeleteRagQuiz(ragQuizId, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(ragQuizId);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const res = await loggedFetch(
    `${API_BASE}${API_RAG_TAB_QUIZ_DELETE}/${encodeURIComponent(String(rqid))}`,
    { method: 'PUT' },
    { personId: pid }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * RAG + LLM 單元出題（與 POST /rag/tab/unit/quiz/create 分開）。
 * POST /rag/tab/unit/quiz/llm-generate — query：**person_id**（必填）。
 *
 * Body 欄位順序（對應 DB）：`rag_quiz_id`、`quiz_name`、`quiz_user_prompt_text`、`quiz_history_list`（後三者可空字串／空陣列）。
 * `rag_tab_id`／`rag_unit_id` **不需傳**，後端依 `rag_quiz_id` 自 DB 帶入。
 *
 * unit_type 2／3／4：不載入 RAG ZIP，以 LLM 純生成（system = transcript、user = quiz_user_prompt_text）。
 * 其餘：FAISS 檢索後出題。使用者須於個人設定填 LLM API Key。
 *
 * LLM Key 依 Rag.person_id 自 User；成功後更新 Rag_Quiz 錨點列並清空舊作答欄位（細節以後端為準）。
 * @param {{ rag_quiz_id: number, quiz_user_prompt_text?: string, quiz_name?: string, quiz_history_list?: string[] }} body
 * @returns {Promise<object>} 後端 JSON，預期含 quiz_content、quiz_hint、quiz_reference_answer、quiz_name、rag_quiz_id、transcript 等。
 */
export async function apiRagUnitQuizLlmGenerate(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const uxt = body?.quiz_user_prompt_text != null ? String(body.quiz_user_prompt_text) : '';
  const qname = body?.quiz_name != null ? String(body.quiz_name) : '';
  const history = Array.isArray(body?.quiz_history_list)
    ? [
        ...new Set(
          body.quiz_history_list
            .map((s) => String(s ?? '').trim())
            .filter((s) => s !== ''),
        ),
      ]
    : [];
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_quiz_id: rqid,
      quiz_name: qname,
      quiz_user_prompt_text: uxt,
      quiz_history_list: history,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * RAG + LLM 單元出題（使用 Rag_Quiz 已儲存之 quiz_user_prompt_text，請求不帶該欄）。
 * POST /rag/tab/unit/quiz/llm-generate-db — query：**person_id**（必填）。
 *
 * Body：**僅** `rag_quiz_id`、`quiz_name`（可空字串）。
 *
 * @param {{ rag_quiz_id: number, quiz_name?: string }} body
 * @returns {Promise<object>} 與 {@link apiRagUnitQuizLlmGenerate} 成功回應格式一致之前端預期欄位。
 */
export async function apiRagUnitQuizLlmGenerateDb(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const qname = body?.quiz_name != null ? String(body.quiz_name) : '';
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_DB}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_quiz_id: rqid,
      quiz_name: qname,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 正規化追問出題歷史單筆（quiz_content、answer_content、quiz_answer_reference、answer_critique）。
 * @param {unknown} item
 * @returns {{ quiz_content: string, answer_content: string, quiz_answer_reference: string, answer_critique: string } | null}
 */
export function normalizeFollowupHistoryItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const quiz_content = String(
    item.quiz_content ?? item.quizContent ?? item.quiz ?? '',
  ).trim();
  if (!quiz_content) return null;
  const answer_content = String(
    item.answer_content ?? item.answerContent ?? item.quiz_answer ?? item.answer ?? '',
  ).trim();
  const quiz_answer_reference = String(
    item.quiz_answer_reference
    ?? item.quizAnswerReference
    ?? item.quiz_reference_answer
    ?? item.referenceAnswer
    ?? '',
  ).trim();
  const answer_critique = String(
    item.answer_critique ?? item.answerCritique ?? item.gradingResult ?? '',
  ).trim();
  return { quiz_content, answer_content, quiz_answer_reference, answer_critique };
}

function followupHistoryDedupKey(item) {
  return [
    item.quiz_content,
    item.answer_content,
    item.quiz_answer_reference,
    item.answer_critique,
  ].join('\0');
}

/**
 * 自 API／題卡解析追問出題歷史（去重；支援 JSON 字串）。
 * @param {unknown} source
 * @returns {{ quiz_content: string, answer_content: string, quiz_answer_reference: string, answer_critique: string }[]}
 */
export function parseFollowupHistoryListFromSource(source) {
  let list = source;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    list =
      source.quiz_followup_history_list
      ?? source.quizFollowupHistoryList
      ?? source.quiz_history_list
      ?? source.quizHistoryList;
  }
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (typeof item === 'string') continue;
    const normalized = normalizeFollowupHistoryItem(item);
    if (!normalized) continue;
    const key = followupHistoryDedupKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/**
 * 自題卡組追問出題歷史單筆（供 llm-generate-followup 與 Modal 顯示）。
 * @param {unknown} card
 * @returns {{ quiz_content: string, answer_content: string, quiz_answer_reference: string, answer_critique: string } | null}
 */
export function followupHistoryEntryFromQuizCard(card) {
  if (!card || typeof card !== 'object') return null;
  return normalizeFollowupHistoryItem({
    quiz_content: card.quiz,
    answer_content: card.quiz_answer,
    quiz_answer_reference: card.referenceAnswer ?? card.quiz_answer_reference,
    answer_critique: extractAnswerCritiqueRaw(card),
  });
}

/** @param {unknown} card */
export function extractAnswerCritiqueRaw(card) {
  if (!card || typeof card !== 'object') return '';
  for (const k of ['answer_critique', 'answerCritique']) {
    const v = card[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  const gj = card.gradingResponseJson;
  if (gj && typeof gj === 'object') {
    for (const k of ['answer_critique', 'answerCritique']) {
      const v = gj[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    const formatted = formatGradingResult(JSON.stringify(gj));
    if (formatted && String(formatted).trim() !== '') return String(formatted).trim();
  }
  const gr = card.gradingResult;
  if (gr != null && String(gr).trim() !== '') return String(gr).trim();
  return '';
}

/**
 * RAG + LLM 追問出題（依先前問答接續下一題）。
 * POST /rag/tab/unit/quiz/llm-generate-followup — query：**person_id**、**course_id**（必填）。
 *
 * Body：`rag_quiz_id`、`quiz_name`、`quiz_user_prompt_text`、`quiz_history_list`（物件陣列，每項含 quiz_content、answer_content、quiz_answer_reference、answer_critique）。
 *
 * @param {{ rag_quiz_id: number, quiz_user_prompt_text?: string, quiz_name?: string, quiz_history_list?: { quiz_content: string, answer_content: string, quiz_answer_reference?: string, answer_critique?: string }[] }} body
 * @returns {Promise<object>}
 */
export async function apiRagUnitQuizLlmGenerateFollowup(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const uxt = body?.quiz_user_prompt_text != null ? String(body.quiz_user_prompt_text) : '';
  const qname = body?.quiz_name != null ? String(body.quiz_name) : '';
  const seen = new Set();
  const history = Array.isArray(body?.quiz_history_list)
    ? body.quiz_history_list.reduce((acc, item) => {
        const normalized = normalizeFollowupHistoryItem(item);
        if (!normalized) return acc;
        const key = followupHistoryDedupKey(normalized);
        if (seen.has(key)) return acc;
        seen.add(key);
        acc.push(normalized);
        return acc;
      }, [])
    : [];
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_FOLLOWUP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_quiz_id: rqid,
      quiz_name: qname,
      quiz_user_prompt_text: uxt,
      quiz_history_list: history,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * RAG + LLM 追問出題（使用 Rag_Quiz 已儲存之 quiz_user_prompt_text，請求不帶該欄）。
 * POST /rag/tab/unit/quiz/llm-generate-followup-db — query：**person_id**、**course_id**（必填）。
 *
 * Body：`rag_quiz_id`、`quiz_name`、`quiz_history_list`（物件陣列）。
 *
 * @param {{ rag_quiz_id: number, quiz_name?: string, quiz_history_list?: { quiz_content: string, answer_content: string, quiz_answer_reference?: string, answer_critique?: string }[] }} body
 * @returns {Promise<object>}
 */
export async function apiRagUnitQuizLlmGenerateFollowupDb(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const qname = body?.quiz_name != null ? String(body.quiz_name) : '';
  const seen = new Set();
  const history = Array.isArray(body?.quiz_history_list)
    ? body.quiz_history_list.reduce((acc, item) => {
        const normalized = normalizeFollowupHistoryItem(item);
        if (!normalized) return acc;
        const key = followupHistoryDedupKey(normalized);
        if (seen.has(key)) return acc;
        seen.add(key);
        acc.push(normalized);
        return acc;
      }, [])
    : [];
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_LLM_GENERATE_FOLLOWUP_DB}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_quiz_id: rqid,
      quiz_name: qname,
      quiz_history_list: history,
    }),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 更新 Rag_Quiz.for_exam：POST /rag/tab/unit/quiz/for-exam — query person_id（必填）。
 * Body：`rag_quiz_id`、選填 `rag_tab_id`／`rag_unit_id`、`for_exam`（true＝測驗用、false＝取消）；以 rag_quiz_id 定位列。
 *
 * @param {{ rag_quiz_id: number, rag_tab_id?: string, rag_unit_id?: number, for_exam: boolean }} body
 * @param {string | number} personId
 */
export async function apiMarkRagQuizForExam(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const payload = {
    rag_quiz_id: Math.trunc(rqid),
  };
  const ragTabId = body?.rag_tab_id != null ? String(body.rag_tab_id).trim() : '';
  if (ragTabId) payload.rag_tab_id = ragTabId;
  const ragUnitId = Number(body?.rag_unit_id);
  if (Number.isFinite(ragUnitId) && ragUnitId > 0) payload.rag_unit_id = Math.trunc(ragUnitId);
  payload.for_exam = !!body?.for_exam;
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_FOR_EXAM}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * 更新 Rag_Quiz.follow_up：POST /rag/tab/unit/quiz/followup — query person_id、course_id（必填）。
 * Body：`rag_quiz_id`、選填 `rag_tab_id`／`rag_unit_id`、`followup`（true＝追問、false＝一般）；以 rag_quiz_id 定位列。
 *
 * @param {{ rag_quiz_id: number, rag_tab_id?: string, rag_unit_id?: number, followup: boolean }} body
 * @param {string | number} personId
 */
export async function apiSetRagQuizFollowup(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const rqid = Number(body?.rag_quiz_id);
  if (!Number.isFinite(rqid) || rqid < 1) throw new Error('無效的 rag_quiz_id');
  const payload = {
    rag_quiz_id: Math.trunc(rqid),
    followup: !!body?.followup,
  };
  const ragTabId = body?.rag_tab_id != null ? String(body.rag_tab_id).trim() : '';
  if (ragTabId) payload.rag_tab_id = ragTabId;
  const ragUnitId = Number(body?.rag_unit_id);
  if (Number.isFinite(ragUnitId) && ragUnitId > 0) payload.rag_unit_id = Math.trunc(ragUnitId);
  const res = await loggedFetch(`${API_BASE}${API_RAG_TAB_UNIT_QUIZ_FOLLOWUP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ─── 舊版題目產生（相容層） ───────────────────────────────────────────────────

/**
 * 產生題目：POST /rag/tab/quiz/create（quiz_level 已取消，不再送出）
 * @param {string | number} ragId - Rag 表主鍵
 * @param {string | number | null | undefined} [ragTabId] - 選填；空則傳 ""
 * @param {string | null | undefined} [unitName] - 選填；空字串則後端依 outputs 用第一筆
 * @returns {Promise<object>} 含 quiz_content、quiz_hint、quiz_answer_reference、rag_quiz_id 等
 */
export async function apiGenerateQuiz(ragId, ragTabId, unitName) {
  const rid = Number(ragId);
  if (!Number.isFinite(rid) || rid < 1) {
    throw new Error('無效的 rag_id（須為 Rag 表主鍵正整數）');
  }
  const tid =
    ragTabId != null && String(ragTabId).trim() !== '' ? String(ragTabId).trim() : '';
  const un = unitName != null ? String(unitName).trim() : '';
  const body = {
    rag_id: rid,
    rag_tab_id: tid,
    unit_name: un,
  };
  const res = await loggedFetch(`${API_BASE}${API_GENERATE_QUIZ}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

// ─── 錯誤判斷輔助 ─────────────────────────────────────────────────────────────

/**
 * 判斷是否為 504 或網路錯誤（Failed to fetch）
 * 用於 UI 顯示「逾時或服務喚醒中」等友善訊息
 * @param {Error} [err]
 * @returns {boolean}
 */
export function is504OrNetworkError(err) {
  return err?.message?.includes('504') || (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch'));
}
