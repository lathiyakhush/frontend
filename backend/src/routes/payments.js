const express = require('express');
const { z } = require('zod');
const { Types } = require('mongoose');

const { PaymentModel } = require('../models/payment');
const { OrderModel } = require('../models/order');
const { AdminModel } = require('../models/admin');
const {
  createOrder: createRazorpayOrder,
  verifySignature: verifyRazorpaySignature,
  refundPayment: razorpayRefundPayment,
} = require('../services/razorpayService');

const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const initiateSchema = z.object({
  amount: z.number().finite().positive(),
  currency: z.string().min(1).default('INR'),
  orderId: z.string().optional(),
});

const verifySchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(['completed', 'failed']),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  orderData: z.object({
    currency: z.string().min(1).default('INR'),
    subtotal: z.number().finite().nonnegative(),
    shipping: z.number().finite().nonnegative(),
    tax: z.number().finite().nonnegative(),
    total: z.number().finite().nonnegative(),
    items: z.array(z.object({
      productId: z.string().min(1),
      name: z.string().min(1),
      price: z.number().finite().nonnegative(),
      quantity: z.number().int().min(1),
    })).min(1),
    customer: z.object({ name: z.string().min(1), email: z.string().email() }).optional(),
    address: z.object({
      line1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }).optional(),
  }).optional(),
});

function authToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    if (!req.userId) return res.status(401).json({ error: 'Invalid/expired token' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid/expired token' });
  }
}

router.post('/create-order', authToken, async (req, res) => {
  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.issues });

  const { amount, currency, orderId } = parsed.data;
  const orderObjectId = orderId && Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined;

  try {
    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency,
      receipt: `ikolyra_${Date.now()}`,
    });

    const payment = await PaymentModel.create({
      order: orderObjectId,
      user: new Types.ObjectId(req.userId),
      provider: 'razorpay',
      providerOrderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      status: 'pending',
      paymentMethod: 'razorpay',
      metadata: { razorpayOrder },
    });

    return res.json({
      paymentId: String(payment._id),
      provider: 'razorpay',
      amount,
      currency,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      message: 'Razorpay order created',
    });
  } catch (e) {
    console.error('create-order error', e);
    return res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

router.post('/verify', authToken, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.issues });

  const {
    paymentId,
    status,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderData,
  } = parsed.data;

  try {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const valid = verifyRazorpaySignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
      if (!valid) return res.status(400).json({ error: 'Invalid signature' });
      payment.providerPaymentId = razorpayPaymentId;
      payment.providerSignature = razorpaySignature;
    }

    payment.status = status;
    payment.razorpayOrderId = razorpayOrderId || payment.razorpayOrderId;
    payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || payment.razorpaySignature;

    if (status === 'completed') {
      payment.paidAtIso = new Date().toISOString();
      if (orderData && !payment.order) {
        const order = await OrderModel.create({
          user: new Types.ObjectId(req.userId),
          status: 'paid',
          currency: orderData.currency,
          subtotal: orderData.subtotal,
          shipping: orderData.shipping,
          tax: orderData.tax,
          total: orderData.total,
          items: orderData.items,
          customer: orderData.customer,
          address: orderData.address,
          createdAtIso: new Date().toISOString(),
        });
        payment.order = order._id;
      }
    }

    await payment.save();
    return res.json({ success: true, paymentId: String(payment._id), status: payment.status });
  } catch (e) {
    console.error('verify error', e);
    return res.status(500).json({ error: 'Verify failed' });
  }
});

router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body.toString('utf8');
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).json({ success: false, message: 'Missing signature' });

    const valid = verifyRazorpaySignature({
      razorpayOrderId: '',
      razorpayPaymentId: '',
      razorpaySignature: signature,
      payload,
    });
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const data = JSON.parse(payload);
    const event = data.event;
    const entity = data.payload?.payment?.entity || {};
    const razorpayOrderId = entity.order_id;
    const razorpayPaymentId = entity.id;
    const status = entity.status;

    const payment = await PaymentModel.findOne({ razorpayOrderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (status === 'captured') payment.status = 'completed';
    if (status === 'failed') payment.status = 'failed';

    payment.providerPaymentId = razorpayPaymentId;
    payment.providerSignature = signature;
    await payment.save();
    return res.json({ success: true });
  } catch (e) {
    console.error('webhook error', e);
    return res.status(500).json({ success: false, message: 'Webhook error' });
  }
});

router.get('/methods', async (_req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 'razorpay', name: 'Razorpay', enabled: true },
      { id: 'upi', name: 'UPI', enabled: true },
    ],
  });
});

router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const search = String(req.query.search || '').trim();
    const q = {};
    if (search) q.$or = [{ providerOrderId: new RegExp(search, 'i') }, { providerPaymentId: new RegExp(search, 'i') }];

    const docs = await PaymentModel.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return res.json({ success: true, data: docs });
  } catch (e) {
    console.error('transactions error', e);
    return res.status(500).json({ success: false, message: 'Failed to list transactions' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const rows = await PaymentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('stats error', e);
    return res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

// GET /api/payments/status/:paymentId - Check payment status for polling
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const payment = await PaymentModel.findById(paymentId).lean();
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        status: payment.status,
        providerStatus: payment.providerStatus,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }
    });
  } catch (e) {
    console.error('Payment status error:', e);
    return res.status(500).json({ success: false, message: 'Failed to get payment status', error: e?.message || e });
  }
});

module.exports = router;
