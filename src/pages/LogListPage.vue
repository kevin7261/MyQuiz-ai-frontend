<script setup>
/**
 * LogListPage - 系統紀錄（GET /log/logs）
 *
 * 讀取目前選取課程（currentCourse.course_id）的 Log，依 log_id 降冪；person_id 由 loggedFetch 帶入（僅供後端請求紀錄）。
 * 僅 user_type=1 可進入（路由與選單由 permissions 限制）；白底主內容、TopView 頁名。
 */
import { ref, computed, onMounted } from 'vue';
import { API_BASE, API_LIST_LOGS } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import { loggedFetch } from '../utils/loggedFetch.js';
import { useAuthStore } from '../stores/authStore.js';

const authStore = useAuthStore();

const rows = ref([]);
const loading = ref(false);
const error = ref('');

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.logs)) return data.logs;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

const COLUMN_LABELS = {
  log_id: '紀錄編號',
  course_id: '課程 ID',
  person_id: '使用者 ID',
  created_at: '建立時間',
  updated_at: '更新時間',
};

const courseSubtitle = computed(() => {
  const c = authStore.currentCourse;
  if (!c?.course_id) return null;
  return c.course_name ? `${c.course_name}（course_id: ${c.course_id}）` : `course_id: ${c.course_id}`;
});

const columns = computed(() => {
  const r = rows.value[0];
  if (!r || typeof r !== 'object') return [];
  const keys = Object.keys(r);
  const priority = ['log_id', 'person_id', 'created_at', 'updated_at'];
  const rest = keys.filter((k) => !priority.includes(k)).sort();
  return [...priority.filter((k) => keys.includes(k)), ...rest];
});

function columnHeaderLabel(key) {
  return COLUMN_LABELS[key] ?? key;
}

function cellDisplay(val) {
  if (val == null) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

async function fetchLogs() {
  loading.value = true;
  error.value = '';
  if (authStore.currentCourse?.course_id == null) {
    error.value = '請先於左側選單選擇課程，再載入系統紀錄。';
    rows.value = [];
    loading.value = false;
    return;
  }
  try {
    const res = await loggedFetch(`${API_BASE}${API_LIST_LOGS}`, { method: 'GET' });
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
    const data = text ? JSON.parse(text) : {};
    rows.value = normalizeRows(data);
  } catch (e) {
    error.value = e.message || '無法載入紀錄，請稍後再試';
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchLogs();
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
            <p
              v-if="courseSubtitle"
              class="my-font-sm-400 my-color-gray-1 text-break mb-3"
            >
              {{ courseSubtitle }}
            </p>
            <div class="w-100 min-w-0">
              <div class="d-flex flex-wrap justify-content-end mb-3">
                <button
                  type="button"
                  class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-3 py-2"
                  :disabled="loading"
                  @click="fetchLogs"
                >
                  重新載入
                </button>
              </div>
              <div class="table-responsive">
                <table class="table table-bordered table-hover table-sm my-font-md-400 mb-0">
                  <thead class="my-table-thead">
                    <tr>
                      <th v-for="col in columns" :key="col" class="my-font-md-600">{{ columnHeaderLabel(col) }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in rows" :key="row.log_id ?? idx">
                      <td v-for="col in columns" :key="col" class="my-font-md-400 text-break">{{ cellDisplay(row[col]) }}</td>
                    </tr>
                    <tr v-if="!loading && rows.length === 0">
                      <td :colspan="Math.max(columns.length, 1)" class="my-color-gray-4 text-center my-font-md-400">尚無資料</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
