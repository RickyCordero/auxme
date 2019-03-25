const mongoose = require('mongoose');

// User Schema
const GameSchema = mongoose.Schema({
	host: {
		type: String
	},
	name: {
		type: String,
		required: true
	},
	pin: {
		type: String,
		required: true
	},
	guests: {
		type: Array
	},
	queue: {
		type: Array
	},
	pool: {
		type: Array
	}
}, { usePushEach: true });

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;