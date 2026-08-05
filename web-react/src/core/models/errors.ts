/** Port of `core/models/errors.model.ts`. */
export interface Errors {
  errors: { [key: string]: string };
}

/** Port of the auth state machine's loading states (`user.service.ts`). */
export type LoadingState = 'idle' | 'loading' | 'error';
