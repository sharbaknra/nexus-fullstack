const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: String, required: true },
  fileUrl: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['draft', 'pending_signature', 'signed'], default: 'draft' },
  signature: { type: String, default: '' },
  signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
