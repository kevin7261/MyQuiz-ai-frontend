<script setup>
/**
 * PromptTextPage - LLM Prompt 模板（GET /prompt/templates）
 *
 * 以 Markdown 預覽顯示各 LLM 功能之 prompt 模板（對齊出題規則黑底區）；
 * 同一組 system／user 合併為一區；system 與 user 各一黑底預覽區。
 * rag 區塊為向量檢索查詢句；build_defaults 為數值預設。
 * 僅 user_type=1 可進入（路由與選單由 permissions 限制）。
 */
defineProps({
  design3: { type: Boolean, default: false },
});

import { ref, onMounted } from 'vue';
import { API_BASE, API_PROMPT_TEMPLATES } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import EnglishExamMarkdownEditor from '../components/EnglishExamMarkdownEditor.vue';
import { loggedFetch } from '../utils/loggedFetch.js';

const loading = ref(false);
const error = ref('');
const templates = ref(null);

const SECTION_GROUPS = [
  {
    title: 'RAG 向量檢索（rag）',
    note: '向量檢索抓 RAG 片段之查詢句（非 Chat LLM system 模板）。',
    sections: [
      {
        root: 'rag',
        key: 'llm_generate',
        title: '出題查詢（rag.llm_generate）',
        groups: [
          {
            key: 'main',
            label: 'system / user',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user', label: 'user' },
            ],
          },
        ],
      },
      {
        root: 'rag',
        key: 'llm_grade',
        title: '評分查詢（rag.llm_grade）',
        groups: [
          {
            key: 'main',
            label: 'system / user',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user', label: 'user' },
            ],
          },
        ],
      },
      {
        root: 'rag',
        key: 'build_defaults',
        title: 'build_defaults（rag.build_defaults）',
        kind: 'defaults',
      },
    ],
  },
  {
    title: 'Chat LLM',
    sections: [
      {
        key: 'llm_generate',
        title: '出題（llm_generate）',
        groups: [
          {
            key: 'main',
            label: '出題',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user', label: 'user' },
            ],
          },
          {
            key: 'followup',
            label: '追問出題',
            fields: [
              { key: 'system_followup', label: 'system_followup' },
              { key: 'user_followup', label: 'user_followup' },
            ],
          },
        ],
      },
      {
        key: 'llm_grade',
        title: '評分（llm_grade）',
        groups: [
          {
            key: 'transcription',
            label: 'transcription / course',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user_transcription_course', label: 'user_transcription_course' },
            ],
          },
          {
            key: 'faiss',
            label: 'faiss / course',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user_faiss_course', label: 'user_faiss_course' },
            ],
          },
        ],
      },
      {
        key: 'person_analysis',
        title: '作答弱點分析（person_analysis）',
        groups: [
          {
            key: 'main',
            label: 'system / user',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user', label: 'user' },
            ],
          },
        ],
      },
      {
        key: 'course_analysis',
        title: '學生作答分析（course_analysis）',
        groups: [
          {
            key: 'main',
            label: 'system / user',
            fields: [
              { key: 'system', label: 'system' },
              { key: 'user', label: 'user' },
            ],
          },
        ],
      },
    ],
  },
];

function sectionData(root, sectionKey) {
  if (root) return templates.value?.[root]?.[sectionKey];
  return templates.value?.[sectionKey];
}

function fieldValue(root, sectionKey, fieldKey) {
  const section = sectionData(root, sectionKey);
  const val = section?.[fieldKey];
  return val != null ? String(val) : '';
}

function defaultsEntries(root, sectionKey) {
  const obj = sectionData(root, sectionKey);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj)
    .sort()
    .map((key) => ({ key, value: obj[key] }));
}

function sectionDomId(section) {
  const root = section.root ? `${section.root}-` : '';
  return `${root}${section.key}`;
}

async function fetchTemplates() {
  loading.value = true;
  error.value = '';
  try {
    const res = await loggedFetch(
      `${API_BASE}${API_PROMPT_TEMPLATES}`,
      { method: 'GET' },
      { omitCourseQuery: true },
    );
    const text = await res.text();
    if (!res.ok) {
      let msg = `服務暫時無法回應（${res.status}）`;
      try {
        const body = JSON.parse(text);
        if (body.detail) msg += ` — ${typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)}`;
      } catch {
        if (text && text.length < 200) msg += ` — ${text}`;
      }
      throw new Error(msg);
    }
    templates.value = text ? JSON.parse(text) : {};
  } catch (e) {
    error.value = e.message || '無法載入 Prompt 模板，請稍後再試';
    templates.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTemplates();
});
</script>

<template>
  <div class="d-flex flex-column h-100 overflow-hidden position-relative my-bgcolor-white">
    <LoadingOverlay :is-visible="loading" loading-text="載入中..." />
    <div v-if="error" class="flex-shrink-0">
      <div class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3" role="alert">{{ error }}</div>
    </div>
    <div class="flex-grow-1 overflow-auto d-flex flex-column min-h-0 my-bgcolor-white">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-md-12 col-lg-10 col-xl-8 col-xxl-6">
            <p class="my-font-sm-400 my-color-gray-1 text-break mb-3">
              各 LLM 功能之 system／user prompt 模板；占位符（如 &#123;context_md&#125;、&#123;quiz_user_prompt_text&#125;）保留原樣。
            </p>
            <div class="d-flex flex-wrap justify-content-end mb-3">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-3 py-2"
                :disabled="loading"
                @click="fetchTemplates"
              >
                重新載入
              </button>
            </div>
            <div
              v-if="templates"
              class="d-flex flex-column gap-5 w-100 min-w-0 text-start analysis-page-3-rules my-design--side-panel-left"
            >
              <div
                v-for="group in SECTION_GROUPS"
                :key="group.title"
                class="prompt-text-section-group"
              >
                <h2 class="my-font-md-600 my-color-black mb-2">{{ group.title }}</h2>
                <p
                  v-if="group.note"
                  class="my-font-sm-400 my-color-gray-1 text-break mb-4"
                >
                  {{ group.note }}
                </p>
                <div
                  v-for="section in group.sections"
                  :key="sectionDomId(section)"
                  class="prompt-text-section mb-4"
                >
                  <h3 class="my-font-md-600 my-color-black mb-3">{{ section.title }}</h3>

                  <div
                    v-if="section.kind === 'defaults'"
                    class="my-design-quiz-sub-block-outer mb-3"
                  >
                    <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3">
                      <div class="table-responsive">
                        <table class="table table-bordered table-sm my-font-md-400 mb-0">
                          <thead class="my-table-thead">
                            <tr>
                              <th class="my-font-md-600">鍵</th>
                              <th class="my-font-md-600">值</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="row in defaultsEntries(section.root, section.key)"
                              :key="row.key"
                            >
                              <td class="font-monospace text-break">{{ row.key }}</td>
                              <td class="text-break">{{ row.value }}</td>
                            </tr>
                            <tr v-if="defaultsEntries(section.root, section.key).length === 0">
                              <td colspan="2" class="my-color-gray-4 text-center">尚無資料</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <template v-else>
                    <div
                      v-for="subGroup in section.groups"
                      :key="subGroup.key"
                      class="my-design-quiz-sub-block-outer mb-3"
                    >
                      <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
                        <p
                          v-if="section.groups.length > 1 || subGroup.label !== 'system / user'"
                          class="my-font-sm-400 my-color-gray-1 px-3 pt-2 mb-0"
                        >
                          {{ subGroup.label }}
                        </p>
                        <div
                          v-for="(field, fieldIdx) in subGroup.fields"
                          :key="field.key"
                          class="my-design-quiz-question-prompt-wrap px-3 w-100 min-w-0"
                          :class="fieldIdx === 0 ? 'pt-2' : 'pt-3'"
                        >
                          <section
                            class="my-design-quiz-question-prompt-block w-100 min-w-0"
                            :aria-label="field.label"
                          >
                            <header class="my-design-quiz-question-prompt-block__head">
                              <div
                                class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                              >
                                <h4 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-2 mb-0">
                                  {{ field.label }}
                                </h4>
                              </div>
                            </header>
                            <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                              <EnglishExamMarkdownEditor
                                :model-value="fieldValue(section.root, section.key, field.key)"
                                :textarea-id="`prompt-template-preview-${sectionDomId(section)}-${subGroup.key}-${field.key}`"
                                preview-only
                                preview-design-dark
                                preview-design-dark-embedded
                              />
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <p
              v-else-if="!loading && !error"
              class="my-color-gray-4 text-center my-font-md-400 mb-0"
            >
              尚無資料
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
