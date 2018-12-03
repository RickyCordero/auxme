const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// mongoose.connect(process.env.MONGODB_URI);
// const connection = mongoose.createConnection(process.env.MONGODB_URI);

// User Schema
const UserSchema = mongoose.Schema({
	username: {
		type: String,
		index: true
	},
	password: {
		type: String
	},
	email: {
		type: String
	},
	name: {
		type: String
	},
	profileimage: {
		type: String
	}
}, { usePushEach: true });

// const User = module.exports = mongoose.model('User', UserSchema);
// const User = module.exports = connection.model('User', UserSchema);
mongoose.model('User', UserSchema);

// module.exports = function (connection) {
// module.exports = function () {

// 	// const User = connection.model('User', UserSchema);
// 	const User = mongoose.connection.model('User', UserSchema);

// 	User.getUserById = function (id, callback) {
// 		User.findById(id, callback);
// 	}

// 	User.getUserByUsername = function (username, callback) {
// 		var query = { username: username };
// 		User.findOne(query, callback);
// 	}

// 	User.comparePassword = function (candidatePassword, hash, callback) {
// 		bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
// 			callback(null, isMatch);
// 		});
// 	}

// 	User.createUser = function (newUser, callback) {
// 		bcrypt.genSalt(10, function (err, salt) {
// 			bcrypt.hash(newUser.password, salt, function (err, hash) {
// 				newUser.password = hash;
// 				newUser.save(callback);
// 			});
// 		});
// 	}

// 	return User;
// }

// module.exports.getUserById = function (User, id, callback) {
// 	User.findById(id, callback);
// }

// module.exports.getUserByUsername = function (User, username, callback) {
// 	var query = { username: username };
// 	User.findOne(query, callback);
// }

// module.exports.comparePassword = function (candidatePassword, hash, callback) {
// 	bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
// 		callback(null, isMatch);
// 	});
// }

// module.exports.createUser = function (newUser, callback) {
// 	bcrypt.genSalt(10, function (err, salt) {
// 		bcrypt.hash(newUser.password, salt, function (err, hash) {
// 			newUser.password = hash;
// 			newUser.save(callback);
// 		});
// 	});
// }