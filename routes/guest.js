const express = require('express');
const request = require('request');
const router = express.Router();

const queryString = require('querystring');
const hash = require('object-hash');

const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

const client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
const redirect_uri = `http://${process.env.ADDRESS}:${process.env.PORT}/guest/spotify/callback/`; // Your redirect uri

const stateKey = 'spotify_auth_state';

const Game = require('../game');

// let queue = require('./shared').queue;
let queue = [];

let hostSpotifyToken;
let guestSpotifyAccessToken;
let guestSpotifyRefreshToken;
let room;

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

module.exports = function (io, games) {

    // console.log('io from guest.js');
    // console.log(io);

    // io.on('connection', function (socket) {
    //     console.log('a guest has connected to the guest page');

    //     socket.on('guest-join', data => {
    //         console.log('got the guest-join');
    //         console.log(data);
    //     });
    // });

    // io.on('connection', function (socket) {
    //     socket.on('host-join', data => {
    //         room = data.partyCode;
    //         console.log(`a host has connected`);
    //         console.log(data);
    //         console.log(room);
    //         socket.join(room);
    //         io.to(room).emit('ack', { message: `a host has joined a room with party code ${partyCode}` });
    //     });
    //     socket.on('guest-join', data => {
    //         const room = data.room;
    //         console.log(data);
    //         console.log(room);
    //         console.log(`going to join the room: ${room}`);
    //         socket.join(room);
    //         io.to(room).emit('guest-join', `${data.displayName} has joined the room`);
    //     });
    //     socket.on('got-token', data => {
    //         console.log('got the access token');
    //         console.log(data);
    //         io.to(room).emit('ack', { token: data });
    //     });
    //     socket.on('render-queue', data => {
    //         console.log('going to render the queue');
    //         console.log(data);
    //         io.to(room).emit('render-queue');
    //     });
    //     socket.on('update-snackbar', data => {
    //         console.log('going to update the snackbar');
    //         console.log(data);
    //         io.to(room).emit('update-snackbar', data.message);
    //     });
    //     socket.on('update-now-playing', data => {
    //         console.log('going to update the now playing info');
    //         console.log(data);
    //         io.to(room).emit('update-now-playing', data);
    //     });

    // });

    router.get('/', function (req, res, next) {
        res.render('guest');
    });

    router.get('/displayName/:displayName/pin/:pin', function (req, res, next) {
        const displayName = req.params.displayName;
        const pin = req.params.pin;
        res.render('guest', { displayName: displayName, pin: pin });
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


        console.log("here's the client_id: " + client_id);
        console.log("here's the scope: " + scope);
        console.log("here's the redirect_uri: " + redirect_uri);
        console.log("here's the state: " + state);

        console.log('calling redirect to spotify');

        res.redirect('https://accounts.spotify.com/authorize?' +
            queryString.stringify({
                response_type: 'code',
                client_id: client_id,
                scope: scope,
                redirect_uri: redirect_uri,
                state: state
            }));
    });

    router.get('/spotify/callback', function (req, res, next) {
        // your application requests refresh and access tokens
        // after checking the state parameter
        const code = req.query.code || null;
        const state = req.query.state || null;
        const storedState = req.cookies ? req.cookies[stateKey] : null;
        console.log('in the callback');
        if (state === null || state !== storedState) {
            // res.redirect('/#' +
            //     queryString.stringify({
            //         error: 'state_mismatch'
            //     })
            // );
            res.redirect('/guest');
        } else {
            res.clearCookie(stateKey);
            const authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                form: {
                    code: code,
                    redirect_uri: redirect_uri,
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

                    // tokens.push(body.access_token);
                    // const playerId = Math.random() * 9999;
                    // console.log(playerId);
                    // players.push(new Player(playerId, 'This is a name', {
                    //     spotify: body.access_token
                    // }));
                    // const options = {
                    //     url: 'https://api.spotify.com/v1/me',
                    //     headers: { 'Authorization': 'Bearer ' + access_token },
                    //     json: true
                    // };

                    // // use the access token to access the Spotify Web API
                    // request.get(options, function (error, response, body) {
                    //     // console.log(body);
                    // });

                    // we can also pass the token to the browser to make requests from there
                    // res.redirect('/#' + 
                    //     queryString.stringify({
                    //         access_token: access_token,
                    //         refresh_token: refresh_token
                    //     }));
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

    router.get('/getqueue', function (req, res, next) {
        // const queue = Game.roomTo
        res.send({
            queue: queue
        })
    });

    router.get('/shiftqueue', function (req, res) {
        queue.shift();
        res.send({ queue: queue });
    });

    router.get('/clearqueue', function (req, res) {
        queue.length = 0;
        res.send({ queue: queue });
    });

    router.get('/removetrack', function (req, res) {
        const track = req.query.track;
        queue = queue.filter(x => hash(x) !== hash(track));
        res.send({queue:queue});
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