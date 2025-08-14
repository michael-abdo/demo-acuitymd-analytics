#!/usr/bin/env node

// Load environment variables using industry standard approach
// First load base .env, then overlay with env/.env.production
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: 'env/.env.production', override: true });

// Custom Next.js server for production with .next-production directory
process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Configure Next.js to use standard .next directory
const app = next({ 
  dev,
  dir: __dirname
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
  .once('error', (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});