const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'owner', 'operator'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  deviceMetadata: {
    brand: String,
    model: String,
    os: String,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.statics.toggleUserStatus = function (userId, isActive) {
  return this.findByIdAndUpdate(userId, { isActive }, { new: true });
};

module.exports = mongoose.model('User', userSchema);
