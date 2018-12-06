const express = require('express');
const request = require('request');
const router = express.Router();
const queryString = require('querystring');
const hash = require('object-hash');

const mongoose = require("mongoose");
const utils = require('../models/utils');

require('../models/game');
require('../models/playlist');
require('../models/track');
require('../models/player');
require('../models/user');


const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

const client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret

let guest_redirect_uri;

if (process.env.ENVIRONMENT == 'development') {
    guest_redirect_uri = `http://localhost:${process.env.PORT}/guest/spotify/callback/`;
} else {
    guest_redirect_uri = `http://auxme.io/guest/spotify/callback/`; // Your redirect uri
}
console.log(guest_redirect_uri);

const stateKey = 'spotify_auth_state';

let guestSpotifyAccessToken;
let guestSpotifyRefreshToken;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function (length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


// TODO: Determine how to check if a user has signed into their Spotify account
function ensureSpotifyAuthenticated(req, res, next) {
    console.log(req.cookies);
    // const isLoggedIntoSpotify = req.cookies[stateKey];
    const isLoggedIntoSpotify = true;
    if (isLoggedIntoSpotify) {
        return next();
    }
    res.redirect('/host/spotify-login');
}

module.exports = function (io) {

    // Mongoose models
    const Game = mongoose.model("Game");
    const Playlist = mongoose.model("Playlist");
    const Track = mongoose.model("Track");
    const Player = mongoose.model("Player");

    router.get('/', function (req, res, next) {
        res.render('guest');
    });

    router.get('/displayName/:displayName/pin/:pin', function (req, res, next) {
        const displayName = req.params.displayName;
        const pin = req.params.pin;
        res.render('guest', { displayName: displayName, pin: pin, env: process.env.ENVIRONMENT });
    });

    router.get('/search', function (req, res) {
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

    router.get('/spotify/login', function (req, res, next) {
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
                redirect_uri: guest_redirect_uri,
                state: state
            }));
    });

    router.get('/spotify/callback', function (req, res, next) {
        // your application requests refresh and access tokens
        // after checking the state parameter
        const code = req.query.code || null;
        const state = req.query.state || null;
        const storedState = req.cookies ? req.cookies[stateKey] : null;
        if (state === null || state !== storedState) {
            res.redirect('/guest');
        } else {
            res.clearCookie(stateKey);
            const authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                form: {
                    code: code,
                    redirect_uri: guest_redirect_uri,
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
                    // TODO: Figure out how to store these tokens per user per session
                    guestSpotifyAccessToken = body.access_token;
                    guestSpotifyRefreshToken = body.refresh_token;

                    spotifyApi.setAccessToken(body.access_token);
                    spotifyApi.setRefreshToken(body.refresh_token);
                    res.render('guest', { access_token: body.access_token, refresh_token: body.refresh_token });
                    // req.io.sockets.emit('player-join', access_token);
                } else {
                    res.redirect('/#' +
                        queryString.stringify({
                            error: 'invalid_token'
                        })
                    );
                }
            });
        }

    });

    router.get('/getqueue', function (req, res) {
        console.log(req.query.pin);
        console.log(typeof (req.query.pin));
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

    router.get('/spotify/access_token', function (req, res) {
        res.send({
            'access_token': guestSpotifyAccessToken
        });
    });
    router.get('/apple/access_token', function (req, res) {
        res.send({
            'access_token': guestAppleAccessToken
        });
    });
    router.get('/tidal/access_token', function (req, res) {
        res.send({
            'access_token': guestTidalAccessToken
        });
    });
    router.get('/soundcloud/access_token', function (req, res) {
        res.send({
            'access_token': guestSoundcloudAccessToken
        });
    });

    return router;

};