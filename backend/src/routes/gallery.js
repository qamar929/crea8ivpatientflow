const router = require('express').Router();
const ctrl = require('../controllers/galleryController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);
router.get('/:clientId', ctrl.list);
router.post('/:clientId', upload.single('image'), ctrl.upload);
router.delete('/:id', ctrl.remove);

module.exports = router;
