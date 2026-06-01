'use strict';

const express  = require('express');
const router   = express.Router();
const repoRepo = require('../repositories/repoRepository');

function toCSV(repos) {
  const headers = ['id','full_name','category','language','stars','forks','github_url','description'];
  const escape  = val => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows    = repos.map(r => headers.map(h => escape(r[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// GET /api/export/json
router.get('/json', async (req, res) => {
  try {
    const { category, language, min_stars } = req.query;
    const { repos } = await repoRepo.findAll({
      category, language,
      minStars: parseInt(min_stars) || 0,
      limit: 1000,
    });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="aerominer-export-${date}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(repos, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// GET /api/export/csv
router.get('/csv', async (req, res) => {
  try {
    const { category, language, min_stars } = req.query;
    const { repos } = await repoRepo.findAll({
      category, language,
      minStars: parseInt(min_stars) || 0,
      limit: 1000,
    });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="aerominer-export-${date}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(toCSV(repos));
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

module.exports = router;