#!/usr/bin/env node
/**
 * Fly.io / production startup: seed DB then start server
 */
require('./setup_db.js');
require('../src/server.js');
