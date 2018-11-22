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
let games = [];
const routes = require('./routes/index')(io);
const users = require('./routes/users')(io);
const host = require('./routes/host')(io, games);
const guest = require('./routes/guest')(io, games);

const Player = require('./player');
const Game = require('./game');



const printGames = () => {
  console.log(JSON.stringify(games, null, 4));
};

const socketIdToGame = (socketId) => {
  let g;
  games.forEach((game, gameIdx) => {
    game.players.forEach((player, playerIdx) => {
      if (player.socketId == socketId) {
        g = game;
      }
    });
  });
  return g;
};

const roomToGame = (room) => {
  games.forEach((game, gameIdx) => {
    if (parseInt(game.partyId) == parseInt(room)) {
      return game;
    }
  });
  return null;
};

io.on('connection', function (socket) {

  console.log('a connection has been made');
  console.log(socket.id); // socketId is the default room the socket is in
  console.log(io.sockets.adapter.rooms);
  socket.on('host-join', data => {
    socket.join(data.partyCode, () => {
      console.log(data);
      const host = new Player(hash(data), socket.id, data.hostName, data.partyCode);
      const g = new Game(host, [host], data.partyCode, data.partyName, []);
      games.push(g);
      games = games.filter(game => Object.keys(io.sockets.adapter.rooms).includes(`${game.partyId}`));
      printGames();
      socket.broadcast.to(data.partyCode).emit('host-join', { message: `a host has joined a room with party code ${data.partyCode}` });
    });
  });
  socket.on('disconnect', _data => {
    let p;
    printGames();
    games.forEach((game, gameIdx) => {
      game.players.forEach((player, playerIdx) => {
        if (player.socketId == socket.id) {
          p = player;
          game.players.splice(playerIdx, 1); // modifies players array in place
          console.log(`removed player ${p.displayName} with socketid ${socket.id} in room ${p.room}`);
        }
      });
    });
    printGames();
    if (p) {
      io.in(p.room).emit('guest-leave', { displayName: p.displayName, room: p.room, socketId: socket.id });
    } else {
      // user left a room but never joined a game
    }
  });
  socket.on('guest-join', data => {
    console.log(data);
    games.forEach((game, gameIdx) => {
      if (parseInt(game.partyId) == parseInt(data.room)) {
        socket.join(data.room); // join the room if there exists a game with this pin code
        // tell all guests that you've arrived
        // socket.broadcast.emit('guest-join', { message: message });
        const guest = new Player(hash(data), socket.id, data.displayName, data.room);
        game.players.push(guest);
        socket.broadcast.to(data.room).emit('guest-join', data);
        console.log('updated the players');
      } else {
        socket.emit('no-game-found', { partyCode: data.room });
      }
    });
  });
  socket.on('get-host-spotify-access-token', data => {
    console.log("a request has been made for the host's spotify token");
    console.log(data);
    socket.broadcast.emit('get-host-spotify-access-token', data);
  });
  socket.on('host-spotify-access-token', data => {
    const room = socketIdToGame(socket.id).partyId;
    console.log("got the host's spotify access token");
    console.log(data);
    // sending access token to all clients except host
    socket.broadcast.to(room).emit('host-spotify-access-token', { token: data.token });
  });
  socket.on('push-queue', data => {
    const room = socketIdToGame(socket.id).partyId;
    console.log('going to render the queue');
    console.log(data);
    io.in(room).emit('push-queue', { payload: data.payload, idx: data.idx });
  });
  socket.on('render-queue', data => {
    console.log(data);
    const game = socketIdToGame(socket.id);
    const room = game.partyId;
    console.log('going to render the queue');
    io.in(room).emit('render-queue');
  });
  socket.on('clear-queue', data => {
    console.log(data);
    const room = socketIdToGame(socket.id).partyId;
    console.log('going to clear the queue');
    io.in(room).emit('clear-queue');
  });
  socket.on('remove-track-from-queue', data => {
    console.log(data);
    const room = socketIdToGame(socket.id).partyId;
    console.log('going to remove a track from the queue');
    io.in(room).emit('remove-track-from-queue', { track: data.track });
  });
  socket.on('update-snackbar', data => {
    console.log(data);
    const room = socketIdToGame(socket.id).partyId;
    console.log('going to update the snackbar');
    io.in(room).emit('update-snackbar', data.message);
  });
  socket.on('update-now-playing', data => {
    console.log(data);
    const room = socketIdToGame(socket.id).partyId;
    console.log('going to update the now playing info');
    io.in(room).emit('update-now-playing', data);
  });
  socket.on('play', () => {
    const room = socketIdToGame(socket.id).partyId;
    console.log('change to play state');
    io.in(room).emit('play');
  });
  socket.on('pause', () => {
    const room = socketIdToGame(socket.id).partyId;
    console.log('change to pause state');
    io.in(room).emit('pause');
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
