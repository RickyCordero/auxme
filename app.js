// Server modules
const express = require('express');
const socketIO = require('socket.io');
const app = express();
const io = socketIO();

app.io = io;

// Middleware
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const expressValidator = require('express-validator');

// Validator
app.use(expressValidator({
  errorFormatter: function (param, msg, value) {
    var namespace = param.split('.')
      , root = namespace.shift()
      , formParam = root;

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param: formParam,
      msg: msg,
      value: value
    };
  }
}));
// Passport config
require('./config/passport')(passport);

// Database
const mongoose = require('mongoose');
const MONGODB_URI = require('./config/key').MONGODB_URI;
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Socket.io
const ioEventsHandler = require('./io/events');
io.on('connection', ioEventsHandler);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Expose the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Bodyparser
// allows us to get data from our form using request.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Express Session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
// allows us to use request.flash
// must be set before setting locals middleware
app.use(flash());

// Express Messages
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// // Get access to user model
// app.get('*', function (req, res, next) {
//   // res.locals.user = req.user || null;
//   res.locals.user = req.user || null;
//   next();
// });


app.use((req, res, next) => {
  // res.locals.user = req.user;
  res.locals.req = req;
  next();
});



app.use(cookieParser());

// Routes
app.use('/', require('./routes/index'));
app.use('/host', require('./routes/host'));
app.use('/guest', require('./routes/guest'));

// // catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });

// handle non-existant routes
app.use((req, res, next) => {
  res.redirect('/');
});

// Favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));

// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function (err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function (err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });
app.disable('x-powered-by');

module.exports = app;
