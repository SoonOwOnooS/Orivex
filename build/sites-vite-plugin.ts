// Adapted from @openai/sites-vite-plugin 0.2.0 (openai/sites#9).
// See sites-vite-plugin.LICENSE for the upstream MIT license.
// Authentication is handled exclusively by Orivex's verified GitHub sessions.
import { access, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export function sites(): Plugin {
  let root = process.cwd(), command: 'build' | 'serve' = 'build';
  return {
    name: 'orivex-build-metadata',
    configResolved(config) { root = config.root; command = config.command; },
    async closeBundle() {
      if (command !== 'build') return;
      const outputDirectory = resolve(root, 'dist', '.orivex');
      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });
      await cp(resolve(root, '.orivex', 'hosting.json'), resolve(outputDirectory, 'hosting.json'));
      const migrations = resolve(root, 'drizzle');
      try { await access(migrations); } catch { return; }
      await cp(migrations, resolve(outputDirectory, 'drizzle'), { recursive: true });
    },
  };
}
