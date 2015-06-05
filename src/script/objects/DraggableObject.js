var GLOBAL = require('../global.js');

module.exports = DraggableObject;

DraggableObject.prototype = Object.create(Phaser.Group.prototype);
DraggableObject.prototype.constructor = DraggableObject;
DraggableObject.prototype.buttonColor = GLOBAL.BUTTON_COLOR;

/**
 * Super class for all draggable objects
 * @param {Object} game - A reference to the Phaser game.
 * @param {Object} options - A list of options:
 *        {number} x: the x position (default 0).
 *        {number} y: the y position (default 0).
 *        {number} size: the side of the button (default 75).
 *        {number} startPosX: the x position defined in the subgame
 *        {number} startPosY: the y position defined in the subgame
 *        {string} idName: the name of current object type
 *        {number} id: id number for the current object
 *        {string} background: the frame of the background (default 'button').
 NOTE: Needs to be in the 'objects' atlas.
 *        {number} color: the color of the button (default 0xb2911d).
 *                        NOTE: You can also set the prototype property buttonColor.
 *        {number} colorPressed: the color when the button is pressed (default darker color).
 *        {function} onClick: a function to run when a button is clicked.
 *        {boolean} disabled: true if the button should be disabled (default false).
 *        {boolean} keepDown: true if the button should not auto raise when clicked (default false).
 * @return {Object} Itself.
 */

function DraggableObject (game, options) {
    Phaser.Group.call(this, game, null);
    options = options || {};

    this.x = options.x || 0;
    this.y = options.y || 0;
    this.startPosX = options.startPosX;
    this.startPosY = options.startPosY;
    this.color = options.color || this.buttonColor;
    this.try = 0;
    this.idName = options.idName;
    if (options.colorPressed) {
        this.colorPressed = options.colorPressed;
    } else {
        var col = Phaser.Color.getRGB(this.color);
        col.red -= col.red < 40 ? col.red : 40;
        col.green -= col.green < 40 ? col.green : 40;
        col.blue -= col.blue < 40 ? col.blue : 40;
        this.colorPressed = Phaser.Color.getColor(col.red, col.green, col.blue);
    }

    this.onClick = options.onClick;
    this.disabled = options.disabled || false;
    this.keepDown = options.keepDown || false;
    this.background = options.background;

    var background = options.background;
    if (typeof background === 'undefined') {
        background = 'button';
    }

    this.bg = this.create(0, 0, (background === null ? null : 'cookie'), background);

    this.bg.inputEnabled = true;
    this.bg.input.enableDrag(true,true);
    this.id = options.id;
    this.dropPlaceX = options.dropPlaceX;
    this.dropPlaceY = options.dropPlaceY;
    this.bg.events.onDragStop.add(stopDrag,this,options);

    //sets the object to the down state when clicked on
    this.bg.events.onInputDown.add(function () {

        if (this.disabled || this.bg.tint === this.colorPressed) {
            return;
        }

        this.bg.tint = this.colorPressed;

    }, this);

    this.reset();
    this.setSize(options.size || 75);
    return this;
}

//Function triggered when dropping an object
function stopDrag(options){
    var x = this.game.input.x;
    var y = this.game.input.y;

    x = x-156; //conversion from input coordinate system to the games

    if (this.idName !== 'finalDragObject') {
        //Drop placement for the dragObjects, needed because finalDragObjects drop area is bigger
        //To Do: get the coordinates and size from the gol object directly
        if(x > this.dropPlaceX -10 && x < this.dropPlaceX+ 80 && y > this.dropPlaceY -10 && y < this.dropPlaceY + 80) {
                if (this.onClick) {
                    this.onClick();
                }

                //Placement algorithm for the visual feedback
                //If try is less than 0 place on top of the goal, if its over 0 place to the left of the goal
                //To do: get 113 from the white space calculation in objectPanel the variable fullSize
                /*If this is moved to a seperate function you could be able to use it in the agentTry mode instead
                  of the visualAid sprite to place one of the cookies on its visual feedback position*/
                if ( DraggableObject.try < 0) {
                    options.x = this.dropPlaceX - (this.startPosX+ ((this.id-1) * 113));
                    options.y = this.dropPlaceY - this.startPosY;
                }
                else if(DraggableObject.try > 0){
                    options.x = this.dropPlaceX - ((this.startPosX+ ((this.id-1) * 113))+75);
                    options.y = this.dropPlaceY - this.startPosY;
                }
                else{
                    options.x = 1;
                    options.y = 1;
                }

        }
        else{
            options.x = 1;
            options.y = 1;
        }
    }
    else{
        if(x > this.dropPlaceX -30 && x < this.dropPlaceX+ 200 && y > this.dropPlaceY -10 && y < this.dropPlaceY + 200) {
            if (this.onClick) {
                this.onClick();
            }
        }

        options.x = 1;
        options.y = 1;
    }
    this.reset();
}

/**
 * Set the size of this button.
 * @param {Number} size - The new size.
 */
DraggableObject.prototype.setSize = function (size) {
    this.size = size;
    this.bg.width = size;
    this.bg.height = size;
};

/**
 * Setting the try variable to the offset of the answer
 * @param num
 */
DraggableObject.prototype.setTry = function(num){
    DraggableObject.try = num;
};

/**
 * Reset the buttons to "up" state.
 */
DraggableObject.prototype.reset = function () {
    this.bg.tint = this.color;

};

/**
 * Set the buttons to "down" state.
 * NOTE: This does not fire the click functions.
 */
DraggableObject.prototype.setDown = function () {
    this.bg.tint = this.colorPressed;
};

/**
 * Highlight the object.
 * @param {Number} duration - How long to highlight the button.
 * @param {Number} from - The opacity to highlight from (will end at this as well) (default 1).
 * @returns {Object} The animation tweenmax.
 */
DraggableObject.prototype.highlight = function (duration, from) {
    from = typeof from === 'number' ? from : 1;
    return TweenMax.fromTo(this, 0.5, { alpha: from }, { alpha: 0 }).backForth(duration || 3);
};