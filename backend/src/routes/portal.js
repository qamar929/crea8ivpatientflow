const router = require('express').Router();
const ctrl = require('../controllers/portalController');
const auth = require('../middleware/auth');

router.post('/login', ctrl.login);
router.get('/appointments', auth, ctrl.getMyAppointments);
router.post('/appointments', auth, ctrl.bookAppointment);
router.get('/invoices', auth, ctrl.getMyInvoices);
router.get('/invoices/:id/download', auth, ctrl.downloadInvoice);
router.get('/packages', auth, ctrl.getMyPackages);
router.post('/feedback', auth, ctrl.submitFeedback);

module.exports = router;
