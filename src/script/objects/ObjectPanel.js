var Cookies = require('./Cookies.js');
var GoalCookie = require('./GoalCookie.js');

module.exports = ObjectPanel;

ObjectPanel.prototype = Object.create(Phaser.Group.prototype);
ObjectPanel.prototype.constructor = ObjectPanel;

/**
 * Create a panel filled with drag and drop or goal objects.
 * See cookies for example of drag object, see goalCookie for example of goal object
 * See NumberButton and GeneralButton for more information.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} amount - The number of buttons (this will be overwritten in updateObject for goalCookie and )
 * @param {Object} options - options for the panel:
 *        {number} x - The x position (default is 0)
 *        {number} y - The y position (default is 0)
 *        (string) id and idName - identifier for what object it is (dragObject, goalObject or goalObject) is converted to idName in objectoptions
 *        (number) id indentifies the specific object of the 4 cookies  (1-4)
 *        (number) dropPlaceX - the x drop position for the object, defined at creation in sharkGame
 *        (number) dropPlaceY - the y drop position for the object, defined at creation in sharkGame
 *        {number} size - The size of the panel (default is game width or height, depending on if vertical is set)
 *        {number} min - The smallest number on the panel (default is 1)
 *        {number} max - The biggest number on the panel (default is min + amount - 1)
 *        {function} onClick - What should happen when clicking the button
 *        {string} background - The sprite key for the button backgrounds
 *        {number} maxButtonSize - The maximum size of the buttons (default is 75)
 *                                 NOTE: The button size is always calculated to not overlap
 * @return {Object} Itself.
 */


function ObjectPanel (game, amount, options) {
    Phaser.Group.call(this, game, null); // Parent constructor.
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vertical = options.vertical || false;
    this.reversed = options.reversed || false;
    this.size = options.size || (this.vertical ? this.game.world.height : this.game.world.width);

    this.dropPlaceX = options.dropPlaceX;
    this.dropPlaceY = options.dropPlaceY;
    this.id = options.id;
    this.color = options.color;
    this.background = options.background;
    this.background = 'cookie4.png';

    this.maxObjectSize = options.maxObjectSize || 75;
    this.onClick = options.onClick;
    options.min = options.min || 1;
    this.setRange(options.min, options.max || (options.min + amount - 1));

    return this;
}

ObjectPanel.prototype._createObject = function () {
    this.removeAll(true);

    /* Calculate max object size. */
    var objectSize = this.size/this.amount;
    if (objectSize > this.maxObjectSize) {
        objectSize = this.maxObjectSize;
    }

    /* These options will be used when creating the objects. */
    var objectOptions = {
        min: this.min,
        max: this.max,
        size: objectSize,
        background: this.background,
        color: this.color,
        vertical: !this.vertical,
        onClick: this.onClick,
        dropPlaceX: this.dropPlaceX,
        dropPlaceY: this.dropPlaceY,
        id: 0,
        idName: this.id,
        startPosX: this.x,
        startPosY: this.y
    };


    /* Set up the objects that should be in the panel. depending on the present object */
    if(this.id === 'dragObject' ) {
        for (var i = this.min; i <= this.max; i++) {
            this.cookie = new Cookies(this.game, i, objectOptions);
            this.add(this.cookie);
        }
    }
    else if(this.id === 'goalObject') {
        this.goalCookie = new GoalCookie(this.game,6, objectOptions);
        this.add(this.goalCookie);
    }
    else{
        this.add(this.finalDragObject = new Cookies(this.game,10, objectOptions));
    }
    /* Reverse the order of the buttons if needed. */
    if (this.reversed) { this.reverse(); }


    /* Calculate white space. */
    var widthLeft = this.size - objectSize*this.amount;
    var paddingSize = widthLeft/this.amount;
    if (paddingSize > objectSize/2) {
        paddingSize = objectSize/2;
    }
    var margin = (this.size - this.amount*objectSize - (this.amount - 1)*paddingSize)/2;
    var fullSize = paddingSize + objectSize;

    /* Set up the x and y positions. */
    var direction = this.vertical ? 'y' : 'x';
    for (var j = 0; j < this.length; j++) {
        this.children[j][direction] = margin + fullSize*j;
    }
};

//Update the numbers of each object, 3 randomized and the current correct number
ObjectPanel.prototype._updateObjects = function (currentNumber) {
    var rand = Math.round(Math.random()*9);
    var correct = currentNumber;
    while(rand === correct){
        rand = Math.round(Math.random()*9);
    }
    var randIndex = Math.floor(Math.random()*3); //a randomized index for the current number
    var i = 0;
    if(this.cookie) {
        //looping over the cookies
        for (var key in this.children) {
            this.children[key].min = this.min;
            this.children[key].max = 9;
            if (i === randIndex) {
                this.children[key].number = correct;
            }
            else {
                this.children[key].number = rand;
            }
            Cookies.prototype.updateGraphics.call(this.cookie, rand); //Updating the graphics correlating to the new number

            rand = Math.round(Math.random() * 9);
            //making sure that none of the cookies gets the same number
            while (this.children[0].number === rand || this.children[1].number === rand ||
                   this.children[2].number === rand || this.children[3].number === rand) {
                rand = Math.round(Math.random() * 9);
            }

            i++;
        }
        i = 0;
    }

    if(this.goalCookie) {
        //Setting the goalCookie number to the inverse of the current number
        GoalCookie.prototype.updateGraphics.call(this.goalCookie, 10-currentNumber);
    }
};

/**
 * Set the range for the button panel. It will create or update the panel accordingly.
 * @param {Number} The minimum amount in the panel.
 * @param {Number} The maximum amount in the panel.
 */
ObjectPanel.prototype.setRange = function (min, max,currentNumber) {
    this.min = min;
    this.max = max;
    var oldAmount = this.amount || 0;

    this.amount =  (this.max - this.min + 1);
    if (this.amount !== oldAmount || this.length <= 0) {
        this._createObject();
    } else {
        this._updateObjects(currentNumber);
    }
};

/**
 * Reset all objects to "up" state.
 */
ObjectPanel.prototype.reset = function () {
    for (var i = 0; i < this.length; i++) {
        this.children[i].reset();
    }
};

/**
 * Highlight all objects.
 * @param {Number} duration - How long to highlight the buttons.
 * @param {Number} from - The opacity to highlight from (will end at this as well) (default 1).
 * @returns {Object} The animation timeline.
 */
ObjectPanel.prototype.highlightObject = function (duration, from) {
    var t = new TimelineMax();
    for (var i = 0; i < this.length; i++) {
        t.add(this.children[i].highlightObject(duration, from), 0);
    }
    return t;
};

/**
 * Disable/Enable all object input.
 * @param {Boolean} disable - True is disabled, false is enabled
 */
ObjectPanel.prototype.disable = function (value) {
    for (var i = 0; i < this.length; i++) {
        this.children[i].disabled = value;
    }
};