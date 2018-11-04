const express = require('express');
const request = require('request');
const router = express.Router();
const queryString = require('querystring');
const _ = require('lodash');
const hash = require('object-hash');

const client_id = '67a661b7dd704e57a5a6f03ff226b04c'; // Your client id
const client_secret = '5c7a14fe961745d999cb351294eab884'; // Your secret
const redirect_uri = 'http://localhost:3000/spotify/callback/'; // Your redirect uri

const stateKey = 'spotify_auth_state';

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi(
    //     {
    //     client_id: '67a661b7dd704e57a5a6f03ff226b04c',
    //     client_secret: '5c7a14fe961745d999cb351294eab884',
    //     redirect_uri: 'http://localhost:3000/spotify/callback/'
    // }
);

let loggedIn;
let access_token;
let refresh_token;
const queue = [];
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

/* GET home page. */
router.get('/', ensureAuthenticated, function (req, res, next) {
    // loggedIn = checkIfExpired();
    res.render('spotify', { title: 'Spotify', loggedIn: loggedIn, access_token: access_token, refresh_token: refresh_token });
});

router.get('/login', ensureAuthenticated, function (req, res, next) {
    // res.render('spotify', { title: 'Spotify' });
    const state = generateRandomString(16);
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

router.get('/callback', ensureAuthenticated, function (req, res, next) {
    // your application requests refresh and access tokens
    // after checking the state parameter
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            queryString.stringify({
                error: 'state_mismatch'
            })
        );
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

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                access_token = body.access_token;
                refresh_token = body.refresh_token;
                loggedIn = true;

                const options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                // res.redirect('/#' + 
                //     queryString.stringify({
                //         access_token: access_token,
                //         refresh_token: refresh_token
                //     }));
                spotifyApi.setAccessToken(access_token);
                res.render('spotify', { loggedIn: loggedIn, access_token: access_token, refresh_token: refresh_token });

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

router.get('/refresh_token', function (req, res) {
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
            const token = body.access_token;
            res.send({
                'access_token': token
            });
        }
    });
});

router.get('/access_token', function (req, res) {
    res.send({
        'access_token': access_token
    });
});

router.get('/search', ensureAuthenticated, function (req, res) {
    const searchMe = req.query.searchKey;
    if (searchMe) {
        spotifyApi.searchTracks(searchMe)
            .then(data => {
                const d = data.body.tracks.items.filter(x => x);
                console.log(JSON.stringify(d, null, 4));
                res.send(d);
                // const data = {
                //     "album": {
                //         "album_type": "album",
                //         "artists": [
                //             {
                //                 "external_urls": {
                //                     "spotify": "https://open.spotify.com/artist/4IVAbR2w4JJNJDDRFP3E83"
                //                 },
                //                 "href": "https://api.spotify.com/v1/artists/4IVAbR2w4JJNJDDRFP3E83",
                //                 "id": "4IVAbR2w4JJNJDDRFP3E83",
                //                 "name": "6LACK",
                //                 "type": "artist",
                //                 "uri": "spotify:artist:4IVAbR2w4JJNJDDRFP3E83"
                //             }
                //         ],
                //         "available_markets": [
                //             "AD",
                //             "AR",
                //             "AT",
                //             "AU",
                //             "BE",
                //             "BG",
                //             "BO",
                //             "BR",
                //             "CA",
                //             "CH",
                //             "CL",
                //             "CO",
                //             "CR",
                //             "CY",
                //             "CZ",
                //             "DE",
                //             "DK",
                //             "DO",
                //             "EC",
                //             "EE",
                //             "ES",
                //             "FI",
                //             "FR",
                //             "GB",
                //             "GR",
                //             "GT",
                //             "HK",
                //             "HN",
                //             "HU",
                //             "ID",
                //             "IE",
                //             "IL",
                //             "IS",
                //             "IT",
                //             "JP",
                //             "LI",
                //             "LT",
                //             "LU",
                //             "LV",
                //             "MC",
                //             "MT",
                //             "MX",
                //             "MY",
                //             "NI",
                //             "NL",
                //             "NO",
                //             "NZ",
                //             "PA",
                //             "PE",
                //             "PH",
                //             "PL",
                //             "PT",
                //             "PY",
                //             "RO",
                //             "SE",
                //             "SG",
                //             "SK",
                //             "SV",
                //             "TH",
                //             "TR",
                //             "TW",
                //             "US",
                //             "UY",
                //             "VN",
                //             "ZA"
                //         ],
                //         "external_urls": {
                //             "spotify": "https://open.spotify.com/album/3fc97ZWLIMc1xawhxbKrh2"
                //         },
                //         "href": "https://api.spotify.com/v1/albums/3fc97ZWLIMc1xawhxbKrh2",
                //         "id": "3fc97ZWLIMc1xawhxbKrh2",
                //         "images": [
                //             {
                //                 "height": 640,
                //                 "url": "https://i.scdn.co/image/19b263b0ecfd34efd624df40e696f2aaed6d3705",
                //                 "width": 640
                //             },
                //             {
                //                 "height": 300,
                //                 "url": "https://i.scdn.co/image/35a7e7b0e40fa3dd8726fd7770492fe85770567b",
                //                 "width": 300
                //             },
                //             {
                //                 "height": 64,
                //                 "url": "https://i.scdn.co/image/fcad4465f781b60bdbbc797b9ff068c261542849",
                //                 "width": 64
                //             }
                //         ],
                //         "name": "East Atlanta Love Letter",
                //         "release_date": "2018-09-14",
                //         "release_date_precision": "day",
                //         "total_tracks": 14,
                //         "type": "album",
                //         "uri": "spotify:album:3fc97ZWLIMc1xawhxbKrh2"
                //     },
                //     "artists": [
                //         {
                //             "external_urls": {
                //                 "spotify": "https://open.spotify.com/artist/4IVAbR2w4JJNJDDRFP3E83"
                //             },
                //             "href": "https://api.spotify.com/v1/artists/4IVAbR2w4JJNJDDRFP3E83",
                //             "id": "4IVAbR2w4JJNJDDRFP3E83",
                //             "name": "6LACK",
                //             "type": "artist",
                //             "uri": "spotify:artist:4IVAbR2w4JJNJDDRFP3E83"
                //         },
                //         {
                //             "external_urls": {
                //                 "spotify": "https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5"
                //             },
                //             "href": "https://api.spotify.com/v1/artists/6l3HvQ5sa6mXTsMTB19rO5",
                //             "id": "6l3HvQ5sa6mXTsMTB19rO5",
                //             "name": "J. Cole",
                //             "type": "artist",
                //             "uri": "spotify:artist:6l3HvQ5sa6mXTsMTB19rO5"
                //         }
                //     ],
                //     "available_markets": [
                //         "AD",
                //         "AR",
                //         "AT",
                //         "AU",
                //         "BE",
                //         "BG",
                //         "BO",
                //         "BR",
                //         "CA",
                //         "CH",
                //         "CL",
                //         "CO",
                //         "CR",
                //         "CY",
                //         "CZ",
                //         "DE",
                //         "DK",
                //         "DO",
                //         "EC",
                //         "EE",
                //         "ES",
                //         "FI",
                //         "FR",
                //         "GB",
                //         "GR",
                //         "GT",
                //         "HK",
                //         "HN",
                //         "HU",
                //         "ID",
                //         "IE",
                //         "IL",
                //         "IS",
                //         "IT",
                //         "JP",
                //         "LI",
                //         "LT",
                //         "LU",
                //         "LV",
                //         "MC",
                //         "MT",
                //         "MX",
                //         "MY",
                //         "NI",
                //         "NL",
                //         "NO",
                //         "NZ",
                //         "PA",
                //         "PE",
                //         "PH",
                //         "PL",
                //         "PT",
                //         "PY",
                //         "RO",
                //         "SE",
                //         "SG",
                //         "SK",
                //         "SV",
                //         "TH",
                //         "TR",
                //         "TW",
                //         "US",
                //         "UY",
                //         "VN",
                //         "ZA"
                //     ],
                //     "disc_number": 1,
                //     "duration_ms": 240341,
                //     "explicit": true,
                //     "external_ids": {
                //         "isrc": "USUM71812666"
                //     },
                //     "external_urls": {
                //         "spotify": "https://open.spotify.com/track/4at3d5QWnlibMVN75ECDrp"
                //     },
                //     "href": "https://api.spotify.com/v1/tracks/4at3d5QWnlibMVN75ECDrp",
                //     "id": "4at3d5QWnlibMVN75ECDrp",
                //     "is_local": false,
                //     "name": "Pretty Little Fears (feat. J. Cole)",
                //     "popularity": 82,
                //     "preview_url": null,
                //     "track_number": 6,
                //     "type": "track",
                //     "uri": "spotify:track:4at3d5QWnlibMVN75ECDrp"
                // }
            })
            .catch(err => console.error(err));
    }
});


router.get('/play', ensureAuthenticated, function (req, res) {
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
        console.log(data);
        console.log(status);
        res.send({ data: data, status: status });
    });
});

router.get('/pushqueue', ensureAuthenticated, function (req, res) {
    if (queue.map(x => hash(x)).includes(hash(req.query))) {
        if (req.query.forcepush) {
            queue.push(req.query);
            console.log(queue);
            // req.flash('success', 'Added track to queue');
            res.send({ queue: queue });
        } else {
            res.send({ question: "Song already in queue, are you sure you want to add?" });
        }
    } else {
        queue.push(req.query);
        console.log(queue);
        // req.flash('success', 'Added track to queue successfully');
        res.send({ queue: queue });
    }
});

router.get('/getqueue', ensureAuthenticated, function (req, res) {
    res.send({ queue: queue });
});

router.get('/shiftqueue', ensureAuthenticated, function (req, res) {
    queue.shift();
    res.send({ queue: queue });
    // req.flash('success', 'Removed track from queue successfully');
});

router.get('/clearqueue', ensureAuthenticated, function (req, res) {
    queue.length = 0;
    // req.flash('success', 'Cleared queue successfully');
    res.send({ queue: queue });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

module.exports = router;
