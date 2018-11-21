const express = require('express');
const socketIO = require('socket.io');

const app = express();

const io = socketIO();
app.io = io;

const hash = require('object-hash');

const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressValidator = require('express-validator');
const multer = require('multer');
const upload = multer({ dest: './uploads' });
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

const mongo = require('mongodb');
const mongoose = require('mongoose');
const db = mongoose.connection; 

// import routes
const routes = require('./routes/index')(io);
const users = require('./routes/users')(io);
const host = require('./routes/host')(io);
const guest = require('./routes/guest')(io);

const Player = require('./player');

let room;
let players = [];

// io.on('connection', function (socket) {
//   console.log('a user has connected in app.js');
// });

io.on('connection', function (socket) {
  console.log('a connection has been made');
  socket.on('host-join', data => {
    room = data.partyCode;
    console.log(data);
    socket.join(room);
    socket.broadcast.to(room).emit('host-join', { message: `a host has joined a room with party code ${room}` });
  });
  socket.on('guest-join', data => {
    console.log(data);
    socket.join(data.room);
    players.push(new Player(hash(data), data.displayName));
    console.log('updated the players');
    console.log(players);
    // tell all guests that you've arrived
    // socket.broadcast.emit('guest-join', { message: message });
    socket.broadcast.to(data.room).emit('guest-join', data);
  });
  socket.on('get-host-spotify-access-token', data => {
    console.log("a request has been made for the host's spotify token");
    console.log(data);
    socket.broadcast.emit('get-host-spotify-access-token');
  });
  socket.on('host-spotify-access-token', data => {
    console.log("got the host's spotify access token");
    console.log(data);
    // sending access token to all clients except host
    socket.broadcast.to(room).emit('host-spotify-access-token', { token: data.token });
  });
  socket.on('push-queue', data => {
    console.log('going to render the queue');
    console.log(data);
    io.emit('push-queue', {payload: data.payload, idx: data.idx});
  });
  socket.on('render-queue', data => {
    console.log('going to render the queue');
    // console.log(data);
    io.emit('render-queue');
  });
  socket.on('clear-queue', data => {
    console.log('going to clear the queue');
    // console.log(data);
    io.emit('clear-queue');
  });
  socket.on('remove-track-from-queue', data => {
    console.log('going to remove a track from the queue');
    console.log(data);
    io.emit('remove-track-from-queue', {track: data.track});
  });  
  socket.on('update-snackbar', data => {
    console.log('going to update the snackbar');
    console.log(data);
    io.emit('update-snackbar', data.message);
  });
  socket.on('update-now-playing', data => {
    console.log('going to update the now playing info');
    console.log(data);
    io.emit('update-now-playing', data);
  });
  socket.on('play', () => {
    console.log('change to play state');
    io.emit('play');
  });
  socket.on('pause', () => {
    console.log('change to pause state');
    io.emit('pause');
  });

});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Handle Sessions
app.use(session({
  secret: 'secret',
  saveUninitialized: true, // should this be false?
  resave: true // should this be false?
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

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

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('*', function (req, res, next) {
  res.locals.user = req.user || null;
  next();
});

// configure router for app
app.use('/', routes);
app.use('/users', users);
app.use('/host', host);
app.use('/guest', guest);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
