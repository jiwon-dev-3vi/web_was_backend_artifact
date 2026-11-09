import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const backendRoot = path.join(repositoryRoot, 'backend');
const destination = path.join(backendRoot, 'public', 'site');

export function publishClient() {
  let outputDirectory;

  return {
    name: 'publish-client-to-server',
    apply: 'build',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: JSON.stringify({
          buildId: randomUUID(),
          builtAt: new Date().toISOString(),
          application: 'web-was-backend-artifact',
        }, null, 2),
      });
    },
    async closeBundle() {
      await access(path.join(outputDirectory, 'index.html'));
      if (path.relative(backendRoot, destination) !== path.join('public', 'site')) {
        throw new Error('Unexpected frontend destination');
      }
      await mkdir(path.dirname(destination), { recursive: true });
      await rm(destination, { recursive: true, force: true });
      await cp(outputDirectory, destination, { recursive: true });
      console.info('[publish-client] Frontend bundle copied to backend/public/site');
    },
  };
}
