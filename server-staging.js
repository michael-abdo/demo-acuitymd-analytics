#!/usr/bin/env node

// Load environment variables from .env.staging
require('dotenv').config({ path: '.env.staging' });

// Custom Next.js server for staging with .next-staging directory
process.env.NODE_ENV = 'production';
process.env.ENVIRONMENT = 'staging';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3001;

// Configure Next.js to use .next-staging directory
const app = next({ 
  dev,
  dir: __dirname,
  conf: {
    distDir: '.next-staging'
  }
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