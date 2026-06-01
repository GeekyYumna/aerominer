'use strict';

const axios = require('axios');
const env   = require('../config/env');

const githubClient = axios.create({
  baseURL: env.github.baseUrl,
  headers: {
    'Authorization':        `Bearer ${env.github.pat}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  timeout: 10000,
});

async function searchRepositories({ keyword, language, minStars = 0, maxRepos = 30 }) {
  const perPage = Math.min(maxRepos, 100);
  let   results = [];

  // Build query without topic:aviation — too restrictive when combined with language
  let query = keyword;
  if (minStars > 0) query += ` stars:>=${minStars}`;
  if (language)     query += ` language:${language}`;

  const res = await githubClient.get('/search/repositories', {
    params: {
      q:        query,
      sort:     'stars',
      order:    'desc',
      per_page: perPage,
      page:     1,
    }
  });

  results = res.data.items || [];
  return results.slice(0, maxRepos);
}

module.exports = { searchRepositories };