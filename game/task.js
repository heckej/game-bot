const Discord = require('discord.js');
class Task {

    /**
     * The message that is sent when an incorrect response is received for this task.
     */
    messageOnBadAnswer = "Dat is jammer genoeg fout!";

    /**
     * The message that is sent when a correct response is received for this task.
     */
    messageOnGoodAnswer = "Dat is het juiste antwoord!";

    /**
     * Instantiates a new task with the given description and hints.
     * @param {String} description a text which is used to explain the task.
     * @param {...Hint} hints hints that can be given to the team when requested.
     * @todo make hints actually usefull. Currently they are not used.
     */
    constructor(description, ...hints) {
        this.description = description;
        this.hints = hints[0];
        this.givenHints = 0;
    }

    /**
     * Returns true iff the given answer matches the expected answer of this task.
     * @param {Discord.Message} answer the answer that should be checked.
     */
    answerMatches(answer) {
        throw new Error("Override answerMatches for this Task.");
    }

    /**
     * @returns a sentence that describes this task.
     */
    describe() {
        return this.description;
    }

    /**
     * Handles messages sent by the team playing the given game when they have to solve this task.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async onResponseToTask(bot, game, message) {
        if (this.isRequestForHint(message)) {
            return await this.respondToHintRequest(bot, game, message);
        } else if (this.answerMatches(message)) {
            await this.respondToGoodAnswer(bot, game, message);
            return await bot.onTeamFinishedLocation(game.team, game.currentLocation, this, message);
        }
        return await this.respondToBadAnswer(bot, game, message);
    }

    /**
     * Responds to a message with a message stating that a correct answer has been received.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async respondToGoodAnswer(bot, game, message) {
        await bot.respondToMessage(message, this.generateResponseToGoodAnswer());
    }

    /**
     * Responds to a message with a message stating that an incorrect answer has been received.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async respondToBadAnswer(bot, game, message) {
        await bot.respondToMessage(message, this.generateResponseToBadAnswer());
        console.log(`Hints: ${this.hints.length}`);
        if (this.hints.length > 0 && this.givenHints < this.hints.length) {
            return await bot.respondToMessage(message, this.generateHintProposal());
        }
    }

    /**
     * Sends a response to the given message with a hint.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     * @todo fix this method, such that hints can actually be given. Currently, no hints are given.
     */
    async respondToHintRequest(bot, game, message) {
        // if (this.givenHints >= this.hints.length) {
            return await bot.respondToMessage(message, "Er zijn geen hints.");
        // }
        let hint = this.hints[this.givenHints];
        console.log(`Hint: ${hint.description}, ${hint.imagePath}`);
        // TODO: fix hints
        // Currently hints are not correctly retrieved from the hints array.
        if (hint.description != null) {
            await bot.respondToMessage(message, hint.description);
        }
        if (hint.imagePath != null) {
             // TODO: make sure that either imagePath is online accessible or used to create an attachment
            await bot.respondToMessage(message, hint.imagePath);
        }
        this.givenHints = this.givenHints + 1;
    }

    /**
     * Returns true iff the given message appears to be a hint request.
     * @param {Discord.Message} message a message for which it should be checked whether it is a hint request.
     */
    isRequestForHint(message) {
        return message.content.indexOf("hint") >= 0;
    }

    /**
     * @returns a sentence in response to an incorrect answer to this task.
     */
    generateResponseToBadAnswer() {
        return this.messageOnBadAnswer;
    }

    /**
     * @returns a sentence in response to a correct answer to this task.
     */
    generateResponseToGoodAnswer() {
        return this.messageOnGoodAnswer;
    }

    /**
     * @returns a sentence explaining how to request hints.
     * @todo: as long as hint request are not handled properly, this should not propose hints.
     */
    generateHintProposal() {
        if (this.givenHints == 0) {
            return "Als jullie een hint willen, stuur dan 'hint'.";
        } else {
            return "Als jullie nog een hint willen, stuur dan 'hint'.";
        }
    }
}

class QuestionTask extends Task {

    #answer;
    static debug = false;
    /**
     * Instantiates a new question task.
     * @param {String} question the question that should be asked.
     * @param {String} answer the correct answer to the given question.
     */
    constructor(question, answer, ...hints) {
        super(question, hints);
        this.#answer = answer;
    }

    /**
     * Returns true iff the content of the givenAnswer is equal 
     *          to the answer of this task.
     * @param {Discord.Message} givenAnswer the answer that should be checked.
     */
    answerMatches(givenAnswer) {
        if (QuestionTask.debug) {
            console.log("Given: " + givenAnswer);
            console.log("Actual: " + this.#answer);
            return givenAnswer == this.#answer;
        }
        return givenAnswer.content == this.#answer;
    }
}

class VideoQuestionTask extends QuestionTask {

    /**
     * Instantiates a new video task.
     * @param {String} videoUrl a url pointing to a video in which a question is asked.
     * @param {String} answer the correct answer to the question.
     */
    constructor(videoUrl, answer, ...hints) {
        super(videoUrl, answer, hints);
    }
}

class QuizTask extends Task {
    
    #questions;
    #questionIndex = 0;
    /**
     * Instantiates a new quiz task with possibly multiple sub questions.
     * @param {String} question the main question describing the quiz.
     * @param {...QuestionTask} questions the questions which are asked in order during the quiz.
     */
    constructor(question, ...questions) {
        super(question, []);
        this.#questions = questions;
    }

    /**
     * @returns a sentence announcing the first question of this quiz.
     */
    describe() {
        return `${this.description}\nDe eerste vraag: ${this.#questions[this.#questionIndex].description}`;
    }

    /**
     * Handles answers to the quiz questions.
     * @param {Bot} bot the bot that received a message.
     * @param {Game} game the game which functions as the context in which the message was sent.
     * @param {Discord.Message} message the message that was received from the team.
     */
    async onResponseToTask(bot, game, message) {
        let question = this.#questions[this.#questionIndex];
        if (question.isRequestForHint(message)) {
            return await question.respondToHintRequest(bot, game, message);
        } else if (question.answerMatches(message)) {
            this.#questionIndex = this.#questionIndex + 1;
            await question.respondToGoodAnswer(bot, game, message);
            if (this.#questionIndex == this.#questions.length) {
                // Quiz is over.
                await bot.respondToMessage(message, "Wow, jullie weten best veel, zeg!");
                return await bot.onTeamFinishedLocation(game.team, game.currentLocation, this, message);
            } else if (this.#questionIndex == this.#questions.length-1) {
                return await bot.respondToMessage(message, `Laatste vraag: ${this.#questions[this.#questionIndex].description}`);
            } else {
                return await bot.respondToMessage(message, `Volgende vraag: ${this.#questions[this.#questionIndex].description}`);
            }
        }
        return await question.respondToBadAnswer(bot, game, message);
    }
}

class AttachmentTask extends Task {

    /**
     * @override 
     */
    constructor(description, ...hints) {
        super(description, hints);
    }

    /**
     * @override
     */
    answerMatches(givenAnswer) {
        if (givenAnswer.attachments.size == 0) {
            return false;
        }
        return true;
    }
}

class PictureTask extends AttachmentTask {

    /**
     * @override
     * @returns true iff the given message contains an image as an attachment.
     */
    answerMatches(givenAnswer) {
        if (!super.answerMatches(givenAnswer)) {
            return false;
        }
        // TODO: return true if first attachment is a picture
        return true;
    }
}

class VideoTask extends AttachmentTask {

    /**
     * @override
     * @returns true iff the given message contains a video as an attachment.
     */
    answerMatches(givenAnswer) {
        if (!super.answerMatches(givenAnswer)) {
            return false;
        }
        // TODO: return true if first attachment is a video
        return true;
    }
}

class SentenceLengthTask extends Task {

    /**
     * Instantiates a task for which the expected answer must match a given minimum number of words.
     * @param {Int32Array} minimumNumberOfWords the minimum number of words that should be in an answer sentence.
     */
     constructor(description, minimumNumberOfWords, ...hints) {
        super(description, hints);
        this.minimumNumberOfWords = minimumNumberOfWords
    }

    /**
     * @override
     * @returns true iff the given message contains at least as much words as the minimum number of words.
     */
    answerMatches(givenAnswer) {
        return givenAnswer.content.trim().split(" ").length >= this.minimumNumberOfWords;
    }
}

module.exports = {Task, QuestionTask, VideoQuestionTask, QuizTask, PictureTask, VideoTask, SentenceLengthTask}
