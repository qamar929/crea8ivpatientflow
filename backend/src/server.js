require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LEGACY_NODE_BACKEND !== '1') {
  console.error('Legacy Node backend is disabled in production. Use backend-php unless ALLOW_LEGACY_NODE_BACKEND=1 is explicitly set.');
  process.exit(1);
}

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

server.listen(PORT, () => {
  console.log(`The Smile Expert API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
