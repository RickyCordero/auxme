const express = require('express');
const router = express.Router();

// Authorization
const { ensureAuthenticated } = require('../config/auth');

router.get('/', function (req, res, next) {
    res.render('index');
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    // Dashboard Page
    if (req.user && req.user.role == "host") {
        res.redirect('/host/dashboard');
    } else if (req.user && req.user.role == "guest") {
        res.redirect('/guest/dashboard');
    } else {
        res.redirect('/');
    }
});


module.exports = router;