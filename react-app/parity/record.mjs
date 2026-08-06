/**
 * Records the live RealWorld API into parity/fixtures/recorded.json.
 *
 * Run once (`node parity/record.mjs`); the committed fixture is what the parity
 * harness replays into both apps. The live API is never used during a parity run
 * because it stamps responses with the current date, which would make screenshot
 * diffs non-deterministic.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.realworld.show/api';
const here = dirname(fileURLToPath(import.meta.url));

async function get(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} -> ${response.status}`);
  }
  return response.json();
}

const { tags } = await get('/tags');
const { articles } = await get('/articles?limit=100');

const comments = {};
const profiles = {};
const articleDetails = {};

for (const article of articles) {
  articleDetails[article.slug] = (await get(`/articles/${article.slug}`)).article;
  comments[article.slug] = (await get(`/articles/${article.slug}/comments`)).comments;
  const username = article.author.username;
  if (!profiles[username]) {
    profiles[username] = (await get(`/profiles/${username}`)).profile;
  }
}

const fixture = { tags, articles, articleDetails, comments, profiles };

writeFileSync(join(here, 'fixtures', 'recorded.json'), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `recorded ${tags.length} tags, ${articles.length} articles, ${Object.keys(profiles).length} profiles, ` +
    `${Object.values(comments).reduce((total, list) => total + list.length, 0)} comments`,
);
