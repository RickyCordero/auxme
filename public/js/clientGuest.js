/**
 * What a guest sees
 */
// let hostToken;
// const username = "#{username}";
// let pin = "#{pin}";

// Tell Socket.io client to connect to the '/spotfy' namespace
//- const socketIO = io.connect('https://localhost:5000/');
//- const socketIO = io.connect('https://evening-everglades-10425.herokuapp.com');
//- console.log(window.location.hostname);
//- const socketIO = io.connect(window.location.hostname);
let socketIO;
if (window.location.hostname == 'localhost') { // development
    socketIO = io.connect(window.location.hostname + ":5000");
} else {
    socketIO = io.connect(window.location.hostname);
}

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
     </div>
     `;
    $('#queue-items').append(tile);
};

const renderPoolTrack = (track, idx) => {
    console.log('called renderPoolTrack');
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
         <a class="secondary-content waves-effect waves-light btn" id="pool_upvote_${idx}">
           <i class="material-icons">arrow_drop_up</i>
         </a>
         <div id="pool_upvote_count_${idx}">${votes}</div>
       </div>
     </div>
     `;
    $('#pool-items').append(tile);
};

const renderQueue = () => {
    $('#queue-items').empty();
    console.log('this is the pin before rendering the queue');
    console.log(pin);
    $.get('/host/getqueue', { pin: pin }, (queueData, queueStatus) => {
        let g = new Promise((resolve, reject) => {
            async.forEachOf(queueData.queue, (queueItem, queueIdx) => {
                renderQueueTrack(queueItem, queueIdx);
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
        console.log('got the pool from the client');
        console.log(poolData);
        let g = new Promise((resolve, reject) => {
            async.forEachOf(poolData.pool, (poolItem, poolIdx) => {
                renderPoolTrack(poolItem, poolIdx);
                $(`#pool_upvote_${poolIdx}`).on('click', event => {
                    $.get('/host/vote', { pin: pin, track: poolItem, socketId: socketIO.io.engine.id }, (data, status) => {
                        if (data.err) {
                            console.log(data.err);
                            updateSnackbar(data.err);
                        } else {
                            console.log('voted for track:');
                            console.log(poolItem);
                            console.log('here is the pool:');
                            console.log(data.pool);
                            socketIO.emit('render-pool', { pin: pin });
                            //- const count = parseInt($(`#pool_upvote_count_${poolIdx}`).text());
                            //- $(`#pool_upvote_count_${poolIdx}`).text(count+1);
                        }
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

const updateSnackbar = message => {
    const snackbar = document.getElementById("snackbar");
    snackbar.className = "show";
    snackbar.innerHTML = message;
    setTimeout(function () { snackbar.className = snackbar.className.replace('show', ""); }, 3000);
};

const clearQueue = () => {
    //- updateSnackbar(`Clearing queue`);
    //- $.get('/guest/clearqueue', (data, status)=>{
    //-   //- socketIO.emit('render-queue');
    //-   renderQueue();
    //- });
    renderQueue();
};

const pushQueue = (payload, idx) => {
    $.get('/host/pushqueue', payload, (data, status) => {
        if (data.question) { // tried to update queue but got duplicate track
            if (confirm(data.question)) {
                payload.forcepush = true;
                pushQueue(payload, idx);
                //- socketIO.emit('render-queue');
                renderQueue();
            } else {
                //- user pressed cancel, queue not updated
            }
        } else { // updated queue successfully
            socketIO.emit('update-snackbar', { message: `Added ${payload.name} to the queue`, pin: pin });
            console.log(data);
            console.log(status);
            //- TODO: Implement socket io event to emit signal to render all sockets' queue
        }
    });
};

const pushPool = (payload, idx) => {
    $.get('/host/pushpool', payload, (data, status) => {
        if (data.message) { // tried to update queue but got duplicate track
            console.log(data);
            console.log(data.message);
            updateSnackbar(data.message);
        } else { // updated queue successfully
            socketIO.emit('update-snackbar', { message: `Added ${payload.name} to the pool`, pin: pin });
            console.log(data);
            console.log(status);
        }
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

    document.title = data.name;
};

const updatePlayers = () => {
    $.get('/host/getplayers', { pin: pin }, (data, status) => {
        $('#player-items').empty();
        console.log(data);
        data.players.forEach((player, playerIdx) => {
            const playerHtml = `
         <li class="collection-item avatar" id="player_${playerIdx}">
           <span class="title">${player.username}</span>
         </li>
         `;
            $('#player-items').append(playerHtml);
        });
    });
};

//- On guest join via client
socketIO.on('connect', socket => {
    const payload = { username: username, pin: pin };
    updateSnackbar(`joining room ${pin} with name ${username}`);
    socketIO.emit('guest-join', payload);
    socketIO.emit('get-host-spotify-access-token', payload);
    socketIO.emit('get-now-playing', payload);
    renderQueue();
    renderPool();
});

//- On guest join via client
socketIO.on('guest-leave', data => {
    console.log(data);
    //- const username = data.username;
    //- const pin = data.room;
    //- const payload = {username: username, room: pin};
    updateSnackbar(`a user has left the room`);
    updatePlayers();
});

//- Listen for host-join signal from server
socketIO.on('host-join', data => {
    console.log(data.message);
    updateSnackbar(data.message);
});

//- Listen for guest-join signal from server (only other guests)
socketIO.on('guest-join', data => {
    console.log(data);
    const message = `guest "${data.username}" has joined the room`;
    updateSnackbar(message);
    renderQueue();
});

socketIO.on('no-game-found', data => {
    updateSnackbar(`No game was found with party code: ${data.pin}`);
});

socketIO.on('already-in-game', data => {
    updateSnackbar(data.message);
});

socketIO.on('already-upvoted', data => {
    updateSnackbar(data.message);
});

//- Listen for guest-join signal from server
socketIO.on('host-spotify-access-token', data => {
    hostToken = data.token;
    //- const spotifyHtml = `
    //- <li>
    //-     <a class="white-text">Spotify Connected</a>
    //- </li>
    //- `;
    //- //- $('#connected-accounts').append(spotifyHtml);
    //- $('#sidenav-left').append(spotifyHtml);
});

//- socketIO.on('get-now-playing', data => {
//-   updateNowPlaying(data);
//- });

//- Listen for render-queue signal from server
socketIO.on('push-queue', data => {
    console.log('going to push a track to the queue using socket.io');
    console.log(data);
    pushQueue(data.payload);
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
    renderPool();
});

//- Listen for remove-track-from-queue signal from server
socketIO.on('remove-track-from-queue', data => {
    console.log('going to remove a track from the queue using socket.io');
    console.log(data);
    //- a guest shares the same reference to the queue, thus only needs to render the queue
    //- removeTrackFromQueue(data.track);
    setTimeout(renderQueue, 500);
});

//- Listen for remove-track-from-pool signal from server
socketIO.on('remove-track-from-pool', data => {
    console.log('going to remove a track from the pool using socket.io');
    console.log(data);
    //- a guest shares the same reference to the queue, thus only needs to render the queue
    //- removeTrackFromQueue(data.track);
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
    //- Change the playback button state
    updateNowPlaying(data);
});

socketIO.on('play', data => {
    $('#play_pause_image').text('play_arrow');
});

socketIO.on('pause', data => {
    $('#play_pause_image').text('pause');
});

$('#show-players').on('click', event => {
    $.get('/guest/getplayers', (data, status) => {
        console.log(data);
        $('#players-list').empty();
        data.players.forEach((player, playerId) => {
            const html = `
         ID: ${player.id}
         <br>
         Nickname: ${player.nickname}
         <br>
         Spotify access token: ${player.auth.spotify}
         `;
            $('#players-list').append(html);
        });
    });
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
        if (hostToken) {
            $.get('/guest/search', { hostToken: hostToken, searchKey: event.target.value, limit: 20, offset: 0 }, (searchResults, status) => {
                $('#search_results').empty();
                setTimeout(() => {
                    searchResults.forEach((result, resultIdx) => {
                        const artists = result.artists.map(x => x.name).join(', ');
                        const name = result.name;
                        const minutes = Math.floor(result.duration_ms / 60000);
                        let seconds = Math.round((result.duration_ms / 1000) - 60 * minutes);
                        const imageUrl = result.album.images[2].url;// 64 x 64
                        const card = `
               <li class="collection-item avatar" id="result_${resultIdx}">
                 <img src="${imageUrl}" class="circle">
                 <span class="title">${name}</span>
                 <p>${artists}</p>
                 <p>Length: ${minutes}:${seconds >= 10 ? seconds : "0" + seconds}</p>
                 <a class="secondary-content waves-effect waves-light btn" id="result_${resultIdx}_add">
                   <i class="material-icons">arrow_drop_up</i>
                 </a>
               </li>
               `;
                        $('#search_results').append(card);

                        $(`#result_${resultIdx}_add`).on('click', event => {
                            console.log(socketIO.io.engine.id);
                            const payload = {
                                artists: artists,
                                name: name,
                                minutes: minutes,
                                seconds: seconds,
                                uri: result.uri,
                                imageUrl: result.album.images[1].url,
                                pin: pin,
                                votes: 1,
                                votedBy: [socketIO.io.engine.id],
                                socketId: socketIO.io.engine.id
                            };
                            pushPool(payload, resultIdx);
                            socketIO.emit('render-pool', { pin: pin });
                        });
                    });
                }, 5);
            });
        } else {
            updateSnackbar('Please sign into Spotify');
        }

    } else {
        $('#search_results').empty();
        $("#host-content").show('slow');
        $('#search-content').hide('slow');
    }
});