<script setup>
import DesignPageCopyBtn from './DesignPageCopyBtn.vue';

defineProps({
  name: { type: String, required: true },
  usage: { type: String, required: true },
  dotClass: { type: String, required: true },
  dotBorder: { type: Boolean, default: false },
  rows: {
    type: Array,
    required: true,
    /** @type {Array<{ className: string, hex?: string }>} */
  },
  hexForClass: { type: Function, required: true },
});
</script>

<template>
  <article class="my-design-spec-item my-design-spec-item--color">
    <dl class="my-design-spec-item__meta mb-2">
      <dt class="my-design-spec-item__term my-font-sm-400 my-color-gray-1">名稱</dt>
      <dd class="my-design-spec-item__value my-font-md-600 my-color-black text-break">{{ name }}</dd>
      <dt class="my-design-spec-item__term my-font-sm-400 my-color-gray-1">使用位置</dt>
      <dd class="my-design-spec-item__value my-font-sm-400 my-color-gray-1 text-break">{{ usage }}</dd>
    </dl>
    <div class="my-design-swatch-cell">
      <span
        class="my-design-swatch-dot"
        :class="dotClass"
        :style="dotBorder ? { border: '1px solid var(--my-color-gray-2, #e2e2e2)' } : undefined"
        aria-hidden="true"
      />
      <div class="my-design-swatch-rows design-page-spec-color-rows">
        <div
          v-for="row in rows"
          :key="row.className"
          class="design-page-spec-color-col"
        >
          <div class="my-font-sm-400 my-color-gray-1 font-monospace text-break px-1 mb-1">{{ hexForClass(row.className) }}</div>
          <div class="my-design-spec-item__css-label my-font-sm-400 my-color-gray-1 px-1">css</div>
          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">{{ row.className }}</code>
            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" :text="row.className" :on-light-bg="false" />
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
