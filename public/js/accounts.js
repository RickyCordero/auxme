$('#addSpotify').on('click', event => {
    fetch('/host/spotify/add', { credentials: "include", mode: "cors" })
        .then(response => {
            return response.json();
        })
        .then(results => {
            console.log(results);
        })
        .catch(err => console.log(err));
});