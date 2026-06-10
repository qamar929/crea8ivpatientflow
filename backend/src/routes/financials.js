const router = require('express').Router();
const ctrl = require('../controllers/financialController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/summary', ctrl.getSummary);
router.get('/monthly', ctrl.getMonthly);
router.get('/transactions', ctrl.getTransactions);

module.exports = router;
