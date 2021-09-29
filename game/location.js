const Discord = require('discord.js');
const { Code } = require('./code.js');
const {Util} = require('./util.js');

class GameLocation {

    /**
     * Boolean variable holding the state of whether the QR code linked to this location has been confirmed or not.
     */
    qrCodeConfirmed;

    /**
     * Instantiates a new location.
     * @param {String} description the name or sentence used to describe this new location.
     * @param {Task} task the task that should be fulfilled by a team at this new location.
     * @param {Code?} qrCode the QR code which should be confirmed before the task of this location is announced to the team.
     *                  If the QR code is a string, then the given string is used to instantiate a new QR code.
     * @param {GameLocation?} nextLocation the to which the team is sent after finishing the task of this location.
     */
    constructor(description, task, qrCode=null, nextLocation=null) {
        if (typeof(qrCode) == 'string') {
            qrCode = new Code(null, qrCode, this);
        }
        this.description = description;
        this.task = task;
        this.qrCode = qrCode;
        this.nextLocation = nextLocation;
        if (qrCode != null) {
            qrCode.location = this;
        } else {
            console.log(`Warning: location ${this.description} does not have a QR code. This is dangerous.`);
        }
        this.qrCodeConfirmed = false;
    }

    /**
     * Handles messages that are sent by the team of the given game.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
     async onMessageAtLocation(bot, game, message) {
        if (this.qrCode != null && this.qrCode != undefined && !this.qrCodeConfirmed) {
            let isMatch = await this.qrCode.matchesContents(message);
            if (isMatch) {
                return await this.onArrivalAtLocation(bot, game, message);
            }
            return await bot.respondToMessage(message, `Zoek de QR-code in ${this.description}.`);
        } else if (this.qrCode == null && !this.qrCodeConfirmed) {
            return await this.onArrivalAtLocation(bot, game, message);
        } else {
            return await this.task.onResponseToTask(bot, game, message);
        }
    }


    /**
     * Handles messages that are sent by the team of the given game when they arrive at this location.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async onArrivalAtLocation(bot, game, message) {
        if (!this.qrCodeConfirmed) {
            this.qrCodeConfirmed = true;
        }
        await bot.respondToMessage(message, `Jullie hebben ${this.description} gevonden!`);
        return await bot.respondToMessage(message, this.task.describe());
    }

    /**
     * Responds to a given message with a message describing the next location.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async describeAsNextLocation(bot, game, message) {
        let describeAsNext = `Ga nu naar ${this.description}`;
        if (this.qrCode != null) {
            describeAsNext = describeAsNext + " en scan de QR-code";
        }
        describeAsNext = describeAsNext + ".";
        return await bot.respondToMessage(message, describeAsNext);
    }

    /**
     * @returns a sentence describing this locaion as if it were a start location.
     */
    describeAsStartLocationText() {
        let describeAsStart = `Jullie startlocatie is ${this.description}. Ga erheen`;
        if (this.qrCode != null) {
            describeAsStart = describeAsStart + " en scan de QR-code om de eerste opdracht te ontvangen.";
        }
        describeAsStart = describeAsStart + ".";
        return describeAsStart;
    }
}

class EndLocation extends GameLocation {

    /**
     * Instantiates a new end location with the given messages as the messages that should be sent in 
     * response to any messages sent on arrival at this location.
     * @param {String} description 
     * @param {...Discord.Message} messages
     */
    constructor(description, ...messages) {
        super(description, null, null, null);
        this.messages = messages;
    }

    /**
     * @override
     */
    async onMessageAtLocation(bot, game, message) {
        console.log(game);
        if (game.ended) {
            await bot.respondToMessage(message, "Het spel is gedaan.");
        } else {
            await bot.respondToMessage(message, `Kom zo snel mogelijk naar ${this.description}!`);
        }
    }


    /**
     * @override
     */
    async onArrivalAtLocation(bot, game, message) {
        if (message == null) {
            await Util.asyncForEach(this.messages, async msg => {
                await Util.sendToChannel(game.team.channelId, msg);
            });
        } else {
            await Util.asyncForEach(this.messages, async msg => {
                await bot.respondToMessage(message, this.msg);
            });
        }
    }
}

module.exports = {GameLocation, EndLocation}
