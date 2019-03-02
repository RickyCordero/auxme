const mongoose = require('mongoose');

// User Schema
const TrackSchema = mongoose.Schema({
	artists: {
		type: String,
		index: true
	},
	name: {
		type: String
	},
	minutes: {
		type: String
	},
	seconds: {
		type: String
	},
	uri: {
		type: String
	},
	imageUrl: {
		type: String
	},
	votes: {
		type: Number
	},
	votedBy: {
		type: Array
	}
}, { usePushEach: true });

mongoose.model('Track', TrackSchema);