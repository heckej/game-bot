# Game bot

## About

This repository contains a small framework that can be used to create a (hybrid physical-virtual) game in which the players/teams receive instructions from a (Discord) chatbot.

## Playing a game

Games consist of a route which each team has to follow. Locations on the route have a task which has to be solved in turn to find out what the next location is. Before a task is given to a team, it is possible to request the team to scan a QR code to prove that they have actually found the location. It should be possible to skip this step to allow for an entire virtual game experience, but in games where certain objects are needed at physical locations, it can be usefull to ensure that a team is really at the expected location.

## Creating a custom game

### Running the code

In general, you should be able to get everything up and running by installing the necessary Node.js modules and Python 3 packages, followed by executing `node bot/index.js` and `set FLASK_APP=qrserver.py & set FLASK_ENV="development" & set FLASK_RUN_PORT=8080 & flask run` (note: here Windows commands are used for setting environment variables). Make sure to fill in the token of your Discord bot in the configuration file (see below).

### A simple start

If you want to create your own game, you should definitely implement the `createNewGameForTeamInChannel(channelId, team)` method of the `Bot` class in `bot/bot.js`. The cleanest way would be to override this method in a deriving bot class. An example implementation is provided in the source code, but it is in Dutch. Here is an English example:

```lang=javascript
/**
  * Creates a new game for the given team in the channel with the given channelId as its channel id.
  * This function implements all the logic needed to build the game flow with locations, tasks, hints and QR codes.
  * @param {String} channelId the id of the Discord channel via which the team is going to play the game.
  * @param {Team} team the team that is going to play the new game.
  */
createNewGameForTeamInChannel(channelId, team) {
    let myQuestion = new QuestionTask("When do I wake up?", "9h"); // "9h" is the answer to my question.
    myQuestion.messageOnBadAnswer = "Wrong! Write the time as 'xh' where 'x' is the hour en 'h' stands for 'hour'.";
    let myQuiz = new QuizTask("Time for a small quiz!",
        myQuestion
    );
    let myLocation = new GameLocation("the office", 
        myQuiz, 
        nconf.get(`qr:office`)); // this retrieves the contents of the QR code located at the office from the configuration file.

    let game = this.createGameFromLocations(team, [myLocation]);
    this.games[channelId] = game;
}
```

### A bit more advanced

To customise your a game a bit more, you should have a look at the methods in the `bot/bot.js`, `game/game.js`, `game/location.js` and `game/task.js`, and update them according to your needs.

## Configuration

The set-up of the game (e.g. pre-defined teams, Discord bot token, ...) can be written in a json configuration file, of which an example can be found in `config.json`.
This is mostly for convenience and can be fine-tuned as you like it. The source code also contains configurational properties which should be moved to the separate configuration file.

## QR code verifier

The file `qrserver.py` contains a `flask` to which QR codes can be uploaded from which the contents should be detected. This server can be used by the chatbot.
