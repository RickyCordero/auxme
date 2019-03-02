const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: './uploads' });
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const mongoose = require("mongoose");
const utils = require('../models/utils');

require('../models/user');

const User = mongoose.model('User');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send("This route doesn't do anything yet");
});

router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Register' });
});

router.get('/login', function (req, res, next) {
  res.render('login', { title: 'Login' });
});

router.post('/login',
  passport.authenticate('local', { failureRedirect: '/users/login', failureFlash: 'Invalid username or password' }),
  function (req, res) {
    req.flash('success', 'You are now logged in');
    res.redirect('/host');
  });

// Passport
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  utils.getUserById(User, id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(function (username, password, done) {

  utils.getUserByUsername(User, username, function (err, user) {
    if (err) throw err;
    if (!user) {
      return done(null, false, { message: 'Unknown User' });
    }

    utils.comparePassword(password, user.password, function (err, isMatch) {
      if (err) return done(err);
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid Password' });
      }
    });
  });
}));

router.post('/register', upload.single('profileimage'), function (req, res, next) {
  const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const password2 = req.body.password2;
  let profileimage;
  if (req.file) {
    profileimage = req.file.filename;
  } else {
    profileimage = 'noimage.jpg';
  }

  // Form Validator
  req.checkBody('name', 'Name field is required').notEmpty();
  req.checkBody('email', 'Email field is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('username', 'Username field is required').notEmpty();
  req.checkBody('password', 'Password field is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  // Check Errors
  const errors = req.validationErrors();

  if (errors) {
    res.render('register', {
      errors: errors
    });
  } else {
    const newUser = new User({
      name: name,
      email: email,
      username: username,
      password: password,
      profileimage: profileimage
    });

    utils.createUser(newUser, function (err, user) {
      if (err) throw err;
      console.log('created new user successfully');
    });

    req.flash('success', 'You are now registered and can login');

    res.location('/');
    res.redirect('/users/login');
  }
});

router.get('/logout', function (req, res) {
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/users/login'); // Can be the homepage as well
});

module.exports = router;