<script setup>
/**
 * PromptTextPage - LLM Prompt 模板（GET /prompt/templates）
 *
 * 顯示 rag 向量檢索設定、各區塊占位符說明，以及 LLM prompt 模板（Markdown 黑底預覽）。
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
  key: 'rag',
  title: 'RAG（向量檢索，非 Chat LLM prompt）',
  groups: [
    {
      key: 'llm_generate',
      label: 'llm_generate',
      fields: [
        { key: 'retrieval_query', label: 'retrieval_query' },
        { key: 'retrieval_k', label: 'retrieval_k' },
      ],
    },
    {
      key: 'llm_grade',
      label: 'llm_grade',
      fields: [
        { key: 'retrieval_query', label: 'retrieval_query' },
        { key: 'retrieval_k', label: 'retrieval_k' },
      ],
    },
  ],
};

const LLM_SECTIONS = [
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
];

const buildDefaultRows = computed(() => {
  const defaults = templates.value?.rag?.build_defaults;
  if (!defaults || typeof defaults !== 'object') return [];
  return Object.entries(defaults)
    .map(([key, val]) => ({ key, val: val != null ? String(val) : '—' }))
    .sort((a, b) => a.key.localeCompare(b.key));
});

function nestedValue(rootKey, groupKey, fieldKey) {
  const root = templates.value?.[rootKey];
  if (!root || typeof root !== 'object') return '';
  const node = groupKey ? root[groupKey] : root;
  if (!node || typeof node !== 'object') return '';
  const val = node[fieldKey];
  return val != null ? String(val) : '';
}

function fieldValue(sectionKey, fieldKey) {
  return nestedValue(sectionKey, null, fieldKey);
}

function ragFieldValue(groupKey, fieldKey) {
  return nestedValue('rag', groupKey, fieldKey);
}

function placeholdersForSection(sectionKey) {
  const block = templates.value?.placeholders?.[sectionKey];
  if (!block || typeof block !== 'object') return [];
  return Object.entries(block)
    .map(([name, desc]) => ({
      name,
      desc: desc != null ? String(desc) : '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
              各 LLM 功能之 prompt 模板全文；模板內 &#123;占位符&#125; 保留原樣。
              <code class="font-monospace">rag</code> 區塊為向量檢索查詢句與 k 值（非 Chat LLM prompt）；
              各區塊下方列出占位符說明。
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
              <!-- RAG 向量檢索 -->
              <section class="prompt-text-section">
                <h2 class="my-font-md-600 my-color-black mb-3">{{ RAG_SECTION.title }}</h2>
                <div
                  v-if="placeholdersForSection('rag').length > 0"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3">
                    <h3 class="my-font-sm-400 my-color-gray-1 px-0 pt-2 mb-2">占位符說明</h3>
                    <div class="table-responsive">
                      <table class="table table-sm table-borderless mb-0 my-font-sm-400">
                        <tbody>
                          <tr v-for="item in placeholdersForSection('rag')" :key="item.name">
                            <th scope="row" class="text-nowrap align-top pe-3 font-monospace my-color-gray-3">
                              &#123;{{ item.name }}&#125;
                            </th>
                            <td class="text-break my-color-black">{{ item.desc }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div
                  v-for="group in RAG_SECTION.groups"
                  :key="group.key"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3">
                    <p class="my-font-sm-400 my-color-gray-1 pt-2 mb-3">{{ group.label }}</p>
                    <div
                      v-for="field in group.fields"
                      :key="field.key"
                      class="mb-3"
                    >
                      <label class="form-label my-font-sm-400 my-color-gray-1 mb-2">{{ field.label }}</label>
                      <input
                        :value="ragFieldValue(group.key, field.key)"
                        type="text"
                        class="form-control my-input-md rounded-2 my-form-control-static font-monospace text-break w-100 px-3 py-2"
                        readonly
                        :aria-label="`${group.label} ${field.label}`"
                      >
                    </div>
                  </div>
                </div>
                <div
                  v-if="buildDefaultRows.length > 0"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3">
                    <p class="my-font-sm-400 my-color-gray-1 pt-2 mb-3">build_defaults</p>
                    <div class="table-responsive">
                      <table class="table table-sm table-bordered mb-0 my-font-sm-400">
                        <thead class="my-table-thead">
                          <tr>
                            <th class="my-font-sm-600">鍵</th>
                            <th class="my-font-sm-600">值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in buildDefaultRows" :key="row.key">
                            <td class="font-monospace text-break">{{ row.key }}</td>
                            <td class="font-monospace text-break">{{ row.val }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <!-- LLM prompt 各區 -->
              <section
                v-for="section in LLM_SECTIONS"
                :key="section.key"
                class="prompt-text-section"
              >
                <h2 class="my-font-md-600 my-color-black mb-3">{{ section.title }}</h2>
                <div
                  v-if="placeholdersForSection(section.key).length > 0"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2 px-3">
                    <h3 class="my-font-sm-400 my-color-gray-1 px-0 pt-2 mb-2">占位符說明</h3>
                    <div class="table-responsive">
                      <table class="table table-sm table-borderless mb-0 my-font-sm-400">
                        <tbody>
                          <tr v-for="item in placeholdersForSection(section.key)" :key="item.name">
                            <th scope="row" class="text-nowrap align-top pe-3 font-monospace my-color-gray-3">
                              &#123;{{ item.name }}&#125;
                            </th>
                            <td class="text-break my-color-black">{{ item.desc }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div
                  v-for="group in section.groups"
                  :key="group.key"
                  class="my-design-quiz-sub-block-outer mb-3"
                >
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
                    <p
                      v-if="section.groups.length > 1 || group.label !== 'system / user'"
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
                            <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-3 mb-0">
                              {{ field.label }}
                            </h3>
                          </div>
                        </header>
                        <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                          <EnglishExamMarkdownEditor
                            :model-value="fieldValue(section.key, field.key)"
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
