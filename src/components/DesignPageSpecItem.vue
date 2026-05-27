<script setup>
import DesignPageCopyBtn from './DesignPageCopyBtn.vue';

const props = defineProps({
  name: { type: String, required: true },
  usage: { type: String, required: true },
  css: { type: String, required: true },
  copyText: { type: String, default: '' },
});

function copyValue() {
  return props.copyText || props.css;
}
</script>

<template>
  <article class="my-design-spec-item">
    <dl class="my-design-spec-item__meta mb-0">
      <dt class="my-design-spec-item__term my-font-sm-400 my-color-gray-1">名稱</dt>
      <dd class="my-design-spec-item__value my-font-md-600 my-color-black text-break">{{ name }}</dd>
      <dt class="my-design-spec-item__term my-font-sm-400 my-color-gray-1">使用位置</dt>
      <dd class="my-design-spec-item__value my-font-sm-400 my-color-gray-1 text-break">{{ usage }}</dd>
      <dt class="my-design-spec-item__term my-font-sm-400 my-color-gray-1">css</dt>
    </dl>
    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">{{ css }}</code>
      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" :text="copyValue()" :on-light-bg="false" />
    </div>
    <div v-if="$slots.default" class="my-design-spec-item__preview mt-3">
      <slot />
    </div>
  </article>
</template>
