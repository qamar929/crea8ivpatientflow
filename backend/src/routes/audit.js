const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const auth = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');

router.get('/', auth, allowRoles('owner', 'manager'), ctrl.list);

module.exports = router;
