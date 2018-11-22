class Player {
    constructor(id, socketId, displayName, room) {
        this.id = id;
        this.socketId = socketId;
        this.displayName = displayName;
        this.room = room;
    }
}

module.exports = Player;