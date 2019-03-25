fetch('/host/games', { credentials: "include" })
    .then(response => {
        return response.json();
    })
    .then(games => {
        renderGames(games);
    });


const renderGames = (games) => {
    document.getElementById('games').innerHTML = "";
    const cardHtml = games
        .reduce((html, game) => {
            if (game.name) {
                return html + `
                <div class="card" style="width: 18rem;">
                    <div class="card-body">
                        <h5 class="card-title">${game.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${game.pin}</h6>
                        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                        <a href="/host/game/${game.pin}" class="card-link">Go to game</a>
                        <a href="/host/deleteGame/${game.pin}" class="card-link">Delete game</a>
                    </div>
                </div>
                `;
            }
            return html
        }, "");
    document.getElementById('games').innerHTML = cardHtml;
};