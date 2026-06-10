const router = require('express').Router();
const ctrl = require('../controllers/appointmentController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/today', ctrl.getToday);
router.get('/conflicts', ctrl.getConflicts);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.cancel);
router.post('/:id/checkin', ctrl.checkIn);

module.exports = router;
