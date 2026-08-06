import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Angular renders a host element for every component and those elements take
 * part in layout and are matched by the global stylesheet (for example
 * `app-root > *:not(app-layout-footer)`). Each ported component renders the same
 * custom element so both DOM trees are identical.
 */
type HostElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'app-article-comment': HostElement;
      'app-article-list': HostElement;
      'app-article-meta': HostElement;
      'app-article-page': HostElement;
      'app-article-preview': HostElement;
      'app-auth-page': HostElement;
      'app-editor-page': HostElement;
      'app-favorite-button': HostElement;
      'app-follow-button': HostElement;
      'app-home-page': HostElement;
      'app-layout-footer': HostElement;
      'app-layout-header': HostElement;
      'app-list-errors': HostElement;
      'app-profile-articles': HostElement;
      'app-profile-favorites': HostElement;
      'app-profile-page': HostElement;
      'app-settings-page': HostElement;
      'router-outlet': HostElement;
    }
  }
}
