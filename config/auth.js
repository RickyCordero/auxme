module.exports = {
    ensureSpotifyAuthenticated: function (req, res, next) {
        // TODO: Determine how to check if a user has signed into their Spotify account
        // const spotifyAuthenticated = req.user.spotifyAuthenticated;
        const spotifyAuthenticated = req.user.spotify && req.user.spotify.accessToken != null;
        if (req.isAuthenticated() && req.user.role == "host" && spotifyAuthenticated) {
            return next();
        }
        req.flash('error_msg', 'Please log into Spotify');
        res.redirect('/host/dashboard');
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