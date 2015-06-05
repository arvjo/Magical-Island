var NumberGame = require('./NumberGame.js');
var SharkGameApe = require('./SharkGameApe.js');
var GLOBAL = require('../../global.js');
var LANG = require('../../language.js');
var util = require('../../utils.js');

module.exports = SharkGame;

SharkGame.prototype = Object.create(NumberGame.prototype);
SharkGame.prototype.constructor = SharkGame;
function SharkGame () {
    NumberGame.call(this); // Call parent constructor.
}

SharkGame.prototype.pos = {
    home: {
        x: 110, y: 700
    },
    ape: {
        x: 120, y: 300,
        homeScale: 0.8
    },
    agent: {
        start: { x: 1200, y: 400 },
        stop: { x: 777, y: 360 },
        scale: 0.35
    }
};
/* Phaser state function */
SharkGame.prototype.preload = function () {
    this.load.audio('apeSpeech', LANG.SPEECH.sharkgame.speech);
    this.load.audio('beeMusic', ['audio/subgames/beeflight/music.m4a', 'audio/subgames/beeflight/music.ogg', 'audio/subgames/beeflight/music.mp3']);
    this.load.atlasJSONHash('ape', 'img/subgames/beeflight/atlas.png', 'img/subgames/beeflight/atlas.json');
    this.load.atlasJSONHash('shark', 'img/subgames/sharkgame/atlas.png', 'img/subgames/sharkgame/atlas.json');
    this.load.atlasJSONHash('apa', 'img/subgames/sharkgame/apa.png', 'img/subgames/sharkgame/apa.json');
    this.load.atlasJSONHash('numbers', 'img/objects/numbers.png', 'img/objects/numbers.json');
};

SharkGame.prototype.buttonColor = 0xface3d;

SharkGame.prototype.create = function () {
    // Setup additional game objects on top of NumberGame.init
  this.setupButtons({
        yesnos: {
            x: 150,
            y: 25,
            size: this.world.width - 300
        }
    });
    this.dropPlaceX = 200;
    this.dropPlaceY = 200;
   this.setUpDragObject({
       dragObject:{
           x: 100,
           y: 670,
           size: this.world.width - 300,
           dropPlaceX: this.dropPlaceX,
           dropPlaceY: this.dropPlaceY,
           id: 'dragObject'
       },
       goalObject:{
           x: this.dropPlaceX,
           y: this.dropPlaceY,
           size: this.world.width - 300,
           id: 'goalObject'
       },
       finalDragObject:{
           x: this.dropPlaceX,
           y: this.dropPlaceY,
           size: this.world.width - 300,
           dropPlaceX: -100,
           dropPlaceY: 450,
           id: 'finalDragObject'
       }
    });

    this.add.sprite(0, 0, 'shark', 'island.png', this.gameGroup);

    //Sprites for the equation
    var cloud1 = this.gameGroup.create(-1000, 10, 'objects', 'cloud2');
    var cloud2 = this.gameGroup.create(-1000, 150, 'objects', 'cloud1');
    this.number1 = this.gameGroup.create(50, 200, 'numbers', '1.png');
    this.plus = this.gameGroup.create(120, 180, 'numbers', '+.png');
    this.number2 = this.gameGroup.create(150, 200, 'numbers', '1.png');
    this.equal = this.gameGroup.create(200, 200, 'numbers', '=.png');
    this.answer = this.gameGroup.create(250, 200, 'numbers', '10.png');
    this.number1.visible = false;
    this.plus.visible = false;
    this.number2.visible = false;
    this.equal.visible = false;
    this.answer.visible = false;


    TweenMax.fromTo(cloud1, 380, { x: -cloud1.width }, { x: this.world.width, repeat: -1 });
    TweenMax.fromTo(cloud2, 290, { x: -cloud2.width }, { x: this.world.width, repeat: -1 });

    //To Do: Make the shark a real goal object
    var shark = this.add.sprite(this.pos.home.x, this.pos.home.y, 'shark', 'Shark_angry.png', this.gameGroup);
    shark.anchor.set(0.5, 1);
    this.agent.thought.y += 100;
    this.gameGroup.bringToTop(this.agent);
    this.aGuess = true;
    this.speech = util.createAudioSheet('apeSpeech', LANG.SPEECH.sharkgame.markers);
    this.visualAid = this.gameGroup.create(355, 200, 'cookie', 'cookie1.png');
    this.visualAid.width = 75;
    this.visualAid.height = 75;
    this.visualAid.visible = false;
    this.visualAid.tint = 0xCC7A00;
    // Setup ape
    this.ape = new SharkGameApe(this.game, 450, 500);
    this.ape.scale.set(this.pos.ape.homeScale);
    if (this.method === GLOBAL.METHOD.additionSubtraction) {
        this.ape.addThought(170, -75, this.representation[0], true);
        this.ape.thought.toScale = 0.7;
    }
    this.gameGroup.add(this.ape);

    this.add.music('apeMusic', 0.1, true).play();


};

/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                    Number chosen and return functions                     */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
SharkGame.prototype.runNumber = function (number, simulate) {
    var sum = number + this.addToNumber;
    var result = simulate ? sum - this.currentNumber : this.tryNumber(number, this.addToNumber);
    var correct = false;
    this.disable(true);
    this.visualAid.visible = false;
    var t = new TimelineMax();
    if (GLOBAL.debug) { t.skippable(); }

    /* Correct :) */
    if (!result) {
        correct = true;
        t.addCallback(function () {
            this.showWinObject();
        }, null, null, this);
        //Setting the sprites correlating to the equation
        var goalNumber = (10 - number);
        this.number1.frameName = number +'.png';
        this.number2.frameName = goalNumber +'.png';
        this.number1.visible = true;
        this.plus.visible = true;
        this.number2.visible = true;
        this.equal.visible = true;
        this.answer.visible = true;
        this.atValue = 0;
        this.aGuess = true;
        this.setRelative(correct);
        /* Incorrect :( */
    } else {
        correct = false;
        t.addSound(this.speech, this.ape, 'wrong');
        //If the current mode is agentTry the drag objects and the visualAid sprite should be shown when you are wrong
        /*To Do: instead of using the visualAid sprite use the DraggableObjects visual feedback algorithm before showNumbers
          see DragableObjects stopDrag function for more info*/
        if(this.currentMode === GLOBAL.MODE.agentTry){
            this.visualAid.frame = this.agent.lastGuess + 8;
            if(this.lastTry !== 0 && this.yesButton === true) {
                this.showNumbers();
                if (this.lastTry > 0) {
                    this.visualAid.x = 280;
                } else if (this.lastTry < 0) {
                    this.visualAid.x = 355;

                }
                this.visualAid.visible = true;

            }

        }
        this.aGuess = false;
        this.setRelative(correct);
        this.nextRound();

    }

    t.addCallback(this.updateRelative, null, null, this);
    return t;
};

//Triggerd when the complete cookie is fed to the shark
SharkGame.prototype.win = function(){
    var t = new TimelineMax();
    this.number1.visible = false;
    this.plus.visible = false;
    this.number2.visible = false;
    this.equal.visible = false;
    this.answer.visible = false;
    //If the last correct choice the final wining sound will be played otherwise the correct cookie sound will be played
    if(this._totalCorrect !== 9) {
        t.skippable();
        t.addSound(this.speech, this.ape, 'correct');
    }
    else{
        t.skippable();
        t.addSound(this.speech, this.ape, 'win');
    }
    return t;
};


//The intro dialouge is played
SharkGame.prototype.modeIntro = function () {
    var t = new TimelineMax().skippable();
    t.addSound(this.speech, this.ape, 'intro');
    t.addSound(this.speech, this.ape, 'shark');
    t.addSound(this.speech, this.ape, 'intro2');
    t.addSound(this.speech, this.ape, 'intro3');
    t.addCallback(this.nextRound, null, null, this);
};


SharkGame.prototype.modePlayerDo = function (intro, tries) {
    if (tries > 0) {
        this.showNumbers();
    } else { // if intro or first try
        var t = new TimelineMax();
        t.addCallback(this.showNumbers, null, null, this);
    }
};


SharkGame.prototype.modePlayerShow = function (intro, tries) {
    if (tries > 0) {
        this.showNumbers();
    } else { // if intro or first try
        var t = new TimelineMax();
        if (intro) {
            t.skippable();
            t.add(this.agent.moveTo.start());
            t.addSound(this.speech, this.agent, 'agentIntro');
            t.addSound(this.speech, this.ape, 'watch');
        }
        t.addCallback(this.showNumbers, null, null, this);
    }
};

SharkGame.prototype.modeAgentTry = function (intro, tries) {
    var t = new TimelineMax();


     // if intro or first try
    if (intro) {
        t.skippable();
        t.addSound(this.speech, this.agent,'agentTry');
        t.addSound(this.speech, this.ape,'try');
    }

    this.yesButton = false;

    t.addCallback(this.showGoalObject, null, null, this);
    if(this.aGuess === true) {
        t.add(this.agentGuess(), '+=0.3');
        t.addCallback(this.showYesnos, null, null, this);
    }

};
