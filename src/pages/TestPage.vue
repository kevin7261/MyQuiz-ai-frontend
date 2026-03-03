<script setup>
/** 試題頁面。使用 tabId 與 dataStore 對應，card 列表含 quiz、提示、回答與唯一 id。 */
import { ref } from 'vue';

defineProps({
  tabId: { type: String, required: true },
});

let cardIdSeq = 0;
function nextCardId() {
  return `card-${++cardIdSeq}`;
}

/** 預設 quiz／提示（產生第一個 quiz 時使用） */
const defaultQuiz = '什麼是空間分析（Spatial Analysis）？請簡述其在地理資訊系統中的應用和重要性。';
const defaultHint = '空間分析是一組技術和方法，用於分析地理數據中的空間模式和關係。它可以幫助解決與位置相關的問題，並在城市規劃、環境管理和資源分配等領域中具有重要應用。';

/** 每個 card：{ id, quiz, hint, answer, hintVisible, confirmed, gradingResult }；預設無 quiz */
const cardList = ref([]);

/** 選項：選擇單元、主題、難度、題型 */
const filterUnit = ref('全部');
const filterTopic = ref('全部');
const filterDifficulty = ref('入門');
const filterQuizType = ref('簡答題');

const unitOptions = ['全部'];
const topicOptions = ['全部'];
const difficultyOptions = ['入門', '進階', '困難'];
const quizTypeOptions = ['簡答題', '申論題', '選擇題'];

function addCard() {
  const quiz = cardList.value.length > 0 ? cardList.value[0].quiz : defaultQuiz;
  const hint = cardList.value.length > 0 ? cardList.value[0].hint : defaultHint;
  cardList.value = [
    ...cardList.value,
    {
      id: nextCardId(),
      quiz,
      hint,
      answer: '',
      hintVisible: false,
      confirmed: false,
      gradingResult: '',
    },
  ];
}

function toggleHint(item) {
  item.hintVisible = !item.hintVisible;
}

function confirmAnswer(item) {
  if (!item.answer.trim()) return;
  item.confirmed = true;
  item.gradingResult = '批改結果將顯示於此（待後端串接）';
}

function rewriteAnswer(item) {
  item.answer = '';
  item.confirmed = false;
  item.gradingResult = '';
}
</script>

<template>
  <div class="d-flex flex-column bg-body-secondary h-100">
    <div class="flex-grow-1 overflow-auto bg-white p-4">
      <div class="bg-body-tertiary rounded text-start p-4 mb-3">
        <div class="d-flex flex-wrap align-items-end gap-3">
          <div>
            <label class="form-label text-muted mb-1">選擇單元</label>
            <select v-model="filterUnit" class="form-select form-select-sm" :disabled="cardList.length > 0">
              <option v-for="opt in unitOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div>
            <label class="form-label text-muted mb-1">主題</label>
            <select v-model="filterTopic" class="form-select form-select-sm" :disabled="cardList.length > 0">
              <option v-for="opt in topicOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div>
            <label class="form-label text-muted mb-1">難度</label>
            <select v-model="filterDifficulty" class="form-select form-select-sm" :disabled="cardList.length > 0">
              <option v-for="opt in difficultyOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div>
            <label class="form-label text-muted mb-1">題型</label>
            <select v-model="filterQuizType" class="form-select form-select-sm" :disabled="cardList.length > 0">
              <option v-for="opt in quizTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>
      </div>
      <template v-if="cardList.length === 0">
      </template>
      <template v-else>
        <div
          v-for="(item, idx) in cardList"
          :key="item.id"
          class="card mb-3"
        >
          <div class="card-header py-2">
            <span class="fw-semibold small mb-0">第 {{ idx + 1 }} 個 quiz</span>
          </div>
          <div class="card-body text-start">
            <div class="mb-3">
              <div class="form-label text-muted mb-1">quiz</div>
              <div class="small">{{ item.quiz }}</div>
            </div>
            <div class="mb-3">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary py-0"
                @click="toggleHint(item)"
              >
                {{ item.hintVisible ? '隱藏提示' : '顯示提示' }}
              </button>
              <div v-show="item.hintVisible" class="rounded bg-body-tertiary text-muted mt-2 p-2">
                {{ item.hint }}
              </div>
            </div>
            <div class="mb-3">
              <label :for="`answer-${item.id}`" class="form-label text-muted mb-1">回答</label>
              <template v-if="!item.confirmed">
                <textarea
                  :id="`answer-${item.id}`"
                  v-model="item.answer"
                  class="form-control"
                  rows="4"
                  placeholder="請輸入您的回答..."
                  maxlength="2000"
                />
                <div class="form-text">{{ item.answer.length }} / 2000</div>
                <div class="d-flex gap-2 mt-2">
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="rewriteAnswer(item)">
                    重寫
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    :disabled="!item.answer.trim()"
                    @click="confirmAnswer(item)"
                  >
                    確定
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="rounded bg-body-tertiary small mb-2 p-2">{{ item.answer }}</div>
                <div class="d-flex gap-2 mb-3">
                  <button type="button" class="btn btn-sm btn-outline-secondary" @click="rewriteAnswer(item)">
                    重寫
                  </button>
                </div>
              </template>
            </div>
            <div class="border rounded bg-light p-3">
              <div class="form-label text-muted mb-1">批改結果</div>
              <div class="small">{{ item.gradingResult || '尚未批改' }}</div>
            </div>
          </div>
        </div>
      </template>
      <button type="button" class="btn btn-sm btn-primary" @click="addCard">產生 quiz</button>
    </div>
  </div>
</template>
