const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  date: { type: Date, default: Date.now },
  price: { type: mongoose.Schema.Types.Decimal128, required: true }
});

// Rest of your code...

module.exports = mongoose.model('Price', priceSchema);
