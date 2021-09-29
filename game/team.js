const Discord = require('discord.js');

class Team {

    /**
     * Instantiates a new team.
     * @param {String} name the name by which the team should be called.
     * @param {String?} channelId the id of the Discord channel in which the new team plays the given game.
     * @param {Game?} game the game that is being played by this new team.
     * @param  {...Player} players the players that are part of this new team.
     */
    constructor(name, channelId=null, game=null, ...players) {
        this.name = name;
        this.channelId = channelId;
        this.game = game;
        this.players = players;
    }

    /**
     * Adds a new player to this team.
     * @param {Player} player the player that should be added to this team.
     */
    addPlayer(player) {
        this.players.push(player);
        player.team = this;
    }

    /**
     * Handles messages sent to the channel of this team.
     * @param {Discord.Message} message the message sent by this team.
     */
    async onMessageInChannel(bot, message) {
        return await this.game.onMessageInGame(bot, message);
    }

}

module.exports = {Team}
