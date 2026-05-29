<script setup>
import PackUnitTypeIcon from './PackUnitTypeIcon.vue';
import {
  ZIP_UPLOAD_UNIT_TYPE_INTRO,
  ZIP_UPLOAD_UNIT_TYPE_HINT_ROWS,
  ZIP_UPLOAD_SIZE_NOTE,
} from '../utils/rag.js';
</script>

<template>
  <div class="my-zip-upload-unit-hints w-100 mx-auto">
    <p class="my-zip-upload-unit-hints__intro mb-0">
      {{ ZIP_UPLOAD_UNIT_TYPE_INTRO }}
    </p>
    <ul class="my-zip-upload-unit-hints__list mb-0">
      <li
        v-for="row in ZIP_UPLOAD_UNIT_TYPE_HINT_ROWS"
        :key="'zip-upload-hint-' + row.unitType"
        class="my-zip-upload-unit-hints__item"
      >
        <PackUnitTypeIcon
          :unit-type="row.unitType"
          color-class="my-color-gray-1"
          decorative
          class="my-zip-upload-unit-hints__icon flex-shrink-0"
        />
        <span class="my-zip-upload-unit-hints__line">
          <span class="my-zip-upload-unit-hints__label">{{ row.label }}：</span>{{ row.text }}
        </span>
      </li>
    </ul>
    <p class="my-zip-upload-unit-hints__note mb-0">
      {{ ZIP_UPLOAD_SIZE_NOTE }}
    </p>
  </div>
</template>
