const Razorpay = require('razorpay');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay config env vars: RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

async function createOrder({ amount, currency = 'INR', receipt }) {
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount for Razorpay order');
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // INR paise
    currency,
    receipt: receipt || `receipt_${Date.now()}`,
    payment_capture: 1,
  });

  return order;
}

async function refundPayment({ razorpayPaymentId, amount, notes }) {
  if (!razorpayPaymentId) {
    throw new Error('Razorpay payment id is required for refund');
  }
  const options = {};

  if (amount && Number.isFinite(Number(amount)) && Number(amount) > 0) {
    options.amount = Math.round(Number(amount) * 100);
  }

  if (notes && typeof notes === 'object') {
    options.notes = notes;
  }

  const refund = await razorpay.payments.refund(razorpayPaymentId, options);
  return refund;
}

function verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return generatedSignature === razorpaySignature;
}

module.exports = {
  createOrder,
  verifySignature,
  refundPayment,
};
