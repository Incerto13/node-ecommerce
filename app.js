const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const debug = require('debug')('app');
const chalk = require('chalk');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./src/controllers/error');
const shopController = require('./src/controllers/shop');
const isAuth = require('./src/middleware/is-auth');
const User = require('./src/models/user');

const MONGODB_URI = 'mongodb://localhost/nodeEcommerce';

const port = process.env.PORT || 3000;
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png'
    || file.mimetype === 'image/jpg'
    || file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', './src/views');

const adminRoutes = require('./src/routes/admin');
const shopRoutes = require('./src/routes/shop');
const authRoutes = require('./src/routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// secret should be a long string in production
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store,
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      // just throwing an error won't work in async code, need next()
      next(new Error(err));
    });
});

// must come before csrf middleware bc Stripe has its own token secury, not compatible
app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes); // this needs to comme after adminRoutes
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404); // catch-all middleware

// global error-handler
app.use((error, req, res, next) => {
  // res.redirect('/500');
  console.log(error);
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

const db = mongoose
  .connect(MONGODB_URI, {
    useCreateIndex: true,
    useNewUrlParser: true
  })
  .then((result) => {
    app.listen(port, () => {
      debug(`listening on port ${chalk.green(port)}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
