const express = require('express');
const router = express.Router();

const mongoose = require("mongoose");
const utils = require('../models/utils');

require('../models/game');
require('../models/playlist');
require('../models/track');
require('../models/player');
require('../models/user');

const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();

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

router.get('/getqueue', function (req, res) {
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

module.exports = router;