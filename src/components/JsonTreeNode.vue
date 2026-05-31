<script setup>
import { computed, inject, ref, watch } from 'vue';
import JsonTreeNode from './JsonTreeNode.vue';

const props = defineProps({
  nodeKey: { type: [String, Number], default: null },
  value: { required: true },
  depth: { type: Number, default: 0 },
  defaultExpandDepth: { type: Number, default: 1 },
  isLast: { type: Boolean, default: true },
});

const expandCommand = inject('jsonTreeExpandCommand', null);

/** 掛載時須讀取全域展開指令（子節點在父節點展開後才 mount，否則「全部展開」只影響已存在的節點） */
function expandedFromCommandOrDefault() {
  const mode = expandCommand?.value?.mode;
  if (mode === 'expand') return true;
  if (mode === 'collapse') return false;
  return props.depth < props.defaultExpandDepth;
}

const expanded = ref(expandedFromCommandOrDefault());

watch(
  () => expandCommand?.value,
  (cmd) => {
    if (!cmd) return;
    if (cmd.mode === 'expand') expanded.value = true;
    else if (cmd.mode === 'collapse') expanded.value = false;
    else if (cmd.mode === 'reset') expanded.value = props.depth < props.defaultExpandDepth;
  },
);

const valueType = computed(() => {
  const val = props.value;
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  return typeof val;
});

const entries = computed(() => {
  const val = props.value;
  if (Array.isArray(val)) return val.map((item, index) => [index, item]);
  if (val && typeof val === 'object') return Object.entries(val);
  return [];
});

const isExpandable = computed(() => entries.value.length > 0);

const openBracket = computed(() => (valueType.value === 'array' ? '[' : '{'));
const closeBracket = computed(() => (valueType.value === 'array' ? ']' : '}'));

const previewLabel = computed(() => {
  const count = entries.value.length;
  if (valueType.value === 'array') return `${count} items`;
  return `${count} keys`;
});

const primitiveDisplay = computed(() => {
  const val = props.value;
  if (val === null) return 'null';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'undefined') return 'undefined';
  return String(val);
});

const primitiveClass = computed(() => {
  const type = valueType.value;
  if (type === 'null') return 'json-tree-node__value--null';
  if (type === 'string') return 'json-tree-node__value--string';
  if (type === 'number') return 'json-tree-node__value--number';
  if (type === 'boolean') return 'json-tree-node__value--boolean';
  return '';
});

function toggleExpanded() {
  if (!isExpandable.value) return;
  expanded.value = !expanded.value;
}

function onToggleKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleExpanded();
  }
}
</script>

<template>
  <div
    class="json-tree-node"
    :style="{ '--json-tree-depth': depth }"
  >
    <div
      class="json-tree-node__line"
      :class="{ 'json-tree-node__line--expandable': isExpandable }"
      :role="isExpandable ? 'button' : undefined"
      :tabindex="isExpandable ? 0 : undefined"
      :aria-expanded="isExpandable ? expanded : undefined"
      @click="toggleExpanded"
      @keydown="onToggleKeydown"
    >
      <span
        class="json-tree-node__toggle"
        aria-hidden="true"
      >
        <i
          v-if="isExpandable"
          class="fa-solid"
          :class="expanded ? 'fa-chevron-down' : 'fa-chevron-right'"
        />
      </span>
      <span
        v-if="nodeKey != null && nodeKey !== ''"
        class="json-tree-node__key"
      >{{ nodeKey }}:</span>
      <template v-if="!isExpandable">
        <span
          class="json-tree-node__value"
          :class="primitiveClass"
        >{{ primitiveDisplay }}</span>
      </template>
      <template v-else-if="!expanded">
        <span class="json-tree-node__bracket">{{ openBracket }}</span>
        <span class="json-tree-node__ellipsis">{{ previewLabel }}</span>
        <span class="json-tree-node__bracket">{{ closeBracket }}</span>
      </template>
      <template v-else>
        <span class="json-tree-node__bracket">{{ openBracket }}</span>
      </template>
    </div>
    <div
      v-if="isExpandable && expanded"
      class="json-tree-node__children"
    >
      <JsonTreeNode
        v-for="([childKey, childValue], childIndex) in entries"
        :key="`${depth}-${String(childKey)}`"
        :node-key="childKey"
        :value="childValue"
        :depth="depth + 1"
        :default-expand-depth="defaultExpandDepth"
        :is-last="childIndex === entries.length - 1"
      />
      <div class="json-tree-node__line json-tree-node__line--close">
        <span class="json-tree-node__toggle" aria-hidden="true" />
        <span class="json-tree-node__bracket">{{ closeBracket }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="./JsonTreeNode.css"></style>
