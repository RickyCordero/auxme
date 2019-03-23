class Player {
    constructor(id, socketId, username, room) {
        this.id = id;
        this.socketId = socketId;
        this.username = username;
        this.room = room;
    }
}

module.exports = Player;