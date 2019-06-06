const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

const expiredTest = (access_token, cb) => {
    // Tests if a spotify access token is expired by running a test query
    // and reporting an error to the callback
    console.log('in the expired test function');
    spotifyApi.setAccessToken(access_token);
    spotifyApi.getMe().then(data => {
        console.log("in the expired test getMe test function");
        cb(null, data);
    })
    .catch(err=>{
        console.log('yo, there was an error in the expiredTest spotify getMe function');
        cb(err);
    });
}
module.exports = {
    ensureHostSpotifyAuthenticated: function (req, res, next) {
        // Determines if a user has signed into their Spotify account and has a valid access token
        if(req.user.spotify){
            console.log('spotify account found for user');
            expiredTest(req.user.spotify.access_token, (err, res)=>{
                if (err){
                    // error
                    // req.flash('error_msg', 'Please log into Spotify');
                    console.log("spotify access token expired, need to redirect user to spotify login");
                    console.log(err);
                    res.redirect('/host/spotify/add');
                } else {
                    console.log("spotify access token not expired, user should be redirected to original route");
                    console.log(res); // not expired
                    host_authenticated = req.isAuthenticated() && req.user.role == "host";
                    console.log(host_authenticated);
                    // TODO: Determine if user also needs to be signed in
                    // if (host_authenticated) {
                    //     return next();
                    // } else {
                    //     return 
                    // }
                    next();
                }
            });
        } else {
            // TODO: Need to test this case
            console.log('user does not have a spotify account, need to redirect user to spotify login');
            // req.flash('error_msg', 'Please log into Spotify');
            // res.redirect('/host/dashboard');
            res.redirect('/host/spotify/add');
            // if (req.isAuthenticated() && req.user.role == "host" && spotifyAuthenticated) {
            //     return next();
            // }
            // req.flash('error_msg', 'Please log into Spotify');
            // // res.redirect('/host/dashboard');
            // res.redirect('/host/spotify/login');
        }
    },
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Must be a user or guest to view this resource');
        res.redirect('/');
    },
    ensureHostAuthenticated: function (req, res, next) {
        if (req.isAuthenticated() && req.user.role == "host") {
            return next();
        }
        req.flash('error_msg', 'Please log in to view this resource');
        res.redirect('/host/login');
    },
    ensureGuestAuthenticated: function (req, res, next) {
        if (req.isAuthenticated() && req.user.role == "guest") {
            return next();
        } else {
            req.flash('error_msg', 'Please join a game to access this resource');
            res.redirect('/guest/join');
        }
    },
}