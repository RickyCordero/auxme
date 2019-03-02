const mongoose = require('mongoose');

// User Schema
const PlaylistSchema = mongoose.Schema({
	hostname: {
		type: String,
		index: true
	},
	name: {
		type: String
	},
	tracks: {
		type: Array
	}
}, { usePushEach: true });

mongoose.model('Playlist', PlaylistSchema);