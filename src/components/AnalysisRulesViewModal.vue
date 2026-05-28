<script setup>
/**
 * AnalysisRulesViewModal — 查看分析規則 Modal
 *
 * 以 Markdown 渲染顯示已儲存的分析規則，不可編輯。
 * 用於 AnswerWeaknessAnalysisPage 與 StudentAnswerAnalysisPage。
 */
defineProps({
  open:    { type: Boolean, required: true },
  /** modal h5 的 id，供 aria-labelledby 使用 */
  titleId: { type: String,  required: true },
  loading: { type: Boolean, default: false },
  /** 已渲染為 HTML 的規則內容 */
  html:    { type: String,  default: '' },
});

defineEmits(['close']);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" @click.stop>
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 :id="titleId" class="modal-title my-color-black">分析規則</h5>
            <button type="button" class="btn-close" aria-label="關閉" @click="$emit('close')" />
          </div>

          <div class="modal-body p-0 lh-base" style="max-height: 70vh; overflow: auto;">
            <div v-if="loading" class="my-font-md-400 my-color-gray-4">載入中…</div>
            <template v-else>
              <div
                v-if="html"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="html"
              />
              <span v-else class="my-font-md-400 my-color-black">—</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
