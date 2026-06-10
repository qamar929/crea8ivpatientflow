const router = require('express').Router();
const ctrl = require('../controllers/clientController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/appointments', ctrl.getAppointments);
router.get('/:id/packages', ctrl.getPackages);
router.post('/:id/portal-credentials', ctrl.generatePortalCredentials);

module.exports = router;
