// Server modules
const express = require('express');
const socketIO = require('socket.io');
const app = express();
const io = socketIO();
app.io = io;

// Utilities
const hash = require('object-hash');

// Middleware
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

// Database modules
const mongo = require('mongodb');
const mongoose = require('mongoose');
const utils = require('./models/utils');
// const db = mongoose.connection;
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

require('./models/game');
require('./models/playlist');
require('./models/track');
require('./models/player');
require('./models/user');

const Game = mongoose.model("Game");
const Playlist = mongoose.model("Playlist");
const Track = mongoose.model("Track");
const Player = mongoose.model("Player");
const User = mongoose.model("User");

mongoose.connect(process.env.MONGODB_URI, {
  useCreateIndex: true,
  useNewUrlParser: true
});

// Mongoose models
// const models = {
//   Game: require('./models/game')(connection),
//   Playlist: require('./models/playlist')(connection),
//   Track: require('./models/track')(connection),
//   Player: require('./models/player')(connection),
//   User: require('./models/user')(connection)
// };

// const models = {
//   Game: require('./models/game')(),
//   Playlist: require('./models/playlist')(),
//   Track: require('./models/track')(),
//   Player: require('./models/player')(),
//   User: require('./models/user')()
// };

// const Game = models.Game;
// const Playlist = models.Playlist;
// const Track = models.Track;
// const Player = models.Player;
// const User = models.User;

// Express routes
const routes = require('./routes/index')(io);
const users = require('./routes/users')(io);
const host = require('./routes/host')(io);
const guest = require('./routes/guest')(io);

// MongoDB collections
const gamesCollection = "games";
const playersCollection = "players";
const playlistsCollection = "playlists";
const tracksCollection = "tracks";


// MongoDB functions -----------------------------------------------

/**
 * Finds documents in a MongoDB database given a query object and
 * the MongoDB collection in which the documents should be found,
 * and returns an array of  all results.
 * @param {MongoDB Database} db - The MongoDB database to be searched
 * @param {Object} query - The query object
 * @param {String} collection - The collection name
 */
function findDocuments(db, query, collection) {
  const coll = db.collection(collection);
  return coll.find(query).toArray();
}

function insertDocument(db, document, collection) {
  const coll = db.collection(collection); // get the collection from the database
  return coll.insert(document); // return promise
}

function getAllDocuments(db, collection) {
  const coll = db.collection(collection); // get the collection from the database
  return coll.find({}).toArray(); // return promise
  // return findDocuments(db, {}, collection);
}

function removeDocument(db, document, collection) {
  const coll = db.collection(collection); // get the collection from the database
  return coll.deleteOne(document); // return promise
}

function removeAllDocuments(db, collection) {
  const coll = db.collection(collection);
  return coll.remove({});
}

function updateDocument(db, document, update, collection) {
  const coll = db.collection(collection); // get the collection from the database
  return coll.updateOne(document, { $set: update }, null); // return promise
}

// --------------------------------------------------------------------------------


// Socket.io --------------------------------------------------------------------------

io.on('connection', function (socket) {

  console.log('a socket has connected to the server');
  // console.log(socket.id); // socketId is the default room the socket is in
  // console.log(io.sockets.adapter.rooms);
  socket.on('host-join', data => {
    console.log(data);
    socket.join(data.pin, () => {
      const host = new Player({
        username: data.hostName,
        pin: data.pin
      });

      // Player.createPlayer(host, (err, player) => {
      //   if (err) console.log(err);
      //   console.log(player);
      // });

      const newGame = new Game({
        hostname: data.hostName,
        name: data.partyName,
        pin: data.pin,
        queue: [],
        players: [host]
      });

      utils.createGame(newGame, (err, game) => {
        if (err) {
          console.log('yo, there was an error creating a game');
          console.log(err);
        } else {
          console.log('created the game successfully');
          console.log("This is the game object:");
          console.log(game);
          console.log(typeof (game));
        }
      });

      // Game.getGameByPin(data.pin, (err, game) => {

      //   console.log('here is the error');
      //   console.log(err);

      //   if (err) {
      //     console.log(`yo, there was an error finding the game with pin ${data.pin}`)
      //     // socket.emit('no-game-found', { pin: data.pin });
      //   } else {
      //     console.log('here is the game object');
      //     console.log(game);
      //     console.log(typeof (game));
      //     console.log('here is the game queue');
      //     console.log(game.queue);
      //     console.log(typeof (game.queue));
      //   }
      // });

      socket.broadcast.to(data.pin).emit('host-join', { message: `a host has joined a room with party code ${data.pin}` });
    });
  });
  socket.on('disconnect', _data => {
    // let p;
    // games.forEach((game, gameIdx) => {
    //   game.players.forEach((player, playerIdx) => {
    //     if (player.socketId == socket.id) {
    //       p = player;
    //       game.players.splice(playerIdx, 1); // modifies players array in place
    //       console.log(`removed player ${p.displayName} with socketid ${socket.id} in room ${p.room}`);
    //     }
    //   });
    // });
    // if (p) {
    //   io.in(p.room).emit('guest-leave', { displayName: p.displayName, room: p.room, socketId: socket.id });
    // } else {
    //   // user left a room but never joined a game
    // }
  });
  socket.on('guest-join', data => {
    console.log(data);
    socket.join(data.pin, () => {
      utils.getGameByPin(Game, data.pin, (err, game) => {
        if (err) {
          console.log(`yo, there was an error finding the game with pin ${data.pin}`)
          socket.emit('no-game-found', { pin: data.pin });
        } else {
          const guest = new Player({
            username: data.displayName,
            pin: data.pin
          });
          game.players.push(guest);
          game.save(function (err) {
            if (err) {
              console.log('yo, there was an error adding a guest to the game database');
              console.log(err);
            } else {
              console.log('updated the players successfully in the game database');
              socket.broadcast.to(data.pin).emit('guest-join', data);
            }
          });
        }
      });
    });
  });
  socket.on('get-host-spotify-access-token', data => {
    console.log("a request has been made for the host's spotify token");
    console.log(data);
    const room = data.pin;
    socket.broadcast.to(room).emit('get-host-spotify-access-token', data);
  });
  socket.on('host-spotify-access-token', data => {
    console.log(data);
    const room = data.pin;
    console.log("got the host's spotify access token");
    // sending access token to all clients except host
    socket.broadcast.to(room).emit('host-spotify-access-token', { token: data.token });
  });
  socket.on('push-queue', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to push to the queue');
    io.in(room).emit('push-queue', { payload: data.payload, idx: data.idx });
  });
  socket.on('render-queue', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to render the queue');
    io.in(room).emit('render-queue');
  });
  socket.on('clear-queue', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to clear the queue');
    io.in(room).emit('clear-queue');
  });
  socket.on('remove-track-from-queue', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to remove a track from the queue');
    io.in(room).emit('remove-track-from-queue', { track: data.track });
  });
  socket.on('update-snackbar', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to update the snackbar');
    io.in(room).emit('update-snackbar', data.message);
  });
  socket.on('update-now-playing', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to update the now playing info');
    io.in(room).emit('update-now-playing', data);
  });
  socket.on('get-now-playing', data => {
    console.log(data);
    const room = data.pin;
    console.log('going to send the now playing info');
    io.in(room).emit('get-now-playing', data);
  });
  socket.on('play', data => {
    console.log(data);
    const room = data.pin;
    console.log('changed to play state');
    io.in(room).emit('play');
  });
  socket.on('pause', data => {
    console.log(data);
    const room = data.pin;
    console.log('changed to pause state');
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
