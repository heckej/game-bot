const Discord = require('discord.js');
const { Util } = require('./util');
const axios = require('axios');

class Code {

    /**
     * Instantiates a new QR code.
     * @param {String} imagePath the path leading to the QR code as an image.
     * @param {String} contents the contents that are revealed when the QR code is scanned.
     * @param {GameLocation} location the location at which the QR code is used.
     */
    constructor(imagePath, contents, location) {
        this.imagePath = imagePath;
        this.contents = contents;
        this.location = location;
    }

    /**
     * Returns true iff the given message contents match the this code or the image attachments of the given message match this code.
     * @param {Discord.Message} message 
     */
    async matchesContents(message) {
        return this.stringMatchesContents(message.content) || await this.imageAttachmentMatchesContents(message);
    }

    /**
     * Returns true iff the given string contains "QB{this.contents}" where "this.contents" are the contents of this code.
     * @param {String} string the string to be matched to this code.
     */
    stringMatchesContents(string) {
        // let matches = string.match(/(.)*QB\{([a-z]|[A-Z])*\}(.)*/);
        // return matches.length > 0 && ...
        return string.indexOf(`QB{${this.contents}}`) > -1;
    }

    /**
     * Returns true iff the first attachment of this message is a QR code of which the contents match this code.
     * @param {Discord.Message} message the message of which the attachments should be matched to this code.
     */
    async imageAttachmentMatchesContents(message) {
        if (message.attachments.size > 0) {
            console.log("Found attachment!");
            let res = await axios.post(Util.qrDecoderUrl, {
                // only consider first attachment
                url: message.attachments.first().proxyURL
            });
            console.log(`status code QR response: ${res.status}`)
            console.log(`QR contents: ${res.data.text}`)
            if (res.data.text != "" && res.data.text != undefined) {
                return this.stringMatchesContents(res.data.text);
            }
        }
        return false;
    }
}

module.exports = {Code}
