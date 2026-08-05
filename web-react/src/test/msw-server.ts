import { setupServer } from 'msw/node';

/**
 * Shared MSW server for all unit tests. Handlers are registered per-test with
 * `server.use(...)`; anything unhandled fails the test (see `setup.ts`).
 */
export const server = setupServer();

export const API_URL = 'https://api.realworld.show/api';
