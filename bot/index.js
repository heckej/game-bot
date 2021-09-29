/**
 * An example context in whicht the game and chatbot framework can be used with Discord.
 */

const Discord = require('discord.js');
const nconf = require('nconf');
const {EndLocation} = require('../game/location.js');
const {Util} = require('../game/util.js');
const {Bot} = require('./bot.js');

nconf.file({ file: '../config.json' });

const client = new Discord.Client();

Util.client = client;
const bot = new Bot(nconf.get('bot:name'), 
                new EndLocation("de tuin", "Dit is de laatste locatie."));
client.channels.fetch(nconf.get('admin:discord:channelId')).then( channel =>
    {
        bot.adminChannel = channel;
    }
);


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.author == client.user) {

    } else if (msg.channel.id == nconf.get('admin:discord:channelId') || bot.adminChannel != null && msg.channel.id == bot.adminChannel.id) {
        console.log("Message from admin.");
        if (bot.adminChannel == null) {
            bot.adminChannel = msg.channel;
        }
        bot.onAdminMessage(msg);
    } else {
        bot.onTeamMessage(msg)
        .then( () =>
            {
                var team = bot.getTeamByChannel(msg.channel.id);
                let location = "no location defined";
                if (team.game.currentLocation != null) {
                    location = team.game.currentLocation.description;
                }
                console.log(`Message handled from team ${team.name}@${location}: ${msg.content}`);
            })
        .catch( (error) =>
            {
                console.log(`Error during message handling: ${error}`);
                bot.sendToAdmin(`Error during message handling: ${error}`);
                let teamName = "undefined";
                let currentLocation = "undefined";
                let qrConfirmed = "undefined";
                if (bot.teams[msg.channel.id] != null) {
                    teamName = bot.teams[msg.channel.id].name;
                    currentLocation = bot.teams[msg.channel.id].game.currentLocation;
                    if (currentLocation != null) {
                        qrConfirmed = currentLocation.qrCodeConfirmed;
                    }
                }
                bot.sendToAdmin(`Team: ${teamName}`);
                bot.sendToAdmin(`Location: ${currentLocation}`);
                bot.sendToAdmin(`QR confirmed: ${qrConfirmed}`);
                bot.sendToAdmin(`Channel id: ${msg.channel.id}`);
                bot.sendToAdmin(`Message contents: ${msg.content}`);
            }
        );
    }
 });

client.login(nconf.get("bot:discord:token"));
