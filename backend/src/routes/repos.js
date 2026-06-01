'use strict';

const express  = require('express');
const router   = express.Router();
const repoRepo = require('../repositories/repoRepository');

// GET /api/repos
router.get('/', async (req, res) => {
  try {
    const { category, language, min_stars, page, limit } = req.query;
    const result = await repoRepo.findAll({
      category,
      language,
      minStars: parseInt(min_stars) || 0,
      page:     parseInt(page)      || 1,
      limit:    Math.min(parseInt(limit) || 30, 100),
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch repositories.' });
  }
});

// GET /api/repos/:id
router.get('/:id', async (req, res) => {
  try {
    const repo = await repoRepo.findById(req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repository not found.' });
    res.json(repo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repository.' });
  }
});

module.exports = router;