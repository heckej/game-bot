const Discord = require('discord.js');

class Util {
    static debug = false;

    /**
     * @param {Discord.Client} client the Discord client to be used as the sender of all messages
     */
    static client;
    static qrDecoderUrl = "http://127.0.0.1:8080/decode";

    /**
     * Sends a response to a message in the same channel as the original message was sent.
     * @param {Discord.Message} message the message to which should be replied.
     * @param {Discord.Message} response the reply the should be sent.
     */
    static async respondToMessage(message, response) {
        if (Util.debug) {
            return console.log("Mock send response:", response);
        } else {
            if (typeof(response) != Discord.Message) {
                response = new Discord.Message(Util.client, {
                    id: message.id, // todo: check how id should be defined.
                    type: message.type,
                    content: response.toString(),
                    author: Util.client.user,
                    pinned: message.pinned,
                    tts: false,
                    embeds: message.embeds,
                    attachments: message.attachments,
                    nonce: 0 // todo: check how nonce should be defined.
                }, message.channel);
            } else {
                response.author = Util.client.user;
            }
            if (isNaN(response.nonce)) {
                response.nonce = 0; // not safe
            }
            return await message.channel.send(response)
        }
    }

    /**
     * Sends a message to the given channel.
     * @param {String} channelId the Discord channel id of the channel to which a message should be sent.
     * @param {Discord.Message} message the message that should be sent.
     */
    static async sendToChannel(channelId, message) {
        if (Util.debug) {
            return console.log("Mock send message to channel " + channelId + ":", message);
        }
        console.log("Send to channel " + channelId + ": " + message);
        try {
            let channel = await Util.client.channels.fetch(channelId);
            await channel.send(message);
        } catch(e) {
            console.log(`Could not send to channel with id ${channelId}: ${e}`);
        }
        console.log("End send to channel.");
    }

    /**
     * Applies the given callback to each element of the given array asynchronously.
     * @param {[]} array the array over which should be looped asynchronously.
     * @param {*} callback the callback which should be applied to the elements of the array.
     */
    static async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
          await callback(array[index], index, array);
        }
    }
}

module.exports = {Util}
