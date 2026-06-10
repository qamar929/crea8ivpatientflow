const router = require('express').Router();
const ctrl = require('../controllers/staffController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/performance', ctrl.getPerformance);

module.exports = router;
