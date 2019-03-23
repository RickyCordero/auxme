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
    socketIO = io.connect(`${window.location.hostname}:5000/`);
} else {
    socketIO = io.connect(window.location.hostname);
}

const updateSnackbar = message => {
    const snackbar = document.getElementById("snackbar");
    snackbar.className = "show";
    snackbar.innerHTML = message;
    setTimeout(function () { snackbar.className = snackbar.className.replace('show', ""); }, 3000);
};

const updatePlayback = () => {
    setTimeout(() => {
        $.get('/host/spotify/playback-state', (data, status) => {
            console.log("here's the current playback state");
            console.log(data);
            if (Object.keys(data.data.body).length && data.data.body.is_playing) {
                console.log('render pause button');
                $('#play_pause_image').text('pause');
                // render pause button
                socketIO.emit('pause', { pin: pin });
            } else {
                console.log('render play button');
                $('#play_pause_image').text('play_arrow');
                //- render play button
                socketIO.emit('play', { pin: pin });
            }
        });
    }, 500); // WAIT HALF A SECOND TO GET STATE
    console.log('Play/paused!');
};

const removeTrackFromQueue = (track) => {
    $.get('/host/removetrackfromqueue', { track: track, pin: pin }, (data, status) => {
        console.log(data);
        console.log(status);
    });
    socketIO.emit('remove-track-from-queue', { track: track, pin: pin });
};

const removeTrackFromPool = (track) => {
    $.get('/host/removetrackfrompool', { track: track, pin: pin }, (data, status) => {
        console.log(data);
        console.log(status);
    });
    socketIO.emit('remove-track-from-pool', { track: track, pin: pin });
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
    $('#queue-items').empty();
    $.get('/host/getqueue', { pin: pin }, (queueData, queueStatus) => {
        let g = new Promise((resolve, reject) => {
            //- async.eachOfSeries(queueData.queue, (queueItem, queueIdx)=>{
            async.forEachOf(queueData.queue, (queueItem, queueIdx) => {
                renderQueueTrack(queueItem, queueIdx);
                $(`#track_${queueIdx}`).on('click', event => {
                    socketIO.emit('update-snackbar', { message: `Playing ${queueItem.name}`, pin: pin });
                    socketIO.emit('update-now-playing', { artists: queueItem.artists, name: queueItem.name, uri: queueItem.uri, pin: pin });
                });
                $(`#remove_${queueIdx}`).on('click', event => {
                    console.log(queueItem);
                    removeTrackFromQueue(queueItem);
                    $(`#queue_track_${queueIdx}`).hide('slow', function () {
                        $(`#queue_track_${queueIdx}`).remove();
                    });
                });
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(null);
                }
            });
        });
        g.then(res => {
            //- cb(res);
        });
    });
};

const renderPool = () => {
    console.log('calling renderPool');
    $('#pool-items').empty();
    $.get('/host/getpool', { pin: pin }, (poolData, poolStatus) => {
        let g = new Promise((resolve, reject) => {
            async.forEachOf(poolData.pool, (poolItem, poolIdx) => {
                renderPoolTrack(poolItem, poolIdx);
                //- On click remove from pool
                $(`#pool_remove_${poolIdx}`).on('click', event => {
                    console.log(poolItem);
                    removeTrackFromPool(poolItem);
                    $(`#pool_track_${poolIdx}`).hide('slow', function () {
                        $(`#pool_track_${poolIdx}`).remove();
                    });
                });
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(null);
                }
            });
        });
        g.then(res => {
            //- cb(res);
        });
    });
};

const generatePartyCode = () => {
    $.get('/host/generate-party-code', (data, status) => {
        pin = data.pin;
        console.log('Generated party code: ' + pin);
        updateSnackbar('Generated party code: ' + pin);
        const partyHtml = `
      <a id="party-code" href='#' class="waves-effect white-text">
        Party code: ${pin}
      </a>
      `;
        $('#party-code').empty();
        $('#party-code').append(partyHtml);
        socketIO.emit('host-join', { hostName: 'Ricky', partyName: "Ricky's party", pin: pin });
    });
};

const clearQueue = () => {
    socketIO.emit('update-snackbar', { message: `Clearing queue`, pin: pin });
    $.get('/host/clearqueue', { pin: pin }, (data, status) => {
        //- renderQueue();
        socketIO.emit('render-queue', { pin: pin });
    });
};

//- On host join via client
socketIO.on('connect', data => {
    generatePartyCode();
});

//- Listen for host-join signal from server
socketIO.on('host-join', data => {
    console.log(data.message);
    //- updateSnackbar(data.message);
    renderQueue();
    updatePlayers();
});

const updatePlayers = () => {
    $.get('/host/getplayers', { pin: pin }, (data, status) => {
        $('#player-items').empty();
        data.players.forEach((player, playerIdx) => {
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
        });
    });
};

const updateNowPlaying = (data) => {
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
    $('#playback-info').empty();
    $('#playback-info').append(playbackHtml);

    $.get('/host/spotify/play', { uri: data.uri, device_id: deviceId, access_token: token }, (playData) => {
        console.log(playData);
    });
    document.title = data.name;
};

const getNowPlaying = (cb) => {
    $.get('/host/now-playing', (data, status) => {
        console.log(data);
        cb(data, status);
    });
};

//- Listen for guest-join signal from server
socketIO.on('guest-join', data => {
    console.log(data);
    const message = `guest "${data.username}" has joined the room`;
    updateSnackbar(message);
    //- socketIO.emit('host-spotify-access-token', {token: token});
    //- $.get('/host/addplayer', {username:data.username, room: data.room, socketId: data.socketId}, (data, status) => {
    //-   console.log(data);
    //-   console.log(status);
    //- });
    updatePlayers();
});

//- Listen for guest-leave signal from server
socketIO.on('guest-leave', data => {
    console.log(data);
    const username = data.username;
    updateSnackbar(`guest ${username} has left the room`);
    updatePlayers();
});

//- Listen for get-host-spotify-access-token signal from server
socketIO.on('get-host-spotify-access-token', data => {
    console.log('handling get-host-spotify-access-token event with data:');
    //- console.log('this is data.room:');
    //- console.log(data.pin);
    //- console.log(typeof(data.pin));
    //- console.log('this is the pin:');
    //- console.log(pin);
    //- console.log(typeof(pin));
    if (data.pin == pin) {
        console.log('sending token');
        socketIO.emit('host-spotify-access-token', { token: token, pin: pin });
    } else {
        console.log("a request was made for this host's spotify access token");
    }
});

//- Listen for render-queue signal from server
socketIO.on('push-queue', data => {
    console.log('going to push a track to the queue using socket.io');
    console.log(data);
    pushQueue(data.payload, data.idx);
});

//- Listen for render-queue signal from server
socketIO.on('render-queue', data => {
    console.log('going to render the queue using socket.io');
    console.log(data);
    renderQueue();
});

//- Listen for render-pool signal from server
socketIO.on('render-pool', data => {
    console.log('going to render the pool using socket.io');
    console.log(data);
    renderPool();
});

//- Listen for clear-queue signal from server
socketIO.on('clear-queue', () => {
    console.log('going to clear queue using socket.io');
    clearQueue();
});

//- Listen for update-snackbar signal from server
socketIO.on('update-snackbar', message => {
    console.log('going to update the snackbar using socket.io');
    console.log(message);
    updateSnackbar(message);
});

//- Listen for update-now-playing signal from server
socketIO.on('update-now-playing', data => {
    //- Change the now-playing track info
    updateNowPlaying(data);
    //- Change the playback button state
    updatePlayback();
});

//- const updateNowPlaying = () => {

//- };

//- Listen for get-now-playing signal from server
//- socketIO.on('get-now-playing', data => {
//-   getNowPlaying((status, data)=>{
//-     socketIO.emit('update-now-playing', {artists: data.track.artists, name: data.track.name, uri: data.track.uri, pin: pin});
//-   });
//- });


window.onSpotifyWebPlaybackSDKReady = () => {
    // authenticate the client Spotify web api
    // get token via back end using authorization code flow
    $.get('/host/spotify/access_token', function (data, status) {
        //- $.get('/spotify/all_users', function(data, status){

        token = data.access_token;
        //- socketIO.emit('host-spotify-access-token', {token: data.access_token});
        //- const tokens = data.tokens;
        //- const token = tokens[0];

        //- allUsers = data.all_users;
        function getHostAccessToken() {
            //- allUsers.forEach((user, idx)=>{
            //-   if(user.isHost){
            //-     return user.access_token;
            //-   }
            //- });
            return token;
        }
        //- Create only one Player with different auth tokens
        const player = new Spotify.Player({
            name: 'auxme',
            getOAuthToken: cb => { cb(getHostAccessToken()); }
        });

        // Error handling
        player.addListener('initialization_error', ({ message }) => { console.error(message); });
        player.addListener('authentication_error', ({ message }) => {
            // TODO: Need to test this
            console.log('yo, there was an auth error');
            //- console.error(message);
            $.get('/host/spotify/refresh_token', (data, status) => {
                token = data.token;
                alert('got a new token:', token);
            });
        });
        player.addListener('account_error', ({ message }) => { console.error(message); });
        player.addListener('playback_error', ({ message }) => {
            console.log('yo, there was a playback issue');
            console.log(message);
            //- console.log('trying to start at beginning of queue');
            //- $.get('/host/getqueue', (queueData, status)=>{
            //-   const track = queueData.queue[0];
            //-   socketIO.emit('update-snackbar', {message:`Playing ${track.name}`});
            //-   socketIO.emit('update-now-playing', {artists: track.artists, name: track.name, uri: track.uri});
            //-   const payload = {
            //-     uri: queueData.queue[0].uri,
            //-     device_id: deviceId,
            //-     access_token: token
            //-   };

            //-   $.get('/host/spotify/play', payload, (playData, playStatus) => {
            //-     document.title = track.name;
            //-   });

            //- });

            //- TODO: Determine previous playback state through current music api

        });

        const createPagination = (limit, offset) => {
            $('#left-pagination-arrow').empty();
            $('#pagination-between').empty();
            $('#right-pagination-arrow').empty();
            $('#pagination-container').show('slow');
            console.log('creating the pagination');
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
                console.log('pages: ', pages);
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
                        console.log('clicked on tracks-page button ', i);
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
            $('#track-items').empty();
            data.tracks.forEach((item, resultIdx) => {
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
                    pushQueue(payload, resultIdx);
                    //- renderQueue();
                    socketIO.emit('render-queue', { pin: pin });
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

                            $(`#playlist_${playlistIdx}`).on('click', function (event) {
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
                                            const payload = {
                                                artists: artists,
                                                name: name,
                                                minutes: minutes,
                                                seconds: seconds,
                                                uri: uri,
                                                imageUrl: track.album.images[1].url,
                                                pin: pin
                                            };
                                            pushQueue(payload, trackIdx);
                                            socketIO.emit('render-queue', { pin: pin });
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
                                        pushQueue(payload, trackIdx);
                                    });
                                    socketIO.emit('render-queue', { pin: pin });
                                });
                            });
                        } else {
                            //- TODO: Determine what to render as html instead of nothing!
                            console.log('yo, the playlist has no images');
                        }
                    });
                });
            }
            $("#playlist-container").slideToggle(speed);
        });
        //- socket.emit('render-queue');

        $('#clearqueue').on('click', event => {
            socketIO.emit('clear-queue', { pin: pin });
        });

        const shiftQueue = () => {
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
                } else {
                    console.log('yo, there was some shiftqueue error');
                }
                socketIO.emit('render-queue', { pin: pin });
            });
        };

        const pushQueue = (payload, idx) => {
            $.get('/host/pushqueue', payload, (data, status) => {
                if (data.question) { // tried to update queue but got duplicate track
                    if (confirm(data.question)) {
                        payload.forcepush = true;
                        pushQueue(payload, idx);
                        socketIO.emit('render-queue', { pin: pin });
                    } else {
                        //- user pressed cancel, queue not updated
                    }
                } else { // updated queue successfully
                    socketIO.emit('update-snackbar', { message: `Added ${payload.name} to the queue`, pin: pin });
                    console.log(data);
                    console.log(status);
                }
            });
        };

        $('#generate-party-code').on('click', event => {
            generatePartyCode();
        });

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
                //- shiftQueue();
                selectTopVotedTrack()
                    .then(track => {
                        console.log(track);
                        playTrack(track)
                            .then(res => {
                                console.log(res);
                            })
                            .catch(err => console.log(err));
                    })
                    .catch(err => console.log(err));
            }
            this.state = state;
        });

        // Ready
        player.addListener('ready', ({ device_id }) => {
            deviceId = device_id;
            //- socketIO.emit('update-snackbar', {message:`Ready with Device ID ${device_id}`});
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
                                pushQueue(payload, resultIdx);
                                //- renderQueue();
                                socketIO.emit('render-queue', { pin: pin });
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
            //- console.log('Device ID has gone offline', device_id);
            socketIO.emit('update-snackbar', { message: `Device ID ${device_id} has gone offline`, pin: pin });
        });

        // Connect to the player!
        player.connect();

        // Pause
        $('#play_pause').on('click', event => {
            player.togglePlay().then(() => {
                updatePlayback();
            });
        });

        // Previous track
        $('#previous').on('click', event => {
            player.previousTrack().then(() => {
                //- console.log('Previous!');
            });
        });

        // Next track
        $('#next').on('click', event => {
            player.nextTrack().then(() => {
                //- console.log('Next!');
            });
        });
    });
};