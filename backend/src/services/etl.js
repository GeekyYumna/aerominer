'use strict';

const github         = require('./github');
const { transform }  = require('./classifier');
const repoRepo       = require('../repositories/repoRepository');
const logRepo        = require('../repositories/logRepository');
const db             = require('../config/database');

async function run({ runId, keyword, language, minStars = 0, maxRepos = 30 }) {
  const start = Date.now();

  await db.query(
    'INSERT INTO pipeline_runs (id, keyword, language, min_stars, max_repos, status) VALUES (?, ?, ?, ?, ?, ?)',
    [runId, keyword, language || null, minStars, maxRepos, 'running']
  );

  const log = async (level, stage, message) => {
    console.log(`[${level}] [${stage}] ${message}`);
    await logRepo.insertLog({ runId, level, stage, message });
  };

  try {
    await log('INFO', 'Extract', `Starting — keyword: "${keyword}", language: ${language || 'any'}`);
    const raw = await github.searchRepositories({ keyword, language, minStars, maxRepos });
    await log('INFO', 'Extract', `Fetched ${raw.length} repositories from GitHub API.`);

    await log('INFO', 'Transform', 'Running classification engine...');
    const transformed = raw.map(transform);

    const counts = {};
    transformed.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    for (const [cat, count] of Object.entries(counts)) {
      await log('INFO', 'Transform', `Category [${cat}]: ${count} repositories.`);
    }

    await log('INFO', 'Load', `Persisting ${transformed.length} records to MySQL...`);
    await repoRepo.upsertMany(transformed);
    await log('INFO', 'Load', 'All records saved successfully.');

    const duration = Date.now() - start;
    await db.query(
      'UPDATE pipeline_runs SET status=?, repos_found=?, duration_ms=?, finished_at=NOW() WHERE id=?',
      ['complete', transformed.length, duration, runId]
    );

    await log('INFO', 'System', `Pipeline complete. Duration: ${duration}ms.`);
    return { runId, status: 'complete', reposFound: transformed.length, duration };

  } catch (err) {
    await log('ERROR', 'System', `Pipeline failed: ${err.message}`);
    await db.query(
      'UPDATE pipeline_runs SET status=?, finished_at=NOW() WHERE id=?',
      ['error', runId]
    );
    throw err;
  }
}

module.exports = { run };