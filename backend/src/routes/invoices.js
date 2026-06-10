const router = require('express').Router();
const ctrl = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.post('/:id/pay', ctrl.markPaid);
router.post('/:id/refund', ctrl.refund);
router.get('/:id/pdf', ctrl.getPDF);

module.exports = router;
