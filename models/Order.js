const mongoose = require('mongoose');

// Define order status constants
const ORDER_STATUS = {
  CREATED: 'created',           // Initial state when order is created
  CHECKOUT_INITIATED: 'checkout_initiated', // Checkout process started
  PAYMENT_PENDING: 'payment_pending',     // Waiting for payment
  PAID: 'paid',                 // Payment successful
  POLICY_APPROVED: 'policy_approved',    // Policy approved by provider
  FAILED: 'failed'              // Order failed at any stage
};

// Schema for tracking status changes
const StatusLogSchema = new mongoose.Schema(
  {
    status: { 
      type: String, 
      required: true,
      enum: Object.values(ORDER_STATUS)
    },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Used as orderReference
    policyId: { type: String, required: false }, // ID of saved policy from provider (not required at creation)
    insuranceCompany: {
      type: String,
      required: true,
      enum: process.env.INSURANCE_COMPANIES.split(','),
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
    paymentReference: { type: String, default: null, sparse: true }, // SEB Payment Tracking ID
    currentStatus: {
      type: String,
      default: ORDER_STATUS.CREATED,
      enum: Object.values(ORDER_STATUS),
    },
    statusHistory: [StatusLogSchema], // Track all status changes with timestamps
    policyApprovalDate: { type: Date, default: null }, // When policy was approved
    checkoutDate: { type: Date, default: null }, // When checkout was initiated
    paymentDate: { type: Date, default: null }, // When payment was successful
  },
  { timestamps: true }, // Still keep createdAt and updatedAt
);

// Utility method to update order status
OrderSchema.methods.updateStatus = async function(newStatus, notes = '') {
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes: notes
  });
  
  // Update current status
  this.currentStatus = newStatus;
  
  // Update specific date fields based on status
  if (newStatus === ORDER_STATUS.CHECKOUT_INITIATED) {
    this.checkoutDate = new Date();
  } else if (newStatus === ORDER_STATUS.PAID) {
    this.paymentDate = new Date();
  } else if (newStatus === ORDER_STATUS.POLICY_APPROVED) {
    this.policyApprovalDate = new Date();
  }
  
  return this.save();
};

// Utility method to initiate checkout
OrderSchema.methods.initiateCheckout = async function(paymentReference) {
  this.paymentReference = paymentReference;
  return this.updateStatus(ORDER_STATUS.CHECKOUT_INITIATED, `Checkout initiated with payment reference: ${paymentReference}`);
};

// Utility method to mark as paid
OrderSchema.methods.markAsPaid = async function() {
  return this.updateStatus(ORDER_STATUS.PAID, 'Payment successful');
};

// Utility method to mark policy as approved
OrderSchema.methods.approvePolicyWithId = async function(policyId) {
  this.policyId = policyId;
  return this.updateStatus(ORDER_STATUS.POLICY_APPROVED, `Policy approved with ID: ${policyId}`);
};

// Utility method to mark as failed
OrderSchema.methods.markAsFailed = async function(reason) {
  return this.updateStatus(ORDER_STATUS.FAILED, reason);
};

// Static method to create a new order
OrderSchema.statics.createInitialOrder = async function(orderData) {
  const order = new this(orderData);
  
  // Initialize status history
  order.statusHistory = [{
    status: ORDER_STATUS.CREATED,
    timestamp: new Date(),
    notes: 'Initial order created'
  }];
  
  await order.save();
  return order;
};

const Order = mongoose.model('Order', OrderSchema);

// Export both the model and constants
module.exports = {
  Order,
  ORDER_STATUS
};

