const router = require('express').Router();
const ctrl = require('../controllers/feedbackController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.list);
router.post('/', ctrl.create);

module.exports = router;
