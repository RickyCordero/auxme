const mongoose = require('mongoose');

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

mongoose.model('Player', PlayerSchema);