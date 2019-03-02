const express = require('express');
const router = express.Router();

function ensureAuxMeAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index');
});

router.get('/join', function (req, res) {
    res.render('join');
});

module.exports = router;