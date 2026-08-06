export const LoadingState = {
  NOT_LOADED: 'NOT_LOADED',
  LOADING: 'LOADING',
  LOADED: 'LOADED',
} as const;

export type LoadingState = (typeof LoadingState)[keyof typeof LoadingState];
