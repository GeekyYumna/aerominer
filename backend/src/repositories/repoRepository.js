'use strict';

const db = require('../config/database');

async function upsertMany(repos) {
  if (repos.length === 0) return;

  const query = `
    INSERT INTO repositories
      (github_id, full_name, description, category, language, stars, forks, topics, github_url, last_fetched)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      full_name    = VALUES(full_name),
      description  = VALUES(description),
      category     = VALUES(category),
      language     = VALUES(language),
      stars        = VALUES(stars),
      forks        = VALUES(forks),
      topics       = VALUES(topics),
      last_fetched = NOW()
  `;

  const values = repos.map(r => [
    r.github_id, r.full_name,  r.description,
    r.category,  r.language,   r.stars,
    r.forks,     r.topics,     r.github_url,
    new Date(),
  ]);

  await db.query(query, [values]);
}

async function findAll({ category, language, minStars = 0, page = 1, limit = 30 }) {
  const conditions = ['stars >= ?'];
  const params     = [minStars];

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (language) {
    conditions.push('language = ?');
    params.push(language);
  }

  const where  = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const [rows]       = await db.query(
    `SELECT * FROM repositories WHERE ${where} ORDER BY stars DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM repositories WHERE ${where}`,
    params
  );

  return { repos: rows, total, page, limit };
}

async function findById(id) {
  const [[row]] = await db.query('SELECT * FROM repositories WHERE id = ?', [id]);
  return row || null;
}

module.exports = { upsertMany, findAll, findById };