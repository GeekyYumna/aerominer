'use strict';

const express  = require('express');
const router   = express.Router();
const logRepo  = require('../repositories/logRepository');

// GET /api/logs
router.get('/', async (req, res) => {
  try {
    const { level, page, limit } = req.query;
    const result = await logRepo.findAll({
      level,
      page:  parseInt(page)  || 1,
      limit: parseInt(limit) || 50,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// DELETE /api/logs
router.delete('/', async (req, res) => {
  try {
    await logRepo.clearAll();
    res.json({ message: 'All logs cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs.' });
  }
});

module.exports = router;