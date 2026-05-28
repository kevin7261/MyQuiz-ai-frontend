<script setup>
/**
 * PromptTextPage - LLM Prompt 模板（GET /prompt/templates）
 *
 * 以 Markdown 預覽顯示各 LLM 功能之 prompt 模板（對齊出題規則黑底區）；
 * rag 區塊為向量檢索查詢句與 k 值（非 Chat LLM prompt）。
 * 同一組 system／user 合併為一區；system 與 user 各一黑底預覽區。
 * 僅 user_type=1 可進入（路由與選單由 permissions 限制）。
 */
defineProps({
  design3: { type: Boolean, default: false },
});

import { computed, ref, onMounted } from 'vue';
import { API_BASE, API_PROMPT_TEMPLATES } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import EnglishExamMarkdownEditor from '../components/EnglishExamMarkdownEditor.vue';
import { loggedFetch } from '../utils/loggedFetch.js';

const loading = ref(false);
const error = ref('');
const templates = ref(null);

const RAG_SECTION = {
  title: 'RAG（向量檢索）',
  groups: [
    {
      key: 'llm_generate',
      label: '出題（llm_generate）',
      fields: [
        { key: 'retrieval_query', label: 'retrieval_query', kind: 'text' },
        { key: 'retrieval_k', label: 'retrieval_k', kind: 'scalar' },
      ],
    },
    {
      key: 'llm_grade',
      label: '評分（llm_grade）',
      fields: [
        { key: 'retrieval_query', label: 'retrieval_query', kind: 'text' },
        { key: 'retrieval_k', label: 'retrieval_k', kind: 'scalar' },
      ],
    },
  ],
};

const PROMPT_SECTIONS = [
  {
    key: 'llm_generate',
    title: '出題（llm_generate）',
    groups: [
      {
        key: 'main',
        label: '出題',
        fields: [
          { key: 'system', label: 'system', kind: 'text' },
          { key: 'user', label: 'user', kind: 'text' },
        ],
      },
      {
        key: 'followup',
        label: '追問出題',
        fields: [
          { key: 'system_followup', label: 'system_followup', kind: 'text' },
          { key: 'user_followup', label: 'user_followup', kind: 'text' },
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
          { key: 'system', label: 'system', kind: 'text' },
          { key: 'user_transcription_course', label: 'user_transcription_course', kind: 'text' },
        ],
      },
      {
        key: 'faiss',
        label: 'faiss / course',
        fields: [
          { key: 'system', label: 'system', kind: 'text' },
          { key: 'user_faiss_course', label: 'user_faiss_course', kind: 'text' },
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
          { key: 'system', label: 'system', kind: 'text' },
          { key: 'user', label: 'user', kind: 'text' },
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
          { key: 'system', label: 'system', kind: 'text' },
          { key: 'user', label: 'user', kind: 'text' },
        ],
      },
    ],
  },
];

function promptFieldValue(sectionKey, fieldKey) {
  const section = templates.value?.[sectionKey];
  const val = section?.[fieldKey];
  return val != null ? String(val) : '';
}

function ragFieldValue(groupKey, fieldKey) {
  const group = templates.value?.rag?.[groupKey];
  const val = group?.[fieldKey];
  if (val == null) return '';
  return String(val);
}

const buildDefaultRows = computed(() => {
  const obj = templates.value?.rag?.build_defaults;
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj)
    .sort()
    .map((key) => ({ key, value: obj[key] }));
});

function showGroupLabel(sectionOrRag, group) {
  if (sectionOrRag === RAG_SECTION) return true;
  return sectionOrRag.groups.length > 1 || group.label !== 'system / user';
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
              各 LLM 功能之 system／user prompt 模板；rag 為向量檢索查詢句與 k 值。占位符（如 &#123;context_md&#125;、&#123;quiz_user_prompt_text&#125;）保留原樣。
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
              class="d-flex flex-column gap-4 w-100 min-w-0 text-start analysis-page-3-rules my-design--side-panel-left"
            >
              <!-- RAG -->
              <section class="prompt-text-section">
                <h2 class="my-font-md-600 my-color-black mb-3">{{ RAG_SECTION.title }}</h2>
                <div
                  v-for="group in RAG_SECTION.groups"
                  :key="group.key"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
                    <p
                      v-if="showGroupLabel(RAG_SECTION, group)"
                      class="my-font-sm-400 my-color-gray-1 px-3 pt-2 mb-0"
                    >
                      {{ group.label }}
                    </p>
                    <div
                      v-for="(field, fieldIdx) in group.fields"
                      :key="field.key"
                      class="px-3 w-100 min-w-0"
                      :class="fieldIdx === 0 ? 'pt-2' : 'pt-3'"
                    >
                      <template v-if="field.kind === 'text'">
                        <div class="my-design-quiz-question-prompt-wrap w-100 min-w-0">
                          <section
                            class="my-design-quiz-question-prompt-block w-100 min-w-0"
                            :aria-label="field.label"
                          >
                            <header class="my-design-quiz-question-prompt-block__head">
                              <div
                                class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                              >
                                <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-2 mb-0">
                                  {{ field.label }}
                                </h3>
                              </div>
                            </header>
                            <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                              <EnglishExamMarkdownEditor
                                :model-value="ragFieldValue(group.key, field.key)"
                                :textarea-id="`prompt-template-rag-${group.key}-${field.key}`"
                                preview-only
                                preview-design-dark
                                preview-design-dark-embedded
                              />
                            </div>
                          </section>
                        </div>
                      </template>
                      <template v-else>
                        <label
                          class="form-label my-font-sm-400 my-color-gray-1 mb-2"
                          :for="`prompt-template-rag-${group.key}-${field.key}`"
                        >
                          {{ field.label }}
                        </label>
                        <input
                          :id="`prompt-template-rag-${group.key}-${field.key}`"
                          class="form-control my-input-md rounded-2 my-form-control-static font-monospace text-break w-100 px-3 py-2"
                          :value="ragFieldValue(group.key, field.key)"
                          readonly
                          :aria-label="field.label"
                        >
                      </template>
                    </div>
                  </div>
                </div>
                <div class="my-design-quiz-sub-block-outer mb-3">
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3 pt-2 pb-3">
                    <p class="my-font-sm-400 my-color-gray-1 mb-3">build_defaults</p>
                    <div
                      v-for="row in buildDefaultRows"
                      :key="row.key"
                      class="mb-3"
                    >
                      <label
                        class="form-label my-font-sm-400 my-color-gray-1 mb-2"
                        :for="`prompt-template-rag-build-${row.key}`"
                      >
                        {{ row.key }}
                      </label>
                      <input
                        :id="`prompt-template-rag-build-${row.key}`"
                        class="form-control my-input-md rounded-2 my-form-control-static font-monospace text-break w-100 px-3 py-2"
                        :value="row.value != null ? String(row.value) : ''"
                        readonly
                        :aria-label="row.key"
                      >
                    </div>
                    <p
                      v-if="buildDefaultRows.length === 0"
                      class="my-color-gray-4 my-font-md-400 mb-0"
                    >
                      —
                    </p>
                  </div>
                </div>
              </section>

              <!-- LLM prompts -->
              <section
                v-for="section in PROMPT_SECTIONS"
                :key="section.key"
                class="prompt-text-section"
              >
                <h2 class="my-font-md-600 my-color-black mb-3">{{ section.title }}</h2>
                <div
                  v-for="group in section.groups"
                  :key="group.key"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
                    <p
                      v-if="showGroupLabel(section, group)"
                      class="my-font-sm-400 my-color-gray-1 px-3 pt-2 mb-0"
                    >
                      {{ group.label }}
                    </p>
                    <div
                      v-for="(field, fieldIdx) in group.fields"
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
                            <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-2 mb-0">
                              {{ field.label }}
                            </h3>
                          </div>
                        </header>
                        <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                          <EnglishExamMarkdownEditor
                            :model-value="promptFieldValue(section.key, field.key)"
                            :textarea-id="`prompt-template-preview-${section.key}-${group.key}-${field.key}`"
                            preview-only
                            preview-design-dark
                            preview-design-dark-embedded
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </section>
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
