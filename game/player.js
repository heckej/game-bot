class Player {

    /**
     * Instantiates a new player with the given name, user id and team as its properties.
     * @param {String} name the name of the new player.
     * @param {String?} userId the user id of the new player.
     * @param {Team?} team the team to which the new player belongs.
     */
    constructor(name, userId=null, team=null) {
        this.name = name;
        this.userId = userId;
        this.team = team;
    }
}

module.exports = {Player}
