class Hint {

    /**
     * Instantiates a new hint with the given description, location and image as its properties.
     * @param {String} description the description that is given when the hint is requested.
     * @param {GameLocation?} location the location where the hint is applicable.
     * @param {String?} imagePath an image that is shown when the hint is requested.
     */
    constructor(description, location, imagePath=null) {
        this.description = description;
        this.location = location;
        this.imagePath = imagePath;
    }
}

module.exports = {Hint}
