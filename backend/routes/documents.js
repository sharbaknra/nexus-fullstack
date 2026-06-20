const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// @route POST /api/documents/upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const sizeKB = (req.file.size / 1024).toFixed(1) + ' KB';
    const doc = await Document.create({
      name: req.file.originalname,
      type: path.extname(req.file.originalname).replace('.', '').toUpperCase(),
      size: sizeKB,
      fileUrl: `/uploads/${req.file.filename}`,
      owner: req.user._id
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/documents
router.get('/', protect, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.user._id }, { sharedWith: req.user._id }]
    }).populate('owner', 'name email avatarUrl').sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/documents/:id/share
router.post('/:id/share', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId } = req.body;
    if (!doc.sharedWith.includes(userId)) {
      doc.sharedWith.push(userId);
      doc.status = 'pending_signature';
      await doc.save();
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/documents/:id/sign
router.post('/:id/sign', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const { signature } = req.body;
    doc.signature = signature;
    doc.signedBy = req.user._id;
    doc.signedAt = new Date();
    doc.status = 'signed';
    await doc.save();

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const filePath = path.join(uploadDir, path.basename(doc.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
