const mongoose = require('mongoose');

// Host Schema
const HostSchema = mongoose.Schema({
	name: {
		type: String
	},
	email: {
		type: String
	},
	username: {
		type: String,
		index: true
	},
	password: {
		type: String
	},
	role: {
		type: String,
		default: "host"
	},
	spotify: {
		type: Object
	}
}, { usePushEach: true });

const Host = mongoose.model('Host', HostSchema);

module.exports = Host;