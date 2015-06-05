var Character = require('../../agent/Character.js');

module.exports = SharkGameApe;

/* Humfrid, the bee you are helping. */
SharkGameApe.prototype = Object.create(Character.prototype);
SharkGameApe.prototype.constructor = SharkGameApe;
function SharkGameApe (game, x, y) {
    Character.call(this, game); // Parent constructor.
    this.turn = true;
    this.x = x || 0;
    this.y = y || 0;

    this.body = this.create(0, 90, 'apa', 'Chimp_empty_cup.png');
    this.body.anchor.set(0.5);
    this.mouth = this.create(0, 0, 'apa', 'Chimp_sadTalking.png');
    this.mouth.anchor.set(0.5);
    //this.wings = this.create(-25, -43, 'bee', 'wings1');
    //this.wings.anchor.set(0.5);

    this.talk = TweenMax.to(this.mouth, 0.2, {
        frame: this.mouth.frame+1, roundProps: 'frame', ease: Power0.easeInOut, repeat: -1, yoyo: true, paused: true
    });

}
/*
SharkGameApe.prototype.flap = function (on) {
    if (on) {
        if (this._flap.paused()) {
            this.wings.frameName = 'wings1';
            this._flap.restart(0);
        }
    } else {
        this._flap.pause(0);
        this.wings.frameName = 'wings0';
    }
};*/
