const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const plantRoutes = require('./routes/plant');
app.use('/api', plantRoutes);

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: 'zhi-wu-yu-h5-mvp',
    port: PORT,
    hasBaiduKey: !!process.env.BAIDU_AI_API_KEY,
    hasBaiduSecret: !!process.env.BAIDU_AI_SECRET_KEY,
    hasPerenualKey: !!process.env.PERENUAL_API_KEY
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({
      ok: false,
      error: 'IMAGE_TOO_LARGE：图片过大，请压缩后重试（最大 10MB）'
    });
  }

  console.error('H5 request failed:', error);
  return res.status(500).json({
    ok: false,
    error: 'SERVER_ERROR：服务暂时不可用，请稍后重试'
  });
});

app.listen(PORT, () => {
  console.log(`植の物语 H5 MVP running at http://localhost:${PORT}`);
});
