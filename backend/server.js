import express from 'express';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const directory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(directory, 'public', 'site');
const indexFile = path.join(webRoot, 'index.html');
const port = Number(process.env.APP_PORT || process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('APP_PORT or PORT must be a valid port');
}

app.disable('x-powered-by');
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'artifact-was', uptimeSeconds: Math.floor(process.uptime()) });
});

app.get('/api/status', async (req, res, next) => {
  try {
    const indexExists = await access(indexFile).then(() => true, () => false);
    const build = await readFile(path.join(webRoot, 'build-info.json'), 'utf8')
      .then(JSON.parse).catch(() => null);
    const assets = await readdir(path.join(webRoot, 'assets')).catch(() => []);
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      frontend: {
        ready: indexExists && Boolean(build?.buildId) && assets.length > 0,
        buildId: build?.buildId || null,
        builtAt: build?.builtAt || null,
        assetCount: assets.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', (req, res) => {
  res.json({ products: [
    { id: 'desk-plant', name: '책상 위 작은 정원', category: 'LIVING', price: 18000, symbol: '🌱' },
    { id: 'ceramic-mug', name: '매일 쓰는 머그', category: 'KITCHEN', price: 24000, symbol: '☕' },
    { id: 'daily-notes', name: '생각을 담는 노트', category: 'STATIONERY', price: 12000, symbol: '📘' },
  ] });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
app.use(express.static(webRoot, { index: false, maxAge: 0 }));

app.get(['/', '/catalog', '/catalog/:id'], (req, res, next) => {
  res.sendFile(indexFile, error => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.code === 'ENOENT') {
      return res.status(404).type('text').send('Frontend build is missing. Run npm run build from the project root.');
    }
    next(error);
  });
});

app.use((req, res) => res.status(404).type('text').send('Page not found'));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.info(`Artifact WAS listening on port ${port}; static root: public/site`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
