require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5174', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/appointments', require('./routes/appointments'));
app.use('/api/v1/staff', require('./routes/staff'));
app.use('/api/v1/services', require('./routes/services'));
app.use('/api/v1/packages', require('./routes/packages'));
app.use('/api/v1/invoices', require('./routes/invoices'));
app.use('/api/v1/inventory', require('./routes/inventory'));
app.use('/api/v1/financials', require('./routes/financials'));
app.use('/api/v1/feedback', require('./routes/feedback'));
app.use('/api/v1/campaigns', require('./routes/marketing'));
app.use('/api/v1/gallery', require('./routes/gallery'));
app.use('/api/v1/branches', require('./routes/branches'));
app.use('/api/v1/audit', require('./routes/audit'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/portal', require('./routes/portal'));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

module.exports = app;
