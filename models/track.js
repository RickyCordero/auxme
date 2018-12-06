const mongoose = require('mongoose');

// mongoose.connect(process.env.MONGODB_URI);
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

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

// const Track = module.exports = mongoose.model('Track', TrackSchema);
// const Track = module.exports = connection.model('Track', TrackSchema);
mongoose.model('Track', TrackSchema);


// module.exports = function (connection) {
// module.exports = function () {

// 	// const Track = connection.model('Track', TrackSchema);
// 	const Track = mongoose.connection.model('Track', TrackSchema);

// 	Track.getTrackByUri = function (uri, callback) {
// 		const query = { uri: uri };
// 		Track.findOne(query, callback);
// 		// Track.findById(uri, callback);
// 	}

// 	Track.getTrackByName = function (name, callback) {
// 		var query = { name: name };
// 		Track.find(query, callback);
// 	}

// 	Track.createTrack = function (newTrack, callback) {
// 		newTrack.save(callback);
// 	}

// 	return Track;
// }

// module.exports.getTrackByUri = function (Track, uri, callback) {
// 	const query = { uri: uri };
// 	Track.findOne(query, callback);
// 	// Track.findById(uri, callback);
// }

// module.exports.getTrackByName = function (Track, name, callback) {
// 	var query = { name: name };
// 	Track.find(query, callback);
// }

// module.exports.createTrack = function (newTrack, callback) {
// 	newTrack.save(callback);
// }