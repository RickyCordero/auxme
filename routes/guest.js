const express = require('express');
const router = express.Router();

const passport = require('passport');

// Database utils
const utils = require('../models/utils');

const { ensureAuthenticated, ensureGuestAuthenticated } = require('../config/auth');

const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

// Mongoose models
const Game = require('../models/Game');
const Track = require('../models/Track');
const Guest = require('../models/Guest');

// guest join page
router.get('/join', function (req, res) {
    res.render('guestJoin');
});

// guest register page
router.get('/signup', (req, res) => {
    res.render('guestSignup');
});

// // guest joining a room
// router.get('/username/:username/pin/:pin', function (req, res, next) {
//     const username = req.params.username;
//     const pin = req.params.pin;
//     utils.getGameByPin(Game, pin, (err, game) => {
//         if (err) {
//             res.render('join', {
//                 errors: [`no game was found with pin ${pin}`]
//             });
//             // console.log(`yo, there was an error finding the game with pin ${pin}`);
//             // console.log(err);
//         } else {
//             if (game.players.some(player => player.username == username)) {
//                 res.render('join', {
//                     errors: [`there already exists a player with name ${username}`]
//                 });
//                 // console.log(`there already exists a player with name ${username}`);
//             } else {
//                 if (game) {
//                     const guest = new Player({
//                         username: username,
//                         pin: pin,
//                         isHost: false
//                     });
//                     utils.createPlayer(guest, (err, player) => {
//                         if (err) {
//                             console.log('yo, there was an error creating a guest player');
//                         } else {
//                             console.log('created the guest player successfully');
//                             game.players.push(guest);
//                             game.save(function (err) {
//                                 if (err) {
//                                     console.log('yo, there was an error adding a guest to the game database');
//                                     console.log(err);
//                                 } else {
//                                     console.log('updated the players successfully in the game database');
//                                     // TODO: Figure out how to update the players
//                                     socket.join(pin, () => {
//                                         socket.broadcast.to(pin).emit('guest-join');
//                                     });
//                                 }
//                             });
//                         }
//                     });
//                 } else {
//                     console.log('game was null');
//                 }

//                 res.render('guest', { username: username, pin: pin });
//             }
//         }
//     });
// });

function isValidName(name) {
    // Make sure it 
    return true;
}

function isValidPin(pin) {
    // 
    return true;
}

router.post('/signup', (req, res) => {
    const { name, pin } = req.body;

    // Form Validator
    req.checkBody('name', 'Name field is required').notEmpty();
    req.checkBody('pin', 'Pin field is required').notEmpty();

    // TODO: Sanitize name and pin fields
    // Check required fields
    // if (!isValidName(name)) {
    //     errors.push({ msg: 'Invalid name' });
    // }
    // // Check required fields
    // if (!isValidPin(pin)) {
    //     errors.push({ msg: 'Invalid pin' });
    // }

    // Check Errors
    const formErrors = req.validationErrors();

    if (formErrors) {
        res.render('guestSignup', {
            errors: formErrors
        });
        // if (errors.length > 0) {
        //     res.render('guestSignup', {
        //         errors, name, pin
        //     });
    } else {
        // Initial validation passed
        // Make sure user does not exist
        Game.findOne({ pin: pin })
            .then(game => {
                if (game) {
                    const match = game.guests.find(guest => guest.name == name);
                    if (match) {
                        // Other user exists with name
                        const signupErrors = [{ msg: `Name '${name}' already taken in game with pin '${pin}'` }]
                        res.render('guestSignup', {
                            errors: signupErrors, name, pin
                        });
                    } else {
                        const newGuest = new Guest({
                            name, pin
                        });
                        // Save guest
                        newGuest.save()
                            .then(guest => {
                                game.guests.push(newGuest);
                                game.save()
                                    .then(g => {
                                        req.flash('success_msg', 'You have signed up for the game successfully');
                                        res.redirect('/guest/join');
                                    })
                                    .catch(err => console.log(err));
                            })
                            .catch(err => console.log(err));
                    }
                } else {
                    const pinError = { msg: `Game with pin '${pin}' not found` };
                    res.render('guestSignup', {
                        errors: pinError, name, pin
                    });
                }
            })
            .catch(err => console.log(err));
    }
});

// Login handle
router.post('/join', (req, res, next) => {
    passport.authenticate('guest-login', {
        successRedirect: '/dashboard',
        failureRedirect: '/guest/join',
        failureFlash: true
    })(req, res, next);
});

router.get('/search', ensureGuestAuthenticated, function (req, res) {
    const searchKey = req.query.searchKey;
    const limit = req.query.limit;
    const offset = req.query.offset;
    const hostToken = req.query.hostToken;
    spotifyApi.setAccessToken(hostToken);
    if (searchKey) {
        spotifyApi
            .searchTracks(searchKey, { limit: limit, offset: offset })
            .then(data => {
                const d = data.body.tracks.items;
                res.send(d);
            })
            .catch(err => {
                console.error(err)
                res.send({ error: err });
            });
    } else {
        res.end();
    }
});

router.get('/getqueue', function (req, res) {
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            // This fails
            res.send({ queue: game.queue });
        }
    });
});

router.get('/pushqueue', function (req, res) {
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            const track = new Track({
                artists: req.query.artists,
                name: req.query.name,
                minutes: req.query.minutes,
                seconds: req.query.seconds,
                uri: req.query.uri,
                imageUrl: req.query.imageUrl,
                votes: 0,
                votedBy: []
            });
            if (game.queue.includes(track)) {
                if (req.query.forcepush) {
                    game.queue.push(track);
                    game.save(function (err) {
                        if (err) {
                            console.log('yo, there was an error pushing queue items to the database');
                            console.log(err);
                        } else {
                            console.log('updated the queue successfully in the database');
                            res.send({ queue: game.queue });
                        }
                    });
                } else {
                    res.send({ question: "Song already in queue, are you sure you want to add?" });
                }
            } else {
                game.queue.push(track);
                game.save(function (err) {
                    if (err) {
                        console.log('yo, there was an error pushing queue items to the database');
                        console.log(err);
                    } else {
                        console.log('updated the queue successfully in the database');
                        res.send({ queue: game.queue });
                    }
                });
            }
        }
    });
});

module.exports = router;