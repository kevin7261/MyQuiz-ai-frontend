<script setup>
/** 答題分析頁面：讀取 GET /quiz/quiz-answers?person_id=xxx，顯示 Quiz 與關聯的 Answer 列表。 */
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore.js';
import { API_BASE, API_QUIZ_ANSWERS } from '../constants/api.js';

const authStore = useAuthStore();

const items = ref([]);
const count = ref(0);
const loading = ref(false);
const error = ref('');

function parseFeedbackMeta(str) {
  if (str == null || str === '') return null;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

async function fetchQuizAnswers() {
  loading.value = true;
  error.value = '';
  const personId = authStore.user?.person_id;
  if (!personId) {
    error.value = '請先登入以查看答題分析';
    loading.value = false;
    return;
  }
  try {
    const url = `${API_BASE}${API_QUIZ_ANSWERS}?person_id=${encodeURIComponent(personId)}`;
    const headers = { 'X-Person-Id': String(personId) };
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(res.statusText || '無法載入答題資料');
    const data = await res.json();
    console.log('/quiz/quiz-answers 回傳', data);
    items.value = data?.items ?? [];
    count.value = data?.count ?? items.value.length;
  } catch (err) {
    error.value = err.message || '無法載入答題分析';
    items.value = [];
    count.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchQuizAnswers();
});
</script>

<template>
  <div class="d-flex flex-column my-bgcolor-gray-200 h-100">
    <div class="flex-grow-1 overflow-auto my-bgcolor-white p-4">
      <div class="my-bgcolor-gray-100 rounded text-start p-4">
        <h6 class="my-title-sm-black mb-3">答題分析</h6>
      </div>

      <div v-if="loading" class="text-center py-5 text-muted">載入中...</div>
      <div v-else-if="error" class="alert alert-warning mt-3">{{ error }}</div>
      <div v-else-if="items.length === 0" class="alert alert-info mt-3">尚無答題紀錄。</div>

      <template v-else>
        <div class="mt-3 small text-muted">共 {{ count }} 筆試題</div>
        <div v-for="(item, idx) in items" :key="item.quiz?.quiz_id ?? idx" class="card mt-3">
          <div class="card-header py-2 d-flex justify-content-between align-items-center">
            <span class="fw-semibold">{{ item.quiz?.course_name ?? '—' }}</span>
            <span class="badge bg-secondary">quiz_id: {{ item.quiz?.quiz_id }}</span>
          </div>
          <div class="card-body">
            <div class="mb-2">
              <span class="text-muted small">題目：</span>
              <span>{{ item.quiz?.quiz_content ?? '—' }}</span>
            </div>
            <div v-if="item.quiz?.quiz_hint" class="mb-2 small">
              <span class="text-muted">提示：</span>
              <span>{{ item.quiz.quiz_hint }}</span>
            </div>
            <div v-if="item.quiz?.reference_answer" class="mb-3 small">
              <span class="text-muted">參考答案：</span>
              <span>{{ item.quiz.reference_answer }}</span>
            </div>

            <div class="border-top pt-2">
              <div class="small fw-semibold text-muted mb-2">作答紀錄（{{ (item.answers || []).length }} 筆）</div>
              <div
                v-for="(ans, aIdx) in (item.answers || [])"
                :key="ans.answer_id ?? aIdx"
                class="border rounded p-2 mb-2 bg-light"
              >
                <div class="d-flex justify-content-between align-items-start small mb-1">
                  <span class="text-muted">{{ ans.created_at }}</span>
                  <span v-if="ans.answer_grade != null" class="badge bg-primary">分數 {{ ans.answer_grade }}</span>
                </div>
                <div class="mb-1"><strong>學生答案：</strong>{{ ans.student_answer ?? '—' }}</div>
                <div v-if="ans.answer_feedback_metadata" class="small text-muted">
                  <strong>回饋：</strong>
                  <span>{{ typeof ans.answer_feedback_metadata === 'string' ? ans.answer_feedback_metadata : JSON.stringify(parseFeedbackMeta(ans.answer_feedback_metadata)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
