# AuxMe

AuxMe is a party playlist curation web application

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Make sure Node.js, and MongoDB are installed on your system.

In order to make full use of AuxMe as a host, you will need a Spotify Premium account.

Head over to https://developer.spotify.com/dashboard/ to create a new Spotify app.

Once your app has been created, find your app's Client ID and Client Secret as they will be needed to construct the environment file below.

After creating the app, you must specify both a development and production Redirect URI using the Spotify developers dashboard for your app. Copy these as they will be needed to construct the environment file below.


### Installing

How to get a development env running:

- Create the environment file with the Client ID and Client Secret of your Spotify app

```
touch .env
```
- You will need to specify the address and port of your local Express server instance, typically 'localhost' and '5000' 

- You will need to specify the URI of your development MongoDB instance

- You will need to specify the environment as "development"

Add the following variables and fill them in appropriately:

```
export SPOTIFY_CLIENT_ID={YOUR_CLIENT_ID}
export SPOTIFY_CLIENT_SECRET={YOUR_CLIENT_SECRET}
export SPOTIFY_HOST_REDIRECT_URI={YOUR_DEV_REDIRECT_URI}
export PORT={YOUR_PORT_NUMBER}
export MONGODB_URI={YOUR_MONGODB_URI}
export ENVIRONMENT=development
```

- Activate the environment 

```
source .env
```

- Verify the environment has been set

```
env | grep -E 'SPOTIFY|PORT|ADDRESS|MONGODB_URI|ENVIRONMENT'
```
- Once the above has been completed, start the server

```
npm start
```

- To run the server with hot-reload using nodemon, run the following

```
npm run dev
```

## Deployment

How to deploy this on a live system:

- Modify the environment file filling in the necessary variables with their respective production version equivalents

- To host the app using your own domain, change the address variable and port accordingly

- Change the MONGOD_URI variable to the URI of your production MongoDB instance (https://mlab.com/ offers remote instances that work well)

- Change the environment variable to "production"

```
npm start
```

## Built With

* [Node.js](https://nodejs.org) - Backend JavaScript runtime
* [Express.js](https://expressjs.com/) - Web application framework
* [Express Generator](https://github.com/expressjs/generator) - Express application generator
* [Socket IO](https://github.com/socketio/socket.io) - Real-time bidrectional event-based communication
* [MongoDB](https://mongodb.github.io/node-mongodb-native/) - MongoDB Node.js Driver
* [jQuery](https://github.com/jquery/jquery) - Front end DOM manipulation
* [Materialize CSS](https://materializecss.com/) - Front end styling framework
* [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - Spotify Web API

