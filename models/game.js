const mongoose = require('mongoose');

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
	},
	pool: {
		type: Array
	}
}, { usePushEach: true });

mongoose.model('Game', GameSchema);