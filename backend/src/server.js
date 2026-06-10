require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

server.listen(PORT, () => {
  console.log(`The Smile Expert API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
