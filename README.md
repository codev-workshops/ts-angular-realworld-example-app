# ![React Example App](logo.png)

> ### React codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://realworld.show) spec and API.

### [RealWorld](https://realworld.show)

This codebase was created to demonstrate a fully fledged application built with React that interacts with an actual backend server including CRUD operations, authentication, routing, pagination, and more. It uses Vite, TypeScript, React Router (data router with route-level code splitting), Zustand for auth state, React Hook Form for forms and axios for HTTP.

# How it works

A global documentation for the project is available at [docs.realworld.show](https://docs.realworld.show/introduction/).

# Getting started

Requires Node >= 22.12 (see `.nvmrc`). Run `bun install` to resolve all dependencies (`npm install` works too).

Run `bun run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Building the project

Run `bun run build` to build the project. The build artifacts will be stored in `dist/react-conduit`.

### Testing

```bash
bun run test              # unit tests (Vitest + Testing Library)
bun run test:e2e          # Playwright, everything except @security
bun run test:e2e:security # the @security suite
bun run lint              # ESLint
bun run typecheck         # tsc --noEmit
```

## Functionality overview

The example application is a social blogging site (i.e. a Medium.com clone) called "Conduit". It uses a custom API for all requests, including authentication. You can view a live demo over at [demo.realworld.show](https://demo.realworld.show)

**General functionality:**

- Authenticate users via JWT (login/signup pages + logout button on settings page)
- CRU\* users (sign up & settings page - no deleting required)
- CRUD Articles
- CR\*D Comments on articles (no updating required)
- GET and display paginated lists of articles
- Favorite articles
- Follow other users

**The general page breakdown looks like this:**

- Home page (URL: / )
  - List of tags
  - List of articles pulled from either Feed, Global, or by Tag
  - Pagination for list of articles
- Sign in/Sign up pages (URL: /login, /register )
  - Uses JWT (store the token in localStorage)
  - Authentication can be easily switched to session/cookie based
- Settings page (URL: /settings )
- Editor page to create/edit articles (URL: /editor, /editor/article-slug-here )
- Article page (URL: /article/article-slug-here )
  - Delete article button (only shown to article's author)
  - Render markdown from server client side
  - Comments section at bottom of page
  - Delete comment button (only shown to comment's author)
- Profile page (URL: /profile/:username, /profile/:username/favorites )
  - Show basic user info
  - List of articles populated from author's created articles or author's favorited articles

## License

- **Project code**: [MIT License](LICENSE)
