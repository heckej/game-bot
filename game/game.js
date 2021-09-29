const Discord = require('discord.js');
const { Util } = require('./util');
// const {GameLocation} = require('./location.js');
// const {Team} = require('./team.js');
// const {Bot} = require('../bot/bot.js');

class Game {

    /**
     * @param {GameLocation} currentLocation the location at which the team of this game is at this moment.
     */
    currentLocation;

    /**
     * Variable used to assign whether a new game can be started.
     */
    readyForNextGame;

    /**
     * Variable used to assign whether this game has been ended.
     */
    ended;

    /**
     * Instantiates a new game with the given startLocation as its start location.
     * @param {GameLocation} startLocation 
     * @param {Team} team 
     */
    constructor(startLocation, team) {
        if (team == null || team == undefined) {
            throw new Error("Constructor argument 'team' in Game cannot be null.")
        }
        this.startLocation = startLocation;
        this.currentLocation = startLocation;
        this.finishedLocations = [];
        this.team = team;
        team.game = this;
        this.readyForNextGame = true;
        this.askedForNext = false;
        this.ended = false;
    }

    /**
     * Inserts a new location between the current and the next location.
     * @param {GameLocation} newNextLocation 
     * @post the nextLocation property of the newNextLocation is overwritten with the 
     *       old nextLocation of the currentLocation
     */
    addIntermediateLocation(newNextLocation) {
        newNextLocation.nextLocation = this.currentLocation.nextLocation;
        if (this.currentLocation != null) {
            this.currentLocation.nextLocation = newNextLocation;
        }
    }

    /**
     * Inserts a new location after the last location that is reachable from the start location of this game.
     * @param {GameLocation} newNextLocation 
     */
    addNextLocation(newNextLocation) {
        if (this.startLocation == null) {
            this.startLocation = newNextLocation;
        } else {
            let lastLocation = this.startLocation;
            while (lastLocation.nextLocation != null) {
                lastLocation = lastLocation.nextLocation;
            }
            lastLocation.nextLocation = newNextLocation;
        }
    }

    /**
     * Handles messages that are sent by the team of this game when the game is being played.
     * @param {Bot} bot the bot that received a message.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async onMessageInGame(bot, message) {
        if (this.currentLocation == null) {
            if (this.finishedLocations.length > 0) {
                return await Util.respondToMessage(message, "Alle locaties zijn afgewerkt. Wacht op verdere instructies.");
            } else {
                await Util.respondToMessage(message, "Dit spel heeft geen startlocatie en kan dus niet worden gespeeld.");
                throw new Error(`Game of team ${this.team.name} has no start location. Please add and restart the bot.`);
            }
        }
        if (this.readyForNextGame) {
            this.readyForNextGame = false;
            return await this.startLocation.describeAsNextLocation(bot, this, message);
        }
        return await this.currentLocation.onMessageAtLocation(bot, this, message);
    }

    /**
     * Ends this game by replacing the current location with the given end location.
     * @param {GameLocation} endLocation 
     */
    end(endLocation) {
        this.currentLocation = endLocation;
        this.ended = true;
        this.readyForNextGame = false;
    }
}

module.exports = {Game}
