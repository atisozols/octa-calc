const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Used as orderReference
    policyId: { type: String, required: true }, // ID of saved policy from provider
    insuranceCompany: {
      type: String,
      required: true,
      enum: ['ergo', 'balcia', 'balta'],
    },
    offerPrice: { type: Number, required: true }, // Final price from provider
    carData: {
      reg: { type: String, required: true }, // Car Registration Number
      vin: { type: String, required: true }, // Vehicle Identification Number
    },
    email: { type: String, required: true },
    phone: {
      country_code: { type: String, required: true }, // 1-4 digit country code
      number: { type: String, required: true }, // 4-14 digit local number
    },
    octaDuration: { type: Number, required: true, enum: [1, 3, 6, 9, 12] },
    paymentReference: { type: String, default: null, unique: true }, // SEB Payment Tracking ID
    paymentStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'successful', 'failed'],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', OrderSchema);
