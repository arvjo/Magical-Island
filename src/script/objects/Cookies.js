var DraggableObject = require('./DraggableObject');

module.exports = Cookies;

Cookies.prototype = Object.create(DraggableObject.prototype);
Cookies.prototype.constructor = Cookies;

/**
 * A draggable cookie piece in the shark game
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number for the button, is overwritten in objectPanel.
 * @param {Object} options - A list of options (in addition to GeneralButton):
 *        {number} min: The minimum value of the button.
 *        {number} max: The maximum value of the button.
 *        {number} size: the small side of the button (the other depend on representation amount) (default 75).
 *        {string} idName: the name of current object type
 *        {number} id: id number for the current object
 *        {boolean} vertical: stretch button vertically if many representations, otherwise horisontally (default true).
 *        {string} spriteKey: Used for object representation only. The key to the sprite.
 *        {string} spriteFrame: Used for object representation only. The framename in the sprite.
 NOTE: Used like this: spriteFrame + this.number
 * @returns {Object} Itself.
 */

function Cookies (game, number, options) {



    this.background = options.background.slice(0, 6) + number + options.background.slice(7);
    this.spriteKey = options.spriteKey;
    this.spriteFrame = options.spriteFrame;

    if (typeof this.background === 'undefined') {
        this.background = options.background.slice(0, 6) + number + options.background.slice(7);

    }
    options.background = this.background;
    options.id += 1;
    this.id = options.id;
    this.idName = options.idName;
   DraggableObject.call(this, game, options); // Parent constructor.

   this.vertical = options.vertical;
   if (typeof this.vertical === 'undefined' || this.vertical === null) {
        this.vertical = true;
   }

    this.setDirection(!this.vertical);

    this.min = options.min || null;
    this.max = options.max || null;
    this._number = 0;
    this.number = number;
    this._clicker = options.onClick;


    this.onClick = function () {
        if (this._clicker) {
            this._clicker(this.number);

        }
    };

    return this;

}

Object.defineProperty(Cookies.prototype, 'number', {
    get: function () {
        return this._number;
    },
    set: function (value) {
        /* Check boundaries */
        if (this.min && value < this.min) { value = this.min; }
        if (this.max && value > this.max) { value = this.max; }
        if (value === this._number) { return; }

        this._number = value;

        this.updateGraphics(value);
    }
});

Cookies.prototype.updateGraphics = function (num) {
    /* Remove old graphics. */
    if (this.children.length > 1) {
        this.removeBetween(1, this.children.length-1, true);
    }

    /*Setting the sprite frame to the image correlating to the cookies number, 8 is
    the difference between the number and its index in the json file*/
    if(this.idName !== 'finalDragObject') {
        this.bg.frame = num + 8;
    }

    this.setSize();
    this.reset();
};


Cookies.prototype.calcOffset = function (offset) {
    var t = {
        x: 0,
        y: 0,
        o: this.size/offset
    };

    if (this.background) { // Probably square looking button.
        t.x = t.o*2;
        t.y = t.o*2;
    } else if (this.direction) { /* Up/Down */
        t.x = t.o*1.8;
        t.y = t.o*(this._number >= 0 ? 3.3 : 1);
    } else { /* Left/Right */
        t.x = t.o*(this._number >= 0 ? 1 : 3.3);
        t.y = t.o*2;
    }

    t.o *= 4;
    return t;
};


Cookies.prototype.setSize = function (size) {
    DraggableObject.prototype.setSize.call(this, size || this.size);

    return this;
};

Cookies.prototype.setDirection = function (val) {
    this.direction = val;
    if (val) {
        this.bg.rotation = -Math.PI/2;
        this.bg.y += this.bg.width;
        this.bg.adjusted = this.bg.width;
    } else {
        this.bg.rotation = 0;
        this.bg.y -= this.bg.adjusted || 0;
    }

    if (this.number) {
        this.updateGraphics(this.number);
    }

    return this;
};