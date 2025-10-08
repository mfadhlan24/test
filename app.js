import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import sheetRouter from './routes/sheetRoutes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const __dirname = process.cwd();
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', sheetRouter);

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
