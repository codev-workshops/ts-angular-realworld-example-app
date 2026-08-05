import { Errors } from '../core/models/errors';

interface ListErrorsProps {
  errors: Errors | null;
}

/** Port of `shared/components/list-errors.component.ts` + `.html`. */
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
