<script setup>
import PackUnitTypeIcon from './PackUnitTypeIcon.vue';
import { ZIP_UPLOAD_UNIT_TYPE_INTRO, ZIP_UPLOAD_UNIT_TYPE_HINT_ROWS } from '../utils/rag.js';
</script>

<template>
  <div class="my-zip-upload-unit-hints w-100 mx-auto">
    <div class="my-zip-upload-unit-hints__panel">
      <p class="my-zip-upload-unit-hints__intro mb-0">
        {{ ZIP_UPLOAD_UNIT_TYPE_INTRO }}
      </p>
      <ul class="my-zip-upload-unit-hints__list mb-0">
        <li
          v-for="row in ZIP_UPLOAD_UNIT_TYPE_HINT_ROWS"
          :key="'zip-upload-hint-' + row.unitType"
          class="my-zip-upload-unit-hints__item"
        >
          <div class="my-zip-upload-unit-hints__head">
            <PackUnitTypeIcon :unit-type="row.unitType" color-class="my-color-gray-1" decorative />
            <span class="my-zip-upload-unit-hints__label">{{ row.label }}：</span>
          </div>
          <p class="my-zip-upload-unit-hints__text mb-0">
            {{ row.text }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>
