const express = require('express');
const request = require('request');
const router = express.Router();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const _ = require('lodash');
const queryString = require('querystring');
const hash = require('object-hash');

// Database utils
const utils = require('../models/utils');

// Mongoose models
const Game = require('../models/Game');
const Host = require('../models/Host');
const Track = require('../models/Track');
const Guest = require('../models/Guest');

// Authorization
const { ensureAuthenticated, ensureHostAuthenticated, ensureSpotifyAuthenticated } = require('../config/auth');

const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

const { client_id, client_secret, add_redirect_url } = require('../config/spotify');

// let redirectUrl;

// if (process.env.ENVIRONMENT == 'development') {
//     redirectUrl = `http://localhost:${process.env.PORT}/host/spotify/callback/`;
// } else {
//     redirectUrl = `http://auxme.io/host/spotify/callback/`; // Your redirect uri
// }

const stateKey = 'spotify_auth_state';

let global_access_token;
let global_refresh_token;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length - The length of the string
 * @return {string} - The generated string
 */
const generateRandomString = function (length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

router.get('/dashboard', ensureHostAuthenticated, (req, res, next) => {
    res.render('hostDashboard');
});

router.get('/spotify/login', passport.authenticate('spotify', {
    scope: [
        // Playlists
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-read-private',
        'playlist-modify-private',
        // Spotify Connect
        'user-read-currently-playing',
        'user-modify-playback-state',
        'user-read-playback-state',
        // Follow
        'user-follow-read',
        'user-follow-modify',
        // Users
        'user-read-email',
        'user-read-private',
        'user-read-birthdate',
        // Library
        'user-library-read',
        'user-library-modify',
        // Playback
        'app-remote-control',
        'streaming',
        // Listening History
        'user-top-read',
        'user-read-recently-played'
    ],
    showDialog: true
}), (req, res) => {
    // Request will be redirected to spotify for authentication, so this function will not be called
});

router.get('/spotify/add', (req, res, next) => {
    const state = generateRandomString(16);

    // Sets cookie stateKey to state. The value parameter may be a string or object converted to JSON.
    res.cookie(stateKey, state);

    // your application requests authorization
    // see https://developer.spotify.com/documentation/general/guides/scopes/#scopes
    const permissions = [
        // Playlists
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-read-private',
        'playlist-modify-private',
        // Spotify Connect
        'user-read-currently-playing',
        'user-modify-playback-state',
        'user-read-playback-state',
        // Follow
        'user-follow-read',
        'user-follow-modify',
        // Users
        'user-read-email',
        'user-read-private',
        'user-read-birthdate',
        // Library
        'user-library-read',
        'user-library-modify',
        // Playback
        'app-remote-control',
        'streaming',
        // Listening History
        'user-top-read',
        'user-read-recently-played'
    ];
    const scope = permissions.join(' ');
    res.redirect('https://accounts.spotify.com/authorize?' +
        queryString.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: add_redirect_url,
            state: state
        }));
});

router.get('/spotify/callback', passport.authenticate('spotify', {
    failureRedirect: '/host/dashboard'
}), (req, res) => {
    console.log(req.user.spotify.accessToken);
    console.log(req.user.spotify.refreshToken);
    req.flash('success', 'Logged into Spotify successfully');
    res.redirect('/host/dashboard');
    // spotifyApi.setAccessToken(req.user.spotify.accessToken);
    // spotifyApi.setRefreshToken(req.user.spotify.refreshToken);
});

router.get('/spotify/add/callback', function (req, res, next) {
    // your application requests refresh and access tokens
    // after checking the state parameter
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/host/accounts');
    } else {
        res.clearCookie(stateKey);
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: add_redirect_url,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        // get the access and refresh tokens using the resultant code from the callback response
        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const { access_token, refresh_token, expires_in } = body;
                // TODO: Figure out how to store these tokens per user per session
                spotifyApi.setAccessToken(access_token);
                spotifyApi.setRefreshToken(refresh_token);
                spotifyApi.getMe().then(data => {
                    const profile = data.body;
                    Host.findOneAndUpdate({ email: req.user.email }, { spotify: profile }, (err, host) => {
                        if (err) {
                            console.log('error finding host with email ', req.user.email);
                        } else {
                            console.log(`found and updated the host's spotify profile`);
                            console.log(host);
                        }
                    });
                })

                req.flash('success', 'Added Spotify successfully');
                res.redirect('/host/accounts');
            } else {
                console.log(error);
                req.flash('error_msg', 'Invalid token, Spotify not added successfully');
                res.redirect('/host/accounts');
            }
        });
    }
});

router.get('/spotify/refresh_token', function (req, res) {
    // requesting access token by using the refresh token
    const refresh_token = req.query.refresh_token;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            res.send({
                'access_token': body.access_token
            });
        }
    });
});

router.get('/spotify/mytracks', function (req, res) {
    const limit = req.query.limit;
    const offset = req.query.offset;
    spotifyApi
        .getMySavedTracks({ limit: limit, offset: offset })
        .then(data => {
            const total = data.body.total;
            res.send({ tracks: data.body.items, total: total });
        })
        .catch(err => console.error(err));
});

router.get('/spotify/update_auth_token', function (req, res) {
    console.log('getting new auth token');
    // returns a new auth token using the global refresh token set by the login callback
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: global_refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            spotifyApi.setAccessToken(body.access_token);
            res.send({
                'access_token': body.access_token
            });
        }
    });
});

router.get('/spotify/access_token', ensureSpotifyAuthenticated, (req, res) => {
    console.log(req.user.spotify.accessToken);
    res.send({
        'access_token': req.user.spotify.accessToken
    });
});

router.get('/spotify/search', ensureSpotifyAuthenticated, function (req, res) {
    const searchKey = req.query.searchKey;
    const limit = req.query.limit;
    const offset = req.query.offset;
    if (searchKey) {
        spotifyApi
            .searchTracks(searchKey, { limit: limit, offset: offset })
            .then(data => {
                const d = data.body.tracks.items;
                res.send(d);
            })
            .catch(err => console.error(err));
    }
});

router.get('/spotify/play', ensureSpotifyAuthenticated, function (req, res) {
    // TODO: Use the spotify web api node library to play
    // spotifyApi.play({
    //     device_id: req.query.device_id,
    //     uris: req.query.uri
    // }).then(data => {
    //     res.send({ data: data });
    // }).catch(error => {
    //     console.log('yo, there was an error in /play');
    //     console.log(error);
    //     res.send({ error: error });
    // });

    const options = {
        body: JSON.stringify({ uris: [req.query.uri] }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${req.query.access_token}`
        }
    };
    const url = `https://api.spotify.com/v1/me/player/play?device_id=${req.query.device_id}`;
    request.put(url, options, (data, status) => {
        res.send({ data: data, status: status });
    });
});

router.get('/pushqueue', ensureAuthenticated, function (req, res) {
    console.log('calling pushqueue');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            const trackConfig = {
                artists: req.query.artists,
                name: req.query.name,
                minutes: req.query.minutes,
                seconds: req.query.seconds,
                uri: req.query.uri,
                imageUrl: req.query.imageUrl,
                votes: 0,
                votedBy: []
            };
            const track = new Track(trackConfig);
            // console.log(game);
            // console.log(typeof (game));
            // if (game.queue.includes(track)) {
            // console.log(game.queue);
            // console.log(typeof (game.queue));
            // const s = new Set(game.queue.map(item=>typeof(item)));
            // console.log(s);
            // console.log(track);
            // console.log(typeof (track));
            const hashedQueue = game.queue.map(x => hash(_.omit(x, "_id")));
            // console.log("here's the hashedQueue:");
            // console.log(hashedQueue);
            const trackHash = hash(trackConfig);
            // console.log("here's the track hash:");
            // console.log(trackHash);
            if (hashedQueue.includes(trackHash)) {
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

router.get('/pushpool', ensureAuthenticated, function (req, res) {
    console.log('calling pushpool');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            const trackConfig = {
                artists: req.query.artists,
                name: req.query.name,
                minutes: req.query.minutes,
                seconds: req.query.seconds,
                uri: req.query.uri,
                imageUrl: req.query.imageUrl,
                votes: req.query.votes,
                votedBy: req.query.votedBy
            };
            const track = new Track(trackConfig);
            console.log('this is the trackConfig to be added');
            console.log(trackConfig);
            // console.log(typeof(track));
            // const hashedPool = game.pool.map(x => hash(_.omit(x, ["_id", "votes", "votedBy"])));
            // const trackHash = hash(_.omit(trackConfig, ["votes", "votedBy"]));
            const containsTrack = () => {
                // const hashedPool = game.pool.map(x => hash(_.omit(x, ["_id", "votes", "votedBy"])));
                // const trackHash = hash(_.omit(trackConfig, ["votes", "votedBy"]));
                // return hashedPool.includes(trackHash);
                return game.pool.some(x => x.uri == req.query.uri);
            }
            if (containsTrack()) {
                console.log('song already in pool');
                // async.eachOf(game.pool, (poolItem, poolIdx, eachCallback)=>{

                // }, (eachError)=>{
                //     if(eachError){
                //         console.log('yo, there was an error in the async each call');
                //     } else {

                //     }
                // });
                game.pool.forEach((poolItem, poolIdx) => {
                    // if (hash(_.omit(poolItem, ["_id", "votes", "votedBy"])) == hash(_.omit(trackConfig, ["votes", "votedBy"]))) {
                    if (poolItem.uri == req.query.uri && !poolItem.votedBy.includes(req.query.socketId)) {
                        console.log('going to upvote this track');
                        game.pool[poolIdx].votes += 1;
                    }
                });
                game.save(function (err) {
                    if (err) {
                        console.log('yo, there was an error saving the pool items to the database');
                        console.log(err);
                    } else {
                        console.log('updated the pool successfully in the database');
                        res.send({ pool: game.pool });
                    }
                });
            } else {
                game.pool.push(track);
                game.save(function (err) {
                    if (err) {
                        console.log('yo, there was an error saving the pool items to the database');
                        console.log(err);
                    } else {
                        console.log('updated the pool successfully in the database');
                        res.send({ pool: game.pool });
                    }
                });
            }
        }
    });
});

router.get('/removetrackfromqueue', ensureHostAuthenticated, function (req, res) {
    console.log('calling removetrackfromqueue');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            const track = req.query.track;
            console.log("here is the track to be removed:");
            console.log(track);
            console.log(typeof (track));
            game.queue = game.queue.filter(x => hash(_.omit(x, "_id")) !== hash(_.omit(track, "_id")));
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
    });
});

router.get('/removetrackfrompool', ensureHostAuthenticated, function (req, res) {
    console.log('calling removetrackfrompool');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            const track = req.query.track;
            console.log("here is the track to be removed:");
            console.log(track);
            console.log(typeof (track));
            game.pool = game.pool.filter(x => hash(_.omit(x, "_id")) !== hash(_.omit(track, "_id")));
            game.save(function (err) {
                if (err) {
                    console.log('yo, there was an error pushing queue items to the database');
                    console.log(err);
                } else {
                    console.log('updated the queue successfully in the database');
                    res.send({ pool: game.pool });
                }
            });
        }
    });
});

router.get('/getqueue', ensureAuthenticated, function (req, res) {
    // console.log('this is the query pin');
    // console.log(req.query.pin);
    console.log('calling getqueue');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            if (game) {
                res.send({ queue: game.queue });
            } else {
                console.log('game is null');
            }
        }
    });
});

router.get('/getpool', ensureAuthenticated, function (req, res) {
    console.log('calling getpool');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            if (game) {
                res.send({ pool: game.pool });
            } else {
                console.log('game is null');
            }
        }
    });
});

router.get('/shiftqueue', ensureAuthenticated, function (req, res) {
    console.log('calling shiftqueue');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            if (game) {
                game.queue.shift();
                game.save(function (err) {
                    if (err) {
                        console.log('yo, there was an error pushing queue items to the database');
                        console.log(err);
                    } else {
                        console.log('shifted the queue successfully in the database');
                        res.send({ queue: game.queue });
                    }
                });
            } else {
                console.log('game is null');
            }
        }
    });
});

router.get('/topvotedtrack', ensureAuthenticated, function (req, res) {
    console.log('calling topvotedtrack');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            if (game) {
                let nextTrack;
                let nextTrackIndex = 0;
                const maxVotes = Math.max(game.pool.map(track => track.votes));
                game.pool.forEach((track, trackIdx) => {
                    if (track.votes == maxVotes) {
                        nextTrack = track;
                        nextTrackIndex = trackIdx;
                    }
                });
                game.pool.splice(nextTrackIndex, 1);
                game.save(function (err) {
                    if (err) {
                        console.log('yo, there was an error shifting pool items in the database');
                        console.log(err);
                    } else {
                        console.log('shifted the pool successfully in the database');
                        res.send({ track: nextTrack });
                    }
                });
            } else {
                console.log('game is null');
            }
        }
    });
});

router.get('/vote', ensureAuthenticated, function (req, res) {
    console.log('calling vote');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
            res.send({ err: err });
        } else {
            if (game.pool.some(poolTrack => poolTrack.uri == req.query.track.uri)) {
                game.pool.forEach((poolTrack, poolTrackIdx) => {
                    if (poolTrack.uri == req.query.track.uri) {
                        if (!poolTrack.votedBy.includes(req.query.socketId)) {
                            poolTrack.votes += 1;
                            poolTrack.votedBy.push(req.query.socketId);
                            game.save(function (err) {
                                if (err) {
                                    console.log('yo, there was an error upvoting a track in the pool');
                                    console.log(err);
                                    res.send({ err: err });
                                } else {
                                    console.log('updated the pool successfully in the database');
                                    res.send({ pool: game.pool });
                                }
                            });
                        } else {
                            res.send({ err: 'already voted for this track' });
                        }
                    }
                });
                // game.pool = game.pool.map(poolTrack => {
                //     if (poolTrack.uri == req.query.track.uri) {
                //         if (!poolTrack.votedBy.includes(req.query.socketId)) {
                //             poolTrack.votes += 1;
                //             poolTrack.votedBy.push(req.query.socketId);
                //         } else {
                //             res.send({ err: 'Already voted for this track' });
                //         }
                //     }
                //     return poolTrack;
                // });
                // game.save(function (err) {
                //     if (err) {
                //         console.log('yo, there was an error upvoting a track in the pool');
                //         console.log(err);
                //         res.send({ err: err });
                //     } else {
                //         console.log('updated the pool successfully in the database');
                //         res.send({ pool: game.pool });
                //     }
                // });
            } else {
                console.log("track not in the pool, can't vote");
            }
        }
    });
});

router.get('/clearqueue', ensureHostAuthenticated, function (req, res) {
    console.log('calling clearqueue');
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            // game.queue.length = 0;
            game.queue = [];
            game.save(function (err) {
                if (err) {
                    console.log('yo, there was an error clearing the queue in the database');
                    console.log(err);
                } else {
                    console.log('cleared the queue successfully in the database');
                    res.send({ queue: game.queue });
                }
            });
        }
    });
});

router.get('/spotify/myplaylists', ensureSpotifyAuthenticated, function (req, res) {
    spotifyApi
        .getUserPlaylists({ limit: 50, offset: 0 })
        .then(data => {
            res.send({ data: data });
        })
        .catch(error => {
            console.log('yo there was an error in /myplaylists');
            console.log(error);
            res.send({ error: error });
        });
});

router.get('/spotify/playlist-tracks', ensureSpotifyAuthenticated, function (req, res) {
    const playlistId = req.query.playlist_id;
    console.log(playlistId);
    spotifyApi
        .getPlaylistTracks(playlistId)
        .then(data => {
            res.send({ tracks: data.body.items });
        })
        .catch(error => {
            console.log('yo, there was an error in /playlist-tracks');
            console.log(error);
            res.send({ error: error });
        });
});

router.get('/spotify/playback-state', ensureSpotifyAuthenticated, function (req, res) {
    spotifyApi
        .getMyCurrentPlaybackState()
        .then(data => {
            res.send({ data: data });
        })
        .catch(error => {
            console.log('yo, there was an error in /playback-state');
            console.log(error);
            res.redirect('/spotify/update_auth_token');
            // res.send({error: error});
        });
});

router.get('/spotify/now-playing', ensureSpotifyAuthenticated, function (req, res) {
    spotifyApi
        .getMyCurrentPlayingTrack()
        .then(data => {
            res.send({ data: data });
        })
        .catch(error => {
            console.log('yo, there was an error in /now-playing');
            console.log(error);
            res.redirect('/spotify/update_auth_token');
        });
});

router.get('/getplayers', ensureAuthenticated, function (req, res) {
    utils.getGameByPin(Game, req.query.pin, (err, game) => {
        if (err) {
            console.log(`yo, there was an error finding the game with pin ${req.query.pin}`);
            console.log(err);
        } else {
            if (game) {
                res.send({ players: game.guests });
            } else {

            }
        }
    });
});

function generatePartyCode() {
    return Math.floor(Math.random() * 90000) + 10000; // new pin for game
}

// --------------------------------------------------------------------------------------

// Login page
router.get('/login', (req, res) => {
    res.render('hostLogin');
});

// Sign up page
router.get('/signup', (req, res) => {
    res.render('hostSignup');
});

// Login handler
router.post('/login', (req, res, next) => {
    const { email, password } = req.body;

    req.checkBody('email', 'Email field is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('password', 'Password field is required').notEmpty();

    const formErrors = req.validationErrors();

    if (formErrors) {
        res.render('hostLogin', {
            errors: formErrors, email: email, password: password
        });
    } else {
        passport.authenticate('host-login', (err, user, info) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                const loginErrors = [{ msg: "Invalid email or password" }];
                return res.render('hostLogin', {
                    errors: loginErrors, email: email, password: password
                });
            }

            // Note that when using a custom callback, it becomes the application's responsibility 
            // to establish a session (by calling req.login()) and send a response.
            req.logIn(user, function (err) {
                if (err)
                    return next(err);

                return res.redirect('/dashboard');
            });
        })(req, res, next);
    }
});

// Logout handler
router.get('/logout', ensureHostAuthenticated, (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out');
    res.redirect('/host/login');
});

router.post('/signup', (req, res) => {
    const { name, email, username, password, password2 } = req.body;

    // Form Validator
    req.checkBody('name', 'Name field is required').notEmpty();
    req.checkBody('email', 'Email field is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username field is required').notEmpty();
    req.checkBody('password', 'Password field is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    // Check Errors
    const formErrors = req.validationErrors();

    if (formErrors) {
        res.render('hostSignup', {
            errors: formErrors, name, email, username, password, password2
        });
    } else {
        // Validation passed
        // Make sure host does not exist
        Host.findOne({ email: email })
            .then(host => {
                if (host) {
                    // Host exists
                    const signupErrors = [{ msg: 'Email is already registered' }];
                    res.render('hostSignup', {
                        errors: signupErrors, name, email, username, password, password2
                    });
                } else {
                    // Create new host
                    const newHost = new Host({
                        name: name,
                        email: email,
                        username: username,
                        password: password
                    });
                    utils.createHost(newHost, (err, host) => {
                        if (err) {
                            throw err;
                        } else {
                            req.flash('success', 'You are now registered and can log in');
                            res.location('/');
                            res.redirect('/host/login');
                        }
                    });
                }
            })
            .catch(err => console.log(err));
    }
});

router.get('/accounts', ensureHostAuthenticated, (req, res) => {
    res.render('accounts');
});

// Create game
router.get('/createGame', ensureHostAuthenticated, (req, res) => {
    res.render('createGame');
});

/**
 * Determines if a game name is valid
 * @param {String} name - The name to be checked
 */
const isValidGameName = name => {
    return true;
}

// Create game handler
router.post('/createGame', ensureHostAuthenticated, (req, res, next) => {
    const hostId = req.user.email;
    const { name } = req.body;
    let errors = [];

    // Check required fields
    if (!name) {
        errors.push({ msg: 'Please fill in all fields' });
    }
    // Check required fields
    if (!isValidGameName(name)) {
        errors.push({ msg: `Invalid game name '${name}'` });
    }

    if (errors.length > 0) {
        res.render('createGame', {
            errors, name
        });
    } else {
        const pin = generatePartyCode();
        // Validation passed
        // Make sure game does not exist
        Game.findOne({ pin: pin })
            .then(game => {
                if (game) {
                    // Host exists
                    errors.push({ msg: `Game with pin '${pin}' already exists` });
                    res.render('createGame', {
                        errors, name
                    });
                } else {
                    // Create new game
                    const g = new Game({
                        host: hostId,
                        name: name,
                        pin: pin,
                        guests: [],
                        queue: [],
                        pool: []
                    });
                    g.save()
                        .then(game => {
                            req.flash('success_msg', 'You have created the game successfully');
                            res.redirect('/dashboard');
                        })
                        .catch(err => console.log(err));
                }
            })
    }
});

// Get all games for this user
router.get('/games', ensureHostAuthenticated, (req, res) => {
    Game.find({ host: req.user.email })
        .then(games => {
            if (games) {
                const processedGames = games.map(game => {
                    const obj = { ..._.pick(game, ['name', 'pin', 'guests']) };
                    obj.guests = obj.guests.map(guest => _.pick(guest, 'name'));
                    return obj;
                });
                res.send(processedGames);
            } else {
                req.flash('error_msg', 'No games found');
                res.redirect('/host/dashboard');
            }
        })
        .catch(err => console.log(err));
});


router.get('/game/:pin', ensureSpotifyAuthenticated, (req, res, next) => {
    // Find game where user is host (host must've already been created)
    spotifyApi.setAccessToken(req.user.spotify.accessToken);
    spotifyApi.setRefreshToken(req.user.spotify.refreshToken);
    Game.findOne({ host: req.user.email, pin: req.params.pin })
        .then(game => {
            if (game) {
                res.render('hostGame', { game: game });
            } else {
                console.log('game not found');
                req.flash('error_msg', 'No game found with pin ', req.params.pin);
                res.redirect('/host/dashboard');
            }
        })
        .catch(err => console.log(err));
});

// Get all games for this user
router.get('/deleteGame/:pin', ensureHostAuthenticated, (req, res) => {
    // Find game where user is host (host must've already created)
    Game.deleteOne({ host: req.user.email, pin: req.params.pin })
        .then(stuff => {
            console.log(stuff);
            req.flash('success_msg', 'You have deleted the game successfully');
            res.redirect('/dashboard');
        })
        .catch(err => console.log(err));

});

module.exports = router;