const express = require('express');
const router = express.Router();

function ensureAuxMeAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

module.exports = function (io) {

    // io.on('connection', function (socket) {
    //     console.log('a user has connected to index');
    // });

    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.render('index');
    });

    router.get('/members', ensureAuxMeAuthenticated, function (req, res) {
        res.render('members', { title: 'Members' });
    });

    router.get('/join', function (req, res) {
        res.render('join');
    });

    return router;
};
