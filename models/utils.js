const bcrypt = require('bcryptjs');
// ------------------------------------------------------------------------
// Game model functions
// ------------------------------------------------------------------------
module.exports.getGameByPin = function (Game, pin, callback) {
    const query = { pin: pin }
    Game.findOne(query, callback);
}

module.exports.getGameByHostname = function (Game, hostname, callback) {
    const query = { hostname: hostname };
    Game.findOne(query, callback);
}

module.exports.getGameByHostSocketId = function (Game, socketId, callback) {
    const query = { socketId: socketId };
    Game.findOne(query, callback);
}

module.exports.getGameByName = function (Game, name, callback) {
    const query = { name: name };
    Game.find(query, callback);
}

module.exports.createGame = function (newGame, callback) {
    newGame.save(callback);
}

module.exports.deleteGame = function (game, callback) {
    game.deleteOne(game, callback);
}

// ------------------------------------------------------------------------
// Playlist model functions
// ------------------------------------------------------------------------
module.exports.getPlaylistByName = function (Playlist, name, callback) {
    const query = { name: name };
    Playlist.findOne(query, callback);
    // Playlist.findById(id, callback);
}

module.exports.getPlaylistsByHostname = function (Playlist, hostname, callback) {
    var query = { hostname: hostname };
    Playlist.find(query, callback);
}

module.exports.createPlaylist = function (newPlaylist, callback) {
    newPlaylist.save(callback);
}

// ------------------------------------------------------------------------
// Track model functions
// ------------------------------------------------------------------------
module.exports.getTrackByUri = function (Track, uri, callback) {
    const query = { uri: uri };
    Track.findOne(query, callback);
    // Track.findById(uri, callback);
}

module.exports.getTrackByName = function (Track, name, callback) {
    var query = { name: name };
    Track.find(query, callback);
}

module.exports.createTrack = function (newTrack, callback) {
    newTrack.save(callback);
}

// ------------------------------------------------------------------------
// Player model functions
// ------------------------------------------------------------------------
module.exports.getPlayerByPin = function (Player, pin, callback) {
    const query = { pin: pin };
    Player.findOne(query, callback);
    // Player.findById(id, callback);
}

module.exports.getPlayerBySocketId = function (Player, socketId, callback) {
    const query = { socketId: socketId };
    Player.findOne(query, callback);
}

module.exports.getPlayerByUsername = function (Player, username, callback) {
    var query = { username: username };
    Player.findOne(query, callback);
}

module.exports.createPlayer = function (newPlayer, callback) {
    newPlayer.save(callback);
}

// ------------------------------------------------------------------------
// User model functions
// ------------------------------------------------------------------------
module.exports.getUserById = function (User, id, callback) {
    User.findById(id, callback);
}

module.exports.getUserByUsername = function (User, username, callback) {
    var query = { username: username };
    User.findOne(query, callback);
}

module.exports.comparePassword = function (candidatePassword, hash, callback) {
    bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
        callback(null, isMatch);
    });
}

module.exports.createHost = function (newHost, callback) {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newHost.password, salt, (err, hash) => {
            if (err) {
                throw err;
            } else {
                // Set password to hash of password
                newHost.password = hash;
                // Save host
                newHost.save(callback);
            }
        });
    });
}
