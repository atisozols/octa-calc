const axios = require('axios');
const { Order, ORDER_STATUS } = require('../models/Order');
const { savePolicyOffer, approvePolicy } = require('../utils/policyService');

const createPayment = async (req, res, next) => {
  try {
    const { carData, email, phone, selectedOfferId, octaDuration } = req.body;

    console.log('received data', req.body);

    const policyData = await savePolicyOffer(
      selectedOfferId,
      carData,
      octaDuration,
    );

    console.log('policyData', policyData);

    if (!policyData || !policyData.policyId || !policyData.price) {
      throw new Error('Failed to save policy offer');
    }

    // Create initial order using the static method
    const savedOrder = await Order.createInitialOrder({
      policyId: policyData.policyId,
      insuranceCompany: selectedOfferId,
      offerPrice: policyData.price,
      carData,
      email,
      phone,
      octaDuration,
    });

    console.log('order created', savedOrder);

    const requestBody = {
      account_name: process.env.SEB_ACCOUNT_NAME,
      amount: policyData.price,
      api_username: process.env.SEB_API_USERNAME,
      customer_url: process.env.SEB_SUCCESS_URL,
      nonce: Math.random().toString(36).substring(2, 15),
      order_reference: savedOrder._id.toString(),
      timestamp: new Date().toISOString(),
      email,
    };

    const response = await axios.post(
      `${process.env.SEB_API_URL}/v4/payments/oneoff`,
      requestBody,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.SEB_API_USERNAME}:${process.env.SEB_API_SECRET}`,
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // Update order with payment reference and change status to checkout initiated
    const order = await Order.findById(savedOrder._id);
    await order.initiateCheckout(response.data.payment_reference);

    res.json({
      paymentLink: response.data.payment_link,
      paymentReference: response.data.payment_reference,
    });
  } catch (error) {
    next(error);
  }
};

const processCallback = async (req, res) => {
  try {
    console.log('SEB Payment Callback:', req.query);

    const { payment_reference, order_reference, event_name } = req.query;

    if (!payment_reference || !order_reference || !event_name) {
      console.error('⚠️ Missing required parameters in callback');
      return res.status(400).json({ message: 'Invalid callback parameters' });
    }

    // Step 1: Fetch Order from MongoDB using the order_reference
    const order = await Order.findById(order_reference);

    if (!order) {
      console.error(`🚨 Order not found for reference: ${order_reference}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Step 2: Handle Payment Events
    if (event_name === 'status_updated') {
      console.log(`🔔 Payment status updated for Order: ${order_reference}`);

      const authString = `${process.env.SEB_API_USERNAME}:${process.env.SEB_API_SECRET}`;
      const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

      console.log('Auth String:', authString); // Ensure this is correct
      console.log('Encoded Auth Header:', authHeader); // Ensure it's a valid Base64 string

      const response = await axios.get(
        `${process.env.SEB_API_URL}/v4/payments/${payment_reference}?api_username=${process.env.SEB_API_USERNAME}`,
        {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      const paymentStatus = response.data.payment_state;
      console.log(`💳 Fetched Payment Status: ${paymentStatus}`);

      if (paymentStatus === 'settled') {
        console.log(`✅ Payment Successful for Order: ${order_reference}`);

        // Mark order as paid using utility method
        await order.markAsPaid();

        // Approve Policy and get policy ID
        const policyResult = await approvePolicy(order);

        // If policy approval returned a policy ID, update the order
        if (policyResult && policyResult.policyId) {
          await order.approvePolicyWithId(policyResult.policyId);
        }

        return res.status(200).send('Payment Approved');
      } else if (paymentStatus === 'failed' || paymentStatus === 'abandoned') {
        console.log(`❌ Payment Failed for Order: ${order_reference}`);

        // Mark order as failed with reason
        await order.markAsFailed(
          `Payment ${paymentStatus}: ${payment_reference}`,
        );

        return res.status(400).send('Payment Failed');
      } else {
        console.log(`⚠️ Payment status unknown: ${paymentStatus}`);
        return res.status(400).send('Unknown Payment Status');
      }
    }

    console.log(`⚠️ Unhandled event: ${event_name}`);
    res.status(400).send('Unknown Event');
  } catch (error) {
    console.error('🚨 Webhook Error:', error);
    res.status(500).send('Error processing webhook');
  }
};

module.exports = { processCallback, createPayment };
