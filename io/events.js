const socketIO = require('socket.io');
const io = socketIO();
const utils = require('../models/utils');

const Game = require('../models/Game');
const Host = require('../models/Host');
const Player = require('../models/Player');

module.exports = socket => {

	console.log('a socket has connected to the server');
	// console.log(socket.id); // socketId is the default room the socket is in
	// console.log(io.sockets.adapter.rooms);
	socket.on('host-join', data => {
		socket.join(data.pin, () => {
			// console.log(data);
			// console.log(`host joined room ${data.pin}`);
			// io.in(data.pin).emit('host-join', { message: `a host has joined a room with party code ${data.pin}` });
			// io.emit('host-join', { message: `a host has joined a room with party code ${data.pin}` });
			socket.emit('host-join', { message: `a host has joined a room with party code ${data.pin}` });
		});
	});
	// socket.on('disconnect', _data => {
	//   console.log(_data);
	//   utils.getPlayerBySocketId(Player, socket.id, (err, player) => {
	//     if (err) {
	//       console.log(`yo, there was an error getting the player with socketId ${socket.id}`);
	//       console.log(err);
	//     } else {
	//       console.log(`yo, a player was found with socketId ${socket.id}`);
	//       console.log(player);
	//       utils.getGameByPin(Game, player.pin, (err, game) => {
	//         if (err) {
	//           console.log(`yo, there was an error finding the game with pin ${player.pin}`);
	//         } else {
	//           console.log(`found a game with pin ${player.pin}`);
	//           game.players = game.players.filter(p => p.socketId !== socket.id);
	//           game.save(function (err) {
	//             if (err) {
	//               console.log('yo, there was an error removing a guest from the game database');
	//               console.log(err);
	//             } else {
	//               console.log('removed a player successfully from the game database');
	//               // socket.broadcast.to(data.pin).emit('guest-join', data);
	//               io.in(player.pin).emit('guest-leave', { username: player.username, room: player.pin, socketId: socket.id });
	//             }
	//           });
	//         }
	//       })
	//     }
	//   });
	// });
	socket.on('guest-join', data => {
		if (parseInt(data.pin)) {
			utils.getGameByPin(Game, data.pin, (err, game) => {
				if (err) {
					console.log(`yo, there was an error finding the game with pin ${data.pin}`)
					socket.emit('no-game-found', { pin: data.pin });
				} else {
					if (game) {
						const guest = new Player({
							username: data.username,
							socketId: socket.id,
							pin: data.pin,
							isHost: false
						});
						if (game.players.some(x => x.socketId == guest.socketId)) {
							console.log('there already exists a player with this socketId, not adding to database');
							socket.emit('already-in-game', { message: `already in room ${data.pin}` });
						} else {
							utils.createPlayer(guest, (err, player) => {
								if (err) {
									console.log('yo, there was an error creating a guest player');
								} else {
									console.log('created the guest player successfully');
									game.players.push(guest);
									game.save(function (err) {
										if (err) {
											console.log('yo, there was an error adding a guest to the game database');
											console.log(err);
										} else {
											console.log('updated the players successfully in the game database');
											socket.join(data.pin, () => {
												socket.broadcast.to(data.pin).emit('guest-join', data);
											});
										}
									});
								}
							});
						}
					} else {
						console.log('game was null');
					}
				}
			});
		} else {
			socket.emit('no-game-found', { pin: data.pin });
		}
	});
	socket.on('get-host-spotify-access-token', data => {
		console.log("a request has been made for the host's spotify token");
		// console.log(data);
		const room = data.pin;
		socket.broadcast.to(room).emit('get-host-spotify-access-token', data);
	});
	socket.on('host-spotify-access-token', data => {
		// console.log(data);
		const room = data.pin;
		console.log("got the host's spotify access token");
		// sending access token to all clients except host
		socket.broadcast.to(room).emit('host-spotify-access-token', { token: data.token });
	});
	socket.on('push-queue', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to push to the queue');
		// io.in(room).emit('push-queue', { payload: data.payload, idx: data.idx });
		socket.emit('push-queue', { payload: data.payload, idx: data.idx });
	});
	socket.on('render-queue', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to render the queue');
		// io.in(room).emit('render-queue');
		socket.emit('render-queue');
	});
	socket.on('render-pool', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to render the pool');
		// io.in(room).emit('render-pool');
		socket.emit('render-pool');
	});
	socket.on('clear-queue', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to clear the queue');
		// io.in(room).emit('clear-queue');
		socket.emit('clear-queue');
	});
	socket.on('remove-track-from-queue', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to remove a track from the queue');
		socket.emit('remove-track-from-queue', { track: data.track });
	});
	socket.on('remove-track-from-pool', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to remove a track from the pool');
		// io.in(room).emit('remove-track-from-pool', { track: data.track });
		socket.emit('remove-track-from-pool', { track: data.track });
	});
	socket.on('update-snackbar', data => {
		console.log(data);
		const room = data.pin;
		console.log('going to update the snackbar');
		// io.in(room).emit('update-snackbar', data.message);
		socket.emit('update-snackbar', data.message);
	});
	socket.on('update-now-playing', data => {
		// console.log(data);
		const room = data.pin;
		// console.log('going to update the now playing info');
		// io.in(room).emit('update-now-playing', data);
		socket.emit('update-now-playing', data);
	});
	socket.on('get-now-playing', data => {
		// console.log(data);
		const room = data.pin;
		console.log('going to send the now playing info');
		// io.in(room).emit('get-now-playing', data);
		socket.emit('get-now-playing', data);
	});
	socket.on('play', data => {
		// console.log(data);
		const room = data.pin;
		console.log('changed to play state');
		// io.in(room).emit('play');
		socket.emit('play');
	});
	socket.on('pause', data => {
		// console.log(data);
		const room = data.pin;
		console.log('changed to pause state');
		// io.in(room).emit('pause');
		socket.emit('pause');
	});

}