const {Game} = require('./game.js');
const {GameLocation} = require('./location.js');
const {Team} = require('./team.js');
const {Task, QuestionTask} = require('./task.js');
const {Player} = require('./player.js');
const {Util} = require('./util.js');
const {Code} = require('./code.js');
const {Hint} = require('./hint.js');

/**
 * An offline test program which is no longer functional.
 * To make it work, you should replace the message strings with actual Discord.Message objects.
 */
async function run() {
    const garden = new GameLocation("Garden", new QuestionTask("Where are we?", "garden"));
    const kitchen = new GameLocation("Kitchen", new QuestionTask("What time is it?", "now"), new Code(null, "test", null), garden);
    const team = new Team("Bob's team")
    const game = new Game(kitchen, team);
    const room = new GameLocation("Room", new QuestionTask("How are you?", "fine"));
    game.addIntermediateLocation(room);
    await game.onMessageInGame("test");
    await game.onMessageInGame("now");
    console.log(game.currentLocation.description);
    await game.onMessageInGame("fine");
    console.log(game.currentLocation.description);
    await game.onMessageInGame("garden");
    console.log(game.currentLocation);
}

run().finally(console.log("Game is over!"));
