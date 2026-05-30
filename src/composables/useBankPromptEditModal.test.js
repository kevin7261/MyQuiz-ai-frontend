import { describe, it, expect } from 'vitest';
import { ref, reactive } from 'vue';
import { useBankPromptEditModal } from './useBankPromptEditModal.js';

function setup(cardFields = {}) {
  const card = reactive({
    id: 1,
    quizUserPromptText: 'q-text',
    quizUserPromptBaseline: 'q-base',
    gradingPrompt: 'g-text',
    gradingPromptBaseline: 'g-base',
    ...cardFields,
  });
  const slotState = reactive({ unitQuizCreateLoading: false });
  const gradingSubmittingCardId = ref(null);
  const api = useBankPromptEditModal({
    getActiveCard: () => card,
    getSlotFormState: () => slotState,
    getActiveSlotIndex: () => 0,
    gradingSubmittingCardId,
  });
  return { api, card, slotState, gradingSubmittingCardId };
}

describe('useBankPromptEditModal', () => {
  it('開出題規則：帶入目前文字並設定 kind', () => {
    const { api } = setup();
    api.openBankQuizUserPromptEditModal();
    expect(api.bankPromptEditModalOpen.value).toBe(true);
    expect(api.bankPromptEditModalKind.value).toBe('quiz');
    expect(api.bankPromptEditModalDraft.value).toBe('q-text');
    expect(api.bankPromptEditModalTitle.value).toBe('出題規則');
  });

  it('出題生成中時不開啟', () => {
    const { api, slotState } = setup();
    slotState.unitQuizCreateLoading = true;
    api.openBankQuizUserPromptEditModal();
    expect(api.bankPromptEditModalOpen.value).toBe(false);
  });

  it('開批改規則並套用寫回 card.gradingPrompt', () => {
    const { api, card } = setup();
    api.openBankGradingPromptEditModal();
    expect(api.bankPromptEditModalKind.value).toBe('grading');
    expect(api.bankPromptEditModalTitle.value).toBe('批改規則');
    api.bankPromptEditModalDraft.value = '新批改';
    api.applyBankPromptEditModal();
    expect(card.gradingPrompt).toBe('新批改');
    expect(api.bankPromptEditModalOpen.value).toBe(false);
  });

  it('套用出題規則寫回 card.quizUserPromptText', () => {
    const { api, card } = setup();
    api.openBankQuizUserPromptEditModal();
    api.bankPromptEditModalDraft.value = '新出題';
    api.applyBankPromptEditModal();
    expect(card.quizUserPromptText).toBe('新出題');
  });

  it('reset 還原為 baseline', () => {
    const { api } = setup();
    api.openBankGradingPromptEditModal();
    api.bankPromptEditModalDraft.value = 'changed';
    api.resetBankPromptEditModalDraft();
    expect(api.bankPromptEditModalDraft.value).toBe('g-base');
  });

  it('resetDisabled：草稿等於 baseline 時為 true', () => {
    const { api } = setup();
    api.openBankQuizUserPromptEditModal();
    api.bankPromptEditModalDraft.value = 'q-base';
    expect(api.bankPromptEditModalResetDisabled.value).toBe(true);
    api.bankPromptEditModalDraft.value = 'other';
    expect(api.bankPromptEditModalResetDisabled.value).toBe(false);
  });

  it('savingDisabled：批改送出中且為同一張卡時為 true', () => {
    const { api, gradingSubmittingCardId } = setup({ id: 7 });
    api.openBankGradingPromptEditModal();
    expect(api.bankPromptEditModalSavingDisabled.value).toBe(false);
    gradingSubmittingCardId.value = 7;
    expect(api.bankPromptEditModalSavingDisabled.value).toBe(true);
  });
});
