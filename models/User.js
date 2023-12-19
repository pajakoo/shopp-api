const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  name: { type: String  },
  email: { type: String, unique: true },
  photoUrl: { type: String },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }], // Reference to Role model
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
