import Order from '../models/Order.js';

// @desc    Get logged-in user orders
// @route   GET /api/orders/me
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
      // Access control: Ensure user owns the order, or user is an admin
      const isOwner = order.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (isOwner || isAdmin) {
        res.json(order);
      } else {
        res.status(403);
        return next(new Error('Access Denied: You are not authorized to view this receipt'));
      }
    } else {
      res.status(404);
      return next(new Error('Invoice/Order not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};
