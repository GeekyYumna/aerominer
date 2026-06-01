'use strict';

require('./config/env'); // validate env vars first
const express      = require('express');
const cors         = require('cors');
const env          = require('./config/env');

const reposRoute    = require('./routes/repos');
const pipelineRoute = require('./routes/pipeline');
const logsRoute     = require('./routes/logs');
const exportRoute   = require('./routes/export');
const errorHandler  = require('./middleware/errorHandler');

const app = express();

// --- Middleware ---
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

// --- Routes ---
app.use('/api/repos',    reposRoute);
app.use('/api/pipeline', pipelineRoute);
app.use('/api/logs',     logsRoute);
app.use('/api/export',   exportRoute);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.server.env });
});

// --- Error handler (must be last) ---
app.use(errorHandler);

app.listen(env.server.port, () => {
  console.log(`🚀 AeroMiner backend running on http://localhost:${env.server.port}`);
});