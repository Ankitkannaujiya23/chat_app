import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
