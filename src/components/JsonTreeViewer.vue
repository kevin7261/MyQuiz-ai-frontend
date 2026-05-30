<script setup>
import { computed, provide, ref } from 'vue';
import JsonTreeNode from './JsonTreeNode.vue';

const props = defineProps({
  /** 要檢視的 JSON 物件；null／undefined 時顯示 emptyLabel */
  data: { default: null },
  emptyLabel: { type: String, default: '—' },
  /** 預設展開深度（0＝僅根；1＝根＋第一層） */
  defaultExpandDepth: { type: Number, default: 1 },
});

const expandCommand = ref(/** @type {{ mode: 'expand'|'collapse'|'reset', tick: number } | null} */ (null));
provide('jsonTreeExpandCommand', expandCommand);

const hasData = computed(() => props.data != null && typeof props.data === 'object');

function sendExpandCommand(mode) {
  expandCommand.value = { mode, tick: Date.now() };
}

function expandAll() {
  sendExpandCommand('expand');
}

function collapseAll() {
  sendExpandCommand('collapse');
}

function resetExpand() {
  sendExpandCommand('reset');
}
</script>

<template>
  <div class="json-tree-viewer my-scrollbar-on-dark">
    <div
      v-if="hasData"
      class="json-tree-viewer__toolbar d-flex flex-wrap align-items-center gap-2 pb-2"
    >
      <button
        type="button"
        class="btn btn-link p-0 border-0 shadow-none my-font-sm-400 my-color-gray-3 text-decoration-none"
        @click="expandAll"
      >
        全部展開
      </button>
      <span class="my-color-gray-3" aria-hidden="true">|</span>
      <button
        type="button"
        class="btn btn-link p-0 border-0 shadow-none my-font-sm-400 my-color-gray-3 text-decoration-none"
        @click="collapseAll"
      >
        全部收合
      </button>
      <span class="my-color-gray-3" aria-hidden="true">|</span>
      <button
        type="button"
        class="btn btn-link p-0 border-0 shadow-none my-font-sm-400 my-color-gray-3 text-decoration-none"
        @click="resetExpand"
      >
        預設展開
      </button>
    </div>
    <JsonTreeNode
      v-if="hasData"
      :value="data"
      :depth="0"
      :default-expand-depth="defaultExpandDepth"
    />
    <span
      v-else
      class="json-tree-viewer__empty my-font-md-400 my-color-gray-2"
    >{{ emptyLabel }}</span>
  </div>
</template>

<style scoped>
.json-tree-viewer {
  box-sizing: border-box;
  margin: 0;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--my-color-black);
  color: var(--my-color-white);
  font-family: var(--my-font-family-code);
  font-size: var(--my-font-size-sm);
  font-weight: var(--my-font-weight-regular);
  max-height: min(55vh, 28rem);
  overflow: auto;
  scrollbar-gutter: stable;
}
.json-tree-viewer__toolbar .btn-link:hover,
.json-tree-viewer__toolbar .btn-link:focus-visible {
  color: var(--my-color-white) !important;
  text-decoration: none;
}
</style>
