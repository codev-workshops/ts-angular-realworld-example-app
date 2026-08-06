import type { Errors } from '@/core/models/errors';

interface ListErrorsProps {
  errors: Errors | null;
}

/**
 * Port of ListErrorsComponent. The Angular version transformed the `errors` input
 * into a flat string list inside a setter; in React the transform is just derived
 * state computed during render.
 */
export function ListErrors({ errors }: ListErrorsProps) {
  const errorList = errors ? Object.keys(errors.errors || {}).map(key => `${key} ${errors.errors[key]}`) : [];

  if (errorList.length === 0) {
    return null;
  }

  return (
    <ul className="error-messages">
      {errorList.map(error => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
