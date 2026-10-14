import app from '../server/index.ts';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[API Serverless Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Vercel Serverless Invocation Error',
        message: err?.message || String(err),
        stack: err?.stack,
        nodeVersion: process.version,
      });
    }
  }
}
