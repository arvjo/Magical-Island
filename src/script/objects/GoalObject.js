var GLOBAL = require('../global.js');

module.exports = GoalObject;

GoalObject.prototype = Object.create(Phaser.Group.prototype);
GoalObject.prototype.constructor = GoalObject;
GoalObject.prototype.buttonColor = GLOBAL.BUTTON_COLOR;

/**
 * Super class for goalObjects  on which to drop draggable objects
 * @param {Object} game - A reference to the Phaser game.
 * @param {Object} options - A list of options:
 *        {number} x: the x position (default 0).
 *        {number} y: the y position (default 0).
 *        {number} size: the side of the button (default 75).
 *        {string} background: the frame of the background (default 'button').
 * @return {Object} Itself.
 */
function GoalObject (game, options) {
    Phaser.Group.call(this, game, null); //
    options = options || {};
    this.x = options.dropPlaceX || 0;
    this.y = options.dropPlaceY || 0;

    this.color = options.color || this.buttonColor;

    var col = Phaser.Color.getRGB(this.color);
    col.red -= col.red < 40 ? col.red : 40;
    col.green -= col.green < 40 ? col.green : 40;
    col.blue -= col.blue < 40 ? col.blue : 40;


    this.disabled = options.disabled || false;

    var background = options.background;

    if (typeof background === 'undefined') {
        background = 'button';
    }

    this.bg = this.create(0, 0, (background === null ? null : 'cookie'), background);

    this.setSize(options.size || 75);
    return this;
}

/**
 * Set the size of this object.
 * @param {Number} size - The new size.
 */
GoalObject.prototype.setSize = function (size) {
    this.size = size;
    this.bg.width = size;
    this.bg.height = size;
};

/**
 * Highlight the objects.
 * @param {Number} duration - How long to highlight the button.
 * @param {Number} from - The opacity to highlight from (will end at this as well) (default 1).
 * @returns {Object} The animation tweenmax.
 */
GoalObject.prototype.highlight = function (duration, from) {
    from = typeof from === 'number' ? from : 1;
    return TweenMax.fromTo(this, 0.5, {alpha: from}, {alpha: 0}).backForth(duration || 3);
};

