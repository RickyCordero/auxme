class Game {
    constructor(host, players, partyId, partyName, queue) {
        this.host = host;
        this.players = players;
        this.partyId = partyId;
        this.partyName = partyName;
        this.queue = queue;
    }

}

module.exports = Game;