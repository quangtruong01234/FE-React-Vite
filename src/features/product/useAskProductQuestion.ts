import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import type { ProductAnswer } from '@/types';
import { normalizeQuestion } from './productQuestion';

/**
 * PRODUCT-QA-01 — ask the grounded assistant about one product. A one-shot read
 * that nothing caches or invalidates, so it is a bare mutation with no query key.
 * Mutations default to `retry: 0`, which the contract needs: every resend spends
 * one of the user's 5 asks per minute.
 */
export function useAskProductQuestion(productId: string) {
  return useMutation<ProductAnswer, unknown, string>({
    mutationFn: (question: string) =>
      api.products.askQuestion(productId, { question: normalizeQuestion(question) }),
  });
}
