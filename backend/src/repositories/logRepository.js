'use strict';

const db = require('../config/database');

async function insertLog({ runId, level, stage, message }) {
  await db.query(
    'INSERT INTO pipeline_logs (run_id, level, stage, message) VALUES (?, ?, ?, ?)',
    [runId, level, stage, message]
  );
}

async function findByRunId(runId) {
  const [rows] = await db.query(
    'SELECT * FROM pipeline_logs WHERE run_id = ? ORDER BY created_at ASC',
    [runId]
  );
  return rows;
}

async function findAll({ level, page = 1, limit = 50 }) {
  const conditions = [];
  const params     = [];

  if (level && level !== 'all') {
    conditions.push('level = ?');
    params.push(level);
  }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows]        = await db.query(
    `SELECT * FROM pipeline_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM pipeline_logs ${where}`,
    params
  );

  return { logs: rows, total, page, limit };
}

async function clearAll() {
  await db.query('DELETE FROM pipeline_logs');
}

module.exports = { insertLog, findByRunId, findAll, clearAll };