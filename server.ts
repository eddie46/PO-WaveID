import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_CONFIG_PATH = path.resolve(__dirname, 'public', 'supabase-config.json');
const DOCS_CONFIG_PATH = path.resolve(__dirname, 'docs', 'supabase-config.json');
const SRC_CONFIG_PATH = path.resolve(__dirname, 'src', 'services', 'supabaseDefaultConfig.json');

function readSavedSupabaseConfig() {
  try {
    if (fs.existsSync(PUBLIC_CONFIG_PATH)) {
      const raw = fs.readFileSync(PUBLIC_CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read supabase-config.json:', err);
  }
  return {
    supabaseUrl: 'https://zcudrmvrzflrmeaffmjz.supabase.co',
    supabaseAnonKey: 'sb_publishable_6ypDQ95oEmYuUghUmJPYOw_P_bgplO8',
    tableName: 'orders',
    isEnabled: true,
    realtimeProvider: 'supabase',
    secondarySupabaseUrl: 'https://qeooqwsyibcamsibkrkl.supabase.co',
    secondarySupabaseAnonKey: 'sb_publishable_3TJC5rkO3niTfPlSVOnToA_4voT1PMI',
    enableAutoFailover: true,
    activeAccountIndex: 1,
  };
}

function writeSavedSupabaseConfig(config: Record<string, unknown>) {
  const payload = JSON.stringify(
    {
      supabaseUrl: typeof config.supabaseUrl === 'string' ? config.supabaseUrl.trim() : '',
      supabaseAnonKey: typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey.trim() : '',
      tableName: typeof config.tableName === 'string' && config.tableName.trim() ? config.tableName.trim() : 'orders',
      isEnabled: Boolean(config.isEnabled),
      realtimeProvider: 'supabase',
      secondarySupabaseUrl: typeof config.secondarySupabaseUrl === 'string' ? config.secondarySupabaseUrl.trim() : '',
      secondarySupabaseAnonKey: typeof config.secondarySupabaseAnonKey === 'string' ? config.secondarySupabaseAnonKey.trim() : '',
      enableAutoFailover: config.enableAutoFailover !== undefined ? Boolean(config.enableAutoFailover) : true,
      activeAccountIndex: config.activeAccountIndex === 2 ? 2 : 1,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  );

  for (const targetPath of [PUBLIC_CONFIG_PATH, DOCS_CONFIG_PATH, SRC_CONFIG_PATH]) {
    try {
      const dir = path.dirname(targetPath);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(targetPath, payload, 'utf-8');
      }
    } catch (err) {
      console.warn(`Could not write Supabase config to ${targetPath}:`, err);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Support both root /api/supabase-config and base-prefixed /PO-WaveID/api/supabase-config
  const getHandler: express.RequestHandler = (_req, res) => {
    res.json(readSavedSupabaseConfig());
  };

  const postHandler: express.RequestHandler = (req, res) => {
    try {
      const body = req.body || {};
      writeSavedSupabaseConfig(body);
      res.json({ success: true, config: readSavedSupabaseConfig() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Gagal menyimpan konfigurasi di server.' });
    }
  };

  app.get('/api/supabase-config', getHandler);
  app.get('/PO-WaveID/api/supabase-config', getHandler);
  app.post('/api/supabase-config', postHandler);
  app.post('/PO-WaveID/api/supabase-config', postHandler);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use('/PO-WaveID', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
