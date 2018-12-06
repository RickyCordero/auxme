const mongoose = require('mongoose');

// mongoose.connect(process.env.MONGODB_URI);
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

// User Schema
const PlayerSchema = mongoose.Schema({
	username: {
		type: String,
		index: true
	},
	socketId: {
		type: String
	},
	pin: {
		type: String
	},
	isHost: {
		type: Boolean
	}
}, { usePushEach: true });

// const Player = module.exports = mongoose.model('Player', PlayerSchema);
// const Player = module.exports = connection.model('Player', PlayerSchema);
mongoose.model('Player', PlayerSchema);

// module.exports = function (connection) {
// module.exports = function () {

// 	// const Player = connection.model('Player', PlayerSchema);
// 	const Player = mongoose.connection.model('Player', PlayerSchema);

// 	Player.getPlayerByPin = function (pin, callback) {
// 		const query = { pin: pin };
// 		Player.findOne(query, callback);
// 		// Player.findById(id, callback);
// 	}

// 	Player.getUserByUsername = function (username, callback) {
// 		var query = { username: username };
// 		Player.findOne(query, callback);
// 	}

// 	Player.createPlayer = function (newPlayer, callback) {
// 		newPlayer.save(callback);
// 	}

// 	return Player;
// }

// module.exports.getPlayerByPin = function (Player, pin, callback) {
// 	const query = { pin: pin };
// 	Player.findOne(query, callback);
// 	// Player.findById(id, callback);
// }

// module.exports.getUserByUsername = function (Player, username, callback) {
// 	var query = { username: username };
// 	Player.findOne(query, callback);
// }

// module.exports.createPlayer = function (newPlayer, callback) {
// 	newPlayer.save(callback);
// }