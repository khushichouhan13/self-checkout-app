import Product from '../models/Product.js';

// @desc    Get product by barcode or QR code
// @route   GET /api/products/barcode/:barcode
// @access  Private
export const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ barcode: barcode.trim() });

    if (product) {
      res.json(product);
    } else {
      res.status(404);
      return next(new Error(`Product with barcode '${barcode}' not found in database`));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private (Both Admin and standard customers can view)
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  try {
    const { name, price, barcode, image, stock } = req.body;

    // Check if barcode already exists
    const barcodeExists = await Product.findOne({ barcode });
    if (barcodeExists) {
      res.status(400);
      return next(new Error('Product with this barcode already exists'));
    }

    const product = await Product.create({
      name,
      price,
      barcode,
      image: image || undefined,
      stock: stock || 0,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  try {
    const { name, price, barcode, image, stock } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price !== undefined ? price : product.price;
      product.barcode = barcode || product.barcode;
      product.image = image !== undefined ? image : product.image;
      product.stock = stock !== undefined ? stock : product.stock;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Product removed successfully' });
    } else {
      res.status(404);
      return next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Scan product barcode and return product
// @route   POST /api/products/scan
// @access  Private
export const scanProduct = async (req, res, next) => {
  try {
    const { barcode } = req.body;

    const product = await Product.findOne({ barcode });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
