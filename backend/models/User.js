const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['entrepreneur', 'investor'], required: true },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  startupName: { type: String },
  pitchSummary: { type: String },
  fundingNeeded: { type: String },
  industry: { type: String },
  location: { type: String },
  foundedYear: { type: Number },
  teamSize: { type: Number },
  investmentInterests: [{ type: String }],
  investmentStage: [{ type: String }],
  portfolioCompanies: [{ type: String }],
  totalInvestments: { type: Number, default: 0 },
  minimumInvestment: { type: String },
  maximumInvestment: { type: String }
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
