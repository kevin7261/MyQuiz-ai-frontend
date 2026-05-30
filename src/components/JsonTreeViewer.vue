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

<style scoped src="./JsonTreeViewer.css"></style>
