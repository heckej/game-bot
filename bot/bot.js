const Discord = require('discord.js');
const nconf = require('nconf');
const {Game} = require('../game/game.js');
const {Team} = require('../game/team.js');
console.log(Team);
const {GameLocation, EndLocation} = require('../game/location.js');
console.log(GameLocation);
console.log(EndLocation);
const {Code} = require('../game/code');
const {Task, QuestionTask, VideoQuestionTask, PictureTask, VideoTask, QuizTask, SentenceLengthTask} = require('../game/task.js');
console.log(Task);
console.log(QuestionTask);
const {Util} = require('../game/util.js');
const { Hint } = require('../game/hint.js');


const commands = ["help", "end", "abort", "break", "resume", "return", "start"];
nconf.file({ file: '../config.json' });

class Bot {

    /**
     * A dictionary mapping channel ids to teams.
     * @param {Object}
     */
    teams;

    /**
     * Instantiates a new bot which lets teams play a game, and which can notify the game admin and accept admin commands.
     * @param {String} name the name of this new bot.
     * @param {EndLocation} endLocation the location that should be used as the end location of all games created by this bot.
     */
    constructor(name, endLocation) {
        this.name = name;
        this.teams = {};
        this.games = {};
        this.adminChannel = null;
        this.endLocation = endLocation;
        this.ended = false;
        this.initialiseTeams(nconf.get(`teams`));
    }

    /**
     * Handles messages that have been received from a team.
     * @param {Discord.Message} msg the message sent by the team.
     */
    async onTeamMessage(msg) {
        let channelId = msg.channel.id;
        let team;
        if (channelId in this.teams) {
            team = this.teams[channelId];
            await this.onPossiblyUnnamedTeamMessage(msg, team);
            if (team.name == null) {
                // Only proceed after the team name has been set.
                return;
            }
        } else {
            return await this.onNonRegisteredTeamMessage(msg);
        }

        return await team.onMessageInChannel(this, msg);
    }

    /**
     * Handles messages which have been sent by a team which has possibly no name.
     * @param {Discord.Message} msg the message sent by the team.
     * @param {Team} team the team that sent the message.
     */
    async onPossiblyUnnamedTeamMessage(msg, team) {
        if (team.name == null) {
            if (msg.content != null && msg.content != undefined && msg.content.replace(" ", "") != "") {
                team.name = msg.content;
                return await Util.respondToMessage(msg, `Welkom, ${team.name}!`);
            } else {
                return await Util.respondToMessage(msg, "Hoe heet jullie team?");
            }
        }
    }

    /**
     * Handles messages from a channel for which no team has been registered yet.
     * @param {Discord.Message} msg the message sent in a channel which is not linked to a team.
     */
    async onNonRegisteredTeamMessage(msg) {
        let channelId = msg.channel.id;
        let teamName = nconf.get(`teams:${channelId}:name`);
        let team = new Team(teamName, channelId);
        this.teams[channelId] = team;
        this.createNewGameForTeamInChannel(channelId, team);
        if (this.ended) {
            team.name = "Team te laat";
            team.game.end(this.endLocation);
            return await team.onMessageInChannel(msg);
        }
        if (teamName == null) {
            return await this.respondToMessage(msg, "Hallo! Wat is de naam van jullie team?");
        } else {
            return await this.respondToMessage(msg, `Hallo, team ${team.name}!`);
        }
    }

    
    /**
     * Handles the message sent by a team when they finish a location of their game. 
     * @param {Team} team the team that finished the last location of the game.
     * @param {GameLocation} location the location that was finished.
     * @param {Task} task the task that resulted in finishing the location.
     * @param {Discord.Message} message the message sent by the team that resulted in finishing the last location.
     */
    async onTeamFinishedLocation(team, location, task, message) {
        let adminNotification = `Team ${team.name} has finished location '${location.description}' with the following message:\n${message.content}`;
        message.attachments.forEach(attachment => {
            adminNotification = adminNotification + `\n${attachment.proxyURL}`;
        });
        await this.sendToAdmin(adminNotification);

        let game = team.game;
        game.finishedLocations.push(location);
        game.currentLocation = location.nextLocation;

        if (game.currentLocation == null || game.currentLocation == undefined) {
            await this.onTeamFinishedLastLocation(game.team, location, task, message);
        } else {
            await game.currentLocation.describeAsNextLocation(this, game, message);
            if (game.currentLocation.qrCode == null) {
                return await game.currentLocation.onArrivalAtLocation(this, game, message);
            }
            return;
        }
    }

    /**
     * Handles the message sent by a team when they finish the last location of their game. 
     * @param {Team} team the team that finished the last location of the game.
     * @param {Location} lastLocation the location that resulted in finishing the game.
     * @param {Task} lastTask the task that resulted in finishing the last location.
     * @param {Discord.Message} lastMessage the last message sent by the team that resulted in finishing the last location.
     */
    async onTeamFinishedLastLocation(team, lastLocation, lastTask, lastMessage) {
        await this.sendToAdmin(`Team ${team.name} has successfully finished the game with '${lastLocation.description}' as their last location.`);
        await this.respondToMessage(lastMessage, `Jullie hebben alle opdrachten succesvol voltooid. Proficiat!`);
    }

    /**
     * Handles messages sent by the admin of this bot.
     * @param {Discord.Message} msg the message sent by the admin.
     */
     async onAdminMessage(msg) {
         const command = this.getCommandFromAdminMessage(msg);
         if (command == undefined) {
             return await Util.respondToMessage(msg, "Commands should start with '/'.");
         }
         return await this.executeComand(command);
     }

    /**
     * Retrieves a recognised admin command from the given message.
     * @param {Discord.Message} message the message sent by the admin.
     */
    getCommandFromAdminMessage(message) {
        const contents = message.content;
        if (!contents.startsWith("/")) {
            return undefined;
        }
        const command = contents.substr(1);
        if (commands.indexOf(command) < 0) {
            return null;
        }
        return command;
    }

    /**
     * Performs the actions related to the given admin command.
     * @param {String} command the command sent by the admin.
     */
    async executeComand(command) {
        // commands = ["help", "end", "abort", "break", "resume", "return"];
        switch(command) {
            case "help": 
                this.adminChannel.send(this.getAdminHelpMessage());
                break;
            case "end":
                await this.adminChannel.send("The game will be ended.");
                await this.endAllGames();
                break;
            case "return":
                await this.adminChannel.send("The last phase of the game has started.");
                await this.enterEndPhase();
                break;
            case "start":
                await this.adminChannel.send("The game will start.");
                await this.sendStartSignal();
                break;
            default:
                await this.adminChannel.send(`The command '${command}' has not yet been implemented.`);
        }
    }

    /**
     * @returns a help message whcih explains the admin commands.
     */
    getAdminHelpMessage() {
        let message = "All possible commands are:\n";
        commands.forEach(command =>
            message = message + "- `/" + command + "`\n"
        );
        return message;
    }

    /**
     * Ends all games that are registered with this bot and sends a notification to all teams.
     */
    async endAllGames() {
        this.ended = true;
        for (const [key, game] of Object.entries(this.games)) {
            game.ended = true;
            game.currentLocation = this.endLocation;
        }
        let message = "Het spel is gedaan.";
        this.sendMessageToAllTeams(message);
        console.log("Games ended.");
    }

    /**
     * Sends a message to all teams to announce that the game is almost over and sets the current location of all games
     * to the end location of this bot.
     */
    async enterEndPhase() {
        let message = "Het spel is bijna gedaan. Kom nu naar de tuin!";
        for (const [key, game] of Object.entries(this.games)) {
            game.currentLocation = this.endLocation;
        }
        console.log("Starting end phase of game.");
        let teamsArray = this.getTeamsAsArray();
        await Util.asyncForEach(teamsArray, async team => {
            await this.endLocation.onArrivalAtLocation(this, team.game, null);
        });
        console.log("End phase of game: messages sent to all teams.");
    }

    /**
     * Sends a message to all registered teams with the instructions on playing the game.
     */
    async sendStartSignal() {
        console.log("Sending instructions to teams.");
        let instructions = this.getInstructions();
        await this.sendMessageToAllTeams(instructions);
        console.log("Game started: instructions sent to all teams.");
        let teamsArray = this.getTeamsAsArray();
        await Util.asyncForEach(teamsArray, async team => {
            console.log(`Startlocatie van team ${team.name}: ${team.game.startLocation}.`);
            let teamPlayers = nconf.get(`teams:${team.channelId}:players`);
            await Util.sendToChannel(team.channelId, `**Jullie team bestaat uit de volgende personen: ${teamPlayers}.**`);
        });
        await Util.asyncForEach(teamsArray, async team => {
            console.log(`Startlocatie van team ${team.name}: ${team.game.startLocation}.`);
            let startLocationDescription = team.game.startLocation.describeAsStartLocationText();
            team.game.readyForNextGame = false;
            await Util.sendToChannel(team.channelId, startLocationDescription);
        });
        console.log("Start location sent to all teams.");
    }

    /**
     * @returns the game instructions which should be sent to the teams when the game is started.
     */
    getInstructions() {
        let instructions = "Volg onze aanwijzingen!";
        instructions = instructions + "\nWe zullen jullie naar verschillende locaties sturen.";
        instructions = instructions + "\n- Op elke locatie hangt een QR-code die jullie aan ons moeten doorgeven. Stuur een foto van de QR-code via chat of scan de QR-code met een QR-scanner en stuur de tekst via chat naar ons. Om de QR-code goed leesbaar te maken kan het helpen om de foto eventueel met flits te nemen.";
        instructions = instructions + "\n- Als de QR-code overeenkomt met de locatie waar jullie moeten zijn, dan krijgen jullie een opdracht van ons.";
        instructions = instructions + "\n- Stuur de oplossing of het bewijs dat jullie de opdracht goed hebben uitgevoerd via chat en daarna leiden we jullie naar de volgende locatie.";
        return instructions;
    }

    /**
     * @returns an array containing all registered teams.
     */
    getTeamsAsArray() {
        let teamsArray = [];
        for (const [key, team] of Object.entries(this.teams)) {
            teamsArray.push(team);
        }
        return teamsArray;
    }

    /**
     * Sends a given message to all registered teams.
     * @param {Discord.Message} message the message that should be sent.
     */
    async sendMessageToAllTeams(message) {
        let teamsArray = this.getTeamsAsArray();
        await Util.asyncForEach(teamsArray, async team => {
            await Util.sendToChannel(team.channelId, message);
            console.log(`Sent message to team ${team.name}`);
        });
    }

    /**
     * Returns the team that is registered with the given channel.
     * @param {String} channelId the id of the Discord channel for which the registered team should be returned.
     */
    getTeamByChannel(channelId) {
        if (channelId in this.teams) {
            return this.teams[channelId];
        }
        console.log(`Channel id ${channelId} is not registered as the channel of a team.`);
        return null;
    }

    /**
     * Sends a message to the admin of this bot.
     * @param {Discord.Message} message the message which should be sent to the admin.
     */
    async sendToAdmin(message) {
        return await this.adminChannel.send(message);
    }

    /**
     * Sends a response to a given message.
     * @param {Discord.Message} message the message to which should be replied.
     * @param {Discord.Message} response the response to be sent as reply to the given message.
     * @returns 
     */
    async respondToMessage(message, response) {
        return await Util.respondToMessage(message, response);
    }

    /**
     * Instantiates teams for this bot, based on the given configuration.
     * @param {*} teamsConfiguration 
     */
    initialiseTeams(teamsConfiguration) {
        let keys = Object.keys(teamsConfiguration);
        keys.forEach((channelId, index) => {
            let team = new Team(teamsConfiguration[channelId].name, channelId);
            this.teams[channelId] = team;
            this.createNewGameForTeamInChannel(team.channelId, team);
            console.log(`Team ${team.name} initialised from configuration in channel ${team.channelId}.`);
        });
    }

    /**
     * Creates a new game for the given team in the channel with the given channelId as its channel id.
     * This function implements all the logic needed to build the game flow with locations, tasks, hints and QR codes.
     * @param {String} channelId the id of the Discord channel via which the team is going to play the game.
     * @param {Team} team the team that is going to play the new game.
     */
    createNewGameForTeamInChannel(channelId, team) {
        let kantoorurenVraag = new QuestionTask("Vanaf wanneer kunnen de ontvoerders op woensdag om een stofzuiger/GFT-zakken gaan?", "9u");
        kantoorurenVraag.messageOnBadAnswer = "Fout! Schrijf het uur als 'xu' waarbij 'x' het uur is en 'u' staat voor 'uur'.";
        let quizOpdracht = new QuizTask("Tijd voor een kleine quiz!",
            kantoorurenVraag
        );
        let kantoor = new GameLocation("het kantoor", 
            quizOpdracht, 
            nconf.get(`qr:kantoor`));
        let woordzoekerWoord = nconf.get(`constants:woordzoekerWoord`);
        let woordzoekerOpdracht = new QuestionTask("Toen we hier passeerden, zijn we onze woordzoeker hier vergeten. Als jullie ons het woord kunnen geven dat overblijft nadat hij volledig ingevuld is, dan zou dat jullie wel eens vooruit kunnen helpen. Los de woordzoeker dus op en stuur ons het overblijvende woord.", 
            woordzoekerWoord); // TODO: resulting word
        woordzoekerOpdracht.messageOnGoodAnswer = "Dat moesten we weten! Jullie zijn alweer een stapje dichterbij.";
        woordzoekerOpdracht.messageOnBadAnswer = "Dat is fout. Schrijf alles in blokletters (hoofdletters).";
        let gemeenschappelijkeRuimte = new GameLocation("de gemeenschappelijke ontspanningsruimte", 
            woordzoekerOpdracht,
            nconf.get(`qr:gemeenschappelijkeRuimte`)); 
        
        // The following order is the order in which the locations will be visited during the game.
        // Depending on the configured start location, part of the array is moved to the back, such that all locations are still in the game.
        let locations = [gemeenschappelijkeRuimte, kantoor];
        let startLocationName = nconf.get(`teams:${team.channelId}:startLocation`);
        let indexStartLocation = this.getIndexLocationWithName(locations, startLocationName);
        if (indexStartLocation < 0) {
            console.log(`WARNING: Unknown start location for team ${team.name}: ${startLocationName} - ${indexStartLocation}.`);
            indexStartLocation = 0;
        }
        let firstLocations = locations.slice(indexStartLocation);
        let lastLocations = locations.slice(0, indexStartLocation);

        // let game = new Game(moestuin, team);
        console.log(`#first: ${firstLocations.length}, #last: ${lastLocations.length}`);
        locations = [...firstLocations, ...lastLocations];
        let game = this.createGameFromLocations(team, locations);
        this.games[channelId] = game;
    }

    /**
     * Returns the index in an array of locations of the location of which the description equals the given name.
     * @param {[GameLocation]} locations an array of locations.
     * @param {String} startLocationName the name of the location of which the index should be returned.
     */
    getIndexLocationWithName(locations, startLocationName) {
        let finalIndex = -1;
        locations.forEach((value, index) => {
            console.log(`Location ${value.description == startLocationName} ${index}`);
            if (value.description == startLocationName) {
                finalIndex = index;
            }
        });
        return finalIndex;
    }

    /**
     * Returns a new game with the given locations as its locations in order and the given team as its team.
     * @param {Team} team the team that is going to play the new game.
     * @param  {...GameLocation} locations the locations that should be visited in order during the game.
     */
    createGameFromLocations(team, locations) {
        let firstLocation = null;
        if (locations.length > 0) {
            firstLocation = locations.shift(); // TODO: check whether this works as expected
        }
        console.log(`First location: ${firstLocation}`);
        console.log(`Locations: ${locations}`);
        let game = new Game(firstLocation, team);
        locations.forEach(location => {
            game.addNextLocation(location);
        })
        return game;
    }
}

module.exports = {Bot}
