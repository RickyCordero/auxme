const mongoose = require('mongoose');

// mongoose.connect(process.env.MONGODB_URI);
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

// User Schema
const GameSchema = mongoose.Schema({
	hostname: {
		type: String,
		index: true
	},
	name: {
		type: String
	},
	pin: {
		type: String
	},
	queue: {
		type: Array
	},
	players: {
		type: Array
	}
}, { usePushEach: true });

// const Game = module.exports = mongoose.model('Game', GameSchema);
// const Game = module.exports = connection.model('Game', GameSchema);
mongoose.model('Game', GameSchema);

// module.exports = function (connection) {
// module.exports = function () {

// 	// const Game = connection.model('Game', GameSchema);
// 	const Game = mongoose.connection.model('Game', GameSchema);

// 	Game.getGameByPin = function (pin, callback) {
// 		const query = { pin: pin };
// 		Game.findOne(query, callback);
// 		// Game.findById(id, callback);
// 	}

// 	Game.getGameByHostname = function (hostname, callback) {
// 		const query = { hostname: hostname };
// 		Game.findOne(query, callback);
// 	}

// 	Game.getGameByName = function (name, callback) {
// 		const query = { name: name };
// 		Game.find(query, callback);
// 	}

// 	Game.createGame = function (newGame, callback) {
// 		newGame.save(callback);
// 	}

// 	return Game;
// }

// module.exports.getGameByPin = function (Game, pin, callback) {
// 	const query = { pin: pin }
// 	Game.findOne(query, callback);
// 	// Game.findById(id, callback);
// }

// module.exports.getGameByHostname = function (Game, hostname, callback) {
// 	var query = { hostname: hostname };
// 	Game.findOne(query, callback);
// }

// module.exports.getGameByName = function (Game, name, callback) {
// 	var query = { name: name };
// 	Game.find(query, callback);
// }

// module.exports.createGame = function (newGame, callback) {
// 	newGame.save(callback);
// }