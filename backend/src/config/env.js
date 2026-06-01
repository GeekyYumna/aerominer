'use strict';

require('dotenv').config();

const required = ['GITHUB_PAT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  github: {
    pat:     process.env.GITHUB_PAT,
    baseUrl: 'https://api.github.com',
  },
  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name:     process.env.DB_NAME,
  },
  server: {
    port:        parseInt(process.env.PORT) || 3001,
    env:         process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  },
};