import Razorpay from 'razorpay';
import crypto from 'crypto';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// @desc    Create Razorpay Order from backend
// @route   POST /api/payments/order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty, cannot place an order' });
    }

    // Always re-calculate total from DB prices (prevents client price hijacking)
    let totalAmount = 0;
    const itemsToVerify = [];

    for (const item of items) {
      const dbProduct = await Product.findById(item.product);

      if (!dbProduct) {
        return res.status(404).json({ message: `Product '${item.name || item.product}' not found` });
      }

      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stock}`
        });
      }

      totalAmount += dbProduct.price * item.quantity;
      itemsToVerify.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: item.quantity,
      });
    }

    // Convert INR to paise (Razorpay expects subunits)
    const amountInPaise = Math.round(totalAmount * 100);

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ message: 'Computed order amount is invalid' });
    }

    // Initialize Razorpay here so env vars are guaranteed to be loaded
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(201).json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      calculatedItems: itemsToVerify,
    });

  } catch (error) {
    console.error("RAZORPAY ORDER ERROR:", error);
    return res.status(500).json({
      message: "Order creation failed",
      error: error.error?.description || error.message || 'Unknown error',
    });
  }
};

// @desc    Verify Razorpay payment signature & commit order
// @route   POST /api/payments/verify
// @access  Private
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items, // array of { product, name, price, quantity }
    } = req.body;

    if (!razorpay_order_id || !items) {
      res.status(400);
      return next(new Error('Missing transaction verification arguments'));
    }

    // 1. Authenticate payment signature via SHA256 HMAC (Skip if running mock key & mock signature for easy UI simulation)
    const isMockSetup = (process.env.RAZORPAY_KEY_ID || '').trim() === 'rzp_test_mockKeyId123';
    const isMockSignature = razorpay_signature === 'mock_signature_approved';

    if (!(isMockSetup && isMockSignature)) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        res.status(400);
        return next(new Error('Security Verification Failed: Payment signature tampered'));
      }
    }

    // 2. Finalize stock reduction and calculate total
    let finalAmount = 0;
    const finalItems = [];

    for (const item of items) {
      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        res.status(404);
        return next(new Error(`Transaction committed, but product '${item.name}' not found in DB`));
      }

      // Check stock again
      if (dbProduct.stock < item.quantity) {
        res.status(400);
        return next(
          new Error(`Transaction aborted: '${dbProduct.name}' went out of stock during checkout`)
        );
      }

      // Decrement stock in database
      dbProduct.stock -= item.quantity;
      await dbProduct.save();

      finalAmount += dbProduct.price * item.quantity;
      finalItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: item.quantity,
      });
    }

    // 3. Create paid order log inside MongoDB
    const completedOrder = await Order.create({
      user: req.user._id,
      items: finalItems,
      totalAmount: parseFloat(finalAmount.toFixed(2)),
      paymentStatus: 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id || 'mock_pay_id_999',
    });

    res.status(201).json({
      success: true,
      message: 'Payment verification succeeded! Order registered.',
      order: completedOrder,
    });
  } catch (error) {
    console.error('[Payment Verification Error]:', error);
    next(new Error(`Transaction verification failed: ${error.message}`));
  }
};
