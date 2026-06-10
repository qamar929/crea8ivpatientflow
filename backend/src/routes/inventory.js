const router = require('express').Router();
const ctrl = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/alerts/low-stock', ctrl.getLowStock);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.post('/:id/stock', ctrl.adjustStock);

module.exports = router;
