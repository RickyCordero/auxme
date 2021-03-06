/**
 * What a host sees
 */
const renderPartyView = () => {
    $('#party-view').show('slow');
};

const renderHostView = () => {
    $('#host-view').show('slow');
};

$('#party-link').on('click', event => {
    $('#host-view').hide('slow');
    renderPartyView();
});

$('#host-link').on('click', event => {
    $('#party-view').hide('slow');
    renderHostView();
});

let deviceId;
let token;
let pin;

// Tell Socket.io client to connect to the '/' namespace
let socketIO;
// TODO: This needs to be generalized
if (window.location.hostname == 'localhost') { // development
    console.log('in development mode');
    const socket_url = `${window.location.hostname}:5000/`;
    console.log(socket_url);
    socketIO = io.connect(socket_url);
} else {
    socketIO = io.connect(window.location.hostname);
}

const updateSnackbar = message => {
    const snackbar = document.getElementById("snackbar");
    snackbar.className = "show";
    snackbar.innerHTML = message;
    setTimeout(() => { snackbar.className = snackbar.className.replace('show', ""); }, 3000);
};

const updatePlayback = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            $.get('/host/spotify/playback-state', (data, status) => {
                console.log("here's the current playback state");
                console.log(data);
                if (data) {
                    if (Object.keys(data.data.body).length && data.data.body.is_playing) {
                        console.log('render pause button');
                        $('#play_pause_image').text('pause');
                        // render pause button
                        socketIO.emit('pause', { pin: pin });
                    } else {
                        console.log('render play button');
                        $('#play_pause_image').text('play_arrow');
                        // render play button
                        socketIO.emit('play', { pin: pin });
                    }
                    resolve();
                } else {
                    reject('playback state data not found');
                }
            });
        }, 500); // WAIT HALF A SECOND TO GET STATE
        console.log('Play/paused!');
    });
};

const removeTrackFromQueue = (track) => {
    return new Promise((resolve, reject) => {
        $.get('/host/removetrackfromqueue', { track: track, pin: pin }, (queueData, queueStatus) => {
            console.log(queueData);
            console.log(queueStatus);
            if (queueData) {
                socketIO.emit('remove-track-from-queue', { track: track, pin: pin });
                resolve();
            } else {
                reject('queue data not found');
            }
        });
    });
};

const removeTrackFromPool = (track) => {
    return new Promise((resolve, reject) => {
        $.get('/host/removetrackfrompool', { track: track, pin: pin }, (poolData, poolStatus) => {
            console.log(poolData);
            console.log(poolStatus);
            if (poolData) {
                socketIO.emit('remove-track-from-pool', { track: track, pin: pin });
                resolve();
            } else {
                reject('pool data not found');
            }
        });
    });
};

const renderQueueTrack = (track, idx) => {
    const artists = track.artists;
    const name = track.name;
    const minutes = track.minutes;
    let seconds = track.seconds;
    const imageUrl = track.imageUrl;
    const uri = track.uri;
    const tile = `
    <div class="card small" id="queue_track_${idx}">
      <div class="card-image waves-effect waves-light" id="track_${idx}">
        <img src="${imageUrl}">
        <span class="card-title card-title-custom">${artists}</span>
      </div>
      <div class="card-content card-content-custom">
        <span>${name}</span>
      </div>
      <div class="card-action">
        <div class="remove" id="remove_${idx}">REMOVE FROM QUEUE</div>
      </div>
    </div>
    `;
    $('#queue-items').append(tile);
};

const renderPoolTrack = (track, idx) => {
    console.log('calling renderPoolTrack');
    const artists = track.artists;
    const name = track.name;
    const minutes = track.minutes;
    let seconds = track.seconds;
    const imageUrl = track.imageUrl;
    const uri = track.uri;
    const votes = track.votes;
    const tile = `
    <div class="card small" id="pool_track_${idx}">
      <div class="card-image waves-effect waves-light" id="pool_track_image_${idx}">
        <img src="${imageUrl}">
        <span class="card-title card-title-custom">${artists}</span>
      </div>
      <div class="card-content card-content-custom">
        <span>${name}</span>
      </div>
      <div class="card-action">
        <div id="pool_upvote_count_${idx}">${votes}</div>
        <div class="remove" id="pool_remove_${idx}">REMOVE FROM POOL</div>
      </div>
    </div>
    `;
    $('#pool-items').append(tile);
};

const renderQueue = () => {
    return new Promise((resolve, reject) => {
        console.log('rendering the queue');
        $.get('/host/getqueue', { pin: pin }, (queueData, queueStatus) => {
            if (queueData && queueData.queue) {
                $('#queue-items').empty();
                async.forEachOf(queueData.queue, (queueItem, queueIdx, eachCb) => {

                    renderQueueTrack(queueItem, queueIdx);
                    $(`#track_${queueIdx}`).on('click', event => {
                        socketIO.emit('update-snackbar', { message: `Playing ${queueItem.name}`, pin: pin });
                        socketIO.emit('update-now-playing', { artists: queueItem.artists, name: queueItem.name, uri: queueItem.uri, pin: pin });
                    });
                    $(`#remove_${queueIdx}`).on('click', event => {
                        console.log(queueItem);
                        removeTrackFromQueue(queueItem)
                            .then(() => {
                                $(`#queue_track_${queueIdx}`).hide('slow', function () {
                                    $(`#queue_track_${queueIdx}`).remove();
                                });
                            })
                            .catch(err => console.log(err));
                    });
                }, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject('queue data not found');
            }
        });
    });
};

const renderPool = () => {
    return new Promise((resolve, reject) => {
        $.get('/host/getpool', { pin: pin }, (poolData, poolStatus) => {
            if (poolData && poolData.pool) {
                $('#pool-items').empty();
                async.forEachOf(poolData.pool, (poolItem, poolIdx) => {
                    renderPoolTrack(poolItem, poolIdx);
                    // On click remove from pool
                    $(`#pool_remove_${poolIdx}`).on('click', event => {
                        console.log(poolItem);
                        removeTrackFromPool(poolItem)
                            .then(() => {
                                $(`#pool_track_${poolIdx}`).hide('slow', function () {
                                    $(`#pool_track_${poolIdx}`).remove();
                                });
                            })
                            .catch(err => console.log(err));
                    });
                }, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject('pool data not found');
            }
        });
    });
};

const clearQueue = () => {
    return new Promise((resolve, reject) => {
        socketIO.emit('update-snackbar', { message: `Clearing queue`, pin: pin });
        $.get('/host/clearqueue', { pin: pin }, (queueData, queueStatus) => {
            if (queueData) {
                socketIO.emit('render-queue', { pin: pin });
                resolve();
            } else {
                reject('queue data not found');
            }
        });
    });
};

// On host join via client
socketIO.on('connect', data => {
    console.log('in the socketIO on connect function');
    $.get('/host/game/current', (gameData, status)=>{
        console.log('got the game pin');
        pin = gameData.pin;
        const payload = {
            pin: pin
        }
        socketIO.emit('host-join', payload);
    });
});

// Listen for host-join signal from server
socketIO.on('host-join', data => {
    updateSnackbar(data.message);
    renderQueue()
        .then(updatePlayers)
        .catch(err => console.log(err));
});

const updatePlayers = () => {
    return new Promise((resolve, reject) => {
        $.get('/host/getplayers', { pin: pin }, (data, status) => {
            if (data && data.players) {
                $('#player-items').empty();
                async.forEachOf(data.players, (player, playerIdx) => {
                    let playerHtml = "";
                    if (player.isHost) {
                        playerHtml = `
                  <li class="collection-item avatar" id="player_${playerIdx}">
                    <span class="title">${player.username}</span>
                    <span>[HOST]</span>
                  </li>
                  `;
                    } else {
                        playerHtml = `
                  <li class="collection-item avatar" id="player_${playerIdx}">
                    <span class="title">${player.username}</span>
                    <span>[GUEST]</span>
                  </li>
                  `;
                    }
                    $('#player-items').append(playerHtml);
                }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject('player data not found');
            }
        });
    })
};

const updateNowPlaying = (data) => {
    return new Promise((resolve, reject) => {
        console.log('going to update the now playing info using socket.io');
        console.log(data);
        const playbackHtml = `
        <h5 id="now-playing-song" class="white-text">
          ${data.name}
        </h5>
        <p id="now-playing-artist" class="white-text">
          ${data.artists}
        </p>
        `;
        $.get('/host/spotify/play', { uri: data.uri, device_id: deviceId, access_token: token }, (playData) => {
            console.log(playData);
            if (playData) {
                $('#playback-info').empty();
                $('#playback-info').append(playbackHtml);
                document.title = data.name;
                resolve();
            } else {
                reject('play data not found');
            }
        });
    });
};

const getNowPlaying = () => {
    return new Promise((resolve, reject) => {
        $.get('/host/now-playing', (data, status) => {
            console.log(data);
            if (data) {
                resolve(data);
            } else {
                reject('now playing data not found');
            }
        });
    })
};

// Listen for guest-join signal from server
socketIO.on('guest-join', data => {
    console.log(data);
    const message = `guest "${data.username}" has joined the room`;
    updateSnackbar(message);
    // socketIO.emit('host-spotify-access-token', {token: token});
    // $.get('/host/addplayer', {username:data.username, room: data.room, socketId: data.socketId}, (data, status) => {
    //   console.log(data);
    //   console.log(status);
    // });
    updatePlayers();
});

// Listen for guest-leave signal from server
socketIO.on('guest-leave', data => {
    console.log(data);
    const username = data.username;
    updateSnackbar(`guest ${username} has left the room`);
    updatePlayers();
});

// Listen for get-host-spotify-access-token signal from server
socketIO.on('get-host-spotify-access-token', data => {
    console.log('handling get-host-spotify-access-token event with data:');
    if (data.pin == pin) {
        console.log('sending token');
        socketIO.emit('host-spotify-access-token', { token: token, pin: pin });
    } else {
        console.log("a request was made for this host's spotify access token");
    }
});

// Listen for render-queue signal from server
socketIO.on('push-queue', data => {
    console.log('going to push a track to the queue using socket.io');
    console.log(data);
    pushQueue(data.payload, data.idx)
        .then(() => {

        })
        .catch(err => {
            console.log(err);
        });
});

// Listen for render-queue signal from server
socketIO.on('render-queue', data => {
    console.log('going to render the queue using socket.io');
    console.log(data);
    renderQueue()
        .catch(err => console.log(err));
});

// Listen for render-pool signal from server
socketIO.on('render-pool', data => {
    console.log('going to render the pool using socket.io');
    console.log(data);
    renderPool()
        .catch(err => console.log(err));
});

// Listen for clear-queue signal from server
socketIO.on('clear-queue', () => {
    console.log('going to clear queue using socket.io');
    clearQueue();
});

// Listen for update-snackbar signal from server
socketIO.on('update-snackbar', message => {
    console.log('going to update the snackbar using socket.io');
    console.log(message);
    updateSnackbar(message);
});

// Listen for update-now-playing signal from server
socketIO.on('update-now-playing', data => {
    // Change the now-playing track info
    updateNowPlaying(data)
        // Change the playback button state
        .then(updatePlayback);
});

// const updateNowPlaying = () => {

// };

// // Listen for get-now-playing signal from server
// socketIO.on('get-now-playing', _data => {
//     getNowPlaying()
//         .then(data => {
//             socketIO.emit('update-now-playing', { artists: data.track.artists, name: data.track.name, uri: data.track.uri, pin: pin });
//         });
// });


window.onSpotifyWebPlaybackSDKReady = () => {
    // authenticate the client Spotify web api
    // get token via back end using authorization code flow
    $.get('/host/spotify/access_token', function (data, status) {
        //- $.get('/spotify/all_users', function(data, status){

        token = data.access_token;
        console.log(token);
        // socketIO.emit('host-spotify-access-token', {token: data.access_token});
        // const tokens = data.tokens;
        // const token = tokens[0];

        // allUsers = data.all_users;
        function getHostAccessToken() {
            // allUsers.forEach((user, idx)=>{
            //   if(user.isHost){
            //     return user.access_token;
            //   }
            // });
            return token;
        }
        // Create only one Player with different auth tokens
        const player = new Spotify.Player({
            name: 'auxme',
            getOAuthToken: cb => { cb(getHostAccessToken()); }
        });

        // Error handling
        player.addListener('initialization_error', ({ message }) => { console.error(message); });
        player.addListener('authentication_error', ({ message }) => {
            // TODO: Need to test this
            console.log('yo, there was an auth error');
            // console.error(message);
            $.get('/host/spotify/refresh_token', (data, status) => {
                token = data.token;
                alert('got a new token:', token);
            });
        });
        player.addListener('account_error', ({ message }) => { console.error(message); });
        player.addListener('playback_error', ({ message }) => {
            console.log('yo, there was a playback issue');
            console.log(message);
            // console.log('trying to start at beginning of queue');
            // $.get('/host/getqueue', (queueData, status)=>{
            //   const track = queueData.queue[0];
            //   socketIO.emit('update-snackbar', {message:`Playing ${track.name}`});
            //   socketIO.emit('update-now-playing', {artists: track.artists, name: track.name, uri: track.uri});
            //   const payload = {
            //     uri: queueData.queue[0].uri,
            //     device_id: deviceId,
            //     access_token: token
            //   };

            //   $.get('/host/spotify/play', payload, (playData, playStatus) => {
            //     document.title = track.name;
            //   });

            // });

            // TODO: Determine previous playback state through current music api

        });

        const createPagination = (limit, offset) => {
            $('#left-pagination-arrow').empty();
            $('#pagination-between').empty();
            $('#right-pagination-arrow').empty();
            $('#pagination-container').show('slow');
            $.get('/host/spotify/mytracks', { limit: limit, offset: offset }, (data, status) => {
                const leftArrowHtml = `
                    <a href="#!">
                    <i class="material-icons">
                        chevron_left
                    </i>
                    </a>
                `;
                $('#left-pagination-arrow').append(leftArrowHtml);
                const rightArrowHtml = `
                    <a href="#!">
                    <i class="material-icons">
                        chevron_right
                    </i>
                    </a>
                `;
                $('#right-pagination-arrow').append(rightArrowHtml);
                const totalTracks = data.total;
                const pages = Math.ceil(totalTracks / limit);
                for (let i = 1; i <= pages; i++) {
                    const pagesHtml = `
                    <li id="page-${i}" class="waves-effect page">
                    <a class="tracks-page-button" id="tracks-page-button-${i}" href="#">
                        ${i}
                    </a>
                    </li>
                    `;
                    $('#pagination-between').append(pagesHtml);
                    $(`#tracks-page-button-${i}`).on('click', event => {
                        $.get('/host/spotify/mytracks', { limit: limit, offset: limit * (i - 1) }, (data, status) => {
                            console.log(data);
                            renderSavedTracks(data);
                        });
                        if (i == 1) {
                            $('#left-pagination-arrow').addClass('disabled');
                            $('#right-pagination-arrow').removeClass('disabled');
                            $('#right-pagination-arrow').addClass('waves-effect');
                        } else if (i == pages) {
                            $('#left-pagination-arrow').removeClass('disabled');
                            $('#left-pagination-arrow').addClass('waves-effect');
                            $('#right-pagination-arrow').addClass('disabled');
                        } else {
                            $('#left-pagination-arrow').removeClass('disabled');
                            $('#right-pagination-arrow').removeClass('disabled');
                        }
                        $('.page').removeClass('active');
                        $(`#page-${i}`).addClass('active');
                    });
                };
            });
        };

        const renderSavedTracks = (data) => {
            return new Promise((resolve, reject) => {
                $('#track-items').empty();
                async.forEachOf(data.tracks, (item, resultIdx, eachCb) => {
                    const track = item.track;
                    const artists = track.artists.map(x => x.name).join(', ');
                    const name = track.name;
                    const minutes = Math.floor(track.duration_ms / 60000);
                    let seconds = Math.round((track.duration_ms / 1000) - 60 * minutes);
                    const imageUrl = track.album.images[2].url;// 64 x 64
                    const uri = track.uri;
                    const trackCardHtml = `
                    <li class="collection-item avatar" id="track_${resultIdx}">
                        <img src="${imageUrl}" class="circle">
                        <span class="title">${name}</span>
                        <p>${artists}</p>
                        <p>Length: ${minutes}:${seconds >= 10 ? seconds : "0" + seconds}</p>
                        <a class="secondary-content waves-effect waves-light btn" id="track_${resultIdx}_add">
                        <i class="material-icons">add</i>
                        </a>
                    </li>
                    `;
                    $('#track-items').append(trackCardHtml);

                    $(`#track_${resultIdx}`).on('dblclick', event => {
                        socketIO.emit('update-snackbar', { message: `Playing ${name}`, pin: pin });
                        socketIO.emit('update-now-playing', { artists: artists, name: name, uri: uri, pin: pin });
                        const payload = {
                            uri: uri,
                            device_id: deviceId,
                            access_token: token
                        };
                        $.get('/host/spotify/play', payload, (playData, playStatus) => {
                        });
                        document.title = track.name;
                    });

                    $(`#track_${resultIdx}_add`).on('click', event => {
                        const payload = {
                            artists: artists,
                            name: name,
                            minutes: minutes,
                            seconds: seconds,
                            uri: uri,
                            imageUrl: track.album.images[1].url,
                            pin: pin
                        };
                        pushQueue(payload, resultIdx)
                            .then(() => {
                                socketIO.emit('render-queue', { pin: pin });
                            })
                            .catch(err => console.log(err));
                    });
                }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };

        $('#my-tracks').on('click', event => {
            $('#playlist-container').hide('slow');
            $('#track-items').empty();
            const limit = 20;
            const offset = 0;
            const speed = 500;
            if (!$('#track-container').is(':visible')) {
                createPagination(limit, offset);
            }
            $('#track-container').slideToggle(speed);
        });

        $('#my-playlists').on('click', event => {
            $('#playlist-track-items').empty();
            $('#track-container').hide('slow');
            const speed = 500;
            if (!$('#playlist-container').is(':visible')) {
                $('#playlist-items').empty();
                $.get('/host/spotify/myplaylists', (playlistData, status) => {
                    const playlists = playlistData.data.body.items;
                    playlists.forEach((playlist, playlistIdx) => {
                        if (playlist.images.length > 0) {
                            const playlistItemHtml = `
                            <div class="card small playlist-items">
                            <div class="card-image playlist-image" id="playlist_${playlistIdx}">
                                <img src="${playlist.images[0].url}">
                            </div>
                            <div class="card-content playlist-title">${playlist.name}</div>
                            <div class="card-action add-to-queue" id="add-to-queue-${playlistIdx}">ADD PLAYLIST TO QUEUE</div>
                            </div>
                            `;
                            $('#playlist-items').append(playlistItemHtml);

                            $(`#playlist_${playlistIdx}`).on('click', (event) => {
                                $('#playlist-track-items').empty();
                                $('#track-container').hide('slow');
                                $.get('/host/spotify/playlist-tracks', { playlist_id: playlist.id }, (playlistTracksData, status) => {
                                    const playlistTracks = playlistTracksData.tracks;
                                    playlistTracks.forEach((playlistTrack, trackIdx) => {

                                        const track = playlistTrack.track;
                                        const artists = track.artists.map(x => x.name).join(', ');
                                        const name = track.name;
                                        const minutes = Math.floor(track.duration_ms / 60000);
                                        let seconds = Math.round((track.duration_ms / 1000) - 60 * minutes);
                                        const imageUrl = track.album.images[2].url;// 64 x 64
                                        const uri = track.uri;
                                        const playlistTrackHtml = `
                                        <li class="collection-item avatar" id="playlist-track-${trackIdx}">
                                            <img src="${imageUrl}" class="circle">
                                            <span class="title">${name}</span>
                                            <p>${artists}</p>
                                            <p>Length: ${minutes}:${seconds >= 10 ? seconds : "0" + seconds}</p>
                                            <a class="secondary-content waves-effect waves-light btn" id="playlist-track-${trackIdx}-add">
                                            <i class="material-icons">add</i>
                                            </a>
                                        </li>
                                        `;
                                        $('#playlist-track-items').append(playlistTrackHtml);
                                        $(`#playlist-track-${trackIdx}`).on('dblclick', event => {
                                            socketIO.emit('update-snackbar', { message: `Playing ${name}`, pin: pin });
                                            socketIO.emit('update-now-playing', { artists: artists, name: name, uri: uri, pin: pin });
                                            const payload = {
                                                uri: uri,
                                                device_id: deviceId,
                                                access_token: token
                                            };

                                            $.get('/host/spotify/play', payload, (playData) => {
                                                document.title = name;
                                            });
                                        });

                                        $(`#playlist-track-${trackIdx}-add`).on('click', event => {
                                            console.log('adding playlist track to queue with payload:');
                                            console.log(JSON.stringify(payload, null, 4));

                                            const payload = {
                                                artists: artists,
                                                name: name,
                                                minutes: minutes,
                                                seconds: seconds,
                                                uri: uri,
                                                imageUrl: track.album.images[1].url,
                                                pin: pin
                                            };
                                            console.log(pin);
                                            pushQueue(payload, trackIdx)
                                                .then(() => {
                                                    socketIO.emit('render-queue', { pin: pin });
                                                })
                                                .catch(err => console.log(err));
                                        });
                                    });
                                });
                            });

                            $(`#add-to-queue-${playlistIdx}`).on('click', function (event) {
                                $.get('/host/spotify/playlist-tracks', { playlist_id: playlist.id }, (playlistTracksData, status) => {
                                    const playlistTracks = playlistTracksData.tracks;
                                    playlistTracks.forEach((playlistTrack, trackIdx) => {
                                        const track = playlistTrack.track;
                                        const minutes = Math.floor(track.duration_ms / 60000);
                                        let seconds = Math.round((track.duration_ms / 1000) - 60 * minutes);
                                        const imageUrl = track.album.images[2].url;// 64 x 64
                                        const payload = {
                                            artists: track.artists.map(x => x.name).join(', '),
                                            name: track.name,
                                            minutes: minutes,
                                            seconds: seconds,
                                            uri: track.uri,
                                            imageUrl: track.album.images[1].url,
                                            pin: pin
                                        };
                                        pushQueue(payload, trackIdx)
                                            .then(() => {

                                            })
                                            .catch(err => console.log(err));

                                    });
                                    socketIO.emit('render-queue', { pin: pin });
                                });
                            });
                        } else {
                            // TODO: Determine what to render as html instead of nothing!
                            console.log('yo, the playlist has no images');
                        }
                    });
                });
            }
            $("#playlist-container").slideToggle(speed);
        });

        $('#clearqueue').on('click', event => {
            socketIO.emit('clear-queue', { pin: pin });
        });

        const shiftQueue = () => {
            return new Promise((resolve, reject) => {
                $.get('/host/shiftqueue', { pin: pin }, (queueData, queueStatus) => {
                    if (queueData) {
                        const queueItem = queueData.queue[0];
                        if (queueItem) {
                            $.get('/host/spotify/play', { uri: queueItem.uri, device_id: deviceId, access_token: token }, (playData) => {
                                socketIO.emit('update-snackbar', { message: `Now playing ${queueItem.name}`, pin: pin });
                                socketIO.emit('update-now-playing', { artists: queueItem.artists, name: queueItem.name, uri: queueItem.uri, pin: pin });
                                document.title = queueItem.name;
                            });
                        } else {
                            socketIO.emit('update-snackbar', { message: `The queue is empty`, pin: pin });
                            socketIO.emit('update-now-playing', { artists: '', name: '', uri: '', pin: pin });
                            document.title = "auxme";
                        }
                        socketIO.emit('render-queue', { pin: pin });
                        resolve();
                    } else {
                        reject('yo, there was some shiftqueue error');
                    }
                });
            });
        };

        const pushQueue = (payload, idx) => {
            return new Promise((resolve, reject) => {
                $.get('/host/pushqueue', payload, (data, status) => {
                    if (data) {
                        if (data.question) { // tried to update queue but got duplicate track
                            if (confirm(data.question)) {
                                payload.forcepush = true;
                                pushQueue(payload, idx)
                                    .then(() => {
                                        socketIO.emit('render-queue', { pin: pin });
                                        resolve();
                                    })
                                    .catch(err => {
                                        reject(err);
                                    });
                            } else {
                                // user pressed cancel, queue not updated
                                resolve();
                            }
                        } else { // updated queue successfully
                            socketIO.emit('update-snackbar', { message: `Added ${payload.name} to the queue`, pin: pin });
                            console.log(data);
                            console.log(status);
                            resolve();
                        }
                    } else {
                        reject('queue data not found');
                    }
                });
            });
        };

        const selectTopVotedTrack = () => {
            return new Promise((resolve, reject) => {
                $.get('/host/topvotedtrack', { pin: pin }, (data, status) => {
                    console.log(data.track);
                    if (data.track) {
                        resolve(data.track);
                    } else {
                        reject('yo, there was an error getting the top voted track in the pool');
                    }
                });
            });
        }

        const playTrack = (track) => {
            return new Promise((resolve, reject) => {
                if (track) {
                    $.get('/host/spotify/play', { uri: track.uri, device_id: deviceId, access_token: token }, (_playData, _playStatus) => {
                        socketIO.emit('update-snackbar', { message: `Now playing ${track.name}`, pin: pin });
                        socketIO.emit('update-now-playing', { artists: track.artists, name: track.name, uri: track.uri, pin: pin });
                        document.title = track.name;
                        resolve('successfully played track');
                    });
                } else {
                    reject('track is null');
                }
            });
        }

        player.addListener('player_state_changed', state => {
            console.log(state);
            if (this.state && !this.state.paused && state.paused && state.position === 0) {
                // track ended
                // shiftQueue();
                selectTopVotedTrack()
                    .then(playTrack(track))
                    .catch(err => console.log(err));
            }
            this.state = state;
        });

        // Ready
        player.addListener('ready', ({ device_id }) => {
            deviceId = device_id;
        });


        $("#close-search").on('click', event => {
            $('#search').val('');
            $('#search-content').hide('slow');
            $("#host-content").show('slow');
        });

        // Search
        $('#search').on('input', event => {
            if (event.target.value) {
                $("#host-content").hide('slow');
                $('#search-content').show('slow');
                $.get('/host/spotify/search', { searchKey: event.target.value, limit: 20, offset: 0 }, (searchResults, status) => {
                    $('#search_results').empty();
                    setTimeout(() => {
                        searchResults.forEach((result, resultIdx) => {
                            const artists = result.artists.map(x => x.name).join(', ');
                            const name = result.name;
                            const minutes = Math.floor(result.duration_ms / 60000);
                            let seconds = Math.round((result.duration_ms / 1000) - 60 * minutes);
                            const imageUrl = result.album.images[2].url;// 64 x 64
                            const uri = result.uri;
                            const resultCardHtml = `
                            <li class="collection-item avatar" id="result_${resultIdx}">
                            <img src="${imageUrl}" class="circle">
                            <span class="title">${name}</span>
                            <p>${artists}</p>
                            <p>Length: ${minutes}:${seconds >= 10 ? seconds : "0" + seconds}</p>
                            <a class="secondary-content waves-effect waves-light btn" id="result_${resultIdx}_add">
                                <i class="material-icons">add</i>
                            </a>
                            </li>
                            `;
                            $('#search_results').append(resultCardHtml);

                            $(`#result_${resultIdx}`).on('dblclick', event => {
                                socketIO.emit('update-snackbar', { message: `Playing ${name}`, pin: pin });
                                socketIO.emit('update-now-playing', { artists: artists, name: name, uri: uri, pin: pin });
                                const payload = {
                                    uri: uri,
                                    device_id: deviceId,
                                    access_token: token
                                };

                                $.get('/host/spotify/play', payload, (playData, playStatus) => {
                                    document.title = result.name;
                                });
                            });

                            $(`#result_${resultIdx}_add`).on('click', event => {
                                const payload = {
                                    artists: artists,
                                    name: name,
                                    minutes: minutes,
                                    seconds: seconds,
                                    uri: uri,
                                    imageUrl: result.album.images[1].url,
                                    pin: pin
                                };
                                pushQueue(payload, resultIdx)
                                    .then(() => {
                                        socketIO.emit('render-queue', { pin: pin });
                                    })
                                    .catch(err => console.log(err));
                            });
                        });
                    }, 5);
                });
            } else {
                $('#search_results').empty();
                $("#host-content").show('slow');
                $('#search-content').hide('slow');
            }
        });

        // Not Ready
        player.addListener('not_ready', ({ device_id }) => {
            // console.log('Device ID has gone offline', device_id);
            socketIO.emit('update-snackbar', { message: `Device ID ${device_id} has gone offline`, pin: pin });
        });

        // Connect to the player!
        player.connect();

        // Pause
        $('#play_pause').on('click', event => {
            player.togglePlay()
                .then(updatePlayback)
                .catch(err => console.log(err));
        });

        // Previous track
        $('#previous').on('click', event => {
            player.previousTrack().then(() => {
                // console.log('Previous!');
            });
        });

        // Next track
        $('#next').on('click', event => {
            player.nextTrack().then(() => {
                // console.log('Next!');
            });
        });
    });
};