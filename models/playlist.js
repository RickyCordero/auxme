const mongoose = require('mongoose');

// mongoose.connect(process.env.MONGODB_URI);
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

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

// const Playlist = module.exports = mongoose.model('Playlist', PlaylistSchema);
// const Playlist = module.exports = connection.model('Playlist', PlaylistSchema);
mongoose.model('Playlist', PlaylistSchema);

// module.exports = function (connection) {
// module.exports = function () {

// 	// const Playlist = connection.model('Playlist', PlaylistSchema);
// 	const Playlist = mongoose.connection.model('Playlist', PlaylistSchema);

// 	Playlist.getPlaylistByName = function (name, callback) {
// 		const query = { name: name };
// 		Playlist.findOne(query, callback);
// 		// Playlist.findById(id, callback);
// 	}

// 	Playlist.getPlaylistsByHostname = function (hostname, callback) {
// 		var query = { hostname: hostname };
// 		Playlist.find(query, callback);
// 	}

// 	Playlist.createPlaylist = function (newPlaylist, callback) {
// 		newPlaylist.save(callback);
// 	}
// 	return Playlist;
// }

// module.exports.getPlaylistByName = function (Playlist, name, callback) {
// 	const query = { name: name };
// 	Playlist.findOne(query, callback);
// 	// Playlist.findById(id, callback);
// }

// module.exports.getPlaylistsByHostname = function (Playlist, hostname, callback) {
// 	var query = { hostname: hostname };
// 	Playlist.find(query, callback);
// }

// module.exports.createPlaylist = function (newPlaylist, callback) {
// 	newPlaylist.save(callback);
// }