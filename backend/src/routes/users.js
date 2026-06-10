const router = require('express').Router();
const ctrl = require('../controllers/userController');
const auth = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');

router.use(auth, allowRoles('owner'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.post('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id', ctrl.remove);

module.exports = router;
