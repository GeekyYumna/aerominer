 'use strict';

const express        = require('express');
const router         = express.Router();
const { v4: uuidv4 } = require('uuid');
const etl            = require('../services/etl');
const db             = require('../config/database');
const logRepo        = require('../repositories/logRepository');

// POST /api/pipeline/run
router.post('/run', async (req, res) => {
  const { keyword, language, minStars, maxRepos } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required.' });
  }

  const runId = uuidv4();

  // Respond immediately with runId
  res.json({ runId, status: 'started' });

  // Run ETL in background — pass the same runId
  etl.run({ runId, keyword, language, minStars, maxRepos })
    .catch(err => console.error('[Pipeline] ETL error:', err.message));
});

// GET /api/pipeline/status/:runId
router.get('/status/:runId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM pipeline_runs WHERE id = ?',
      [req.params.runId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Run not found.' });
    }

    const run  = rows[0];
    const logs = await logRepo.findByRunId(req.params.runId);
    res.json({ ...run, logs });

  } catch (err) {
    res.status(500).json({ error: 'Failed to get pipeline status.' });
  }
});

module.exports = router;