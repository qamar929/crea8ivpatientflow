const router = require('express').Router();
const ctrl = require('../controllers/packageController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.listPackages);
router.post('/', ctrl.createPackage);
router.put('/:id', ctrl.updatePackage);
router.post('/:id/purchase', ctrl.purchasePackage);
router.get('/client/:clientId', ctrl.getClientPackages);

module.exports = router;
