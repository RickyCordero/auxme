const express = require('express');
const request = require('request');
const router = express.Router();
const queryString = require('querystring');
const _ = require('lodash');
const hash = require('object-hash');

const client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
const redirect_uri = `https://${process.env.ADDRESS}/host/spotify/callback/`; // Your redirect uri

const stateKey = 'spotify_auth_state';

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi();

let global_access_token;
let global_refresh_token;

// let queue = require('./shared').queue;
let queue = [];

let tokens = [];
let all_users = [];
const players = [];
let room; // partyCode

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

function ensureAuxMeAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

// TODO: Determine how to check if a user has signed into their Spotify account
function ensureSpotifyAuthenticated(req, res, next) {
    // console.log(req.cookies);
    // const isLoggedIntoSpotify = req.cookies[stateKey];
    const isLoggedIntoSpotify = false;
    if (isLoggedIntoSpotify) {
        return next();
    }
    res.redirect('/host/spotify-login');
}

module.exports = function (io, games) {

    /* GET home page. */
    router.get('/', ensureSpotifyAuthenticated, function (req, res, next) {
        // Check if spotify cookie exists
        console.log(res.cookies);
        res.render('host', { title: 'Spotify', access_token: global_access_token, refresh_token: global_refresh_token });
    });

    router.get('/spotify-login', ensureAuxMeAuthenticated, function (req, res, next) {
        // Render the spotify login page
        res.render('host-login', { title: 'Spotify' });
    });

    router.get('/spotify/login', ensureAuxMeAuthenticated, function (req, res, next) {
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
                redirect_uri: redirect_uri,
                state: state
            }));
    });

    router.get('/spotify/callback', ensureAuxMeAuthenticated, function (req, res, next) {
        // your application requests refresh and access tokens
        // after checking the state parameter
        const code = req.query.code || null;
        const state = req.query.state || null;
        const storedState = req.cookies ? req.cookies[stateKey] : null;

        if (state === null || state !== storedState) {
            // res.redirect('/#' +
            //     queryString.stringify({
            //         error: 'state_mismatch'
            //     })
            // );
            res.redirect('/host/spotify-login');
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
                    global_access_token = body.access_token;
                    global_refresh_token = body.refresh_token;

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
                    res.render('host', { access_token: body.access_token, refresh_token: body.refresh_token });

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
                // console.log(data.body.items);
                // const d = data.body.tracks.items;
                res.send({ tracks: data.body.items, total: total });
            })
            .catch(err => console.error(err));
    });

    router.get('/all_tokens', function (req, res) {
        res.send({ tokens: tokens });
    });

    router.get('/addplayer', function (req, res) {
        const player = req.query.player;
        console.log(player);
        players.push(player);
        res.send({ players: players });
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

    router.get('/spotify/access_token', function (req, res) {
        res.send({
            'access_token': global_access_token
        });
    });

    router.get('/spotify/search', ensureAuxMeAuthenticated, function (req, res) {
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


    router.get('/spotify/play', ensureAuxMeAuthenticated, function (req, res) {
        // TODO: Use the spotify web api node library to play
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

    router.get('/pushqueue', function (req, res) {
        if (queue.map(x => hash(x)).includes(hash(req.query))) {
            if (req.query.forcepush) {
                queue.push(req.query);
                res.send({ queue: queue });
            } else {
                res.send({ question: "Song already in queue, are you sure you want to add?" });
            }
        } else {
            queue.push(req.query);
            res.send({ queue: queue });
        }
    });

    router.get('/removetrack', ensureAuxMeAuthenticated, function (req, res) {
        const track = req.query.track;
        queue = queue.filter(x => hash(x) !== hash(track));
        res.send({ queue: queue });
    });

    router.get('/getqueue', ensureAuxMeAuthenticated, function (req, res) {
        res.send({ queue: queue });
    });

    router.get('/shiftqueue', ensureAuxMeAuthenticated, function (req, res) {
        queue.shift();
        res.send({ queue: queue });
    });

    router.get('/clearqueue', ensureAuxMeAuthenticated, function (req, res) {
        queue.length = 0;
        res.send({ queue: queue });
    });

    router.get('/spotify/myplaylists', ensureAuxMeAuthenticated, function (req, res) {
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

    router.get('/spotify/playlist-tracks', ensureAuxMeAuthenticated, function (req, res) {
        const playlistId = req.query.playlist_id;
        console.log(playlistId);
        spotifyApi
            .getPlaylistTracks(playlistId)
            .then(data => {
                res.send({ tracks: data.body.items });
            })
            .catch(error => {
                console.log('yo there was an error in /playlist-tracks');
                console.log(error);
                res.send({ error: error });
            });
    });

    router.get('/spotify/playback-state', ensureAuxMeAuthenticated, function (req, res) {
        spotifyApi
            .getMyCurrentPlaybackState()
            .then(data => {
                res.send({ data: data });
            })
            .catch(error => {
                console.log('yo, there was an error in /playback-state');
                console.log(error);
                res.redirect('/update_auth_token');
                // res.send({error: error});
            });
    });

    router.get('/getplayers', ensureAuxMeAuthenticated, function (req, res) {
        res.send({ players: players });
    });

    router.get('/profile', ensureAuxMeAuthenticated, function (req, res) {
        res.send(req.session);
    });

    router.get('/generate-party-code', ensureAuxMeAuthenticated, function (req, res) {
        // partyCode = 1234;
        partyCode = Math.floor(Math.random() * 90000) + 10000; // new pin for game
        res.send({ partyCode: partyCode });
    });

    return router;
};