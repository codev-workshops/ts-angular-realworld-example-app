import type { Errors } from '../../core/models/errors';

/**
 * Angular ListErrorsComponent equivalent.
 *
 * The Angular template guards on `errorList`, an array that is always truthy, so
 * the `<ul>` is rendered even when empty (its `margin-bottom` is part of every
 * form's layout). That is reproduced here on purpose.
 */
export function ListErrors({ errors }: { errors: Errors | null }) {
  const errorList = errors ? Object.keys(errors.errors || {}).map(key => `${key} ${errors.errors[key]}`) : [];

  return (
    <app-list-errors>
      <ul className="error-messages">
        {errorList.map(error => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </app-list-errors>
  );
}
