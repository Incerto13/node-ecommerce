const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
// Stripe test-mode keys come from the environment (app.env / k8s Secret).
const STRIPE_SECRET_KEY = process.env.stripe_API_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const stripe = require('stripe')(STRIPE_SECRET_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 6;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render('shop/product-detail', {
        pageTitle: product.title,
        product,
        path: '/products'
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect('/cart');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      let total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products,
        totalSum: total,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  // Payment token created by Stripe Checkout on the checkout page.
  const token = req.body.stripeToken;
  let totalSum = 0;
  let products;

  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then((user) => {
      user.cart.items.forEach((p) => {
        totalSum += p.quantity * p.productId.price;
      });
      products = user.cart.items.map((i) => ({ quantity: i.quantity, product: { ...i.productId._doc } }));
      if (!STRIPE_SECRET_KEY) {
        throw new Error('Payments are not configured (stripe_API_KEY is not set).');
      }
      // Charge FIRST and await it. This used to be a fire-and-forget async call:
      // any Stripe error became an unhandled rejection and killed the process.
      return stripe.charges.create({
        amount: Math.round(totalSum * 100),
        currency: 'usd',
        description: 'Demo Order',
        source: token,
      });
    })
    .then((charge) => {
      const order = new Order({
        user: { email: req.user.email, userId: req.user },
        products,
      });
      return order.save().then((saved) => stripe.charges
        .update(charge.id, { metadata: { order_id: saved._id.toString() } })
        .catch(() => {}) // metadata is nice-to-have only
        .then(() => saved));
    })
    .then(() => req.user.clearCart())
    .then(() => res.redirect('/orders'))
    .catch((err) => {
      console.log(`[checkout] ${err.type || 'Error'}: ${err.message}`);
      const error = new Error(err.message);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then((orders) => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params;
  Order.findById(orderId).then((order) => {
    if (!order) {
      return next(new Error('No order found.'));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error('Unauthorized'));
    }
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const pdfDoc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('Invoice', {
      underline: true
    });

    pdfDoc.text('-------------------------------');
    let totalPrice = 0;
    order.products.forEach((prod) => {
      totalPrice += prod.quantity * prod.product.price;
      pdfDoc.fontSize(14)
        .text(
          prod.product.title
          + ' - '
          + prod.quantity
          + ' x '
          + ' $ '
          + prod.product.price
        );
    });
    pdfDoc.text('----------');
    pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

    pdfDoc.end();

    // ** Note pre-loading files like this below is bad practice ~ blocking/memory
    // fs.readFile(invoicePath, (err, data) => {
    //   if (err) {
    //     return next(err);
    //   }
    //   res.setHeader('Content-Type', 'application/pdf');
    //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
    //   res.send(data);
    // });
    // const file = fs.createReadStream(invoicePath);
    // file.pipe(res);
  })
    .catch(err => next(err));
};
