import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('links the logo back home', () => {
    const { container } = renderFooter();

    const logo = container.querySelector('a.logo-font');
    expect(logo).toHaveTextContent('conduit');
    expect(logo).toHaveAttribute('href', '/');
  });

  it('renders the attribution with the current year', () => {
    const { container } = renderFooter();

    const attribution = container.querySelector('span.attribution');
    expect(attribution).toHaveTextContent(`© ${new Date().getFullYear()}. An interactive learning project from`);
    expect(attribution).toHaveTextContent('Code licensed under MIT.');
    expect(screen.getByRole('link', { name: 'RealWorld OSS Project' })).toHaveAttribute(
      'href',
      'https://github.com/gothinkster/realworld',
    );
  });
});
