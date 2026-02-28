#!/usr/bin/env node
/**
 * Copy skills/krump-battle-agent/SKILL.md to public/skill.md
 * so Lovable serves it at /skill.md. Run before build (prebuild).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../skills/krump-battle-agent/SKILL.md');
const dest = path.join(__dirname, '../public/skill.md');

if (!fs.existsSync(src)) {
  console.warn('copy-skill: source not found', src);
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log('copy-skill: copied SKILL.md to public/skill.md');
