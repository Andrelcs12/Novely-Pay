// src/common/helpers/asaas-error.helper.ts
// Resolve o erro: 'err' is of type 'unknown' / Property 'response' does not exist

import { AxiosError } from 'axios';

export function extractAsaasError(err: unknown): string {
  if (err instanceof AxiosError) {
    const errors = err.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0]?.description ?? err.message;
    }
    return err.response?.data?.message ?? err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Erro desconhecido';
}