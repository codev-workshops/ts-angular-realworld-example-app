import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Errors } from '../core/models/errors';
import { ListErrors } from './ListErrors';

describe('ListErrors', () => {
  it('renders nothing when errors are null', () => {
    const { container } = render(<ListErrors errors={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the errors object is empty', () => {
    const { container } = render(<ListErrors errors={{ errors: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one list item per error key', () => {
    const errors: Errors = { errors: { email: 'is invalid', password: 'is too short' } };
    render(<ListErrors errors={errors} />);

    const list = screen.getByRole('list');
    expect(list).toHaveClass('error-messages');
    const items = screen.getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual(['email is invalid', 'password is too short']);
  });

  it('stringifies array values comma-joined, as Angular interpolation does', () => {
    const errors = { errors: { email: ['is invalid', 'has already been taken'] } } as unknown as Errors;
    render(<ListErrors errors={errors} />);

    expect(screen.getByRole('listitem')).toHaveTextContent('email is invalid,has already been taken');
  });
});
