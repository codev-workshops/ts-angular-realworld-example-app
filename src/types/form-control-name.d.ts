import 'react';

/**
 * The copied e2e suite selects form inputs with `input[formControlName="email"]`, so the
 * React ports keep the Angular attribute (React renders it as `formcontrolname`, which the
 * suite's CSS attribute selectors match case-insensitively).
 */
declare module 'react' {
  // The type parameter must keep React's name for declaration merging to apply.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    formControlName?: string;
  }
}
