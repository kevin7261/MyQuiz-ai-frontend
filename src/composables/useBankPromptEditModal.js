import { ref, computed } from 'vue';

/**
 * 出題／批改規則編輯 Modal 的本地狀態與操作。
 *
 * 自 CreateExamQuizBankDetailPage 抽出。所有外部相依以「lazy getter／函式」注入，
 * 不在此存取元件其他狀態，且讀取時機與原本一致以保留 computed 反應性：
 * @param {object} deps
 * @param {() => any} deps.getActiveCard - 取得目前作用中的題卡物件（activeUnitQuizCard.value）
 * @param {(slotIndex: number) => any} deps.getSlotFormState - 取得 slot 表單狀態
 * @param {() => number} deps.getActiveSlotIndex - 取得目前 slot index（activeUnitSlotIndex.value）
 * @param {import('vue').Ref<unknown>} deps.gradingSubmittingCardId - 批改送出中的卡片 id
 */
export function useBankPromptEditModal({
  getActiveCard,
  getSlotFormState,
  getActiveSlotIndex,
  gradingSubmittingCardId,
}) {
  const bankPromptEditModalOpen = ref(false);
  const bankPromptEditModalKind = ref(/** @type {'quiz'|'grading'|''} */ (''));
  const bankPromptEditModalDraft = ref('');

  const bankPromptEditModalTitle = computed(() =>
    bankPromptEditModalKind.value === 'grading' ? '批改規則' : '出題規則',
  );

  const bankPromptEditModalSavingDisabled = computed(() => {
    if (bankPromptEditModalKind.value === 'quiz') {
      return !!getSlotFormState(getActiveSlotIndex()).unitQuizCreateLoading;
    }
    const card = getActiveCard();
    return (
      gradingSubmittingCardId.value != null
      && card
      && String(gradingSubmittingCardId.value) === String(card.id)
    );
  });

  const bankPromptEditModalResetDisabled = computed(() => {
    if (bankPromptEditModalSavingDisabled.value) return true;
    const card = getActiveCard();
    if (!card) return true;
    if (bankPromptEditModalKind.value === 'quiz') {
      return (
        String(bankPromptEditModalDraft.value ?? '')
        === String(card.quizUserPromptBaseline ?? '')
      );
    }
    if (bankPromptEditModalKind.value === 'grading') {
      return (
        String(bankPromptEditModalDraft.value ?? '')
        === String(card.gradingPromptBaseline ?? '')
      );
    }
    return true;
  });

  function resetBankPromptEditModalDraft() {
    const card = getActiveCard();
    if (!card) return;
    if (bankPromptEditModalKind.value === 'quiz') {
      bankPromptEditModalDraft.value = String(card.quizUserPromptBaseline ?? '');
    } else if (bankPromptEditModalKind.value === 'grading') {
      bankPromptEditModalDraft.value = String(card.gradingPromptBaseline ?? '');
    }
  }

  function openBankQuizUserPromptEditModal() {
    const card = getActiveCard();
    if (!card) return;
    if (getSlotFormState(getActiveSlotIndex()).unitQuizCreateLoading) return;
    bankPromptEditModalKind.value = 'quiz';
    bankPromptEditModalDraft.value = String(card.quizUserPromptText ?? '');
    bankPromptEditModalOpen.value = true;
  }

  function openBankGradingPromptEditModal() {
    const card = getActiveCard();
    if (!card) return;
    bankPromptEditModalKind.value = 'grading';
    bankPromptEditModalDraft.value = String(card.gradingPrompt ?? '');
    bankPromptEditModalOpen.value = true;
  }

  function closeBankPromptEditModal() {
    bankPromptEditModalOpen.value = false;
    bankPromptEditModalKind.value = '';
    bankPromptEditModalDraft.value = '';
  }

  function applyBankPromptEditModal() {
    const card = getActiveCard();
    if (card) {
      if (bankPromptEditModalKind.value === 'quiz') {
        card.quizUserPromptText = bankPromptEditModalDraft.value;
      } else if (bankPromptEditModalKind.value === 'grading') {
        card.gradingPrompt = bankPromptEditModalDraft.value;
      }
    }
    closeBankPromptEditModal();
  }

  return {
    bankPromptEditModalOpen,
    bankPromptEditModalKind,
    bankPromptEditModalDraft,
    bankPromptEditModalTitle,
    bankPromptEditModalSavingDisabled,
    bankPromptEditModalResetDisabled,
    resetBankPromptEditModalDraft,
    openBankQuizUserPromptEditModal,
    openBankGradingPromptEditModal,
    closeBankPromptEditModal,
    applyBankPromptEditModal,
  };
}
