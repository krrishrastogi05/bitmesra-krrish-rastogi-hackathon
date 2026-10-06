import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { config } from './config';
import routes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '256kb' }));
app.use(pinoHttp({
  logger,
  serializers: { req: (req) => ({ method: req.method, url: req.url }), res: (res) => ({ status: res.statusCode }) },
}));
app.use('/api', rateLimit(config.maxRequestsPerMinute), routes);
app.use(notFound);
app.use(errorHandler);

export default app;
