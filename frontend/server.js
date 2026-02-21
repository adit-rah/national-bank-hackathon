import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Proxy /api requests to the backend service
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  timeout: 120000,
  proxyTimeout: 120000,
  pathRewrite: { '^/': '/api/' },
}));

// Serve static files from the build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback — serve index.html for all non-API, non-static routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend serving on port ${PORT}, proxying API to ${API_URL}`);
});
