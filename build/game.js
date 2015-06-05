(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Character = require('./Character.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var EventSystem = require('../pubsub.js');
var utils = require('../utils.js');
var WaterCan = require('../objects/WaterCan.js');

module.exports = Agent;

Agent.prototype = Object.create(Character.prototype);
Agent.prototype.constructor = Agent;

/*
 * The super class for agent objects.
 * (See Panda for sub classing template)
 *
 * In a subclass, set up the following:
 * <SubAgent>.prototype.id = string, for reference in LANG files.
 * <SubAgent>.prototype.agentName = string, name of the agent.
 * this.coords
 *
 * The subagent's sprite atlas and audio should be loaded in the boot state.
 * The sprite atlas should be named the same as the id of the subagent.
 * It should at least have the following: arm, leg, body, eye,
 *                                        mouth0 (neutral), mouth1 (open), mouth2 (happy), mouth3 (sad)
 *
 * @param {Object} game - A reference to the Phaser game.
 * @return {Object} Itself
 */
function Agent (game) {
	Character.call(this, game); // Parent constructor.

	this.coords = this.coords || {};
	this.coords.anim = {
		arm: {
			origin: -0.8,
			wave: { from: -0.1, to: 0.2, durUp: 0.3, dur: 0.2 },
			pump: { angle: 0.5, move: 50, durUp: 0.5, dur: 0.25 },
			water: { angle: 0, back: -2, canAngle: -0.5, durBack: 0.2, durUp: 0.5, durCan: 0.5 }
		}
	};

	this.leftArm = this.game.add.group(this);
	this.leftArm.x = this.coords.arm.left.x;
	this.leftArm.y = this.coords.arm.left.y;
	this.leftArm.rotation = this.coords.anim.arm.origin;
	this.leftArm.create(0, 0, this.id, 'arm').anchor.set(1, 0.5);

	this.rightArm = this.game.add.group(this);
	this.rightArm.x = this.coords.arm.right.x;
	this.rightArm.y = this.coords.arm.right.y;
	this.rightArm.rotation = -this.coords.anim.arm.origin;
	var rightarm = this.rightArm.create(0, 0, this.id, 'arm');
	rightarm.anchor.set(1, 0.5);
	rightarm.scale.x = -1;

	this.leftLeg = this.game.add.group(this);
	this.leftLeg.x = this.coords.leg.left.x;
	this.leftLeg.y = this.coords.leg.left.y;
	this.leftLeg.create(0, 0, this.id, 'leg').anchor.set(0.5, 0);

	this.rightLeg = this.game.add.group(this);
	this.rightLeg.x = this.coords.leg.right.x;
	this.rightLeg.y = this.coords.leg.right.y;
	var rightleg = this.rightLeg.create(0, 0, this.id, 'leg');
	rightleg.anchor.set(0.5, 0);
	rightleg.scale.x = -1;

	this.body = this.create(0, 0, this.id, 'body');
	this.body.anchor.set(0.5);

	this.leftEye = this.create(this.coords.eye.left.x, this.coords.eye.left.y, this.id, 'eye');
	this.leftEye.anchor.set(0.5);

	this.rightEye = this.create(this.coords.eye.right.x, this.coords.eye.right.y, this.id, 'eye');
	this.rightEye.anchor.set(0.5);

	this.mouth = this.create(this.coords.mouth.x, this.coords.mouth.y, this.id, 'mouth0');
	this.mouth.anchor.set(0.5, 0);


	/* Character animations */
	var mouthNeutral = this.mouth.frame;
	this.talk = TweenMax.fromTo(this.mouth, 0.2, { frame: mouthNeutral }, {
		frame: mouthNeutral + 1, roundProps: 'frame', ease: Power0.easeInOut, repeat: -1, yoyo: true, paused: true
	});
	this.walk = new TimelineMax({ repeat: -1, paused: true })
		.to(this.leftLeg, 0.12, { y: '-=50' , ease: Power1.easeInOut, yoyo: true, repeat: 1 }, 0)
		.to(this.rightLeg, 0.12, { y: '-=50' , ease: Power1.easeInOut, yoyo: true, repeat: 1 }, 0.24);

	/* Create the speech audio sheet. */
	this.speech = utils.createAudioSheet(this.id + 'Speech', LANG.SPEECH[this.id].markers);

	/* Save the progress of the player for AI purposes */
	var _this = this;
	var currentMode = null;
	this.playerCorrect = 0;
	this.playerWrong = 0;
	this.playerGuesses = [];
	this.lastGuess = null;

	EventSystem.subscribe(GLOBAL.EVENT.subgameStarted, function () {
		_this.playerCorrect = 0;
		_this.playerWrong = 0;
		_this.playerGuesses = [];
	});

	EventSystem.subscribe(GLOBAL.EVENT.modeChange, function (mode) {
		currentMode = mode;
	});

	EventSystem.subscribe(GLOBAL.EVENT.tryNumber, function (guess, correct) {
		if (currentMode === GLOBAL.MODE.playerDo ||
			currentMode === GLOBAL.MODE.playerShow) {
			_this.playerGuesses.push([guess, correct]);
			if (guess === correct) {
				_this.playerCorrect++;
			} else {
				_this.playerWrong++;
			}
		}
	});

	return this;
}

/**
 * @property {number} tint - The tint of the agent.
 */
Object.defineProperty(Agent.prototype, 'tint', {
	get: function() {
		return this.body.tint;
	},
	set: function(value) {
		this.body.tint = value;
		this.leftArm.children[0].tint = value;
		this.rightArm.children[0].tint = value;
		this.leftLeg.children[0].tint = value;
		this.rightLeg.children[0].tint = value;
	}
});

/**
 * @property {number} percentWrong - The minimum chance of an agent picking wrong number.
 */
Agent.prototype.percentWrong = 0.3;

/**
 * Have the agent guess a number.
 * NOTE: This can be overwritten by other AI.
 * Variables that are available:
 *     this.playerGuesses [[guess, correct], ...].
 *     this.playerCorrect Number of correct guesses by the player.
 *     this.playerWrong   Number of incorrect guesses by the player.
 * @param {number} correct - The correct number.
 * @param {number} min - Minimum value to guess.
 * @param {number} max - Maximum value to guess.
 * @returns {number} The agent's guess.
 */
Agent.prototype.guessing = function (correct, min, max) {
	var perc = 1;
	if (this.playerWrong > 0) {
		perc = Math.random();
	}

	// Guessing correct is relative to how many wrongs you have made.
	// There is also always a small chance for the agent to be wrong.
	var guess;
	if (perc >= (this.playerWrong / this.playerGuesses.length) && Math.random() > this.percentWrong) {
		guess = correct;
	} else {
		do {
			guess = this.game.rnd.integerInRange(min, max);
		} while (guess === correct && (min < correct || correct < max));
	}

	return guess;
};

/**
 * Have the agent guess a number
 * Publishes agentGuess event.
 * @param {number} correct - The correct number.
 * @param {number} min - Minimum value to guess.
 * @param {number} max - Maximum value to guess.
 * @returns {number} The agent's guess (also available in this.lastGuess).
 */
Agent.prototype.guessNumber = function (correct, min, max) {
	this.lastGuess = this.guessing(correct, min, max);
	EventSystem.publish(GLOBAL.EVENT.agentGuess, [this.lastGuess, correct]);
	return this.lastGuess;
};


/**
 * Set the agent to neutral state.
 */
Agent.prototype.setNeutral = function () {
	this.mouth.frameName = 'mouth0';
};

/**
 * Set the agent to happy state.
 */
Agent.prototype.setHappy = function () {
	this.mouth.frameName = 'mouth2';
};

/**
 * Set the agent to sad state.
 */
Agent.prototype.setSad = function () {
	this.mouth.frameName = 'mouth3';
};

/**
 * Add a thought bubble to the agent. Must be called to use the "think" function.
 * @param {number} representation - The representation of the guess.
 * @param {boolean} right - If the thought bubble should be to the right instead of left (default false).
 */
Agent.prototype.addThought = function (representation, right) {
	Character.prototype.addThought.call(this, right ? 550 : -550, -475, representation, right);
	this.thought.toScale = 2;
};

/**
 * Animation: Think about the guessed number!
 * NOTE: The addThought must have been called before this function.
 * @param {boolean} sielnt - If the agent should be silent while thinking (optional).
 * @returns {Object} The animation timeline.
 */
Agent.prototype.think = function (silent) {
	if (typeof this.thought === 'undefined' || this.thought === null) {
		return;
	}

	var t = Character.prototype.think.call(this);
	t.addCallback(function () { this.thought.guess.number = this.lastGuess; }, 0, null, this);
	if (!silent) {
		t.addSound(this.speech, this, 'hmm', 0);

		// TODO: Sound should be based on confidence
		t.addSound(this.speech, this, this.game.rnd.pick(['isThisRight', 'itItThisOne', 'hasToBeThis']));
	}
	return t;
};

/**
 * Animation: Pump it up yeah!
 * @param {number} duration - Duration in seconds (default 3).
 * @param {number} arm - -1 = left arm, 0 = both, 1 = right arm (default 0).
 * @returns {Object} The animation timeline.
 */
Agent.prototype.fistPump = function (duration, arm) {
	duration = duration || 3;
	arm = arm || 0;

	var origin = this.coords.anim.arm.origin;
	var pump = this.coords.anim.arm.pump;
	var upDown = duration / 4;
	if (upDown > pump.durUp) { upDown = pump.durUp; }
	var times = TweenMax.prototype.calcYoyo(duration - upDown * 2, pump.dur);

	var t = new TimelineMax();
	if (arm <= 0) {
		t.add(new TweenMax(this.leftArm, upDown, { rotation: pump.angle, ease: Power1.easeIn }), 0);
		t.add(new TweenMax(this.leftArm, pump.dur, { x: '+=' + pump.move, y: '+=' + pump.move, ease: Power1.easeIn, repeat: times, yoyo: true }), 0);
		t.add(new TweenMax(this.leftArm, upDown, { rotation: origin, ease: Power1.easeOut }), pump.dur * times);
	}
	if (arm >= 0) {
		t.add(new TweenMax(this.rightArm, upDown, { rotation: -pump.angle, ease: Power1.easeIn }), 0);
		t.add(new TweenMax(this.rightArm, pump.dur, { x: '-=' + pump.move, y: '+=' + pump.move, ease: Power1.easeIn, repeat: times, yoyo: true }), 0);
		t.add(new TweenMax(this.rightArm, upDown, { rotation: -origin, ease: Power1.easeOut }), pump.dur * times);
	}
	return t;
};

/**
 * Animation: Put you hand up in the air and wave it around like you care.
 * @param {number} duration - Duration in seconds (default 3).
 * @param {number} arm - -1 = left arm, 0 = both, 1 = right arm (default 0).
 * @returns {Object} The animation timeline.
 */
Agent.prototype.wave = function (duration, arm) {
	duration = duration || 3;
	arm = arm || 0;

	var origin = this.coords.anim.arm.origin;
	var wave = this.coords.anim.arm.wave;
	var upDown = duration / 4;
	if (upDown > wave.durUp) { upDown = wave.durUp; }
	var times = parseInt((duration - upDown * 2) / wave.dur);
	times += (times % 2 === 0) ? 1 : 0; // Even numbers do not loop back to origin.

	var t = new TimelineMax();
	if (arm <= 0) {
		t.add(new TweenMax(this.leftArm, upDown, { rotation: wave.from, ease: Power1.easeIn }), 0);
		t.add(new TweenMax(this.leftArm, wave.dur, { rotation: wave.to, ease: Power0.easeOut, repeat: times, yoyo: true }), upDown);
		t.add(new TweenMax(this.leftArm, upDown, { rotation: origin, ease: Power1.easeOut }), wave.dur * times + upDown);
	}
	if (arm >= 0) {
		t.add(new TweenMax(this.rightArm, upDown, { rotation: -wave.from, ease: Power1.easeIn }), 0);
		t.add(new TweenMax(this.rightArm, wave.dur, { rotation: -wave.to, ease: Power0.easeOut, repeat: times, yoyo: true }), upDown);
		t.add(new TweenMax(this.rightArm, upDown, { rotation: -origin, ease: Power1.easeOut }), wave.dur * times + upDown);
	}
	return t;
};

/**
 * Animation: Water with a water can.
 * @param {number} duration - Duration in seconds (default 3).
 * @param {number} arm - 1 < left arm, otherwise right arm (default 0).
 * @returns {Object} The animation timeline.
 */
Agent.prototype.water = function (duration, arm) {
	duration = duration || 3;
	arm = arm || 0;
	var obj, dir;
	if (arm < 1) {
		obj = this.leftArm;
		dir = 1;
	} else {
		obj = this.rightArm;
		dir = -1;
	}

	var w  = new WaterCan(this.game, -obj.children[0].width + dir * 60, -100);
	w.scale.set(-dir * 3, 3);
	w.rotation = 0;
	w.visible = false;
	obj.add(w);

	var t = new TimelineMax();
	var water = this.coords.anim.arm.water;
	t.add(new TweenMax(obj, water.durBack, { rotation: dir * water.back, ease: Power1.easeIn }));
	t.addCallback(function () { w.visible = true; });
	t.add(new TweenMax(obj, water.durUp, { rotation: dir * water.angle, ease: Power1.easeOut }));
	t.add(new TweenMax(w, water.durCan, { rotation: dir * water.canAngle }));
	t.addCallback(this.eyesFollowObject, null, [w.can], this);
	t.addLabel('watering');
	t.add(w.pour(duration));
	t.addCallback(this.eyesStopFollow, null, null, this);
	t.add(new TweenMax(obj, water.durUp, { rotation: dir * water.back, ease: Power1.easeIn }));
	t.addCallback(function () { w.destroy(); });
	t.add(new TweenMax(obj, water.durBack, { rotation: dir * this.coords.anim.arm.origin, ease: Power1.easeOut }));
	return t;
};

/**
 * Have an eye follow a target.
 * @param {Object} eye - The eye to follow with.
 * @param {Object} targ - The target to follow.
 * @private
 */
Agent.prototype._eyeFollow = function (eye, targ) {
	var origin = { x: eye.x, y: eye.y };
	var depth = this.coords.eye.depth;
	var maxMove = this.coords.eye.maxMove;
	var agent = this;

	/* Update functions trigger on every game loop */
	eye.update = function () {
		if (!agent.visible) { return; }

		var o = this.world;
		var a = this.game.physics.arcade.angleBetween(o, targ.world ? targ.world : targ);
		var d = this.game.physics.arcade.distanceBetween(o, targ.world ? targ.world : targ) / depth;
		if (d > maxMove) { d = maxMove; }
		this.x = Math.cos(a) * d + origin.x;
		this.y = Math.sin(a) * d + origin.y;
	};
};

/**
 * Make the agent's eyes follow an object.
 * @param {Object} targ - The target to follow
 */
Agent.prototype.eyesFollowObject = function (targ) {
	this.eyesStopFollow();

	this._eyeFollow(this.leftEye, targ);
	this._eyeFollow(this.rightEye, targ);
};

/**
 * Make the agent's eyes follow the input pointer.
 */
Agent.prototype.eyesFollowPointer = function () {
	this.eyesFollowObject(this.game.input.activePointer);
};

/**
 * Stop the eyes following pointer or object.
 */
Agent.prototype.eyesStopFollow = function () {
	this.leftEye.x = this.coords.eye.left.x;
	this.leftEye.y = this.coords.eye.left.y;
	this.rightEye.x = this.coords.eye.right.x;
	this.rightEye.y = this.coords.eye.right.y;

	this.leftEye.update = function () {};
	this.rightEye.update = function () {};
};
},{"../global.js":8,"../language.js":9,"../objects/WaterCan.js":21,"../pubsub.js":34,"../utils.js":48,"./Character.js":2}],2:[function(require,module,exports){
var NumberButton = require('../objects/buttons/NumberButton.js');
var GLOBAL = require('../global.js');
var utils = require('../utils.js');

module.exports = Character;

Character.prototype = Object.create(Phaser.Group.prototype);
Character.prototype.constructor = Character;

/**
 * Superclass for characters.
 * @param {Object} game - A reference to the Phaser game.
 */
function Character (game) {
	Phaser.Group.call(this, game, null); // Parent constructor.
}

/**
 * When you want a sound to be said by a character.
 * NOTE: If the character has a this.talk TweenMax or TimelineMax it will be used.
 * @param {string|Object} what - Key to a sound file or the sound object.
 * @param {string} marker - If you want the speaker to only talk during a specific marker.
 * @returns {Object} The sound object (not started).
 */
Character.prototype.say = function (what, marker) {
	var a = (typeof what === 'string') ? this.game.add.audio(what) : what;

	/* Check if character has a talk animation. */
	if (this.talk) {
		var current;
		var signals = [];

		/* Functions to run on audio signals. */
		var play = function () {
			if (a.currentMarker) {
				current = a.currentMarker;
			}
			if (!marker || current === marker) {
				this.talk.play();
			}
		};

		var pause = function () {
			if (!marker || current === marker) {
				this.talk.pause(0);
			}
		};

		var stop = function () {
			if (!marker || current === marker) {
				this.talk.pause(0);
				while (signals.length > 0) {
					signals[0].detach();
					signals[0]._destroy();
					signals.splice(0, 1);
				}
			}
		};

		signals.push(a.onPlay.add(play, this));
		signals.push(a.onResume.add(play, this));
		signals.push(a.onPause.add(pause, this));
		signals.push(a.onStop.add(stop, this));
	}

	return a;
};

/**
 * Move a character.
 * NOTE: If this.turn property is true, it will turn according to direction.
 * NOTE: If the character has a this.walk TweenMax or TimelineMax it will be used.
 * @param {Object} properties - Properties to tween, set x and/or y to move.
 * @param {number} duration - Duration of the move.
 * @param {number} scale - If a scaling should happen during the move.
 * @returns {Object} The movement timeline.
 */
Character.prototype.move = function (properties, duration, scale) {
	properties.ease = properties.ease || Power1.easeInOut;

	var t = new TimelineMax();
	t.to(this, duration, properties);

	/* Check if character has a walk animation. */
	if (this.walk) {
		t.addCallback(function () { this.walk.play(); }, 0, null, this);
		t.addCallback(function () { this.walk.pause(0); }, '+=0', null, this);
	}

	/* Animate the scale if available. */
	/* Scaling is also how we turn the character, so it gets a bit complicated later... */
	var ts = null;
	if (scale) {
		ts = new TweenMax(this.scale, duration, { x: scale, y: scale, ease: properties.ease });
	}

	/* Check if the character should be turned when moving. */
	if (this.turn) {
		var _this = this;
		var turnDuration = 0.2;
		var percentDuration = turnDuration / duration;

		t.add(new TweenMax(this.scale, turnDuration, {
			ease: properties.ease,
			onStart: function () {
				// The turn tween needs to be updated in real time,
				// otherwise it won't work in Timelines.
				var prop = { x: Math.abs(_this.scale.x), y: Math.abs(_this.scale.y) };

				// Check if we are scaling along with the movement.
				// In that case we scale the turning as well
				if (ts) {
					if (ts.vars.x > _this.scale.x) { // Scaling up
						prop.x += ts.vars.x * percentDuration;
					} else { // Scaling down
						prop.x -= ts.vars.x * percentDuration;
					}
					if (ts.vars.x > _this.scale.x) { // Scaling up
						prop.y += ts.vars.y * percentDuration;
					} else { // Scaling down
						prop.y -= ts.vars.y * percentDuration;
					}
				}

				// Set the scale direction
				// If we do not change x and we are looking left, keep doing it.
				if (typeof properties.x === 'undefined' || properties.x === null ||
					_this.x === properties.x) {
					if (_this.scale.x < 0) {
						prop.x *= -1;
					}
				/* If we are going to a position to the left of the current, look left. */
				} else if (properties.x < _this.x) {
					prop.x *= -1;
				}

				/* Update the turn tween with new values */
				this.updateTo({ x: prop.x, y: prop.y });

				/* Make sure that a scaling tween has the correct direction */
				if (ts && prop.x < 0) {
					ts.updateTo({ x: -1 * ts.vars.x });
				}
			}
		}), 0);

		if (ts) {
			/* Update the duration of scaling and add it. */
			ts.duration(ts.duration() - turnDuration);
			t.add(ts, turnDuration);
		}

	} else if (ts) {
		/* No turning, just add the scaling. */
		t.add(ts, 0);
	}

	return t;
};

/**
 * Turn around! Every now and then I get a little bit lonely...
 * @param {number} direction - -1 = left, 1 = right, default: opposite of current.
 *                             NOTE: This only takes into account the state when the function is called.
 *                             Making a "opposite turn" inside a Timeline might not have the expected result.
 * @returns {Object} The turning tween.
 */
Character.prototype.moveTurn = function (direction) {
	// Turn by manipulating the scale.
	var newScale = (direction ? direction * Math.abs(this.scale.x) : -1 * this.scale.x);
	return new TweenMax(this.scale, 0.2, { x: newScale });
};


/**
 * Add a thought bubble to the agent. Must be called to use the "think" function.
 * NOTE: You can change the scale for the think function by setting the toScale property.
 * @param {number} x - The x position.
 * @param {number} y - The y position.
 * @param {number} representation - The representation of the guess.
 * @param {boolean} mirror - If the thought bubble should be to the right instead of left (default false).
 */
Character.prototype.addThought = function (x, y, representation, mirror) {
	this.thought = this.game.add.group(this);
	this.thought.x = x;
	this.thought.y = y;
	this.thought.visible = false;
	this.thought.toScale = 1;
	this.thought.bubble = this.thought.create(0, 0, 'objects', 'thought_bubble');
	this.thought.bubble.scale.x = 1;
	this.thought.bubble.anchor.set(0.5);
	var options = {
		x: -60,
		y: -55,
		size: 100,
		disabled: true
	};
	// Make sure that button background is correct according to method.
	if (this.game.state.getCurrentState().method === GLOBAL.METHOD.count ||
		this.game.state.getCurrentState().method === GLOBAL.METHOD.incrementalSteps) {
		options.background = 'button';
	}
	this.thought.guess = new NumberButton(this.game, 1, representation, options);
	this.thought.add(this.thought.guess);
	if (mirror) {
		this.mirrorThought();
	}
};

/**
 * Mirror the thought bubble 180 degrees horizontally.
 */
Character.prototype.mirrorThought = function () {
	this.thought.guess.x += (this.thought.guess.x > -60) ? -20 : 20;
	this.thought.bubble.scale.x *= -1;
};

/**
 * Animation: Think about the guessed number!
 * NOTE: The addThought must have been called before this function.
 * @returns {Object} The animation timeline.
 */
Character.prototype.think = function () {
	if (typeof this.thought === 'undefined' || this.thought === null) {
		return;
	}

	var t = new TimelineMax();
	t.addCallback(function () { this.thought.guess.visible = false; }, null, null, this);
	t.add(utils.fade(this.thought, true));
	t.add(TweenMax.fromTo(this.thought.scale, 1.5,
		{ x: 0, y: 0 },
		{ x: this.thought.toScale, y: this.thought.toScale, ease: Elastic.easeOut }
	), 0);
	t.add(utils.fade(this.thought.guess, true, 1), 0.5);

	return t;
};
},{"../global.js":8,"../objects/buttons/NumberButton.js":24,"../utils.js":48}],3:[function(require,module,exports){
var Agent = require('./Agent.js');
var LANG = require('../language.js');

module.exports = Hedgehog;

Hedgehog.prototype = Object.create(Agent.prototype);
Hedgehog.prototype.constructor = Hedgehog;

Hedgehog.prototype.id = 'hedgehog'; // Reference for LANG files and asset files
Hedgehog.prototype.agentName = LANG.TEXT.hedgehogName;

/**
 * The hedgehog agent.
 * The asset files are loaded in the boot state using key: *.prototype.id.
 * @param {Object} game - A reference to the Phaser game.
 * @return Itself
 */
function Hedgehog (game) {
	this.coords = {
		arm: {
			left: { x: -100, y: -80 },
			right: { x: 100, y: -80 }
		},
		leg: {
			left: { x: -150, y: 300 },
			right: { x: 150, y: 300 }
		},
		eye: {
			left: { x: -53, y: -272 },
			right: { x: 35, y: -272 },
			depth: 20,
			maxMove: 7
		},
		mouth: {
			x: -6, y: -205
		}
	};

	Agent.call(this, game); // Call parent constructor.

	var leftEyeSocket = this.create(this.coords.eye.left.x + 1, this.coords.eye.left.y - 8, this.id, 'socket');
	leftEyeSocket.anchor.set(0.5);
	this.bringToTop(this.leftEye);

	var rightEyeSocket = this.create(this.coords.eye.right.x - 1, this.coords.eye.right.y - 8, this.id, 'socket');
	rightEyeSocket.anchor.set(0.5);
	rightEyeSocket.scale.set(-1, 1);
	this.bringToTop(this.rightEye);

	var nose = this.create(this.coords.mouth.x - 2, this.coords.mouth.y - 15, this.id, 'nose');
	nose.anchor.set(0.5);
	
	var back = this.create(0, 0, this.id, 'back');
	back.anchor.set(0.5);
	this.sendToBack(back);

	return this;
}
},{"../language.js":9,"./Agent.js":1}],4:[function(require,module,exports){
var Agent = require('./Agent.js');
var LANG = require('../language.js');

module.exports = Mouse;

Mouse.prototype = Object.create(Agent.prototype);
Mouse.prototype.constructor = Mouse;

Mouse.prototype.id = 'mouse'; // Reference for LANG files and asset files
Mouse.prototype.agentName = LANG.TEXT.mouseName;

/**
 * The mouse agent.
 * The asset files are loaded in the boot state using key: *.prototype.id.
 * @param {Object} game - A reference to the Phaser game.
 * @return Itself
 */
function Mouse (game) {
	this.coords = {
		arm: {
			left: { x: -110, y: -40 },
			right: { x: 110, y: -40 }
		},
		leg: {
			left: { x: -150, y: 350 },
			right: { x: 150, y: 350 }
		},
		eye: {
			left: { x: -50, y: -240 },
			right: { x: 50, y: -240 },
			depth: 20,
			maxMove: 9
		},
		mouth: {
			x: 0, y: -150
		}
	};

	Agent.call(this, game); // Call parent constructor.

	var leftEyeSocket = this.create(this.coords.eye.left.x + 1, this.coords.eye.left.y - 8, this.id, 'socket');
	leftEyeSocket.anchor.set(0.5);
	this.bringToTop(this.leftEye);

	var rightEyeSocket = this.create(this.coords.eye.right.x - 1, this.coords.eye.right.y - 8, this.id, 'socket');
	rightEyeSocket.anchor.set(0.5);
	rightEyeSocket.scale.set(-1, 1);
	this.bringToTop(this.rightEye);

	var nose = this.create(this.coords.mouth.x - 1, this.coords.mouth.y - 17, this.id, 'nose');
	nose.anchor.set(0.5);

	return this;
}
},{"../language.js":9,"./Agent.js":1}],5:[function(require,module,exports){
var Agent = require('./Agent.js');
var LANG = require('../language.js');

module.exports = Panda;

Panda.prototype = Object.create(Agent.prototype);
Panda.prototype.constructor = Panda;

Panda.prototype.id = 'panda'; // Reference for LANG files and asset files
Panda.prototype.agentName = LANG.TEXT.pandaName;

/**
 * The panda agent.
 * The asset files are loaded in the boot state using key: *.prototype.id.
 * @param {Object} game - A reference to the Phaser game.
 * @return Itself
 */
function Panda (game) {
	this.coords = {
		arm: {
			left: { x: -150, y: -20 },
			right: { x: 150, y: -20 }
		},
		leg: {
			left: { x: -130, y: 320 },
			right: { x: 130, y: 320 }
		},
		eye: {
			left: { x: -65, y: -238 },
			right: { x: 65, y: -238 },
			depth: 20,
			maxMove: 9
		},
		mouth: {
			x: 0, y: -142
		}
	};

	Agent.call(this, game); // Call parent constructor.

	return this;
}
},{"../language.js":9,"./Agent.js":1}],6:[function(require,module,exports){
var GLOBAL = require('./global.js');
var EventSystem = require('./pubsub.js');

/**
 * Handles the communication with the backend.
 * The communication needs a Route object set, that object will tell where
 * to send the different get and post requests.
 * @global
 */
module.exports = {
	/**
	 * @property {Object} _maxTries - Max tries to send requests.
	 * @default
	 * @private
	 */
	_maxTries: 10,

	/**
	 * @property {Object} _rnd - A random data generator (we have no access to game object here).
	 * @private
	 */
	_rnd: new Phaser.RandomDataGenerator(),

	/**
	 * @property {Object} _previous - The previous scenario.
	 * @private
	 */
	_previous: -1,

	/**
	 * Basic ajax call.
	 * Publishes connection event if ajax call fail.
	 * @param {Object} settings - An object with settings to jQuery ajax call
	 * @param {number} tries - Amount of times to resend if something goes wrong.
	 *                         Default value is max tries.
	 *                         NOTE: If server code is between 400 and 500 it will not retry.
	 * @return {Array} A promise to the ajax request.
	 *                 NOTE: This has a fail function set which will show connection lost.
	 */
	ajax: function (settings, tries) {
		if (isNaN(tries) || tries === null) {
			tries = this._maxTries;
		}
		tries--;

		var _this = this;
		return $.ajax(settings).fail(function (jqXHR) {
			if (jqXHR.status >= 400 && jqXHR.status < 500) {
				tries = 0;
			}

			if (tries > 0) {
				EventSystem.publish(GLOBAL.EVENT.connection, [false]);
				setTimeout(function () { _this.ajax(settings, tries); },
					(_this._maxTries - tries) * 1000);
			} else {
				EventSystem.publish(GLOBAL.EVENT.connectionLost);
			}
		});
	},

	/**
	 * GET request.
	 * Publishes connection event when get is done.
	 * NOTE: This request is sent synchronous.
	 * @param {String} routeName - The name of the route function.
	 * @param {*} parameters - optional parameters for the route action.
	 * @return {Object} The object returned from the ajax request.
	 **/
	get: function (routeName, parameters) {
		var ret = null;

		if (typeof Routes !== 'undefined' && Routes[routeName]) {
			var settings = {
				url: Routes[routeName](parameters),
				async: false
			};

			this.ajax(settings).done(function (data) {
				ret = data;
				EventSystem.publish(GLOBAL.EVENT.connection, [true]);
			});
		}

		return ret;
	},

	/**
	 * POST data.
	 * Publishes connection event when post is done.
	 * @param {String} routeName - The name of the route function.
	 * @param {Object} data - The data to send (will be transformed to JSON-format).
	 */
	post: function (routeName, data, callback) {
		/* We wrap the data in "magic" to make it easier to find at the server. */
		var stringified = JSON.stringify({ magic: data });

		if (typeof Routes !== 'undefined' && Routes[routeName]) {
			var settings = {
				url: Routes[routeName](),
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json',
				data: stringified
			};

			this.ajax(settings).done(function (data) {
				EventSystem.publish(GLOBAL.EVENT.connection, [true]);
				if (callback) {
					callback(data);
				}
			});

		} else {
			/* This should only be used when in local mode. */
			console.log('POST (' + routeName + '): ' + stringified);
		}
	},


	/**
	 * GET the data of the player.
	 * @return {Object} An object with data about the player.
	 */
	getPlayer: function () {
		return this.get('current_api_players_path');
	},

	/**
	 * GET the garden appearance.
	 * @return {Object} An object with data about the garden.
	 */
	getGarden: function () {
		return this.get('current_api_gardens_path');
	},

	/**
	 * GET the next game that should be played.
	 * @return {Object} An object with data about the next game.
	 */
	getScenario: function () {
		var data = this.get('current_api_scenarios_path');

		if (data) {
			// Setup subgame. First check if we should pick a random game.
			if (data.subgame === GLOBAL.STATE.random) {
				do {
					data.subgame = this._rnd.pick(GLOBAL.STATE.randomGames);
				} while (data.subgame === this._previous);
			}
			this._previous = data.subgame;

			// Representations are only one integer, but can include several representations.
			// Every position holds its own representation, see global.js for more info.
			var rep = [];
			while (data.representation >= 10) {
				rep.unshift(data.representation % 10);
				data.representation = Math.floor(data.representation/10);
			}
			rep.unshift(data.representation);
			data.representation = rep;

			// Add intro and outro for the game.
			data.mode.unshift(GLOBAL.MODE.intro);
			data.mode.push(GLOBAL.MODE.outro);
		}

		return data;
	},

	/**
	 * POST agent updates.
	 * @param {Object} data - The agent updates.
	 */
	putAgent: function (data) {
		this.post('update_agent_api_players_path', data);
	},

	/**
	 * POST garden updates.
	 * Publishes plantUpgrade event.
	 * @param {Object} data - The garden updates.
	 */
	putUpgradePlant: function (data) {
		this.post('upgrade_field_api_gardens_path', data, function (data) {
			EventSystem.publish(GLOBAL.EVENT.plantUpgrade, [data]);
		});
	},

	/**
	 * POST player session results.
	 * @param {Object} data - The session results.
	 */
	putSession: function (data) {
		this.post('register_api_player_sessions_path', data);
	}
};
},{"./global.js":8,"./pubsub.js":34}],7:[function(require,module,exports){
var GLOBAL = require('./global.js');
var Player = require('./player.js');
var Hedgehog = require('./agent/Hedgehog.js');
var Mouse = require('./agent/Mouse.js');
var Panda = require('./agent/Panda.js');
var BootState = require('./states/BootState.js');
var EntryState = require('./states/EntryState.js');
var AgentSetupState = require('./states/AgentSetupState.js');
var GardenState = require('./states/GardenState.js');
var BeachState = require('./states/BeachState.js');
var SharkGame = require('./states/subgames/SharkGame.js');
/*var LizardJungleGame = require('./states/subgames/LizardJungleGame.js');
var BirdheroGame = require('./states/subgames/BirdheroGame.js');
var BalloonGame = require('./states/subgames/BalloonGame.js');*/
var BeeFlightGame = require('./states/subgames/BeeFlightGame.js');
var ChooseScenarioState = require('./states/ChooseScenarioState.js');

require('./logger.js'); // Start logger
require('./utils.js'); // Setup prototype functions.

/**
 * This is the entrance point to the game.
 * This is where all the states/games are added.
 * BootState will run after this.
 */
window.onload = function () {

	// Only start game if the element to put it in exist.
	if (document.querySelector('#game')) {

		// If running locally we enter debug mode.
		if (window.location.hostname.toLowerCase() === 'localhost' || window.location.hostname === '127.0.0.1') {
			GLOBAL.debug = true;
		}

		// Create game object.
		var game = new Phaser.Game(1024, 768, Phaser.AUTO, 'game');

		// Cache game object among GLOBALs, use this only if necessary.
		// TODO: This is not a pretty solution, but it becomes very complicated in utils otherwise.
		GLOBAL.game = game;

		/* Setup agent lookup globals */
		GLOBAL.AGENT = {
			0: Panda,
			1: Hedgehog,
			2: Mouse
		};

		// Cache player object in the game object for easy access.
		game.player = new Player(game);

		// Setup game states.
		game.state.add('Boot', BootState);
		game.state.add(GLOBAL.STATE.entry,        EntryState);
		game.state.add(GLOBAL.STATE.agentSetup,   AgentSetupState);
		game.state.add(GLOBAL.STATE.garden,       GardenState);
		game.state.add(GLOBAL.STATE.beach,        BeachState);
		game.state.add(GLOBAL.STATE.sharkGame,	  SharkGame);
		/*game.state.add(GLOBAL.STATE.lizardGame,   LizardJungleGame);
		game.state.add(GLOBAL.STATE.birdheroGame, BirdheroGame);
		game.state.add(GLOBAL.STATE.balloonGame,  BalloonGame);*/
		game.state.add(GLOBAL.STATE.beeGame,      BeeFlightGame);
		game.state.add(GLOBAL.STATE.scenario,     ChooseScenarioState);

		// Run the boot state.
		game.state.start('Boot');
	}
};
},{"./agent/Hedgehog.js":3,"./agent/Mouse.js":4,"./agent/Panda.js":5,"./global.js":8,"./logger.js":10,"./player.js":33,"./states/AgentSetupState.js":35,"./states/BeachState.js":36,"./states/BootState.js":37,"./states/ChooseScenarioState.js":38,"./states/EntryState.js":39,"./states/GardenState.js":40,"./states/subgames/BeeFlightGame.js":43,"./states/subgames/SharkGame.js":45,"./utils.js":48}],8:[function(require,module,exports){
/* Used for the publish-subscribe system */
exports.EVENT = {
	stateShutDown:     'stateShutDown',     // [state]

	subgameStarted:    'subgameStarted',    // [game type, session token]
	numbergameStarted: 'numbergameStarted', // [method, maxAmount, representation]
	modeChange:        'modeChange',        // [new mode]
	tryNumber:         'tryNumber',         // [guess, correct number]
	agentGuess:        'agentGuess',        // [guess, correct number]
	numberPress:       'numberPress',       // [number, representations]
	waterAdded:        'waterAdded',        // [total amount, added amount]
	disabled:          'disabled',          // [true/false]

	plantPress:        'plantPress',        // [garden plant]
	waterPlant:        'waterPlant',        // [garden plant]
	plantUpgrade:      'plantUpgrade',      // [backend data]

	skippable:         'skippable',         // [TimelineMax object]
	connection:        'connection',        // [status]
	connectionLost:    'connectionLost'
};

/* The different Phaser states, some are the subgames for scenarios */
exports.STATE = {
	entry:        'Entry',
	agentSetup:   'AgentSetup',
	garden:       'Garden',
	beach:		  'Beach',
	0:            'Lizard',
	lizardGame:   'Lizard',
	1:            'Mountain',
	mountainGame: 'Mountain',
	2:            'Birdhero',
	birdheroGame: 'Birdhero',
	3:            'Balloon',
	balloonGame:  'Balloon',
	4:            'BeeFlight',
	sharkGame:	  'SharkGame',
	beeGame:      'BeeFlight',
	scenario:     'Scenario',
	random:       100,         // Not an actual state.
	randomGames:  [0, 2, 3, 4] // Not an actual state, it will randomly pick one in the array.
};
exports.STATE_KEYS = null; // Used to clear a subgame, saved when subgame is booted.

/* Method for scenario */
exports.METHOD = {
	count: 0,              // All numbers displayed at the same time
	incrementalSteps: 1,   // One number that you increment or decrement, ex: (- 1 +)
	addition: 2,           // Start with one number and choose what to add
	subtraction: 3,        // Start with one number and choose what to subtract
	additionSubtraction: 4 // Start with one number and choose what to add or subtract
};

/* Number representation for scenario */
exports.NUMBER_REPRESENTATION = {
	none:       0,
	dots:       1,
	fingers:    2,
	strikes:    3,
	objects:    4,
	numbers:    5,
	dice:       6,
	mixed:      9,
	// Multiple representations will be formed as concatenations, such as:
	// fingers + dots = 21
	// So if representations go above 10 there will be problems in Backend.js.
	yesno:   1000 // Special for yes/no: odd values = yes, even values = no
};


exports.NUMBER_RANGE = {
	0: 4, // Range 1-4
	1: 9  // Range 1-9
};

/* The different modes of a subgame */
exports.MODE = {
	playerDo:   0,
	playerShow: 1,
	agentTry:   2,
	agentDo:    3,
	intro:      10,
	outro:      11
};

// Default button color.
exports.BUTTON_COLOR = 0xc2a12d;

// Font to use in the game.
exports.FONT = 'Coming Soon';
},{}],9:[function(require,module,exports){
/**
 * This is the language variable for the game.
 * All text and speech files for the game should be here.
 * Text strings are in LANG.TEXT.
 * Speech sound files are in LANG.SPEECH.
 * For the agent, use LANG.SPEECH.AGENT.
 *
 * It was developed with switching languages in mind.
 * To do so use function LANG.change.
 * Swedish is the default language and should be used as a
 * template for other languages.
 *
 * NOTE: GLOBAL.FONT specifies which font that is used.
 *
 * *** A NOTE ABOUT AUDIO FILE SIZE ***
 * This project uses web audio, which in turn uses huge memory amounts.
 * This is a problem for our speech on devices with restricted memory.
 * I, Erik, have investigated how to lower this usage:
 * Has effect:
 * 1) Reducing the amount of channels, such as from stereo to mono.
 * 2) Removing unused speech.
 * 3) Never have any unused sound loaded in memory.
 * 
 * Has NO effect:
 * 1) Reducing sample rate or bitrate (web audio decodes to 44100 32bit).
 *    However, file size is reduced by this which gives faster loading times.
 * 2) Modifying format (same reason as previous).
 *    However, some formats cannot be played on all devices, so backup is needed.
 * 3) Removing pauses (or at least has a very marginal effect).
 *
 * @global
 */
var LANG = {};

module.exports = LANG;

/**
 * Change the language.
 * NOTE: A warning is set if text or speech are missing translations.
 * @param {Object} text - The text.
 * @param {Object} speech - The speech markers.
 */
LANG.change = function (text, speech, player) {
	function replacer (orig, plus, missing, prefix) {
		missing = missing || [];
		if (!prefix) { prefix = ''; }
		else { prefix += '/'; }

		for (var p in orig) {
			if (p === 'AGENT') { continue; } // AGENT is special case

			if (!plus.hasOwnProperty(p)) {
				missing.push(prefix + p);
			} else if (typeof orig[p] !== 'string') {
				replacer(orig[p], plus[p], missing, prefix + p);
			} else {
				orig[p] = plus[p];
			}
		}

		return missing;
	}

	var m = replacer(LANG.TEXT, text);
	if (m.length > 0) {
		console.warn('TEXT is missing: ' + m);
	}

	m = replacer(LANG.SPEECH, speech);
	if (m.length > 0) {
		console.warn('SPEECH is missing: ' + m);
	}

	if (player && player.agent && player.agent.prototype.id) {
		LANG.setAgent(player.agent.prototype.id);
	} else { // Use panda as default agent.
		LANG.setAgent('panda');
	}
};

/**
 * Set the speech for the agent.
 * @param {Object} id - The id of the agent.
 */
LANG.setAgent = function (id) {
	LANG.SPEECH.AGENT = LANG.SPEECH[id];
};

/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                        Swedish language (default)                         */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

LANG.swedish = {};
LANG.swedish.text = {
	/* General */
	ok: 'Ok',
	decoding: 'Snart klar...', // When decoding sound files
	connectionLost: 'Ingen anslutning',
	connectionLostMessage: 'Ajdå. Vi tappade anslutningen till servern.',

	/* Entry state */
	title: 'Magical Garden',
	start: 'Starta!',
	continuePlaying: 'Fortsätt',
	changeAgent: 'Byt ut ', // Followed by agent name
	credits: 'Skapat av',
	anonymous: 'Anonym',
	logOut: 'Logga ut',

	/* Credits */
	creditsMade: 'Detta spelet är skapat vid Lunds Universitet',
	creditsDeveloped: 'Idé och utformning',
	creditsProgramming: 'Programmering',
	creditsGraphics: 'Grafik',
	creditsVoices: 'Röster',
	creditsVoicePanda: 'Igis Gulz-Haake',
	creditsVoiceHedgehog: 'Agneta Gulz',
	creditsVoiceMouse: 'Sebastian Gulz-Haake',
	creditsVoiceWoodlouse: 'Igis Gulz-Haake',
	creditsVoiceLizard: 'Igis Gulz-Haake',
	creditsVoiceBumblebee: 'Agneta Gulz',
	creditsVoiceBird: 'Igis Gulz-Haake',
	creditsMusic: 'Musik',
	creditsSfx: 'Ljudeffekter',
	creditsThanks: 'Tack till',

	/* Garden state */
	maxLevel: 'MAX!',

	/* Player setup state */
	pickFriend: 'Vem vill du bli kompis med?',
	confirmFriend: 'Välj ', // Followed by agent name
	changeColor: 'Byt färg',

	/* Menu items */
	menu: 'MENY',
	resume: 'Fortsätt',
	gotoGarden: 'Gå till trädgården',
	quit: 'Avsluta spelet',

	/* Agents and characters */
	pandaName: 'Panders',
	hedgehogName: 'Igis',
	mouseName: 'Mille',
	woodlouseName: 'Grålle',
	lizardName: 'Kamilla',
	bumblebeeName: 'Humfrid',
	birdName: 'Fålia'
};

LANG.swedish.speech = {
	/* Agent intro */
	agentIntro: {
		speech: [
			'audio/agent/swedishIntro.m4a',
			'audio/agent/swedishIntro.ogg',
			'audio/agent/swedishIntro.mp3'
		],
		markers: {
			pandaHello:          [ 0.0, 1.7],
			pandaFunTogether:    [ 2.8, 2.0],
			hedgehogHello:       [ 5.7, 2.4],
			hedgehogFunTogether: [ 8.9, 3.0],
			mouseHello:          [12.3, 1.7],
			mouseFunTogether:    [14.4, 1.9]
		}
	},

	/* Subgames */
	birdhero: {
		speech: [
			'audio/subgames/birdhero/swedish.m4a',
			'audio/subgames/birdhero/swedish.ogg',
			'audio/subgames/birdhero/swedish.mp3'
		],
		markers: {
			thisFloor:     [ 0.2, 1.9],
			helpMeHome:    [ 2.6, 2.0],
			dontLiveHere:  [ 5.9, 1.7],
			notMyParent:   [ 9.1, 2.3],
			higher:        [13.0, 1.9],
			lower:         [16.3, 1.8],
			thankYou:      [19.7, 1.5],
			blownOut:      [23.2, 7.8],
			countFeathers: [32.2, 3.3],
			pushButton:    [37.0, 2.9],
			useMyself:     [41.2, 2.5],
			howMuchHigher: [45.2, 2.0],
			howMuchLower:  [48.3, 2.1],
			thinkItIs:     [51.1, 2.8],
			higherOrLower: [55.6, 2.7]
		}
	},

	balloongame: {
		speech: [
			'audio/subgames/balloongame/swedish.m4a',
			'audio/subgames/balloongame/swedish.ogg',
			'audio/subgames/balloongame/swedish.mp3'
		],
		markers: {
			yippie1:        [  0.1, 1.3],
			yippie2:        [  2.2, 0.8],
			loveTreasures:  [  4.0, 1.6],
			helpToCave:     [  6.6, 4.4],
			lookAtMap:      [ 12.0, 2.8],
			presetBalloons: [ 15.7, 3.4],
			guessBalloons:  [ 20.4, 4.5],
			whatDoYouThink: [ 25.4, 0.6],
			canYouDrag:     [ 27.1, 1.5],
			floor1:         [ 29.6, 2.6],
			floor2:         [ 33.1, 2.1],
			floor3:         [ 36.3, 2.2],
			floor4:         [ 39.7, 2.3],
			canYouDragRight:[ 43.3, 2.2],
			buttonSubtract: [ 46.9, 4.5],
			buttonAddSub:   [ 53.0, 5.2],
			sameAsMap:      [ 59.9, 3.0],
			whatButton:     [ 64.2, 2.4],
			pushButton:     [ 67.8, 5.7],
			pushAnchor:     [ 74.8, 1.9],
			treasure1:      [ 78.0, 1.6],
			treasure2:      [ 80.2, 1.2],
			treasureBoot:   [ 82.1, 2.9],
			newTreasure:    [ 85.9, 0.7],
			helpMeGetThere: [ 87.7, 1.3],
			wrong1:         [ 89.7, 1.4],
			wrong2:         [ 92.0, 1.3],
			lower:          [ 94.2, 1.7],
			higher:         [ 96.9, 1.4],
			fullSack:       [ 99.4, 4.6],
			thankYou:       [104.7, 3.6]
		}
	},

	sharkgame:{
		speech: [
			'audio/subgames/sharkgame/swedish.mp3'
		],
		markers:{
			intro:		[ 0.0, 12.5],
			shark:		[ 12.5, 5.0],
			intro2:		[ 23.0, 21.5],
			intro3:		[ 45.0, 7.0],
			wrong:		[ 53.0, 9.0],
			correct:	[ 62.5, 9.0],
			agentIntro:	[ 71.4, 8.0],
			watch:		[ 80.0, 4.0],
			agentTry:	[ 85.0, 5.0],
			try:		[ 91.0, 5.0],
			guess:		[ 97.0, 4.0],
			wrongGuess:	[ 102.0, 4.0],
			win:		[ 106.0, 11.0]
		}
	},

	beeflight: {
		speech: [
			'audio/subgames/beeflight/swedish.m4a',
			'audio/subgames/beeflight/swedish.ogg',
			'audio/subgames/beeflight/swedish.mp3'
		],
		markers: {
			slurp:        [  0.0, 2.0],
			okay:         [  2.5, 0.8],
			letsGo:       [  3.5, 1.2],
			order1:       [  5.5, 1.0],
			order2:       [  7.1, 1.1],
			order3:       [  8.7, 1.3],
			order4:       [ 10.8, 1.2],
			order5:       [ 12.9, 1.0],
			order6:       [ 15.1, 1.0],
			order7:       [ 17.2, 1.0],
			order8:       [ 18.9, 1.5],
			order9:       [ 21.1, 1.6],
			flower:       [ 23.9, 1.3],
			number1:      [ 25.9, 0.9],
			number2:      [ 27.1, 0.9],
			number3:      [ 28.7, 1.0],
			number4:      [ 30.1, 1.0],
			number5:      [ 31.6, 0.8],
			number6:      [ 32.9, 0.6],
			number7:      [ 34.1, 0.8],
			number8:      [ 35.2, 1.1],
			number9:      [ 36.7, 1.2],
			one:          [ 38.6, 0.8],
			forward:      [ 40.3, 0.8],
			backward:     [ 42.2, 0.9],
			noNectar:     [ 44.0, 5.4],
			tooFar:       [ 50.4, 2.4],
			tooNear:      [ 54.5, 4.2],
			wasBefore:    [ 59.9, 3.6],
			nectar1:      [ 64.6, 1.8],
			nectar2:      [ 66.4, 2.0],
			goingBack:    [ 69.5, 6.3],
			getMore:      [ 76.5, 2.0],
			badSight:     [ 79.8, 4.1],
			howToFind:    [ 87.1, 3.3],
			showTheWay:   [ 90.8, 6.3],
			decideHowFar: [ 97.7, 3.2],
			pushNumber:   [102.3, 4.5],
			wrongPlace:   [107.5, 5.6],
			notFarEnough: [114.4, 3.4],
			howMuchMore:  [118.5, 2.3],
			goneTooFar:   [122.1, 3.5],
			mustGoBack:   [126.1, 4.7],
			thinkItIs:    [132.3, 3.5],
			isItCorrect:  [137.1, 1.2],
			useButtons:   [139.6, 7.2],
			gettingHelp:  [148.3, 6.7],
			youHelpLater: [156.2, 5.6],
			thatsAll:     [164.3, 5.9],
			dancing:      [171.2, 5.3]
		}
	},

	lizard: {
		speech: [
			'audio/subgames/lizard/swedish.m4a',
			'audio/subgames/lizard/swedish.ogg',
			'audio/subgames/lizard/swedish.mp3'
		],
		markers: {
			argh:          [  0.5, 1.5],
			arrg:          [  3.3, 0.9],
			miss:          [  5.3, 1.8],
			openMiss:      [  8.7, 1.5],
			treeTaste:     [ 11.7, 3.4],
			higher:        [ 16.6, 2.3],
			lower:         [ 19.7, 2.9],
			tooHigh:       [ 24.0, 6.5],
			tooLow:        [ 32.2, 4.4],
			yummy:         [ 38.2, 2.5],
			thankYou:      [ 41.9, 2.4],
			almostFull:    [ 46.0, 2.4],
			sleepyHungry:  [ 49.8, 6.5],
			takeThatAnt:   [ 57.6, 4.5],
			helpToAim:     [ 63.5, 2.1],
			howHigh:       [ 67.5, 3.3],
			chooseButton:  [ 72.5, 3.6],
			imStuck:       [ 77.4, 4.0],
			openHowHigher: [ 82.6, 4.1],
			openHowLower:  [ 88.0, 6.8],
			thinkItIs:     [ 96.2, 2.6],
			higherOrLower: [100.1, 5.3],
			helpingMeAim:  [106.9, 6.3],
			fullAndSleepy: [114.5, 7.7],
			byeAndThanks:  [122.6, 2.5],
			openHigher:    [126.1, 3.2],
			openLower:     [130.2, 3.0]
		}
	},

	/* Agents */
	panda: {
		speech: [
			'audio/agent/panda/swedish.m4a',
			'audio/agent/panda/swedish.ogg',
			'audio/agent/panda/swedish.mp3'
		],
		markers: {
			ok1:              [  0.1, 0.7],
			ok2:              [  1.6, 0.4],
			hmm:              [  3.0, 1.0],
			isThisRight:      [  5.1, 1.3],
			itItThisOne:      [  7.5, 1.1],
			hasToBeThis:      [  9.4, 1.6],
			wrongShow:        [ 12.1, 3.3],
			wasCorrect:       [ 16.3, 1.6],
			tryAgain:         [ 19.0, 2.2],
			wrong1:           [ 22.6, 1.4],
			wrong2:           [ 27.6, 1.5],
			higher:           [ 25.0, 1.4],
			more:             [155.9, 1.1],
			lower:            [ 30.0, 2.1],
			fewer:            [153.3, 1.5],
			myTurn1:          [ 33.0, 2.2],
			myTurn2:          [ 36.1, 1.3],
			willYouHelpMe:    [ 38.5, 0.7],
			instructionGreen: [ 39.9, 3.0],
			instructionRed:   [ 43.7, 3.1],
			letsGo:           [105.8, 0.8],
			// Agent setup
			hello:            [147.5, 1.7], // same as in intro speech file
			funTogether:      [150.3, 1.9], // same as in intro speech file
			// Garden
			gardenIntro:      [ 47.9, 6.6],
			gardenMyCan:      [ 55.7, 6.5],
			gardenSign:       [ 63.2, 2.0],
			gardenHaveWater:  [ 66.1, 4.7],
			gardenPushField:  [ 71.9, 2.4],
			gardenGrowing:    [ 75.2, 1.7],
			gardenFullGrown:  [ 78.2, 3.8],
			gardenWaterLeft:  [ 83.3, 3.8],
			gardenEmptyCan:   [ 88.2, 4.3],
			gardenWhereNow:   [ 93.6, 2.2],
			gardenWaterFirst: [ 96.7, 7.9],
			gardenYoureBack:  [107.7, 2.0],
			// Birdhero
			birdheroIntro:    [140.1, 6.6],
			// Lizard
			lizardIntro1:     [117.4, 4.5],
			lizardIntro2:     [123.0, 4.0],
			// Bee
			beeIntro1:        [128.1, 2.8],
			beeIntro2:        [132.0, 2.8],
			beeIntro3:        [135.7, 3.4],
			// Balloon
			balloonIntro:     [110.4, 6.2]
		}
	},

	hedgehog: {
		speech: [
			'audio/agent/hedgehog/swedish.m4a',
			'audio/agent/hedgehog/swedish.ogg',
			'audio/agent/hedgehog/swedish.mp3'
		],
		markers: {
			ok1:              [  0.0, 0.6],
			ok2:              [  1.6, 0.6],
			hmm:              [  3.4, 1.0],
			isThisRight:      [  5.5, 1.5],
			itItThisOne:      [  8.1, 1.0],
			hasToBeThis:      [ 10.0, 2.1],
			wrongShow:        [ 13.1, 3.8],
			wasCorrect:       [ 17.9, 1.9],
			tryAgain:         [ 20.7, 2.4],
			wrong1:           [ 23.7, 1.2],
			wrong2:           [ 31.7, 1.6],
			higher:           [ 25.8, 2.7],
			more:             [ 29.3, 1.6],
			lower:            [ 34.2, 3.0],
			fewer:            [ 38.0, 1.9],
			myTurn1:          [ 41.0, 3.1],
			myTurn2:          [ 45.9, 1.6],
			willYouHelpMe:    [ 48.6, 1.1],
			instructionGreen: [ 51.0, 4.2],
			instructionRed:   [ 56.0, 4.4],
			letsGo:           [ 69.0, 0.9],
			// Agent setup
			hello:            [ 61.5, 2.3], // same as in intro speech file
			funTogether:      [ 65.1, 2.9], // same as in intro speech file
			// Garden
			gardenIntro:      [ 70.9, 9.5],
			gardenMyCan:      [ 81.8, 7.5],
			gardenSign:       [ 90.7, 2.4],
			gardenHaveWater:  [ 94.7, 6.0],
			gardenPushField:  [102.1, 3.1],
			gardenGrowing:    [106.3, 1.5],
			gardenFullGrown:  [109.1, 4.7],
			gardenWaterLeft:  [115.1, 4.0],
			gardenEmptyCan:   [120.4, 5.0],
			gardenWhereNow:   [126.5, 2.2],
			gardenWaterFirst: [129.7,10.3],
			gardenYoureBack:  [141.2, 2.1],
			// Birdhero
			birdheroIntro:    [145.2,11.5],
			// Lizard
			lizardIntro1:     [158.2, 5.4],
			lizardIntro2:     [164.7, 5.3],
			// Bee
			beeIntro1:        [172.0, 4.0],
			beeIntro2:        [177.0, 3.2],
			beeIntro3:        [181.4, 4.3],
			// Balloon
			balloonIntro:     [187.7, 5.6]
		}
	},

	mouse: {
		speech: [
			'audio/agent/mouse/swedish.m4a',
			'audio/agent/mouse/swedish.ogg',
			'audio/agent/mouse/swedish.mp3'
		],
		markers: {
			ok1:              [  0.0, 0.5],
			ok2:              [  1.5, 0.5],
			hmm:              [  3.1, 1.6],
			isThisRight:      [  5.9, 1.2],
			itItThisOne:      [  8.5, 0.9],
			hasToBeThis:      [ 10.6, 1.2],
			wrongShow:        [ 13.3, 3.4],
			wasCorrect:       [ 17.7, 1.6],
			tryAgain:         [ 20.6, 2.1],
			wrong1:           [ 24.2, 1.2],
			wrong2:           [ 26.5, 1.4],
			higher:           [ 28.9, 1.4],
			more:             [ 31.1, 1.3],
			lower:            [ 34.0, 2.2],
			fewer:            [ 37.2, 1.3],
			myTurn1:          [ 39.7, 2.1],
			myTurn2:          [ 42.9, 1.0],
			willYouHelpMe:    [ 45.3, 0.9],
			instructionGreen: [ 47.0, 3.1],
			instructionRed:   [ 51.3, 3.0],
			letsGo:           [ 60.2, 1.0],
			// Agent setup
			hello:            [ 55.3, 1.6], // same as in intro speech file
			funTogether:      [ 57.4, 2.0], // same as in intro speech file
			// Garden
			gardenIntro:      [ 62.2, 6.0],
			gardenMyCan:      [ 69.0, 3.1],
			gardenSign:       [ 73.3, 1.6],
			gardenHaveWater:  [ 76.1, 3.8],
			gardenPushField:  [ 81.2, 2.0],
			gardenGrowing:    [ 84.2, 1.2],
			gardenFullGrown:  [ 86.6, 3.2],
			gardenWaterLeft:  [ 91.0, 3.2],
			gardenEmptyCan:   [ 95.2, 3.8],
			gardenWhereNow:   [ 99.7, 1.6],
			gardenWaterFirst: [102.4, 7.5],
			gardenYoureBack:  [111.0, 1.5],
			// Birdhero
			birdheroIntro:    [113.6, 7.9],
			// Lizard
			lizardIntro1:     [122.5, 4.4],
			lizardIntro2:     [128.2, 3.9],
			// Bee
			beeIntro1:        [133.0, 3.1],
			beeIntro2:        [137.2, 2.6],
			beeIntro3:        [140.7, 3.0],
			// Balloon
			balloonIntro:     [144.9, 7.5]
		}
	}
};

LANG.TEXT = LANG.swedish.text;
LANG.SPEECH = LANG.swedish.speech;
LANG.SPEECH.AGENT = LANG.SPEECH.panda;
},{}],10:[function(require,module,exports){
var backend = require('./backend.js');
var GLOBAL = require('./global.js');
var EventSystem = require('./pubsub.js');

/**
 * Handles the logging of the game and sending to the backend.
 */
(function () {
	var session;
	var trial = {};
	var wasCorrect = true;
	var time = 0;

	/**
	 * Reset the current values of a session.
	 */
	function reset () {
		session = { modes: [], tries: 0, corrects: 0, finished: false, water: 0 };
		time = Date.now();
	}

	/**
	 * Log when a subgame has started.
	 * @param {string} type - The name of the subgame.
	 * @param {number} token - The token recieved from backend (session id).
	 */
	function subgameStarted (type, token) {
		reset();

		session.type = type;
		session.token = token;
	}

	/**
	 * A subgame of type number game has started.
	 * @param {number} method - Method used for subgame.
	 * @param {number} maxAmount - The max number used in the subgame.
	 * @param {number} representation - The representation of the numbers.
	 */
	function numbergameStarted (method, maxAmount, representation) {
		session.method = method;
		session.maxAmount = maxAmount;
		session.representation = representation;
	}

	/**
	 * Game state has changed. Possibly from a subgame to garden.
	 */
	function stateChange () {
		// If we were in a subgame, then tries should be set.
		if (session.tries > 0) {
			backend.putSession(session);
		}

		reset();
	}

	/**
	 * The mode in a subgame has changed.
	 * @param {number} mode - The new mode.
	 */
	function modeChange (mode) {
		if (mode === GLOBAL.MODE.outro) {
			// If we get the outro mode, then we know the player completed the subgame.
			session.finished = true;

		} else if (typeof mode !== 'undefined' && mode !== GLOBAL.MODE.intro) {
			// Create new mode item.
			session.modes.push({ type: mode, results: [] });
		}
	}

	/**
	 * A trial has been executed (someone has tried to answer a problem).
	 * @param {number} guess - The players guess.
	 * @param {number} correct - The actual correct value.
	 * @param {number} pushed - The value that was pushed (used in mode addition, subtraction and add/sub).
	 * @param {number} start - The value the trial started at (used in mode addition, subtraction and add/sub).
	 */
	function trialData (guess, correct, pushed, start) {
		var modeResults = session.modes[session.modes.length-1].results;
		if (modeResults.length <= 0 || wasCorrect) {
			modeResults.push({ target: correct, trials: [] });
		}

		trial.try = guess;
		if (session.method >= GLOBAL.METHOD.addition) {
			trial.chosenValue = pushed;
			trial.startValue = start;
		}
		trial.time = Date.now() - time;

		// This is where trial data is saved.
		// It might however have data from other functions than this.
		modeResults[modeResults.length-1].trials.push(trial);

		session.tries++;
		if (guess === correct) {
			session.corrects++;
			wasCorrect = true;
		} else {
			wasCorrect = false;
		}

		trial = {}; // Reset trial
	}

	/**
	 * An agent has guessed something.
	 * @param {number} guess - The guess.
	 */
	function agentGuess (guess) {
		trial.agent = guess;
	}

	/**
	 * A number button has been pressed.
	 * Currently this only checks yesno pushes, others are logged in trialData.
	 * @param {number} value - The guess.
	 * @param {number} representations - The representations of the button.
	 */
	function numberPress (value, representations) {
		if (representations[0] === GLOBAL.NUMBER_REPRESENTATION.yesno) {
			// The button was correcting an agent.
			trial.corrected = (value % 2) === 0; // yes = 1, no = 0
		}
	}

	/**
	 * Add water to the session.
	 */
	function water () {
		session.water++;
	}

	/**
	 * Set the start time for a session.
	 */
	 function startTime () {
		time = Date.now();
	}


	reset();


	/* General */
	EventSystem.subscribe(GLOBAL.EVENT.stateShutDown,
		function (/*state*/) { stateChange(); }, true);

	/* Session related */
	EventSystem.subscribe(GLOBAL.EVENT.subgameStarted,
		function (type, token) { subgameStarted(type, token); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.numbergameStarted,
		function (method, maxAmount, representation) { numbergameStarted(method, maxAmount, representation); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.modeChange,
		function (mode) { modeChange(mode); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.tryNumber,
		function (guess, correct, chosen, start) { trialData(guess, correct, chosen, start); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.agentGuess,
		function (guess/*, correct*/) { agentGuess(guess); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.waterAdded,
		function (/*current, diff*/) { water(); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.numberPress,
		function (value, representations) { numberPress(value, representations); }, true);
	EventSystem.subscribe(GLOBAL.EVENT.disabled,
		function (value) { if (!value) { startTime(); } }, true);
})();
},{"./backend.js":6,"./global.js":8,"./pubsub.js":34}],11:[function(require,module,exports){
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
},{"./DraggableObject":14}],12:[function(require,module,exports){
module.exports = Counter;

/** 
 * An easy-to-use counter with a max value.
 * NOTE: This is not a graphical counter, only a programmatic.
 *
 * @constructor
 * @param {integer} max - The max value for the counter.
 * @param {boolean} loop - If the counter should loop back to 0 when reaching max value (default is false).
 * @param {integer} start - The start value the first loop (default is 0).
 * @return {Counter} This object.
 */
function Counter (max, loop, start) {
	/**
	 * @property {boolean} _loop - If the counter should loop.
	 * @default false
	 * @private
	 */
	this._loop = loop || false;

	/**
	 * @property {number} _value - The value of the counter.
	 * @default 0
	 * @private
	 */
	this._value = start || 0;


	/**
	 * @property {number} max - The max value of the counter.
	 */
	this.max = max;

	/**
	 * @property {function} onAdd - A function to run when adding water.
	 */
	this.onAdd = null;

	/**
	 * @property {function} onMax - A function to run when water is at max.
	 */
	this.onMax = null;

	return this;
}

/**
 * @property {number} left - Value left until max.
 * @readonly
 */
Object.defineProperty(Counter.prototype, 'left', {
	get: function() {
		return this.max - this._value;
	}
});

/**
 * @property {number} value - The value of the counter.
 *                            This will fire onAdd and onMax when applicable.
 */
Object.defineProperty(Counter.prototype, 'value', {
	get: function() {
		return this._value;
	},
	set: function(value) {
		var diff = value - this._value;
		this._value = value;

		if (this.onAdd) { this.onAdd(this._value, diff, this.left); }

		if (this._value >= this.max) {
			if (this._loop) { this._value = 0; }
			if (this.onMax) { this.onMax(this._value); }
		}
	}
});

/** Calls the onAdd function with current values. */
Counter.prototype.update = function () {
	if (this.onAdd) { this.onAdd(this._value, 0, this.left); }
};
},{}],13:[function(require,module,exports){
module.exports = Cover;

Cover.prototype = Object.create(Phaser.Sprite.prototype);
Cover.prototype.constructor = Cover;

/**
 * A cover over the entire game. Traps all input events.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} color - The color of the cover (default '#000000');
 * @param {number} alpha - The alpha of the cover (default 1);
 * @return {Object} Itself.
 */
function Cover (game, color, alpha) {
	var bmd = game.add.bitmapData(game.world.width, game.world.height);
	bmd.ctx.fillStyle = color || '#000000';
	bmd.ctx.fillRect(0, 0, game.world.width, game.world.height);

	Phaser.Sprite.call(this, game, 0, 0, bmd); // Parent constructor.
	this.alpha = (typeof alpha !== 'undefined') ? alpha : 1;
	this.inputEnabled = true;

	return this;
}
},{}],14:[function(require,module,exports){
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
},{"../global.js":8}],15:[function(require,module,exports){
var GoalObject = require('./GoalObject');

module.exports = GoalCookie;

GoalCookie.prototype = Object.create(GoalObject.prototype);
GoalCookie.prototype.constructor = GoalCookie;

/**
 * The goalCookie in shark game
 * @param {Object} game - A reference to the Phaser game.
 * @param {Object} options - A list of options:
 *        {number} x: the x position (default 0).
 *        {number} y: the y position (default 0).
 *        {number} size: the side of the button (default 75).
 *        {number} number: the number of the cookie
 *        {number} min: The minimum value of the object.
 *        {number} max: The maximum value of the object.
 *        {string} background: the frame of the background (default 'button').
 * @return {Object} Itself.
 */

function GoalCookie (game, number, options) {
    this.background = options.background.slice(0, 6) + number + '-mirror' + options.background.slice(7);
    this.spriteKey = options.spriteKey;
    this.spriteFrame = options.spriteFrame;

    if (typeof this.background === 'undefined') {
        this.background = 'Cookie6-mirror.png';
    }
    GoalObject.call(this, game, options); // Parent constructor.

    this.vertical = options.vertical;
    if (typeof this.vertical === 'undefined' || this.vertical === null) {
        this.vertical = true;
    }

    this.setDirection(!this.vertical);
    this.min = options.min || null;
    this.max = options.max || null;

    this._number = 0;
    this.number = number;
    return this;

}

Object.defineProperty(GoalCookie.prototype, 'number', {
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

GoalCookie.prototype.updateGraphics = function (num) {
    /* Remove old graphics. */
   if (this.children.length > 1) {
        this.removeBetween(1, this.children.length-1, true);
   }
    this.number = 0;
    //Setting the sprite frame to the image correlating to the goal cookies number.
    this.bg.frame = num-1;

};


GoalCookie.prototype.calcOffset = function (offset) {
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

GoalCookie.prototype.setSize = function (size) {
    GoalObject.prototype.setSize.call(this, size || this.size);

    return this;
};

GoalCookie.prototype.setDirection = function (val) {
    this.direction = val;
    if (val) {

        this.bg.rotation = -Math.PI / 2;
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
},{"./GoalObject":16}],16:[function(require,module,exports){
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


},{"../global.js":8}],17:[function(require,module,exports){
var Cover = require('./Cover.js');
var Slider = require('./Slider.js');
var GeneralButton = require('./buttons/GeneralButton.js');
var SpriteButton = require('./buttons/SpriteButton.js');
var TextButton = require('./buttons/TextButton.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var EventSystem = require('../pubsub.js');

module.exports = Menu;

Menu.prototype = Object.create(Phaser.Group.prototype);
Menu.prototype.constructor = Menu;

/**
 * The game's main menu.
 * @param {Object} game - A reference to the Phaser game.
 * @return {Object} Itself.
 */
function Menu (game) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	var centerX = game.world.centerX;
	var centerY = game.world.centerY;

	/* Add menu button. */
	var button = new GeneralButton(game, { x: 5, y: 5, size: 56, onClick: function () { showMenu(true); } });
	this.add(button);
	var menuSplit = Math.ceil(LANG.TEXT.menu.length/2);
	var menuStyle = {
		font: '20pt ' +  GLOBAL.FONT,
		stroke: '#000000',
		strokeThickness: 2,
		align: 'center'
	};
	var menuText = game.add.text(
		button.x + button.width/2,
		button.y + button.height/2 - 7,
		LANG.TEXT.menu.substr(0, menuSplit),
		menuStyle,
		this
	);
	menuText.anchor.set(0.5);
	menuText = game.add.text(
		button.x + button.width/2,
		button.y + button.height/2 + 17,
		LANG.TEXT.menu.substr(menuSplit),
		menuStyle,
		this
	);
	menuText.anchor.set(0.5);


	/* For skipping timelines */
	var skipper = null;
	var skipButton = new TextButton(game, '>>', {
		x: 145, y: 5, size: 56, fontSize: 30,
		doNotAdapt: true,
		onClick: function () {
			if (skipper) {
				skipper.totalProgress(1);
			}
		}
	});
	skipButton.visible = false;
	this.add(skipButton);

	EventSystem.subscribe(GLOBAL.EVENT.skippable, function (timeline) {
		if (!skipper || skipper.getChildren().indexOf(timeline) < 0) {
			skipper = timeline;
		}
		skipButton.visible = !!timeline;
	});


	/* Create the menu group. It will be shown when the button is clicked. */
	var menuGroup = game.add.group(this);
	showMenu(false);


	/* Create a cover behind the menu. */
	menuGroup.add(new Cover(game, '#056449', 0.7));

	/* Create the background of the menu. */
	var bmd = game.add.bitmapData(parseInt(game.world.width*0.4), parseInt(game.world.height*0.6));
	bmd.ctx.fillStyle = '#b9d384';
	bmd.ctx.roundRect(0, 0, bmd.width, bmd.height, 20).fill();
	menuGroup.create(game.world.width*0.3, centerY*0.6, bmd).alpha = 0.7;

	/* Create the texts. */
	var title = game.add.text(centerX, centerY*0.4, LANG.TEXT.title, {
		font: '50pt ' +  GLOBAL.FONT,
		fill: '#ffff00',
		stroke: '#000000',
		strokeThickness: 5
	}, menuGroup);
	title.anchor.set(0.5);

	var resume = new TextButton(game, LANG.TEXT.resume, {
		x: centerX,
		y: centerY*0.7,
		fontSize: 30,
		onClick: function () {
			showMenu(false);
		}
	});
	resume.x -= resume.width/2;
	menuGroup.add(resume);

	/* Add volume control. */
	var fgVolumeSlider = new Slider(game,
		centerX - bmd.width*0.2,
		centerY*1.05,
		bmd.width*0.5,
		40,
		function (value) {
			game.sound.fgVolume = value;
			localStorage.fgVolume = value;

			if (value > 0) {
				fgMuteButton.sprite.frameName = 'speech';
				fgMuteButton.muteValue = value;
			} else {
				fgMuteButton.sprite.frameName = 'speech_mute';
			}
		},
		game.sound.fgVolume
	);
	menuGroup.add(fgVolumeSlider);

	var fgMuteButton = new SpriteButton(game, 'objects', game.sound.fgVolume > 0 ? 'speech' : 'speech_mute', {
		x: centerX - bmd.width*0.35,
		y: fgVolumeSlider.y - fgVolumeSlider.height*0.75,
		size: fgVolumeSlider.height*1.5,
		onClick: function () {
			if (this.sprite.frameName === 'speech_mute') {
				fgVolumeSlider.value = this.muteValue > 0.1 ? this.muteValue : 1;
			} else {
				fgVolumeSlider.value = 0;
			}
		}
	});
	fgMuteButton.sprite.scale.set(0.6);
	fgMuteButton.muteValue = fgVolumeSlider.value;
	menuGroup.add(fgMuteButton);

	var bgVolumeSlider = new Slider(game,
		centerX - bmd.width*0.2,
		centerY*1.25,
		bmd.width*0.5,
		40,
		function (value) {
			game.sound.bgVolume = value;
			localStorage.bgVolume = value;

			if (value > 0) {
				bgMuteButton.sprite.frameName = 'volume';
				bgMuteButton.muteValue = value;
			} else {
				bgMuteButton.sprite.frameName = 'volume_mute';
			}
		},
		game.sound.bgVolume
	);
	menuGroup.add(bgVolumeSlider);

	var bgMuteButton = new SpriteButton(game, 'objects', game.sound.bgVolume > 0 ? 'volume' : 'volume_mute', {
		x: centerX - bmd.width*0.35,
		y: bgVolumeSlider.y - bgVolumeSlider.height*0.75,
		size: bgVolumeSlider.height*1.5,
		onClick: function () {
			if (this.sprite.frameName === 'volume_mute') {
				bgVolumeSlider.value = this.muteValue > 0.1 ? this.muteValue : 1;
			} else {
				bgVolumeSlider.value = 0;
			}
		}
	});
	bgMuteButton.sprite.scale.set(0.6);
	bgMuteButton.muteValue = bgVolumeSlider.value;
	menuGroup.add(bgMuteButton);


	var currentState = game.state.states[game.state.current];
	if (currentState.menuBack) {
		var garden = game.add.text(centerX, centerY*1.5, currentState.menuBack.text, {
			font: '30pt ' +  GLOBAL.FONT,
			fill: '#000000'
		}, menuGroup);
		garden.anchor.set(0.5);
		garden.inputEnabled = true;
		garden.events.onInputDown.add(function () {
			game.state.start(currentState.menuBack.state);
		}, this);
	}

	var quit = game.add.text(centerX, centerY*1.7, LANG.TEXT.quit, {
		font: '30pt ' +  GLOBAL.FONT,
		fill: '#000000'
	}, menuGroup);
	quit.anchor.set(0.5);
	quit.inputEnabled = true;
	quit.events.onInputDown.add(function () {
		game.state.start(GLOBAL.STATE.entry);
	}, this);


	function showMenu (value) {
		menuGroup.visible = value;
	}

	return this;
}
},{"../global.js":8,"../language.js":9,"../pubsub.js":34,"./Cover.js":13,"./Slider.js":20,"./buttons/GeneralButton.js":23,"./buttons/SpriteButton.js":25,"./buttons/TextButton.js":26}],18:[function(require,module,exports){
var Cover = require('./Cover.js');
var TextButton = require('./buttons/TextButton.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');

module.exports = Modal;

Modal.prototype = Object.create(Phaser.Group.prototype);
Modal.prototype.constructor = Modal;

/**
 * A modal with a single ok button.
 * @param {Object} game - A reference to the Phaser game.
 * @param {string} text - The text in the modal.
 * @param {number} fontSize - The size of the text. (default is 50).
 * @param {function} callback - A callback when pushing ok (optional).
 */
function Modal (game, text, fontSize, callback) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	var centerX = game.world.centerX;
	var centerY = game.world.centerY;

	/* Create a cover behind the modal, traps all mouse events. */
	this.add(new Cover(game, '#056449', 0.7));

	/* Create the modal background. */
	var bmd = game.add.bitmapData(parseInt(game.world.width/3), parseInt(game.world.height/2));
	bmd.ctx.fillStyle = '#b9d384';
	bmd.ctx.roundRect(0, 0, bmd.width, bmd.height, 20).fill();
	this.create(game.world.width/3, centerY * 0.67, bmd).alpha = 0.7;

	/* Add the text field. */
	game.add.text(centerX, centerY, text, {
		font: (fontSize || 50) + 'pt ' +  GLOBAL.FONT,
		fill: '#dd00dd',
		align: 'center',
		wordWrap: true,
		wordWrapWidth: bmd.width * 0.7
	}, this).anchor.set(0.5);

	/* Add the ok button. */
	var _this = this;
	this.add(new TextButton(game, LANG.TEXT.ok, {
		x: centerX - 55,
		y: centerY/0.75,
		size: 80,
		fontSize: 30,
		onClick: function () {
			_this.destroy();
			if (callback) {
				callback();
			}
		}
	}));
}
},{"../global.js":8,"../language.js":9,"./Cover.js":13,"./buttons/TextButton.js":26}],19:[function(require,module,exports){
var Cookies = require('./Cookies.js');
var GoalCookie = require('./GoalCookie.js');

module.exports = ObjectPanel;

ObjectPanel.prototype = Object.create(Phaser.Group.prototype);
ObjectPanel.prototype.constructor = ObjectPanel;

/**
 * Create a panel filled with dradg and drop or goal objects.
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
},{"./Cookies.js":11,"./GoalCookie.js":15}],20:[function(require,module,exports){
var GeneralButton = require('./buttons/GeneralButton.js');

module.exports = Slider;

Slider.prototype = Object.create(Phaser.Group.prototype);
Slider.prototype.constructor = Slider;

/**
 * A slider (that is an interactive handle on a line).
 * NOTE: Uses GeneralButton.prototype.buttonColor for colors.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} x - the x position (default 0).
 * @param {number} y - the y position (default 0).
 * @param {number} width - the width (of the line) (default 300).
 * @param {number} height - the height (of the handle) (default 50).
 * @param {Function} onChange: function to run when handle changes (default null).
 * @param {number} initial: initial value of the slider (default 0).
 * @returns {Object} Itself.
 */
function Slider (game, x, y, width, height, onChange, initial) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	this.x = x || 0;
	this.y = y || 0;
	this.onChange = onChange;

	height = height	|| 50;
	width = width || 300;
	initial = initial || 0;

	/* Add the line. */
	var line = this.create(0, 0, 'objects', 'button');
	line.tint = GeneralButton.prototype.buttonColor;
	line.anchor.set(0, 0.5);
	line.height = height/10;
	line.width = width;

	/* Add the handle. */
	this.handle = this.create(0, 0, 'objects', 'button');
	this.handle.tint = GeneralButton.prototype.buttonColor;
	this.handle.anchor.set(0.5);
	this.handle.width = height;
	this.handle.height = height;
	this.handle.max = line.width - this.handle.width;
	this.handle.x = this.handle.max * initial;

	/* Move objects so that handle is easy to use */
	this.x += this.handle.width/2;
	line.x -= this.handle.width/2;

	/* Use a large input area, that can be pushed anywhere on the slider */
	var trigger = this.create(line.x, line.y,
		game.add.bitmapData(line.width, this.handle.height));
	trigger.anchor.set(0, 0.5);
	trigger.inputEnabled = true;

	trigger.events.onInputDown.add(function () {
		var _this = this; // _this is the whole slider
		this.handle.tint -= 0x1e1e1e;
		this.handle.update = function () {
			// this will be the handle in this scope.

			this.x = game.input.activePointer.x - _this.x;
			if (this.x < 0) {
				this.x = 0;
			} else if (this.x > this.max) {
				this.x = this.max;
			}

			_this.onChange(this.x / this.max);
		};
	}, this);

	var click = game.add.audio('click');
	trigger.events.onInputUp.add(function () {
		this.handle.update = function () {};
		this.handle.tint += 0x1e1e1e;
		click.play();
	}, this);
}

/**
 * @property {number} value - The value of the slider.
 */
Object.defineProperty(Slider.prototype, 'value', {
	get: function() {
		return this.handle.x / this.handle.max;
	},
	set: function(value) {
		this.handle.x = this.handle.max * value;
		this.onChange(value);
	}
});

},{"./buttons/GeneralButton.js":23}],21:[function(require,module,exports){
var EventSystem = require('../pubsub.js');
var GLOBAL = require('../global.js');

module.exports = WaterCan;

WaterCan.prototype = Object.create(Phaser.Group.prototype);
WaterCan.prototype.constructor = WaterCan;

/**
 * The graphical representation of the watering can.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} x - X position (default is game.width - 150).
 * @param {number} y - Y position (default is 5).
 * @param {number} amount - amount of water in the can (default player amount).
 * @returns {Object} Itself.
 */
function WaterCan (game, x, y, amount) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	this.x = x || game.width - 125;
	this.y = y || 5;
	this.amount = amount || this.game.player.water;
	var origin = 87;
	var waterStep = 54 / this.game.player.maxWater;

	/* Add water level */
	var bmd = game.add.bitmapData(62, 1);
	bmd.ctx.fillStyle = '#0000ff';
	bmd.ctx.fillRect(0, 0, bmd.width, bmd.height);
	var water = this.create(20, origin, bmd);
	water.height = waterStep*this.amount;
	water.y -= water.height;

	/* Add can */
	this.can = this.create(0, 0, 'objects', 'watering_can');
	this.can.tint = 0xbb3333;

	/* Keep track of when the player's water changes */
	this._sub = EventSystem.subscribe(GLOBAL.EVENT.waterAdded, function (total) {
		var h = waterStep*total;
		TweenMax.to(water, 0.5, { height: h, y: origin - h });
	});

	return this;
}

/** Removes subscriptions in addition to Phaser.Group.destroy */
WaterCan.prototype.destroy = function (destroyChildren, soft) {
	EventSystem.unsubscribe(this._sub); // Otherwise possible memory leak.
	Phaser.Group.prototype.destroy.call(this, destroyChildren, soft);
};

/**
 * Pour water from the can.
 * @param {number} duration - Duration to pour.
 * @returns {Object} The animation TweenMax.
 */
WaterCan.prototype.pour = function (duration) {
	var emitter = this.game.add.emitter(this.can.width, 5, 200);
	emitter.width = 5;
	emitter.makeParticles('objects', 'drop');
	emitter.setScale(0.1, 0.3, 0.1, 0.3);
	emitter.setYSpeed(100, 150);
	emitter.setXSpeed(50, 100);
	emitter.setRotation(0, 0);

	this.can.addChild(emitter);

	return new TweenMax(emitter, duration, {
		onStart: function () { emitter.start(false, 500, 10, (duration-0.5)*50); },
		onComplete: function () { emitter.destroy(); }
	});
};
},{"../global.js":8,"../pubsub.js":34}],22:[function(require,module,exports){
var GLOBAL = require('../../global.js');
var TextButton = require('./TextButton.js');
var NumberButton = require('./NumberButton.js');

module.exports = ButtonPanel;

ButtonPanel.prototype = Object.create(Phaser.Group.prototype);
ButtonPanel.prototype.constructor = ButtonPanel;

/**
 * Create a panel filled with buttons.
 * See NumberButton and GeneralButton for more information.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} amount - The number of buttons (NOTE, this will be overwritten if you set option max)
 * @param {number|Array} representations - The representations to use on the buttons.
 * @param {Object} options - options for the panel:
 *        {number} x - The x position (default is 0)
 *        {number} y - The y position (default is 0)
 *        {number} size - The size of the panel (default is game width or height, depending on if vertical is set)
 *        {number} method - The method of the panel (default is GLOBAL.METHOD.count)
 *        {boolean} vertical - If the panel should be vertical (default is false)
 *        {boolean} reversed - If the panel should display the buttons in reverse (default is false)
 *        {number} min - The smallest number on the panel (default is 1)
 *        {number} max - The biggest number on the panel (default is min + amount - 1)
 *        {function} onClick - What should happen when clicking the button
 *        {string} background - The sprite key for the button backgrounds
 *        {string} color - The color of the representation
 *        {number} maxButtonSize - The maximum size of the buttons (default is 75)
 *                                 NOTE: The button size is always calculated to not overlap
 * @return {Object} Itself.
 */
function ButtonPanel (game, amount, representations, options) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	this.representations = representations;
	this.x = options.x || 0;
	this.y = options.y || 0;
	this.vertical = options.vertical || false;
	this.reversed = options.reversed || false;
	this.size = options.size || (this.vertical ? this.game.world.height : this.game.world.width);
	this.method = options.method || GLOBAL.METHOD.count;

	this.color = options.color;
	this.background = options.background;
	if (!this.background && (this.method === GLOBAL.METHOD.count || this.method === GLOBAL.METHOD.incrementalSteps)) {
		this.background = 'button';
	}
	this.maxButtonSize = options.maxButtonSize || 75;
	this.onClick = options.onClick;

	/* Set range of the panel, which will create the buttons. */
	options.min = options.min || 1;
	this.setRange(options.min, options.max || (options.min + amount - 1));

	return this;
}

/**
 * Create the buttons.
 * @private
 */
ButtonPanel.prototype._createButtons = function () {
	this.removeAll(true);

	/* Calculate max button size. */
	var buttonSize = this.size/this.amount;
	if (buttonSize > this.maxButtonSize) {
		buttonSize = this.maxButtonSize;
	}

	/* These options will be used when creating the buttons. */
	var buttonOptions = {
		min: this.min,
		max: this.max,
		size: buttonSize,
		background: this.background,
		color: this.color,
		vertical: !this.vertical,
		onClick: this.onClick
	};

	/* Set up the buttons that should be in the panel. */
	if (this.method === GLOBAL.METHOD.incrementalSteps) {
		buttonOptions.doNotAdapt = true;
		// Create buttons first, then add them in their order (this is because we manipulate the buttonOptions later)
		var change = new NumberButton(this.game, 1, this.representations, buttonOptions);

		// Put the other buttons centered.
		buttonOptions[this.vertical ? 'x' : 'y'] = ((this.representations.length - 1) * buttonSize)/2;
		buttonOptions.onClick = function () { change.bg.events.onInputDown.dispatch(); };
		var go = new NumberButton(this.game, 1, GLOBAL.NUMBER_REPRESENTATION.yesno, buttonOptions);

		buttonOptions.keepDown = false;
		buttonOptions.background = 'button_minus';
		buttonOptions.onClick = function () { change.number--; };
		var minus = new TextButton(this.game, '-', buttonOptions);

		buttonOptions.background = 'button_plus';
		buttonOptions.onClick = function () { change.number++; };
		var plus = new TextButton(this.game, '+', buttonOptions);

		if (this.vertical) {
			minus.bg.rotation = -Math.PI/2;
			minus.bg.y += minus.bg.width;
			minus._text.y -= 6;
			plus.bg.rotation = -Math.PI/2;
			plus.bg.y += plus.bg.width;
			plus._text.y += 5;
		} else {
			minus._text.x += 5;
			plus._text.x -= 4;
		}

		this.add(minus);
		this.add(change);
		this.add(plus);
		this.add(go);

	} else {
		for (var i = this.min; i <= this.max; i++) {
			this.add(new NumberButton(this.game, i, this.representations, buttonOptions));
		}
	}

	/* Reverse the order of the buttons if needed. */
	if (this.reversed) { this.reverse(); }


	/* Calculate white space. */
	var widthLeft = this.size - buttonSize*this.amount;
	var paddingSize = widthLeft/this.amount;
	if (paddingSize > buttonSize/2) {
		paddingSize = buttonSize/2;
	}
	var margin = (this.size - this.amount*buttonSize - (this.amount - 1)*paddingSize)/2;
	var fullSize = paddingSize + buttonSize;

	/* Set up the x and y positions. */
	var direction = this.vertical ? 'y' : 'x';
	for (var j = 0; j < this.length; j++) {
		this.children[j][direction] = margin + fullSize*j;
	}
};

/**
 * Update the values of the buttons.
 * @private
 */
ButtonPanel.prototype._updateButtons = function () {
	if (this.method === GLOBAL.METHOD.incrementalSteps) {
		var button = this.children[this.reversed ? 2 : 1];
		button.min = this.min;
		button.max = this.max;
	} else {
		var val, dir;
		if (this.reversed) {
			val = this.max;
			dir = -1;
		} else {
			val = this.min;
			dir = 1;
		}
		for (var key in this.children) {
			this.children[key].min = this.min;
			this.children[key].max = this.max;
			this.children[key].number = val;
			val += dir;
		}
	}
};

/**
 * Set the range for the button panel. It will create or update the panel accordingly.
 * @param {Number} The minimum amount in the panel.
 * @param {Number} The maximum amount in the panel.
 */
ButtonPanel.prototype.setRange = function (min, max) {
	this.min = min;
	this.max = max;

	var oldAmount = this.amount || 0;
	// incrementalSteps have these buttons: (-) (number) (+) (ok)
	this.amount = this.method === GLOBAL.METHOD.incrementalSteps ? 4 : (this.max - this.min + 1);

	if (this.amount !== oldAmount || this.length <= 0) {
		this._createButtons();
	} else {
		this._updateButtons();
	}
};

/**
 * Reset all buttons to "up" state.
 */
ButtonPanel.prototype.reset = function () {
	for (var i = 0; i < this.length; i++) {
		this.children[i].reset();
	}
};

/**
 * Highlight all buttons.
 * @param {Number} duration - How long to highlight the buttons.
 * @param {Number} from - The opacity to highlight from (will end at this as well) (default 1).
 * @returns {Object} The animation timeline.
 */
ButtonPanel.prototype.highlight = function (duration, from) {
	var t = new TimelineMax();
	for (var i = 0; i < this.length; i++) {
		t.add(this.children[i].highlight(duration, from), 0);
	}
	return t;
};

/**
 * Disable/Enable all buttons.
 * @param {Boolean} disable - True is disabled, false is enabled
 */
ButtonPanel.prototype.disable = function (value) {
	for (var i = 0; i < this.length; i++) {
		this.children[i].disabled = value;
	}
};
},{"../../global.js":8,"./NumberButton.js":24,"./TextButton.js":26}],23:[function(require,module,exports){
var GLOBAL = require('../../global.js');

module.exports = GeneralButton;

GeneralButton.prototype = Object.create(Phaser.Group.prototype);
GeneralButton.prototype.constructor = GeneralButton;
GeneralButton.prototype.buttonColor = GLOBAL.BUTTON_COLOR; // TODO: Can we use this global directly instead?

/**
 * A general button.
 * @param {Object} game - A reference to the Phaser game.
 * @param {Object} options - A list of options:
 *        {number} x: the x position (default 0).
 *        {number} y: the y position (default 0).
 *        {number} size: the side of the button (default 75).
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
function GeneralButton (game, options) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	options = options || {};
	this.x = options.x || 0;
	this.y = options.y || 0;
	this.color = options.color || this.buttonColor;
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

	var background = options.background;
	if (typeof background === 'undefined') {
		background = 'button';
	}
	this.bg = this.create(0, 0, (background === null ? null : 'objects'), background);
	this.bg.inputEnabled = true;
	//this.bg.input.enableDrag(true,true);
	var click = game.add.audio('click');
	this.bg.events.onInputDown.add(function () {
		if (this.disabled || this.bg.tint === this.colorPressed) {
			return;
		}

		this.bg.tint = this.colorPressed;
		click.play();

		if (this.onClick) {
			this.onClick();
		}
	}, this);

	this.bg.events.onInputUp.add(function () {
		if (!this.keepDown) {
			this.reset();
		}
	}, this);

	this.reset();
	this.setSize(options.size || 75);

	return this;
}

/**
 * Set the size of this object.
 * @param {Number} size - The new size.
 */
GeneralButton.prototype.setSize = function (size) {
	this.size = size;
	this.bg.width = size;
	this.bg.height = size;
};

/**
 * Reset the buttons to "up" state.
 */
GeneralButton.prototype.reset = function () {
	this.bg.tint = this.color;
};

/**
 * Set the buttons to "down" state.
 * NOTE: This does not fire the click functions.
 */
GeneralButton.prototype.setDown = function () {
	this.bg.tint = this.colorPressed;
};

/**
 * Highlight the objects.
 * @param {Number} duration - How long to highlight the button.
 * @param {Number} from - The opacity to highlight from (will end at this as well) (default 1).
 * @returns {Object} The animation tweenmax.
 */
GeneralButton.prototype.highlight = function (duration, from) {
	from = typeof from === 'number' ? from : 1;
	return TweenMax.fromTo(this, 0.5, { alpha: from }, { alpha: 0 }).backForth(duration || 3);
};
},{"../../global.js":8}],24:[function(require,module,exports){
var GeneralButton = require('./GeneralButton.js');
var DotsRepresentation = require('../representations/DotsRepresentation.js');
var FingerRepresentation = require('../representations/FingerRepresentation.js');
var StrikeRepresentation = require('../representations/StrikeRepresentation.js');
var NumberRepresentation = require('../representations/NumberRepresentation.js');
var DiceRepresentation = require('../representations/DiceRepresentation.js');
var YesnoRepresentation = require('../representations/YesnoRepresentation.js');
var GLOBAL = require('../../global.js');
var EventSystem = require('../../pubsub.js');

module.exports = NumberButton;

NumberButton.prototype = Object.create(GeneralButton.prototype);
NumberButton.prototype.constructor = NumberButton;

/**
 * A button with number representations on it.
 * If you supply more than one representation the button will stretch.
 * Publishes numberPress event on click.
 * NOTE: This button will not go to "up" state after click unless you set keepDown option to false.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number for the button.
 * @param {number|Array} representations - The representations of the button (see GLOBAL.NUMBER_REPRESENTATION).
 * @param {Object} options - A list of options (in addition to GeneralButton):
 *        {number} min: The minimum value of the button.
 *        {number} max: The maximum value of the button.
 *        {number} size: the small side of the button (the other depend on representation amount) (default 75).
 *        {boolean} vertical: stretch button vertically if many representations, otherwise horisontally (default true).
 *        {string} spriteKey: Used for object representation only. The key to the sprite.
 *        {string} spriteFrame: Used for object representation only. The framename in the sprite.
                                NOTE: Used like this: spriteFrame + this.number
 * @returns {Object} Itself.
 */
function NumberButton (game, number, representations, options) {
	/* The order here is a bit weird because GeneralButton calls setSize, which this class overshadows. */
	if (typeof options.keepDown === 'undefined' || options.keepDown === null) {
		options.keepDown = true;
	}
	this.representations = representations;
	this.background = options.background;
	this.spriteKey = options.spriteKey;
	this.spriteFrame = options.spriteFrame;

	GeneralButton.call(this, game, options); // Parent constructor.

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
	/* This will be called in the GeneralButton's onInputDown */
	this.onClick = function () {
		EventSystem.publish(GLOBAL.EVENT.numberPress, [this.number, this.representations]);
		if (this._clicker) {
			this._clicker(this.number);
		}
	};

	return this;
}

/**
 * @property {number|Array} representations - The representations on the button.
 */
Object.defineProperty(NumberButton.prototype, 'representations', {
	get: function () {
		return this._representations;
	},
	set: function (value) {
		this._representations = Array.isArray(value) ? value : [value];
		if (typeof this.number !== 'undefined' && this.number !== null) {
			this.updateGraphics();
		}
	}
});

/**
 * @property {number} number - The number on the button. Set according to representations.
 *                             NOTE: This can not be less or more than min or max.
 */
Object.defineProperty(NumberButton.prototype, 'number', {
	get: function () {
		return this._number;
	},
	set: function (value) {
		/* Check boundaries */
		if (this.min && value < this.min) { value = this.min; }
		if (this.max && value > this.max) { value = this.max; }
		if (value === this._number) { return; }

		this._number = value;

		this.updateGraphics();
	}
});

/**
 * Update the graphics of the button.
 */
NumberButton.prototype.updateGraphics = function () {
	/* Remove old graphics. */
	if (this.children.length > 1) {
		this.removeBetween(1, this.children.length-1, true);
	}

	if (typeof this.background === 'undefined' && this.representations[0] !== GLOBAL.NUMBER_REPRESENTATION.yesno) {
		if (this._number > 0) {
			this.bg.frameName = 'button_plus';
		} else if (this._number < 0) {
			this.bg.frameName = 'button_minus';
		} else {
			this.bg.frameName = 'button_zero';
		}
		this.setSize();
		this.reset();
	}

	/* Add new graphics. */
	var x = 0;
	var y = 0;
	var offset = 0;
	var useNum = Math.abs(this._number);
	var rep;
	for (var i = 0; i < this.representations.length; i++) {
		if (this.vertical) {
			y = this.size * i;
		} else {
			x = this.size * i;
		}
		if (i > 0) {
			var bmd = this.vertical ? this.game.add.bitmapData(this.size - 10, 3) : this.game.add.bitmapData(3, this.size - 10);
			bmd.ctx.fillStyle = '#000000';
			bmd.ctx.globalAlpha = 0.2;
			bmd.ctx.roundRect(0, 0, bmd.width, bmd.height, 2).fill();
			if (this.vertical) {
				this.create(x + 5, y - 1, bmd);
			} else {
				this.create(x - 1, y + 5, bmd);
			}
		}

		rep = this.representations[i] === GLOBAL.NUMBER_REPRESENTATION.mixed ? this.game.rnd.pick([
			GLOBAL.NUMBER_REPRESENTATION.dots,
			GLOBAL.NUMBER_REPRESENTATION.fingers,
			GLOBAL.NUMBER_REPRESENTATION.strikes,
			GLOBAL.NUMBER_REPRESENTATION.numbers,
			GLOBAL.NUMBER_REPRESENTATION.dice
		]) : this.representations[i];

		if (rep === GLOBAL.NUMBER_REPRESENTATION.dots) {
			offset = this.calcOffset(16);
			this.add(new DotsRepresentation(this.game, useNum, x+offset.x, y+offset.y, this.size-offset.o, this.color));

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.fingers) {
			offset = this.calcOffset(24);
			this.add(new FingerRepresentation(this.game, useNum, x+offset.x, y+offset.y, this.size-offset.o, this.color));

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.strikes) {
			offset = this.calcOffset(12);
			this.add(new StrikeRepresentation(this.game, useNum, x+offset.x, y+offset.y, this.size-offset.o, this.color, this.max - this.min + 1));

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.objects) {
			var s = this.create(x, y, this.spriteKey, (this.spriteFrame ? this.spriteFrame + Math.abs(this._number) : null));
			var scale = this.size/(s.width > s.height ? s.width : s.height)*0.8;
			s.scale.set(scale);
			s.x = (!this.direction ? (this._number > 0 ? this.size * 0.8 : this.size * 1.2) : this.size)/2 - s.width/2;
			s.y = (this.direction ? (this._number > 0 ? this.size * 1.2 : this.size * 0.8) : this.size)/2 - s.height/2;

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.numbers) {
			offset = this.calcOffset(24);
			this.add(new NumberRepresentation(this.game, this._number, x+offset.x - this.size/12, y+offset.y, this.size/2, this.color));

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.dice) {
			offset = this.calcOffset(12);
			this.add(new DiceRepresentation(this.game, useNum, x+offset.x, y+offset.y, this.size-offset.o, this.color));

		} else if (rep === GLOBAL.NUMBER_REPRESENTATION.yesno) {
			this._number = this._number % 2;
			offset = this.size*0.1;
			this.add(new YesnoRepresentation(this.game, this._number, x + offset, y + offset, this.size - offset*2));
		}
	}
};

/**
 * Calculate the different offsets for the button (needed due to arrow in button).
 * @param {Number} offset - Offset from button edge (used like: this.size/offset).
 * @returns {Object} Offsets on the form { o: offset, x: x, y: y }.
 */
NumberButton.prototype.calcOffset = function (offset) {
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

/**
 * Set the size of this button.
 * @param {Number} The new size.
 * @returns {Object} This button.
 */
NumberButton.prototype.setSize = function (size) {
	GeneralButton.prototype.setSize.call(this, size || this.size);

	// If the button should expand horizontally it will be rotated.
	// So we always want to change height, not width.
	this.bg.height *= this.representations.length;

	return this;
};

/**
 * Set the direction of the background button (where the arrow should point).
 * @param {Boolean} val - True = up/down, false = left/right.
 * @returns {Object} This button.
 */
NumberButton.prototype.setDirection = function (val) {
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
		this.updateGraphics();
	}

	return this;
};
},{"../../global.js":8,"../../pubsub.js":34,"../representations/DiceRepresentation.js":27,"../representations/DotsRepresentation.js":28,"../representations/FingerRepresentation.js":29,"../representations/NumberRepresentation.js":30,"../representations/StrikeRepresentation.js":31,"../representations/YesnoRepresentation.js":32,"./GeneralButton.js":23}],25:[function(require,module,exports){
var GeneralButton = require('./GeneralButton.js');

module.exports = SpriteButton;

SpriteButton.prototype = Object.create(GeneralButton.prototype);
SpriteButton.prototype.constructor = SpriteButton;

/**
 * A button with a sprite on it.
 * @param {Object} game - A reference to the Phaser game.
 * @param {string} key - The sprite key.
 * @param {string} frame - The frame of the sprite (optional).
 * @param {Object} options - A list of options (see GeneralButton).
 * @return {Object} Itself.
 */
function SpriteButton (game, key, frame, options) {
	GeneralButton.call(this, game, options); // Parent constructor.

	var half = this.size/2;

	this.sprite = this.create(half, half, key, frame);
	this.sprite.anchor.set(0.5);
	this._scaleSprite();

	return this;
}

/**
 * Scale the sprite according to the button size.
 * @private
 */
SpriteButton.prototype._scaleSprite = function () {
	var padded = this.size*0.9;

	this.sprite.scale.set(padded/(this.sprite.width > this.sprite.height ?
		this.sprite.width : this.sprite.height));
};

/**
 * Set the size of this button.
 * @param {Number} The new size.
 */
SpriteButton.prototype.setSize = function (size) {
	GeneralButton.prototype.setSize.call(this, size);

	if (this.sprite) {
		this._scaleSprite();
	}
};
},{"./GeneralButton.js":23}],26:[function(require,module,exports){
var GeneralButton = require('./GeneralButton.js');
var GLOBAL = require('../../global.js');

module.exports = TextButton;

TextButton.prototype = Object.create(GeneralButton.prototype);
TextButton.prototype.constructor = TextButton;

/**
 * A button with text on it.
 * @param {Object} game - A reference to the Phaser game.
 * @param {string} text - The text for the button.
 * @param {Object} options - A list of options (in addition to GeneralButton):
 *        {number} fontSize: The size of the font (default is options.size * 0.8).
 *        {number} strokeThickness: The size of the stroke (default is 3).
 *        {string} strokeColor: The color of stroke (if any) (default options.color).
 *        {boolean} doNotAdapt: True if the size should not adapt to text size (default false).
 * @return {Object} Itself.
 */
function TextButton (game, text, options) {
	GeneralButton.call(this, game, options); // Parent constructor.
	this.doNotAdapt = options.doNotAdapt || false;

	var half = this.size/2;
	var fontSize = (options.fontSize || this.size*0.8);
	this._text = game.add.text(half, half, text, {
		font: fontSize + 'pt ' + GLOBAL.FONT,
		fill: this.color,
		stroke: options.strokeColor || this.color,
		strokeThickness: options.strokeThickness || 3
	}, this);
	this._text.anchor.set(0.5, 0.45);

	/* Do this to adapt button size. */
	this.text = this.text;

	if (options.onClick) {
		this._clicker = options.onClick;
		// This will be called in the GeneralButton's onInputDown
		this.onClick = function () {
			if (this._clicker) {
				this._clicker(this.text);
			}
		};
	}

	return this;
}

/**
 * @property {string} text - The text on the button.
 */
Object.defineProperty(TextButton.prototype, 'text', {
	get: function() {
		return this._text.text;
	},
	set: function(value) {
		this._text.text = value;

		if (!this.doNotAdapt) {
			this.adaptSize();
		}
	}
});

/**
 * Adapt the button background to the text size.
 */
TextButton.prototype.adaptSize = function () {
	this.bg.width = (this._text.width > this.size ? this._text.width : this.size) + 30;
	this.bg.height = (this._text.height > this.size ? this._text.height : this.size);
	this._text.x = this.bg.width/2;
	this._text.y = this.bg.height/2;
};
},{"../../global.js":8,"./GeneralButton.js":23}],27:[function(require,module,exports){
module.exports = DiceRepresentation;

DiceRepresentation.prototype = Object.create(Phaser.Sprite.prototype);
DiceRepresentation.prototype.constructor = DiceRepresentation;

/**
 * Dice representation of a number.
 * This is similar to DotsRepresentation, but has a pattern for the dot positions.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number to represent.
 * @param {number} x - X position.
 * @param {number} y - Y position.
 * @param {number} size - Width and height of the representation (default 100).
 * @param {string} color - The color of the representation (default '#000000').
 * @return {Object} Itself.
 */
function DiceRepresentation (game, number, x, y, size, color) {
	size = size || 100;
	this.radius = parseInt(size/8);
	var top = this.radius+1;
	var bottom = size-this.radius-1;
	var left = top;
	var right = bottom;
	var middle = parseInt(size/2);

	/*
	 * For more information about context:
	 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
	 */
	var bmd = game.add.bitmapData(size, size);
	var ctx = bmd.ctx;
	ctx.fillStyle = color || '#000000';
	ctx.beginPath();

	if (number === 1) {
		this.createDots(ctx, [[middle, middle]]);
	} else if (number === 2) {
		this.createDots(ctx, [[left, top], [right, bottom]]);
	} else if (number === 3) {
		this.createDots(ctx, [[left, top], [middle, middle], [right, bottom]]);
	} else if (number === 4) {
		this.createDots(ctx, [[left, top], [right, top], [left, bottom], [right, bottom]]);
	} else if (number === 5) {
		this.createDots(ctx, [[left, top], [right, top],
			[middle, middle], [left, bottom], [right, bottom]]);
	} else if (number === 6) {
		this.createDots(ctx, [[left, top], [right, top],
			[left, middle], [right, middle], [left, bottom], [right, bottom]]);
	} else if (number === 7) {
		this.createDots(ctx, [[left, top], [right, top],
			[left, middle], [middle, middle], [right, middle],
			[left, bottom], [right, bottom]]);
	} else if (number === 8) {
		this.createDots(ctx, [[left, top],  [middle, top], [right, top],
			[left, middle], [right, middle],
			[left, bottom], [middle, bottom], [right, bottom]]);
	} else if (number === 9) {
		this.createDots(ctx, [[left, top],  [middle, top], [right, top],
			[left, middle], [middle, middle], [right, middle],
			[left, bottom], [middle, bottom], [right, bottom]]);
	}

	ctx.closePath();
	ctx.fill();

	Phaser.Sprite.call(this, game, x, y, bmd); // Parent constructor.
	return this;
}

DiceRepresentation.prototype.createDots = function (ctx, dots) {
	ctx.arc(dots[0][0], dots[0][1], this.radius, 0, Math.PI2);
	for (var i = 1; i < dots.length; i++) {
		ctx.moveTo(dots[i][0], dots[i][1]);
		ctx.arc(dots[i][0], dots[i][1], this.radius, 0, Math.PI2);
	}
};
},{}],28:[function(require,module,exports){
module.exports = DotsRepresentation;

DotsRepresentation.prototype = Object.create(Phaser.Sprite.prototype);
DotsRepresentation.prototype.constructor = DotsRepresentation;

/**
 * Dots representation of a number.
 * This is similar to DiceRepresentation, but has a random dot position.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number to represent.
 * @param {number} xPos - X position.
 * @param {number} yPos - Y position.
 * @param {number} size - Width and height of the representation (default 100).
 * @param {string} color - The color of the representation (default '#000000').
 * @return {Object} Itself.
 */
function DotsRepresentation (game, number, xPos, yPos, size, color) {
	size = size || 100;
	var radius = parseInt(size/9);
	var dotSize = radius*2 + 1; // diameter + offset
	var left = radius + 1;
	var right = size - radius - 1;
	var top = left;
	var bottom = right;

	/*
	 * For more information about context:
	 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
	 */
	var bmd = game.add.bitmapData(size, size);
	var ctx = bmd.ctx;
	ctx.fillStyle = color || '#000000';
	ctx.beginPath();

	/* Fill up with dots. */
	var dots = [];
	var x, y, t, i, overlap;
	while (dots.length < number) {
		/* The dots will be placed randomly. */
		x = game.rnd.integerInRange(left, right);
		y = game.rnd.integerInRange(top, bottom);
		t = { x: x, y: y };
		overlap = false;

		/* And then checked that they do not overlap other dots. */
		for (i = 0; i < dots.length; i++) {
			if (game.physics.arcade.distanceBetween(t, dots[i]) < dotSize) {
				overlap = true;
				break;
			}
		}

		/* And added if they do not. */
		if (!overlap) {
			dots.push(t);
			ctx.moveTo(x, y);
			ctx.arc(x, y, radius, 0, Math.PI2);
		}
	}

	ctx.closePath();
	ctx.fill();

	Phaser.Sprite.call(this, game, xPos, yPos, bmd); // Parent constructor.
	return this;
}
},{}],29:[function(require,module,exports){
module.exports = FingerRepresentation;

FingerRepresentation.prototype = Object.create(Phaser.Sprite.prototype);
FingerRepresentation.prototype.constructor = FingerRepresentation;

/**
 * Finger representation of a number.
 * NOTE: Only available between numbers 1-9.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number to represent.
 * @param {number} xPos - X position.
 * @param {number} yPos - Y position.
 * @param {number} size - Width and height of the representation (default 100).
 * @param {string} color - The color of the representation (default '#000000').
 * @return {Object} Itself.
 */
function FingerRepresentation (game, number, xPos, yPos, size, color) {
	size = size || 100;
	var half = size/2;
	var width = size/20;
	var middle = 11.2;

	/*
	 * For more information about context:
	 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
	 */
	var bmd = game.add.bitmapData(size, size);
	var ctx = bmd.ctx;
	ctx.fillStyle = color || '#000000';
	ctx.beginPath();

	var x, y, height;
	if (number >= 1) {
		x = 0;
		y = half*0.8;
		height = half*0.7;
		ctx.moveTo(x, y);
		ctx.lineTo(width, y - width);
		ctx.lineTo(width*2.5, y + height);
		ctx.lineTo(width*1.5, y + height + width);
		ctx.lineTo(x, y);
	}
	if (number >= 2) {
		x = width*2.2;
		y = half*0.5;
		height = half*0.9;
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y - width);
		ctx.lineTo(x + width*2, y + height);
		ctx.lineTo(x + width, y + height + width);
		ctx.lineTo(x, y);
	}
	if (number >= 3) {
		x = width*4.4;
		y = half*0.3;
		height = half*1.1;
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y);
		ctx.lineTo(x + width, y + height);
		ctx.lineTo(x, y + height);
		ctx.lineTo(x, y);
	}
	if (number >= 4) {
		x = width*6.6;
		y = half*0.5;
		height = half;
		ctx.moveTo(x, y - width);
		ctx.lineTo(x + width, y);
		ctx.lineTo(x + width/2, y + height);
		ctx.lineTo(x - width/2, y + height - width);
		ctx.lineTo(x, y - width);
	}
	if (number >= 5) {
		x = width*8.6;
		y = half;
		height = half*0.7;
		ctx.moveTo(x, y - width);
		ctx.lineTo(x + width, y);
		ctx.lineTo(x, y + height);
		ctx.lineTo(x - width, y + height + width);
		ctx.lineTo(x, y - width);
	}
	if (number >= 6) {
		x = width*middle;
		y = half;
		height = half*0.7;
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y - width);
		ctx.lineTo(x + width*2, y + height + width);
		ctx.lineTo(x + width, y + height);
		ctx.lineTo(x, y);
	}
	if (number >= 7) {
		x = width*(middle+2);
		y = half*0.5;
		height = half;
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y - width);
		ctx.lineTo(x + width*1.5, y + height - width);
		ctx.lineTo(x + width/2, y + height);
		ctx.lineTo(x, y);
	}
	if (number >= 8) {
		x = width*(middle + 4.2);
		y = half*0.3;
		height = half*1.1;
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y);
		ctx.lineTo(x + width, y + height);
		ctx.lineTo(x, y + height);
		ctx.lineTo(x, y);
	}
	if (number >= 9) {
		x = width*(middle + 6.4);
		y = half*0.5;
		height = half*0.9;
		ctx.moveTo(x, y - width);
		ctx.lineTo(x + width, y);
		ctx.lineTo(x, y + height + width);
		ctx.lineTo(x - width, y + height);
		ctx.lineTo(x, y - width);
	}

	ctx.closePath();
	ctx.fill();

	Phaser.Sprite.call(this, game, xPos, yPos, bmd); // Parent constructor.
	return this;
}
},{}],30:[function(require,module,exports){
var GLOBAL = require('../../global.js');
module.exports = NumberRepresentation;

NumberRepresentation.prototype = Object.create(Phaser.Text.prototype);
NumberRepresentation.prototype.constructor = NumberRepresentation;

/**
 * Number symbol representation of a number.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number to represent.
 * @param {number} x - X position.
 * @param {number} y - Y position.
 * @param {number} size - Font size of the representation (default 50).
 * @param {string} color - The color of the representation (default '#000000').
 * @return {Object} Itself.
 */
function NumberRepresentation (game, number, x, y, size, color) {
	size = size || 50;
	color = color || '#000000';

	Phaser.Text.call(this, game, x+size, y+size, number.toString(), {
		font: size + 'pt ' + GLOBAL.FONT,
		fill: color,
		stroke: color,
		strokeThickness: 3
	}); // Parent constructor.
	this.anchor.set(0.5);


	//this.updatePosition();
	return this;
}

NumberRepresentation.updatePosition = function(x1,y1) {

		this.x = x1;
		this.y = y1;
};
},{"../../global.js":8}],31:[function(require,module,exports){
module.exports = StrikeRepresentation;

StrikeRepresentation.prototype = Object.create(Phaser.Sprite.prototype);
StrikeRepresentation.prototype.constructor = StrikeRepresentation;

/**
 * Strike/Tick representation of a number.
 * @param {Object} game - A reference to the Phaser game.
 * @param {number} number - The number to represent.
 * @param {number} xPos - X position.
 * @param {number} yPos - Y position.
 * @param {number} size - Width and height of the representation (default 100).
 * @param {string} color - The color of the representation (default '#000000').
 * @param {number} max - If you have a range of numbers, set this to the highest one,
 *                       that way the height of the individual strikes will be the same
 *                       (default argument number).
 * @return {Object} Itself.
 */
function StrikeRepresentation (game, number, xPos, yPos, size, color, max) {
	size = size || 100;
	max = max || number;
	max = Math.abs(max);
	if (max < number) {
		max = number;
	}

	var diagTop = 0.8;
	var diagBottom = 0.2;
	var width = size/10;
	var half = width/2;
	var padding = width*1.25;
	var offset = 2;
	var height = size/Math.ceil(max/5) - offset;

	var pos = (size - width - padding*2) / 3;

	/*
	 * For more information about context:
	 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
	 */
	var bmd = new Phaser.BitmapData(game, '', size, size);
	var ctx = bmd.ctx;
	ctx.fillStyle = color || '#000000';
	ctx.beginPath();

	var x = padding;
	var y = offset/2;
	for (var i = 1; i <= number; i++) {
		if (i % 5 === 0 && i !== 0) {
			ctx.moveTo(0,           y + height*diagTop - half   );
			ctx.lineTo(size - half, y + height*diagBottom       );
			ctx.lineTo(size,        y + height*diagBottom + half);
			ctx.lineTo(half,        y + height*diagTop          );
			ctx.lineTo(0,           y + height*diagTop - half   );
			x = padding;
			y += height + offset;
		} else {
			ctx.fillRect(x, y, width, height);
			x += pos;
		}
	}

	ctx.closePath();
	ctx.fill();

	Phaser.Sprite.call(this, game, xPos, yPos, bmd); // Parent constructor.
	return this;
}
},{}],32:[function(require,module,exports){
module.exports = YesnoRepresentation;

YesnoRepresentation.prototype = Object.create(Phaser.Sprite.prototype);
YesnoRepresentation.prototype.constructor = YesnoRepresentation;

/**
 * Yes - No representation.
 * @param {Object} game - A reference to the Phaser game.
 * @param {boolean} yes - True is yes, false is no.
 * @param {number} x - X position.
 * @param {number} y - Y position.
 * @param {number} size - Font size of the representation (default 50).
 * @return {Object} Itself.
 */
function YesnoRepresentation (game, yes, x, y, size) {
	size = size || 50;
	var typ = yes ? 'yes' : 'no';

	Phaser.Sprite.call(this, game, x, y, 'objects', typ + 1);
	this.width = size;
	this.height = size;

	this.animations.add('cycle', [typ + 1, typ + 2, typ + 1, typ + 3, typ + 1], 5, true).play();

	return this;
}
},{}],33:[function(require,module,exports){
//var backend = require('./backend.js');
var GLOBAL = require('./global.js');
var LANG = require('./language.js');
var EventSystem = require('./pubsub.js');

module.exports = Player;

/**
 * Creates an instance of Player.
 * The player will load information about it from server upon instantiation.
 *
 * @constructor
 * @param {Object} game - A reference to the Phaser game.
 */
function Player (game) {
	this.game = game;

	/**
	 * @property {number} _agent - A pointer to the agent type.
	 * @private
	 */
	this._agent = null;

	/**
	 * @property {number} _water - The amount of water the player has.
	 * @private
	 */
	this._water = 0;

	/**
	 * @property {number} name - The name of the player.
	 */
	this.name = LANG.TEXT.anonymous;

	/**
	 * @property {number} tint - A tint for the agent.
	 */
	this.tint = 0xffffff;

	/* Load player data from server. */
	/*var data =  backend.getPlayer();
	if (data) {
		this.name = data.name;
		this.agent = GLOBAL.AGENT[data.agent.type];
		this.tint = data.agent.tint || this.tint;
		this._water = data.water || 0; // Do not use water since that fires an event.
	}*/
	this.name= 'Erik Anderberg';
	this._agent = GLOBAL.AGENT[1];
	this.tint = this.tint;

	return this;
}

/**
 * @property {number} maxWater - The maximum amount of water the player can have.
 */
Player.prototype.maxWater = 6;

/**
 * @property {number} water - The amount of water the player has.
 *                            Publishes waterAdded event when changed.
 */
Object.defineProperty(Player.prototype, 'water', {
	get: function() {
		return this._water;
	},
	set: function(value) {
		if (value >= 0) {
			value = value > this.maxWater ? this.maxWater : value;
			var diff = value - this._water;
			this._water = value;
			EventSystem.publish(GLOBAL.EVENT.waterAdded, [this._water, diff]);
		}
	}
});

/**
 * @property {Object} agent - Pointer to the agent constructor.
 *                            NOTE: Do not use this to create an agent, use createAgent.
 *                            NOTE: Updates the language object as well.
 */
Object.defineProperty(Player.prototype, 'agent', {
	get: function() {
		return this._agent;
	},
	set: function(value) {
		this._agent = value;
		if (this._agent && this._agent.prototype.id) {
			LANG.setAgent(this._agent.prototype.id);
		}
	}
});

/**
 * Creates an agent of the current type the player uses.
 * @returns {Object} An instance of the agent belonging to the player.
 */
Player.prototype.createAgent = function () {
	var agent = new this.agent(this.game);
	agent.tint = this.tint;
	return agent;
};
},{"./global.js":8,"./language.js":9,"./pubsub.js":34}],34:[function(require,module,exports){
/**
 * A publish/subscribe style event system.
 * Subscribe to an event and it will run when someone publish it.
 *
 * There are two subscription types: regular and persistent.
 * The difference is that persistent will not be removed by
 * the clear function unless explicitly specified.
 * @global
 */
module.exports = {
	/**
	 * Registered subscriptions.
	 * @property {Object} _events
	 * @private
	 */
	_events: {},

	/**
	 * Registered persistent subscriptions.
	 * @property {Object} _persistent
	 * @private
	 */
	_persistent: {},

	/**
	 * Push a subscription to a list.
	 * @param {Object} to - The list to add to (use _events or _persistent).
	 * @param {string} topic - The topic of the event.
	 * @param {function} callback - The function to run when topic is published.
	 * @private
	 */
	_pushEvent: function (to, topic, callback) {
		if (!to[topic]) {
			to[topic] = [];
		}
		to[topic].push(callback);
	},

	/**
	 * Publish an event. This will run all its subscriptions.
	 * @param {string} topic - The topic of the event.
	 * @param {Array} args - The arguments to supply to the subscriptions.
	 */
	publish: function (topic, args) {
		var subs = [].concat(this._events[topic], this._persistent[topic]);
		var len = subs.length;

		while (len--) {
			if (subs[len]) {
				subs[len].apply(this, args || []);
			}
		}
	},

	/**
	 * Subscribe to a certain event.
	 * NOTE: scope will be lost.
	 * @param {string} topic - The topic of the event.
	 * @param {function} callback - The function to run when event is published.
	 * @param {boolean} persistent - If the subscription should be added to the persistent list.
	 * @return {Array} A handle to the subscription.
	 */
	subscribe: function (topic, callback, persistent) {
		this._pushEvent((persistent ? this._persistent : this._events), topic, callback);
		return [topic, callback]; // Array
	},

	/**
	 * Unsubscribe to a certain regular event.
	 * @param {Array|string} handle - The array returned by the subscribe function or
	 *                                the topic if handle is missing.
	 * @param {function} callback - Supply this if you do not have an array handle.
	 */
	unsubscribe: function (handle, callback) {
		var subs = this._events[callback ? handle : handle[0]];
		callback = callback || handle[1];
		var len = subs ? subs.length : 0;

		while (len--) {
			if (subs[len] === callback) {
				subs.splice(len, 1);
			}
		}
	},

	/**
	 * Clear the event lists.
	 * @param {boolean} persistent - True will delete all persistent events as well.
	 */
	clear: function (persistent) {
		this._events = {};
		if (persistent) {
			this._persistent = {};
		}
	}
};
},{}],35:[function(require,module,exports){
var SuperState = require('./SuperState.js');
var backend = require('../backend.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var util = require('../utils.js');
var Hedgehog = require('../agent/Hedgehog.js');
var Mouse = require('../agent/Mouse.js');
var Panda = require('../agent/Panda.js');
var Menu = require('../objects/Menu.js');
var NumberButton = require('../objects/buttons/NumberButton.js');
var TextButton = require('../objects/buttons/TextButton.js');

module.exports = AgentSetupState;

AgentSetupState.prototype = Object.create(SuperState.prototype);
AgentSetupState.prototype.constructor = AgentSetupState;

/**
 * The state for choosing agent.
 */
function AgentSetupState () {}

/* Phaser state function */
AgentSetupState.prototype.preload = function() {
	this.load.audio('entryMusic', ['audio/music.m4a', 'audio/music.ogg', 'audio/music.mp3']);
	this.load.audio('chooseSpeech', LANG.SPEECH.agentIntro.speech);
	this.load.atlasJSONHash(Panda.prototype.id, 'img/agent/panda/atlas.png', 'img/agent/panda/atlas.json');
	this.load.atlasJSONHash(Hedgehog.prototype.id, 'img/agent/hedgehog/atlas.png', 'img/agent/hedgehog/atlas.json');
	this.load.atlasJSONHash(Mouse.prototype.id, 'img/agent/mouse/atlas.png', 'img/agent/mouse/atlas.json');
};

/* Phaser state function */
AgentSetupState.prototype.create = function () {
	var _this = this;
	var spacing = 450;
	var scale = { x: 0.3, y: 0.3 };       // Default scale
	var scaleActive = { x: 0.4, y: 0.4 }; // Scale when pushed
	var scalePicked = { x: 0.5, y: 0.5 }; // Scale when pushed the second time
	var slideTime = 1;
	var fontStyle = {
		font: '50pt ' +  GLOBAL.FONT,
		fill: '#ffff00',
		stroke: '#000000',
		strokeThickness: 5
	};
	var waving;

	var speech = util.createAudioSheet.call(this, 'chooseSpeech', LANG.SPEECH.agentIntro.markers);


	function clickAgent () {
		if (a === this) {
			/* Agent was already active, go into coloring mode */
			pickAgent();
		} else {
			if (a) {
				cancelAgent();
				TweenMax.to(a.scale, slideTime, scale); // Scale down the old agent
			}
			a = this;
			TweenMax.to(a.scale, slideTime, scaleActive); // Scale up the new agent
			// Move the agent group to get the sliding effect on all agents
			TweenMax.to(agents, slideTime, {
				x: -(agents.children.indexOf(a) * spacing),
				ease: Power2.easeOut,
				onStart: function () { speech.stop(); },
				onComplete: function () {
					a.say(speech, a.id + 'Hello').play(a.id + 'Hello');
					waving = a.wave(2, 1);
				}
			});
		}
	}

	function fadeInterface (value) {
		confirm.text = LANG.TEXT.confirmFriend + a.agentName + '?';
		util.fade(title, !value, value ? 0.2 : 0.5);
		util.fade(confirm, value, !value ? 0.2 : 0.5);
		util.fade(noToAgent, value);
		util.fade(yesToAgent, value);
		util.fade(color, value);
	}

	function pickAgent () {
		TweenMax.to(a.scale, 0.5, scalePicked);
		fadeInterface(true);
	}

	function cancelAgent () {
		TweenMax.to(a.scale, 0.5, scaleActive);
		fadeInterface(false);
		noToAgent.reset();
	}

	function chooseAgent () {
		_this.input.disabled = true;
		if (waving) {
			waving.kill();
		}
		fadeInterface(false);
		speech.stop();
		var t = new TimelineMax();
		t.addSound(speech, a, a.id + 'FunTogether');
		t.addCallback(function () {
			a.fistPump();
			backend.putAgent({ agent: { type: a.key, tint: a.tint } });
			_this.game.player.agent = GLOBAL.AGENT[a.key];
			_this.game.player.tint = a.tint;
		}, 0);
		t.addCallback(function () {
			_this.input.disabled = false;
			_this.state.start(GLOBAL.STATE.beach);
		}, '+=0.5');
	}

	// Add music
	this.add.music('entryMusic', 0.3, true).play();

	// Add background
	this.add.image(0, 0, 'entryBg');

	var agents = this.add.group();
	agents.x = spacing;
	var a;
	for (var key in GLOBAL.AGENT) {
		a = new GLOBAL.AGENT[key](this.game);
		this.add.text(0, -(a.body.height/2) - 50, a.agentName, fontStyle, a).anchor.set(0.5);
		a.x = this.world.centerX + spacing * key;
		a.y = this.world.centerY + 70;
		a.scale.x = scale.x;
		a.scale.y = scale.y;
		a.body.inputEnabled = true;
		a.body.events.onInputDown.add(clickAgent, a);
		a.key = key;
		agents.add(a);
	}
	a = null;

	var title = this.add.text(this.world.centerX, 75, LANG.TEXT.pickFriend, fontStyle);
	title.anchor.set(0.5);

	var confirm = this.add.text(this.world.centerX, 75, '', fontStyle);
	confirm.anchor.set(0.5);
	confirm.visible = false;

	var noToAgent = new NumberButton(this.game, 2, GLOBAL.NUMBER_REPRESENTATION.yesno, {
		x: this.world.centerX - 275,
		y: this.world.centerY*0.5,
		size: 75,
		onClick: cancelAgent
	});
	noToAgent.visible = false;
	this.world.add(noToAgent);

	var yesToAgent = new NumberButton(this.game, 1, GLOBAL.NUMBER_REPRESENTATION.yesno, {
		x: this.world.centerX + 200,
		y: this.world.centerY*0.5,
		size: 75,
		onClick: chooseAgent
	});
	yesToAgent.visible = false;
	this.world.add(yesToAgent);

	var color = new TextButton(this.game, LANG.TEXT.changeColor, {
		x: this.world.centerX,
		y: this.world.height - 75,
		fontSize: 30,
		onClick: function () { a.tint = _this.game.rnd.integerInRange(0x000000, 0xffffff); }
	});
	color.x -= color.width/2;
	color.visible = false;
	this.world.add(color);

	this.world.add(new Menu(this.game));


	/* When the state starts. */
	this.startGame = function () {
		/* Choose the first agent if player does not have one */
		var current = 0;
		if (this.game.player.agent) {
			for (var k in agents.children) {
				if (agents.children[k].id === this.game.player.agent.prototype.id) {
					agents.children[k].tint = this.game.player.tint;
					current = k;
					break;
				}
			}
		}

		agents.children[current].body.events.onInputDown.dispatch();
	};
};

/* Phaser state function */
AgentSetupState.prototype.shutdown = function () {
	if (!this.game.player.agent || this.game.player.agent.prototype.id !== Panda.prototype.id) {
		this.cache.removeSound(Panda.prototype.id + 'Speech');
		this.cache.removeImage(Panda.prototype.id);
	}
	if (!this.game.player.agent || this.game.player.agent.prototype.id !== Hedgehog.prototype.id) {
		this.cache.removeSound(Hedgehog.prototype.id + 'Speech');
		this.cache.removeImage(Hedgehog.prototype.id);
	}
	if (!this.game.player.agent || this.game.player.agent.prototype.id !== Mouse.prototype.id) {
		this.cache.removeSound(Mouse.prototype.id + 'Speech');
		this.cache.removeImage(Mouse.prototype.id);
	}

	SuperState.prototype.shutdown.call(this);
};
},{"../agent/Hedgehog.js":3,"../agent/Mouse.js":4,"../agent/Panda.js":5,"../backend.js":6,"../global.js":8,"../language.js":9,"../objects/Menu.js":17,"../objects/buttons/NumberButton.js":24,"../objects/buttons/TextButton.js":26,"../utils.js":48,"./SuperState.js":41}],36:[function(require,module,exports){
var SuperState = require('./SuperState.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var Cover = require('../objects/Cover.js');
var Menu = require('../objects/Menu.js');

module.exports = BeachState;

BeachState.prototype = Object.create(SuperState.prototype);
BeachState.prototype.constructor = BeachState;


/**
 * The beach of the game.
 * The base from where you go to the subgames
 * Basically the GardenState without the garden and backend
 */
function BeachState () {}

/* Phaser state function */
BeachState.prototype.preload = function() {
    if (!this.cache._sounds[this.game.player.agent.prototype.id + 'Speech']) {
        this.load.audio(this.game.player.agent.prototype.id + 'Speech', LANG.SPEECH.AGENT.speech);
    }
    if (!this.cache._sounds.gardenMusic) {
        this.load.audio('gardenMusic', ['audio/garden/music.m4a', 'audio/garden/music.ogg', 'audio/garden/music.mp3']);
    }
    if (!this.cache._images.garden) {
        this.load.atlasJSONHash('garden', 'img/garden/atlas.png', 'img/garden/atlas.json');
    }


};

BeachState.prototype.create = function () {
    // Add music
    this.add.music('gardenMusic', 0.2, true).play();

    // Add background
    this.add.sprite(0, 0, 'garden', 'bg');

    // Add sign to go to next scenario
    //var sure = false;
    var sign = this.add.sprite(750, 100, 'garden', 'sign');
    sign.inputEnabled = true;
    sign.events.onInputDown.add(function () {
        // This happens either on local machine or on "trial" version of the game.
        if (typeof Routes === 'undefined' || Routes === null) {
            this.game.state.start(GLOBAL.STATE.scenario, true, false);
            return;
        }


        var t = new TimelineMax();
        t.addCallback(function () {
            disabler.visible = true;
        });
        t.addCallback(function () {
            disabler.visible = false;
        });
    }, this);

    var startPos = 200;
    var height = (this.world.height - startPos)/3;
    var agent = this.game.player.createAgent();
    agent.scale.set(0.2);
    agent.x = -100;
    agent.y = startPos + height - agent.height/2;
    this.world.add(agent);


    /* Add disabler. */
    var disabler = new Cover(this.game, '#ffffff', 0);
    this.world.add(disabler);

    /* Add the menu */
    this.world.add(new Menu(this.game));

    this.startGame = function () {
        var t = new TimelineMax().skippable();
        t.add(agent.move({ x: this.world.centerX }, 3));
        t.addLabel('sign');
        t.add(agent.wave(1, 1));
        t.addCallback(agent.eyesFollowObject, 'sign', [sign], agent);
        t.addSound(agent.speech, agent, 'gardenSign', 'sign');
        t.addCallback(function () {
            agent.eyesStopFollow();
            disabler.visible = false;
        }, null, null, this);
    };
};


},{"../global.js":8,"../language.js":9,"../objects/Cover.js":13,"../objects/Menu.js":17,"./SuperState.js":41}],37:[function(require,module,exports){
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var EventSystem = require('../pubsub.js');
var Modal = require('../objects/Modal.js');
var Hedgehog = require('../agent/Hedgehog.js');
var Mouse = require('../agent/Mouse.js');
var Panda = require('../agent/Panda.js');

module.exports = BootState;

/**
 * The boot state will load the first parts of the game and common game assets.
 * Add assets that will be used by many states.
 */
function BootState () {}

/**
 * @property {boolean} _isLoaded - Used for loading all assets. See bootGame.
 * @default
 * @private
 */
BootState.prototype._fontLoaded = false;

/* Phaser state function */
BootState.prototype.preload = function () {
	var _this = this;

	GLOBAL.STATE_KEYS = Object.keys(this);
	GLOBAL.STATE_KEYS.push('loaded');

	/* Make sure tweens are stopped when pausing. */
	this.game.onPause.add(function () {
		TweenMax.globalTimeScale(0);
		this.game.sound.pauseAll();
	}, this);
	this.game.onResume.add(function () {
		TweenMax.globalTimeScale(1);
		this.game.sound.resumeAll();
	}, this);


	/* Show loading progress accordingly */
	this.load.onFileComplete.add(function (progress) {
		document.querySelector('.progress').innerHTML = progress + '%';
		if (progress >= 100) {
			document.querySelector('.loading').style.display = 'none';
		} else {
			document.querySelector('.loading').style.display = 'block';
		}
	});

	/* Respond to connection problems */
	EventSystem.subscribe(GLOBAL.EVENT.connection, function (status) {
		if (status) {
			document.querySelector('.loading').style.display = 'none';
		} else {
			document.querySelector('.progress').innerHTML = LANG.TEXT.connectionLost;
			document.querySelector('.loading').style.display = 'block';
		}
	}, true);

	EventSystem.subscribe(GLOBAL.EVENT.connectionLost, function () {
		_this.game.world.add(new Modal(_this.game, LANG.TEXT.connectionLostMessage, 20, function () {
			document.querySelector('.loading').style.display = 'none';
			_this.game.state.start(GLOBAL.STATE.entry);
		}));
	}, true);


	/* Make sure the game scales according to resolution */
	this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
	this.scale.pageAlignHorizontally = true;
	this.scale.pageAlignVertically = true;

	/* Setup sound manager */
	// Array to hold music objects, needed to change bg-volume
	this.sound._music = [];

	/* Use stored volumes, if any. */
	this.sound._fgVolume = 1;
	if (typeof localStorage.fgVolume !== 'undefined') {
		this.sound.fgVolume = localStorage.fgVolume;
	}
	this.sound._bgVolume = 1;
	if (typeof localStorage.bgVolume !== 'undefined') {
		this.sound.bgVolume = localStorage.bgVolume;
	}

	// Overshadow the original sound managers add function.
	// To save maxVolume for the sound and setup actual volume according to fg.
	this.sound.add = function (key, volume, loop, connect) {
		var sound = Phaser.SoundManager.prototype.add.call(this, key, volume, loop, connect);
		sound.maxVolume = sound.volume;
		sound.volume = sound.maxVolume * this.fgVolume;
		return sound;
	};
	// Overshadow the original sound managers remove function.
	// To make sure that object is removed from music array.
	this.sound.remove = function (sound) {
		var success = Phaser.SoundManager.prototype.remove.call(this, sound);
		if (this._music.indexOf(sound) >= 0) {
			this._music.splice(this._music.indexOf(sound), 1);
		}
		return success;
	};
	// Overshadow the original sound objects play function.
	// To set volume according to fg/bg.
	var soundFunction = Phaser.Sound.prototype.play;
	Phaser.Sound.prototype.play = function (marker, position, volume, loop, forceRestart) {
		var container = this.game.sound[this.game.sound._music.indexOf(this) >= 0 ? 'bgVolume' : 'fgVolume'];
		volume = (typeof volume !== 'number' ? this.maxVolume : volume) * container;
		return soundFunction.call(this, marker, position, volume, loop, forceRestart);
	};

	/* Allow images to be served from external sites, e.g. amazon */
	this.load.crossOrigin = 'anonymous';

	/* Load the Google WebFont Loader script */
	// The Google WebFont Loader will look for this specific object.
	window.WebFontConfig = {
		active: function () { _this._fontLoaded = true; },
		google: { families: [GLOBAL.FONT] }
	};
	this.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');

	/* Agent related assets */
	if (this.game.player.agent) {
		var name = this.game.player.agent.prototype.id;
		this.load.audio(name + 'Speech', LANG.SPEECH.AGENT.speech);
		if (name === Panda.prototype.id) {
			this.load.atlasJSONHash(name, 'img/agent/panda/atlas.png', 'img/agent/panda/atlas.json');
		} else if (name === Hedgehog.prototype.id) {
			this.load.atlasJSONHash(name, 'img/agent/hedgehog/atlas.png', 'img/agent/hedgehog/atlas.json');
		} else if (name === Mouse.prototype.id) {
			this.load.atlasJSONHash(name, 'img/agent/mouse/atlas.png', 'img/agent/mouse/atlas.json');
		}
	}

	/* Common game assets */
	this.load.audio('click', ['audio/click.m4a', 'audio/click.ogg', 'audio/click.mp3']);
	this.load.atlasJSONHash('objects', 'img/objects/objects.png', 'img/objects/objects.json');
	this.load.atlasJSONHash('cookie', 'img/objects/cookies.png', 'img/objects/cookies.json');
	/* All sounds are purged from cache when switching state (memory issues), set this to not delete a sound. */
	this.sound._doNotDelete = ['click', Panda.prototype.id + 'Speech', Hedgehog.prototype.id + 'Speech', Mouse.prototype.id + 'Speech'];

	/* Load the entry state assets as well, no need to do two loaders. */
	this.load.image('entryBg', 'img/jungle.png');
};

/* Phaser state function */
BootState.prototype.update = function () {
	/**
	 * The next state will be called when everything has been loaded.
	 * So we need to wait for the web font to set its loaded flag.
	 */
	if (this._fontLoaded) {

		if (typeof Routes === 'undefined' || Routes === null) {
			console.warn('You are missing a route to the server, no data will be fetched or sent.');
		}

		if (GLOBAL.debug) {
			console.log('You are running in debug mode, sneaking into choose scenario state :)');
			this.game.state.start(GLOBAL.STATE.scenario);

		} else {
			this.game.state.start(GLOBAL.STATE.entry);
		}

	}
};
},{"../agent/Hedgehog.js":3,"../agent/Mouse.js":4,"../agent/Panda.js":5,"../global.js":8,"../language.js":9,"../objects/Modal.js":18,"../pubsub.js":34}],38:[function(require,module,exports){
var SuperState = require('./SuperState.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var Panda = require('../agent/Panda.js');
var Menu = require('../objects/Menu.js');
var NumberButton = require('../objects/buttons/NumberButton.js');
var TextButton = require('../objects/buttons/TextButton.js');

module.exports = ChooseScenarioState;

ChooseScenarioState.prototype = Object.create(SuperState.prototype);
ChooseScenarioState.prototype.constructor = ChooseScenarioState;

/* The menu for choosing agent, */
function ChooseScenarioState () {}

/* Phaser state function */
ChooseScenarioState.prototype.preload = function() {
	if (!this.game.player.agent) {
		console.log('Setting agent to: ' + Panda.prototype.id);
		this.game.player.agent = Panda;
		this.load.audio('pandaSpeech', LANG.SPEECH.AGENT.speech);
		this.load.atlasJSONHash('panda', 'img/agent/panda/atlas.png', 'img/agent/panda/atlas.json');
	}
};

/* Phaser state function */
ChooseScenarioState.prototype.create = function () {
	var _this = this;

	this.add.image(0, 0, 'entryBg');

	var textOptions = {
		font: '20pt ' +  GLOBAL.FONT,
		fill: '#ffffff',
		stroke: '#000000',
		strokeThickness: 4
	};
	var offset = 10;
	var i, t, key;


	/* Subgame selection */
	var subgame = null;
	var gameClicker = function () {
		if (subgame !== this && subgame) {
			subgame.reset();
		}
		subgame = this;
	};

	this.add.text(75, 80, 'Subgame', textOptions);
	var games = [
		['Shark', GLOBAL.STATE.sharkGame],
		['Bird Hero', GLOBAL.STATE.birdheroGame],
		['Lizard', GLOBAL.STATE.lizardGame],
		['Bee Flight', GLOBAL.STATE.beeGame]
	];
	var gameButtons = [];
	for (i = 0; i < games.length; i++) {
		t = new TextButton(this.game, games[i][0], {
			x: t ? t.x + t.width + offset : 50,
			y: 125,
			fontSize: 25,
			onClick: gameClicker,
			keepDown: true
		});
		t.gameState = games[i][1];
		this.world.add(t);
		gameButtons.push(t);
	}


	/* Range selection */
	var range = null;
	var rangeClicker = function () {
		if (range !== this && range) {
			range.reset();
		}
		range = this;
	};

	this.add.text(75, 220, 'Number Range', textOptions);
	var rangeButtons = [];
	t = null;
	for (key in GLOBAL.NUMBER_RANGE) {
		t = new TextButton(this.game, '1 - ' + GLOBAL.NUMBER_RANGE[key], {
			x: t ? t.x + t.width + offset : 50,
			y: 265,
			fontSize: 33,
			onClick: rangeClicker,
			keepDown: true
		});
		t.range = key;
		this.world.add(t);
		rangeButtons[key] = t;
	}


	/* Representation selection */
	var representation = null;
	var representationClicker = function () {
		if (representation !== this && representation) {
			representation.reset();
		}
		representation = this;
	};

	this.add.text(75, 360, 'Number Representation', textOptions);
	var representationButtons = [];
	i = 0;
	for (key in GLOBAL.NUMBER_REPRESENTATION) {
		if (key === 'objects' || key === 'yesno') {
			continue;
		}

		representationButtons[GLOBAL.NUMBER_REPRESENTATION[key]] = new NumberButton(this.game, 4, GLOBAL.NUMBER_REPRESENTATION[key], {
			x: 50 + i*(75 + offset),
			y: 405,
			onClick: representationClicker
		});
		this.world.add(representationButtons[representationButtons.length-1]);
		i++;
	}


	/* Method selection */
	var method = null;
	var methodClicker = function () {
		if (method !== this && method) { method.reset(); }
		method = this;
	};

	this.add.text(75, 500, 'Method', textOptions);
	var methods = [
		['Counting',  GLOBAL.METHOD.count],
		['Step-by-step', GLOBAL.METHOD.incrementalSteps],
		['Addition', GLOBAL.METHOD.addition],
		['Subtraction', GLOBAL.METHOD.subtraction],
		['Add & Sub', GLOBAL.METHOD.additionSubtraction]
	];
	var methodButtons = [];
	t = null;
	for (i = 0; i < methods.length; i++) {
		t = new TextButton(this.game, methods[i][0], {
			x: t ? t.x + t.width + offset : 50,
			y: 545,
			fontSize: 20,
			onClick: methodClicker,
			keepDown: true
		});
		t.method = methods[i][1];
		this.world.add(t);
		methodButtons.push(t);
	}


	/* Start game (save current options) */
	var startButton = new TextButton(this.game, 'Start scenario', {
		x: this.world.centerX - 150,
		y: 660,
		fontSize: 30,
		onClick: function () {
			if (!subgame || !subgame.gameState ||
				!range || !range.range ||
				!representation || !representation.representations ||
				!method || (typeof method.method === 'undefined')) {
				return;
			}

			/* Persistent save for ease of use. */
			localStorage.chooseSubgame = subgame.gameState;
			localStorage.chooseRange = range.range;
			localStorage.chooseRepresentation = representation.representations;
			localStorage.chooseMethod = method.method;

			_this.game.state.start(subgame.gameState, true, false, {
				method: method.method,
				representation: representation.representations,
				range: range.range,
				roundsPerMode: 3
			});
		}
	});
	this.world.add(startButton);

	/* In case you want to check out garden instead. */
	var gotoGarden = new TextButton(this.game, LANG.TEXT.gotoGarden, {
		x: 75,
		y: 5,
		size: 56,
		fontSize: 20,
		onClick: function () {
			_this.game.state.start(GLOBAL.STATE.beach);
		}
	});
	this.world.add(gotoGarden);

	this.world.add(new Menu(this.game));


	/* If we have been in this state before, we try to preset the correct buttons. */
	switch (localStorage.chooseSubgame) {
		case GLOBAL.STATE.balloonGame:
			gameButtons[0].setDown();
			subgame = gameButtons[0];
			break;
		case GLOBAL.STATE.birdheroGame:
			gameButtons[1].setDown();
			subgame = gameButtons[1];
			break;
		case GLOBAL.STATE.lizardGame:
			gameButtons[2].setDown();
			subgame = gameButtons[2];
			break;
		case GLOBAL.STATE.beeGame:
			gameButtons[3].setDown();
			subgame = gameButtons[3];
			break;
	}
	if (localStorage.chooseRange) {
		rangeButtons[parseInt(localStorage.chooseRange)].setDown();
		range = rangeButtons[parseInt(localStorage.chooseRange)];
	}
	if (localStorage.chooseRepresentation) {
		representationButtons[parseInt(localStorage.chooseRepresentation)].setDown();
		representation = representationButtons[parseInt(localStorage.chooseRepresentation)];
	}
	if (localStorage.chooseMethod) {
		methodButtons[parseInt(localStorage.chooseMethod)].setDown();
		method = methodButtons[parseInt(localStorage.chooseMethod)];
	}
};
},{"../agent/Panda.js":5,"../global.js":8,"../language.js":9,"../objects/Menu.js":17,"../objects/buttons/NumberButton.js":24,"../objects/buttons/TextButton.js":26,"./SuperState.js":41}],39:[function(require,module,exports){
var SuperState = require('./SuperState.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var util = require('../utils.js');
var Cover = require('../objects/Cover.js');

module.exports = EntryState;

EntryState.prototype = Object.create(SuperState.prototype);
EntryState.prototype.constructor = EntryState;

/**
 * The first state of the game, where you start the game or do settings.
 */
function EntryState () {}

/* Phaser state function */
EntryState.prototype.preload = function () {
	this.load.audio('entryMusic', ['audio/music.m4a', 'audio/music.ogg', 'audio/music.mp3']);
};

/* Entry state assets are loaded in the boot section */

/* Phaser state function */
EntryState.prototype.create = function () {
	// Add music
	this.add.music('entryMusic', 0.7, true).play();
	
	// Add background
	this.add.image(0, 0, 'entryBg');

	// Add headlines
	var title = this.add.text(this.world.centerX, this.world.centerY/2, LANG.TEXT.title, {
		font: '50pt ' +  GLOBAL.FONT,
		fill: '#ffff00',
		stroke: '#000000',
		strokeThickness: 5
	});
	title.anchor.set(0.5);

	var start = this.add.text(this.world.centerX, this.world.centerY, LANG.TEXT.continuePlaying, {
		font: '50pt ' +  GLOBAL.FONT,
		fill: '#dd00dd'
	});
	start.anchor.set(0.5);
	start.inputEnabled = true;

	var changeAgent = this.add.text(this.world.centerX, this.world.centerY*1.4, '', {
		font: '35pt ' +  GLOBAL.FONT,
		fill: '#000000'
	});
	changeAgent.anchor.set(0.5);
	changeAgent.inputEnabled = true;

	if (this.game.player.agent) {
		// Player has played before, we go to garden directly and show the agent change option.
		start.events.onInputDown.add(function () { this.state.start(GLOBAL.STATE.beach); }, this);

		changeAgent.text = LANG.TEXT.changeAgent + this.game.player.agent.prototype.agentName;
		changeAgent.events.onInputDown.add(function () { this.state.start(GLOBAL.STATE.agentSetup); }, this);

	} else {
		// Player has not played before, go to setup.
		start.text = LANG.TEXT.start;
		start.events.onInputDown.add(function () { this.state.start(GLOBAL.STATE.agentSetup); }, this);
	}


	/* Log out player. */
	var log = this.add.text(20, this.world.height, LANG.TEXT.logOut + '\n' + this.game.player.name, {
		font: '25pt ' +  GLOBAL.FONT,
		fill: '#000000'
	});
	log.anchor.set(0, 1);
	log.inputEnabled = true;
	log.events.onInputDown.add(function () { window.location = window.location.origin; });


	/* Credits related objects: */
	var credits = this.add.text(this.world.width - 20, this.world.height, LANG.TEXT.credits, {
		font: '25pt ' +  GLOBAL.FONT,
		fill: '#000000'
	});
	credits.anchor.set(1);
	credits.inputEnabled = true;
	credits.events.onInputDown.add(function () {
		util.fade(credits, false, 0.3);
		util.fade(start, false, 0.3);
		util.fade(changeAgent, false, 0.3);
		util.fade(allCredits, true);
		rolling.restart();
		cover.visible = true;
		TweenMax.to(cover, 0.5, { alpha: 0.7 });
	}, this);

	var cover = new Cover(this.game, '#000000', 0);
	cover.visible = false;
	cover.inputEnabled = true;
	cover.events.onInputDown.add(function () {
		util.fade(credits, true);
		util.fade(start, true);
		util.fade(changeAgent, true);
		util.fade(allCredits, false, 0.3);
		rolling.pause();
		TweenMax.to(cover, 0.3, { alpha: 0, onComplete: function () { cover.visible = false; } });
	}, this);
	this.world.add(cover);

	var allCredits = this.add.text(this.world.centerX, this.world.height,
		LANG.TEXT.creditsMade + '\n\n\n' +
		LANG.TEXT.creditsDeveloped + ':\nErik Anderberg\t \tAgneta Gulz\nMagnus Haake\t \tLayla Husain\n\n' +
		LANG.TEXT.creditsProgramming + ':\nErik Anderberg\t \tMarcus Malmberg\nHenrik Söllvander\n\n' +
		LANG.TEXT.creditsGraphics + ':\nSebastian Gulz Haake\nErik Anderberg\n\n' +
		LANG.TEXT.creditsVoices + ':\n' + LANG.TEXT.pandaName + '\t-\t' + LANG.TEXT.creditsVoicePanda + '\n' +
			LANG.TEXT.hedgehogName + '\t-\t' + LANG.TEXT.creditsVoiceHedgehog + '\n' +
			LANG.TEXT.mouseName + '\t-\t' + LANG.TEXT.creditsVoiceMouse + '\n' +
			LANG.TEXT.woodlouseName + '\t-\t' + LANG.TEXT.creditsVoiceWoodlouse + '\n' +
			LANG.TEXT.lizardName + '\t-\t' + LANG.TEXT.creditsVoiceLizard + '\n' +
			LANG.TEXT.bumblebeeName + '\t-\t' + LANG.TEXT.creditsVoiceBumblebee + '\n' +
			LANG.TEXT.birdName + '\t-\t' + LANG.TEXT.creditsVoiceBird + '\n\n' +
		LANG.TEXT.creditsMusic + ':\nTorbjörn Gulz\n\n' +
		LANG.TEXT.creditsSfx + ':\nAnton Axelsson\nhttp://soundbible.com\nhttp://freesfx.co.uk\n\n' +
		LANG.TEXT.creditsThanks + ':\nSanne Bengtsson\t \tMaja Håkansson\nLisa Lindberg\t \tBjörn Norrliden\nBrunnsparksskolan', {
		font: '15pt ' +  GLOBAL.FONT,
		fill: '#ffffff',
		align: 'center'
	});
	allCredits.anchor.set(0.5, 0);
	allCredits.visible = false;
	var rolling = TweenMax.fromTo(allCredits, 30,
		{ y: this.world.height },
		{ y: -allCredits.height, ease: Power0.easeInOut, repeat: -1, paused: true });
};
},{"../global.js":8,"../language.js":9,"../objects/Cover.js":13,"../utils.js":48,"./SuperState.js":41}],40:[function(require,module,exports){
var SuperState = require('./SuperState.js');
var backend = require('../backend.js');
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var EventSystem = require('../pubsub.js');
var util = require('../utils.js');
var Counter = require('../objects/Counter.js');
var Cover = require('../objects/Cover.js');
var Menu = require('../objects/Menu.js');
var WaterCan = require('../objects/WaterCan.js');
var SpriteButton = require('../objects/buttons/SpriteButton.js');

module.exports = GardenState;

GardenState.prototype = Object.create(SuperState.prototype);
GardenState.prototype.constructor = GardenState;

/**
 * The garden of the game.
 * This is where the player uses the water from the sessions.
 */
function GardenState () {}

/* Phaser state function */
GardenState.prototype.preload = function() {
	if (!this.cache._sounds[this.game.player.agent.prototype.id + 'Speech']) {
		this.load.audio(this.game.player.agent.prototype.id + 'Speech', LANG.SPEECH.AGENT.speech);
	}
	if (!this.cache._sounds.gardenMusic) {
		this.load.audio('gardenMusic', ['audio/garden/music.m4a', 'audio/garden/music.ogg', 'audio/garden/music.mp3']);
	}
	if (!this.cache._images.garden) {
		this.load.atlasJSONHash('garden', 'img/garden/atlas.png', 'img/garden/atlas.json');
	}

	//this.gardenData = backend.getGarden() || { fields: [] };
};

/* Phaser state function */
GardenState.prototype.create = function () {
	// Add music
	this.add.music('gardenMusic', 0.2, true).play();

	// Add background
	this.add.sprite(0, 0, 'garden', 'bg');

	// Add sign to go to next scenario
	//var sure = false;
	var sign = this.add.sprite(750, 100, 'garden', 'sign');
	sign.inputEnabled = true;
	sign.events.onInputDown.add(function () {
		// This happens either on local machine or on "trial" version of the game.
		if (typeof Routes === 'undefined' || Routes === null) {
			this.game.state.start(GLOBAL.STATE.scenario, true, false);
			return;
		}

		var t = new TimelineMax();
		t.addCallback(function () {
			disabler.visible = true;
		});/*
		if (this.game.player.water > this.game.player.maxWater - 3 && !sure) {
			t.addSound(agent.speech, agent, 'gardenWaterFirst');
			sure = true;
			var sub = EventSystem.subscribe(GLOBAL.EVENT.waterPlant, function () {
				sure = false;
				EventSystem.unsubscribe(sub);
			});
		} else {*/
			var scen = backend.getScenario();
			if (scen) {
				t.addSound(agent.speech, agent, 'letsGo');
				t.addCallback(function () {
					this.game.state.start(GLOBAL.STATE[scen.subgame], true, false, scen);
				}, null, null, this);
			}
		//}
		t.addCallback(function () {
			disabler.visible = false;
		});
	}, this);

	/* Setup the garden fields */
	var rows = 3;
	var columns = 8;
	var startPos = 200;
	var width = this.world.width/columns;
	var height = (this.world.height - startPos)/rows;
	var type, level, water, i;
	var fields = this.gardenData.fields;
	for (var row = 0; row < rows; row++) {
		for (var column = 0; column < columns; column++) {
			type = this.rnd.integerInRange(1, 9);
			level = 0;
			water = 0;

			for (i = 0; i < fields.length; i++) {
				if (fields[i].x === column &&
					fields[i].y === row) {
					/*jshint camelcase:false */
					type = fields[i].content_type || type;
					/*jshint camelcase:true */
					level = fields[i].level || level;
					break;
				}
			}

			this.world.add(new GardenPlant(this.game, column, row, column*width, startPos+row*height, width, height, type, level, water));
		}
	}

	/* Add the garden agent */
	var agent = this.game.player.createAgent();
	agent.scale.set(0.2);
	agent.x = -100;
	agent.y = startPos + height - agent.height/2;
	this.world.add(agent);
	var currentMove = null;

	/* Add the water can */
	this.world.add(new WaterCan(this.game));
	var firstWatering = true;

	/* Add disabler. */
	var disabler = new Cover(this.game, '#ffffff', 0);
	this.world.add(disabler);

	/* Add the menu */
	this.world.add(new Menu(this.game));


	/* Move agent when we push a plant. */
	var _this = this;
	EventSystem.subscribe(GLOBAL.EVENT.plantPress, function (plant) {
		var y = plant.y + plant.plantHeight - agent.height/2;
		var x = plant.x;
		// If this is changed: update the side variable in the waterPlant subscription.
		var side = -plant.width * 0.3;
		if (agent.x > x) {
			x += plant.width;
			side *= -1;
		}
		if (agent.x === x && agent.y === y ) {
			return;
		}

		if (currentMove) {
			currentMove.kill();
		}

		currentMove = new TimelineMax();
		var distance = agent.x - x;
		if (agent.y !== y) {
			if (agent.y % (plant.plantHeight - agent.height/2) < 10) {
				distance = 0;
				currentMove.add(agent.move({ x: x }, Math.abs((agent.x - x)/width)));
			}
			currentMove.add(agent.move({ y: y }, Math.abs((agent.y - y)/height)));
		}
		if (agent.x !== x + side || agent.y !== y) {
			currentMove.add(agent.move({ x: x + side }, Math.abs((distance + side)/width)));
		}
		currentMove.addSound(agent.speech, agent, 'ok' + _this.game.rnd.integerInRange(1, 2), 0);
	});

	/* Water plant when we push it. */
	EventSystem.subscribe(GLOBAL.EVENT.waterPlant, function (plant) {
		var t;
		if (_this.game.player.water > 0) {
			var side = ((plant.x + plant.width/3) <= agent.x) ? -1 : 1;
			t = agent.water(2, side);
			t.addCallback(function () {
				_this.game.player.water--;
				plant.water.value++;
				agent.say(agent.speech, 'gardenGrowing').play('gardenGrowing');
			}, 'watering');
			if (plant.water.left === 1 && plant.level.left === 1) {
				t.addSound(agent.speech, agent, 'gardenFullGrown');
			}
			if (firstWatering && _this.game.player.water > 1) {
				firstWatering = false;
				t.addSound(agent.speech, agent, 'gardenWaterLeft');
			}
		} else {
			t = new TimelineMax();
			t.addSound(agent.speech, agent, 'gardenEmptyCan');
		}

		t.addCallback(function () { disabler.visible = true; }, 0); // at start
		t.addCallback(function () {
			plant.waterButton.reset();
			disabler.visible = false;
		}); // at end

		if (currentMove && currentMove.progress() < 1) {
			currentMove.add(t);
		}
	});

	/* Check that backend accepts plant upgrade */
	EventSystem.subscribe(GLOBAL.EVENT.plantUpgrade, function (data) {
		/*jshint camelcase:false */
		if (data.remaining_water !== _this.game.player.water) {
			_this.game.player.water = data.remaining_water;
		}
		/*jshint camelcase:true */
	});

	/* When the state starts. */
	this.startGame = function () {
		var t = new TimelineMax().skippable();
		t.add(agent.move({ x: this.world.centerX }, 3));

		if (this.game.player.water > 0) {
			if (this.gardenData.fields.length > 0) {
				t.addSound(agent.speech, agent, 'gardenWhereNow');
			} else {
				t.addSound(agent.speech, agent, 'gardenHaveWater');
				t.addSound(agent.speech, agent, 'gardenPushField', '+=0.5');
			}
		} else {
			if (this.gardenData.fields.length > 0) {
				t.addSound(agent.speech, agent, 'gardenYoureBack');
			} else {
				var w = new WaterCan(this.game);
				w.visible = false;
				this.world.add(w);

				t.addSound(agent.speech, agent, 'gardenIntro');
				t.addLabel('myCan', '+=0.5');
				t.addCallback(function () {
					w.x = agent.x - w.width/4; // Since we scale to 0.5
					w.y = agent.y;
					w.scale.set(0);
					w.visible = true;
					agent.eyesFollowObject(w);
				});
				t.add(new TweenMax(w.scale, 1, { x: 0.5, y: 0.5, ease: Elastic.easeOut }), 'myCan');
				t.addSound(agent.speech, agent, 'gardenMyCan', 'myCan');
				t.add(new TweenMax(w.scale, 1, { x: 0, y: 0, ease: Elastic.easeOut, onComplete: w.destroy, onCompleteScope: w }));
			}
			t.addLabel('sign');
			t.add(agent.wave(1, 1));
			t.addCallback(agent.eyesFollowObject, 'sign', [sign], agent);
			t.addSound(agent.speech, agent, 'gardenSign', 'sign');
		}
		t.addCallback(function () {
			agent.eyesStopFollow();
			disabler.visible = false;
		}, null, null, this);
	};
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                              Garden objects                               */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

/**
 * A garden plant/field.
 * It will level up depending on how much you water it.
 * @param {number} column - The column position of the plant (for server).
 * @param {number} row - The row position of the plant (for server).
 * @param {number} x - X position.
 * @param {number} y - Y position.
 * @param {number} width - The width.
 * @param {number} height - The height.
 * @param {number} type - The type of plant.
 * @param {number} level - The level of the plant.
 * @param {number} water - The amount of water the plant has.
 */
GardenPlant.prototype = Object.create(Phaser.Group.prototype);
GardenPlant.prototype.constructor = GardenPlant;
function GardenPlant (game, column, row, x, y, width, height, type, level, water) {
	Phaser.Group.call(this, game, null); // Parent constructor.
	var _this = this;
	var maxLevel = 5;
	this.column = column;
	this.row = row;
	this.x = x;
	this.y = y;
	this.plantHeight = height;

	/* The pushable area of the field */
	var bmd = game.add.bitmapData(width, height);
	bmd.ctx.globalAlpha = 0;
	bmd.ctx.fillRect(0, 0, bmd.width, bmd.height);
	var trigger = this.create(0, 0, bmd);
	trigger.inputEnabled = true;
	trigger.events.onInputDown.add(this.down, this);

	if (level !== maxLevel) {
		var hl = game.add.bitmapData(width - 6, height * 0.6);
		hl.ctx.fillStyle = '#6b3e09';
		hl.ctx.globalAlpha = 0.2;
		hl.ctx.roundRect(0, 0, hl.width, hl.height, 10).fill();
		this.highlight = this.create(3, height * 0.4, hl);
	}

	this.type = type;
	var plant = null;

	this.water = new Counter(1, true, water);

	this.level = new Counter(maxLevel, false, level);
	this.level.onAdd = function (current, diff) {
		if (current <= 0) {
			if (plant) { plant.destroy(); }
			return;
		}

		var newPlant = _this.create(width/2, height/2, 'garden', 'plant' + _this.type + '-' + current);
		newPlant.anchor.set(0.5);
		newPlant.scale.set(0.5); // TODO: We should not scale this, use better graphics.

		if (diff > 0) {
			// Plant has leveled up by watering.
			newPlant.alpha = 0;

			/* Check that backend accepts plant upgrade */
			var ev = EventSystem.subscribe(GLOBAL.EVENT.plantUpgrade, function (data) {
				if (!data.success && data.field.x === _this.column && data.field.y === _this.row) {
					_this.level.value = data.field.level;
				}
				EventSystem.unsubscribe(ev);
			});

			/* Upgrade plant animation, ending with sending to backend. */
			TweenMax.to(newPlant, 2, {
				alpha: 1,
				onComplete: function () {
					_this.water.update();
					if (plant) { plant.destroy(); }
					plant = newPlant;

				/*jshint camelcase:false */
				backend.putUpgradePlant({ field: { x: column, y: row, level: this.value, content_type: type }});
				/*jshint camelcase:true */
				}
			});

		} else {
			// Could be: Setup of plant from constructor
			// Could be: Backend says that water is missing
			if (plant) { plant.destroy(); }
			plant = newPlant;
		}
	};
	this.level.update();

	return this;
}

/**
 * When pushing on a garden plant.
 * Publishes plantPress event.
 * Publishes waterPlant when waterButton is pushed.
 */
GardenPlant.prototype.down = function () {
	var _this = this; // Events do not have access to this

	/* If this plant is active, it means that it is already showing only publish plantPress */
	if (this.active) {
		EventSystem.publish(GLOBAL.EVENT.plantPress, [this]);
		return;
	}

	/* The interface for the plant is set up when needed. */
	if (!this.infoGroup) {
		var height = 100;
		this.infoGroup = this.game.add.group(this);
		this.infoGroup.x = 0;
		this.infoGroup.y = -height;
		this.infoGroup.visible = false;

		var bmd = this.game.add.bitmapData(this.width, height);
		bmd.ctx.fillStyle = '#ffffff';
		bmd.ctx.globalAlpha = 0.5;
		bmd.ctx.fillRect(0, 0, bmd.width, bmd.height);
		this.game.add.sprite(0, 0, bmd, null, this.infoGroup).inputEnabled = true;

		/* The button to push when adding water. */
		this.waterButton = new SpriteButton(this.game, 'objects', 'watering_can', {
			x: this.width/2 - (height - 20)/2,
			y: 10,
			size: height - 20,
			keepDown: true,
			onClick: function () {
				/* Water is added to the plant when animation runs. */
				EventSystem.publish(GLOBAL.EVENT.waterPlant, [_this]);
			}
		});
		this.waterButton.sprite.tint = 0xbb3333;
		this.infoGroup.add(this.waterButton);

		/* Water management */
		var maxLevel = function () {
			_this.waterButton.destroy();
			_this.highlight.destroy();
			_this.game.add.text(_this.width/2, height/2, LANG.TEXT.maxLevel, {
				font: '40pt ' +  GLOBAL.FONT,
				fill: '#5555ff'
			}, _this.infoGroup).anchor.set(0.5);
		};

		/* Check if this plant can be upgraded more. */
		if (this.level.left > 0) {
			this.water.onMax = function () {
				_this.level.value++;
				if (_this.level.value === _this.level.max) {
					_this.water.onMax = null;
					maxLevel();
				}
			};
			this.water.update();
		} else {
			maxLevel();
		}
	}


	util.fade(this.infoGroup, true, 0.2);

	/* Publish plantPress to hide other possible active plant interfaces. */
	EventSystem.publish(GLOBAL.EVENT.plantPress, [this]);

	/* Subscribe to plantPress to hide this plant interface when applicable. */
	this.active = EventSystem.subscribe(GLOBAL.EVENT.plantPress, function () {
		_this.waterButton.reset();
		_this.hide();
	});
};

/**
 * Hide the plant interface
 */
GardenPlant.prototype.hide = function () {
	EventSystem.unsubscribe(this.active);
	this.active = null;
	util.fade(this.infoGroup, false, 0.2);
};
},{"../backend.js":6,"../global.js":8,"../language.js":9,"../objects/Counter.js":12,"../objects/Cover.js":13,"../objects/Menu.js":17,"../objects/WaterCan.js":21,"../objects/buttons/SpriteButton.js":25,"../pubsub.js":34,"../utils.js":48,"./SuperState.js":41}],41:[function(require,module,exports){
var GLOBAL = require('../global.js');
var LANG = require('../language.js');
var EventSystem = require('../pubsub.js');
var GeneralButton = require('../objects/buttons/GeneralButton.js');
var DraggableObjects = require('../objects/DraggableObject');

module.exports = SuperState;

/**
 * The boot state will load the first parts of the game and common game assets.
 * Add assets that will be used by many states.
 * NOTE: Do not overshadow the update function! Use 'run' instead.
 */
function SuperState () {}

/**
 * Update will trigger after create. But sounds might not be decoded yet, so we wait for that.
 * NOTE: Do not overshadow the update function! Use 'run' instead.
 */
SuperState.prototype.update = function () {
	this.state.onUpdateCallback = function () {};

	var keys = [], key;
	for (var i = 0; i < this.sound._sounds.length; i++) {
		key = this.sound._sounds[i].key;
		if (keys.indexOf(key) < 0 && this.cache._sounds[key]) {
			this.sound.decode(key); // Make sure that decoding has begun.
			keys.push(key);
		}
	}

	document.querySelector('.loading').style.display = 'block';
	document.querySelector('.progress').innerHTML = LANG.TEXT.decoding;

	this.sound.setDecodedCallback(keys, this._soundsDecoded, this);
};

/** This function runs when all sounds have been decoded. */
SuperState.prototype._soundsDecoded = function () {
	document.querySelector('.loading').style.display = 'none';

	if (this.startGame) {
		this.startGame();
	}

	this.state.onUpdateCallback = this.run;
};

/**
 * Overshadow this function for use of the update loop.
 * This will be set when all sounds have been decoded.
 */
SuperState.prototype.run = function () {};

/**
 * Utility function: Call this upon state shutdown.
 * Publishes stateShutDown event.
 */
SuperState.prototype.shutdown = function () {
	TweenMax.killAll();
	EventSystem.publish(GLOBAL.EVENT.stateShutDown, this);
	EventSystem.clear();
	GeneralButton.prototype.buttonColor = GLOBAL.BUTTON_COLOR;
	DraggableObjects.prototype.buttonColor = GLOBAL.BUTTON_COLOR;

	// Purge sound
	var key = this.sound._sounds.length;
	while (key--) {
		this.sound._sounds[key].destroy(true);
	}
	// Purge sound from cache as well
	for (key in this.cache._sounds) {
		if (this.sound._doNotDelete.indexOf(key) < 0) {
			this.cache.removeSound(key);
		}
	}
	// Purge all "this" variables.
	for (key in this) {
		if (GLOBAL.STATE_KEYS.indexOf(key) < 0) {
			if (this[key] && this[key].destroy) {
				try {
					this[key].destroy(true);
				}
				catch (e) {
					// Don't care about errors here.
					// console.log(e);
				}
			}
			delete this[key];
		}
	}
	this.world.removeAll(true);
};
},{"../global.js":8,"../language.js":9,"../objects/DraggableObject":14,"../objects/buttons/GeneralButton.js":23,"../pubsub.js":34}],42:[function(require,module,exports){
var Character = require('../../agent/Character.js');

module.exports = BeeFlightBee;

/* Humfrid, the bee you are helping. */
BeeFlightBee.prototype = Object.create(Character.prototype);
BeeFlightBee.prototype.constructor = BeeFlightBee;
function BeeFlightBee (game, x, y) {
	Character.call(this, game); // Parent constructor.
	this.turn = true;
	this.x = x || 0;
	this.y = y || 0;

	this.body = this.create(0, 0, 'bee', 'body');
	this.body.anchor.set(0.5);
	this.mouth = this.create(50, 35, 'bee', 'mouth_happy');
	this.mouth.anchor.set(0.5);
	this.wings = this.create(-25, -43, 'bee', 'wings1');
	this.wings.anchor.set(0.5);

	this.talk = TweenMax.to(this.mouth, 0.2, {
		frame: this.mouth.frame+1, roundProps: 'frame', ease: Power0.easeInOut, repeat: -1, yoyo: true, paused: true
	});

	this._flap = TweenMax.to(this.wings, 0.1, {
		frame: this.wings.frame+1, roundProps: 'frame', ease: Power0.easeInOut, repeat: -1, yoyo: true, paused: true
	});
	this.wings.frameName = 'wings0';
}

BeeFlightBee.prototype.flap = function (on) {
	if (on) {
		if (this._flap.paused()) {
			this.wings.frameName = 'wings1';
			this._flap.restart(0);
		}
	} else {
		this._flap.pause(0);
		this.wings.frameName = 'wings0';
	}
};
},{"../../agent/Character.js":2}],43:[function(require,module,exports){
var BeeFlightBee = require('./BeeFlightBee.js');
var NumberGame = require('./NumberGame.js');
var GLOBAL = require('../../global.js');
var LANG = require('../../language.js');
var util = require('../../utils.js');

module.exports = BeeFlightGame;

/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                             Bee Flight game
/* Methods:         All
/* Representations: All, except "none".
/* Range:           1--4, 1--9
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
BeeFlightGame.prototype = Object.create(NumberGame.prototype);
BeeFlightGame.prototype.constructor = BeeFlightGame;
function BeeFlightGame () {
	NumberGame.call(this); // Call parent constructor.
}

BeeFlightGame.prototype.pos = {
	flowers: {
		start: 325, stopOffset: 0
	},
	home: {
		x: 110, y: 700
	},
	bee: {
		x: 120, y: 300,
		homeScale: 0.3,
		airScale: 0.8,
		flowerScale: 0.6
	},
	agent: {
		start: { x: 1200, y: 400 },
		stop: { x: 777, y: 360 },
		scale: 0.35
	}
};

BeeFlightGame.prototype.buttonColor = 0xface3d;

/* Phaser state function */
BeeFlightGame.prototype.preload = function () {
	this.load.audio('beeSpeech', LANG.SPEECH.beeflight.speech); // speech sheet
	this.load.audio('beeMusic', ['audio/subgames/beeflight/music.m4a', 'audio/subgames/beeflight/music.ogg', 'audio/subgames/beeflight/music.mp3']);
	this.load.atlasJSONHash('bee', 'img/subgames/beeflight/atlas.png', 'img/subgames/beeflight/atlas.json');
};

/* Phaser state function */
BeeFlightGame.prototype.create = function () {
	// Setup additional game objects on top of NumberGame.init
	this.setupButtons({
		buttons: {
			x: 150,
			y: 25,
			size: this.world.width - 300
		},
		yesnos: {
			x: 150,
			y: 25,
			size: this.world.width - 300
		}
	});

	// Add music, sounds and speech
	this.speech = util.createAudioSheet('beeSpeech', LANG.SPEECH.beeflight.markers);
	this.add.music('beeMusic', 0.1, true).play();

	// Add background
	this.add.sprite(0, 0, 'bee', 'bg', this.gameGroup);
	var cloud1 = this.gameGroup.create(-1000, 10, 'objects', 'cloud2');
	var cloud2 = this.gameGroup.create(-1000, 150, 'objects', 'cloud1');
	TweenMax.fromTo(cloud1, 380, { x: -cloud1.width }, { x: this.world.width, repeat: -1 });
	TweenMax.fromTo(cloud2, 290, { x: -cloud2.width }, { x: this.world.width, repeat: -1 });
	var home = this.add.sprite(this.pos.home.x, this.pos.home.y, 'bee', 'home', this.gameGroup);
	home.anchor.set(0.5, 1);
	this.agent.thought.y += 100;
	this.gameGroup.bringToTop(this.agent);

	// Setup flowers
	var size = this.world.width - this.pos.flowers.stopOffset - this.pos.flowers.start;
	var width = size / this.amount;
	var yPos = 550;
	this.flowers = [];
	var i, v, c;
	for (i = 0; i < this.amount; i++) {
		this.flowers.push(this.add.sprite(this.pos.flowers.start + width*i, yPos, 'bee', 'flower', this.gameGroup));
		this.flowers[i].anchor.set(0.5, 0);

		// Calculate tint
		v = this.rnd.integerInRange(150, 230);
		c = this.rnd.integerInRange(1, 3);
		this.flowers[i].tint = Phaser.Color.getColor(c === 1 ? v : 255, c === 2 ? v : 255, c === 3 ? v : 255);
	}

	// Setup bee
	this.bee = new BeeFlightBee(this.game, this.pos.home.x, this.pos.home.y);
	this.bee.scale.set(this.pos.bee.homeScale);
	if (this.method === GLOBAL.METHOD.additionSubtraction) {
		this.bee.addThought(170, -75, this.representation[0], true);
		this.bee.thought.toScale = 0.7;
	}
	this.gameGroup.add(this.bee);


	// Add Timeline/Tween functions
	var _this = this;
	this.bee.moveTo = {
		home: function (duration) {
			var t = new TimelineMax();
			t.addCallback(_this.bee.flap, null, [true], _this.bee);
			t.add(_this.bee.move(_this.pos.home, duration || 5, _this.pos.bee.homeScale));
			t.addCallback(_this.bee.flap, null, [false], _this.bee);
			return t;
		},
		start: function () {
			var t = new TimelineMax();
			t.addCallback(_this.bee.flap, null, [true], _this.bee);
			t.add(_this.bee.move(_this.pos.bee, 2, _this.pos.bee.airScale));
			return t;
		},
		flower: function (target, direct) {
			var t = new TimelineMax();
			t.addCallback(_this.bee.flap, null, [true], _this.bee);
			if (_this.bee.y > 300) {
				t.add(_this.bee.move({ y: _this.pos.bee.y }, 1));
			}

			var flow = _this.flowers[target - 1];
			if (this.atValue !== target) {
				if (direct) {
					t.add(_this.bee.move({ x: flow.x }, 2));
				} else {
					var dir = target < _this.atValue ? -1 : 1;
					var i = _this.atValue + dir;
					while (i !== target + dir) {
						t.add(_this.bee.move({ x: _this.flowers[i - 1].x }, 1));
						t.addSound(_this.speech, _this.bee, 'number' + i, '-=0.5');
						i += dir;
					}
				}
			}

			t.add(_this.bee.move({ y: flow.y }, 0.75, _this.pos.bee.flowerScale));
			t.addCallback(_this.bee.flap, null, [false], _this.bee);
			return t;
		}
	};
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                           Instruction functions                           */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
BeeFlightGame.prototype.instructionCount = function () {
	var t = new TimelineMax();
	t.addSound(this.speech, this.bee, 'showTheWay');
	t.addSound(this.speech, this.bee, 'decideHowFar', '+=0.8');
	t.add(this.pointAtFlowers(this.currentNumber));
	t.addLabel('useButtons');
	t.addLabel('flashButtons', '+=0.5');
	t.addSound(this.speech, this.bee, 'pushNumber', 'useButtons');
	t.add(util.fade(this.buttons, true), 'useButtons');
	t.addCallback(this.buttons.highlight, 'flashButtons', [1], this.buttons);
	return t;
};

BeeFlightGame.prototype.instructionSteps = BeeFlightGame.prototype.instructionCount;

BeeFlightGame.prototype.instructionAdd = function () {
	var t = new TimelineMax();
	t.addSound(this.speech, this.bee, 'wrongPlace');
	t.addSound(this.speech, this.bee, 'notFarEnough', '+=0.8');
	t.addSound(this.speech, this.bee, 'howMuchMore');
	// t.add(this.pointAtFlowers(this.currentNumber));
	t.addLabel('useButtons', '+=0.3');
	t.addLabel('flashButtons', '+=0.8');
	t.addSound(this.speech, this.bee, 'pushNumber', 'useButtons');
	t.add(util.fade(this.buttons, true), 'useButtons');
	t.addCallback(this.buttons.highlight, 'flashButtons', [1], this.buttons);
	return t;
};

BeeFlightGame.prototype.instructionSubtract = function () {
	var t = new TimelineMax();
	t.addSound(this.speech, this.bee, 'goneTooFar');
	t.addSound(this.speech, this.bee, 'mustGoBack');
	// t.add(this.pointAtFlowers(this.currentNumber));
	t.addLabel('useButtons', '+=0.3');
	t.addLabel('flashButtons', '+=0.8');
	t.addSound(this.speech, this.bee, 'pushNumber', 'useButtons');
	t.add(util.fade(this.buttons, true), 'useButtons');
	t.addCallback(this.buttons.highlight, 'flashButtons', [1], this.buttons);
	return t;
};

BeeFlightGame.prototype.instructionAddSubtract = function () {
	var t = new TimelineMax();
	t.addLabel('useButtons');
	t.addLabel('flashButtons', '+=0.5');
	t.addSound(this.speech, this.bee, 'useButtons', 'useButtons');
	t.add(util.fade(this.buttons, true), 'useButtons');
	t.addCallback(this.buttons.highlight, 'flashButtons', [1], this.buttons);
	return t;
};

BeeFlightGame.prototype.pointAtFlowers = function (number) {
	var startY = this.pos.bee.y;
	var arrow = this.gameGroup.create(this.flowers[0].x, startY, 'objects', 'arrow');
	arrow.tint = 0xf0f000;
	arrow.anchor.set(0, 0.5);
	arrow.rotation = -Math.PI/2;
	arrow.visible = false;

	var t = new TimelineMax();
	t.addCallback(function () { arrow.visible = true; });
	t.addCallback(function () {}, '+=0.5');
	for (var i = 0; i < number; i++) {
		if (i !== 0) {
			t.add(new TweenMax(arrow, 0.75, { x: this.flowers[i].x, y: startY }), '+=0.3');
		}
		t.add(new TweenMax(arrow, 1, { y: this.flowers[i].y }));
	}
	t.addCallback(function () { arrow.destroy(); }, '+=0.5');
	return t;
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                           Start round functions                           */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
BeeFlightGame.prototype.newFlower = function (silent) {
	var t = new TimelineMax();
	t.addCallback(this.openFlower, null, [this.currentNumber], this);

	this.doStartFunction(t, silent);
	return t;
};

BeeFlightGame.prototype.openFlower = function (number) {
	this.flowers[number - 1].frameName = 'flower' + number;
};

BeeFlightGame.prototype.startStop = function () {
	// Do nothing
};

BeeFlightGame.prototype.startBelow = function (t, silent) {
	t.add(this.runNumber(this.rnd.integerInRange(1, this.currentNumber - 1), true));
	if (!silent) {
		t.addSound(this.speech, this.bee, this.rnd.pick(['notFarEnough', 'howMuchMore']));
	}
};

BeeFlightGame.prototype.startAbove = function (t, silent) {
	t.add(this.runNumber(this.rnd.integerInRange(this.currentNumber + 1, this.amount), true));
	if (!silent) {
		t.addSound(this.speech, this.bee, this.rnd.pick(['goneTooFar', 'mustGoBack']));
	}
};

BeeFlightGame.prototype.startThink = function (t) {
	var addTo = this.rnd.integerInRange(1, this.amount);
	t.addCallback(function () {
		this.addToNumber = addTo;
		this.bee.thought.guess.number = this.addToNumber;
	}, null, null, this);
	t.addSound(this.speech, this.bee, 'thinkItIs');
	t.addLabel('number', '+=0.3');
	t.add(this.bee.think());
	t.addSound(this.speech, this.bee, 'number' + addTo, 'number');
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                    Number chosen and return functions                     */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
BeeFlightGame.prototype.runNumber = function (number, simulate) {
	var current = this.currentNumber-1;
	var sum = number + this.addToNumber;
	var result = simulate ? sum - this.currentNumber : this.tryNumber(number, this.addToNumber);

	this.disable(true);
	this.agent.eyesFollowObject(this.bee);
	if (this.bee.thought) {
		this.bee.thought.visible = false;
	}

	var t = new TimelineMax();
	if (GLOBAL.debug) { t.skippable(); }

	if (!simulate) {
		if (number !== 0) {
			var moving = Math.abs(number);
			if (this.isRelative) {
				t.addSound(this.speech, this.bee, moving === 1 ? 'one' : 'number' + moving);
				t.addSound(this.speech, this.bee, number > 0 ? 'forward' : 'backward');
			} else {
				t.addSound(this.speech, this.bee, 'order' + moving);
				t.addSound(this.speech, this.bee, 'flower');
			}
			t.addCallback(function () {}, '+=0.5'); // Pause until next sound.
		}
		t.addSound(this.speech, this.bee, 'letsGo');
	}

	t.add(this.bee.moveTo.flower(sum));
	
	/* Correct :) */
	if (!result) {
		t.addCallback(function () {
			this.hideButtons();
			this.flowers[current].frameName = 'flower';
			this.agent.setHappy();
		}, null, null, this);
		t.addSound(this.speech, this.bee, this.rnd.pick(['slurp', 'nectar1', 'nectar2']));
		t.addLabel('goingHome', '+=0.5');

		if (this._totalCorrect === 1) {
			// Only say "going back" first time.
			t.addSound(this.speech, this.bee, 'goingBack', 'goingHome');
			t.add(this.bee.moveTo.home(), 'goingHome');
		} else {
			t.add(this.bee.moveTo.home(2), 'goingHome');
		}
		t.add(this.bee.moveTo.start());
		this.atValue = 0;

	/* Incorrect :( */
	} else {
		t.addCallback(this.agent.setSad, null, null, this.agent);
		this.doReturnFunction(t, sum, result, simulate);
	}

	t.addCallback(this.agent.setNeutral, null, null, this.agent);
	t.addCallback(this.updateRelative, null, null, this);
	return t;
};

BeeFlightGame.prototype.returnToStart = function (t) {
	this.atValue = 0;
	t.addSound(this.speech, this.bee, 'noNectar');
	t.add(this.bee.moveTo.start());
	t.add(this.bee.moveTurn(1));
};

BeeFlightGame.prototype.returnNone = function (t, number, notUsed, silent) {
	this.atValue = number;
	if (!silent) {
		t.addSound(this.speech, this.bee, 'noNectar');
	}
};

BeeFlightGame.prototype.returnToPreviousIfHigher = function (t, number, diff, silent) {
	if (diff > 0) {
		t.addSound(this.speech, this.bee, 'tooFar');
		t.addSound(this.speech, this.bee, 'wasBefore');
		t.add(this.bee.moveTo.flower(this.atValue, true));
	} else {
		this.returnNone(t, number, diff, silent);
	}
};

BeeFlightGame.prototype.returnToPreviousIfLower = function (t, number, diff, silent) {
	if (diff < 0) {
		t.addSound(this.speech, this.bee, 'tooNear');
		t.addSound(this.speech, this.bee, 'wasBefore');
		t.add(this.bee.moveTo.flower(this.atValue, true));
	} else {
		this.returnNone(t, number, diff, silent);
	}
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                 Overshadowing Subgame mode functions                      */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/
BeeFlightGame.prototype.modeIntro = function () {
	var t = new TimelineMax().skippable();
	t.addSound(this.speech, this.bee, 'badSight');
	t.addLabel('gotoStart', '+=0.5');
	t.add(this.bee.moveTo.start(), 'gotoStart');
	t.addSound(this.speech, this.bee, 'howToFind', 'gotoStart');
	t.addCallback(this.nextRound, null, null, this);
};

BeeFlightGame.prototype.modePlayerDo = function (intro, tries) {
	if (tries > 0) {
		this.showNumbers();
	} else { // if intro or first try
		var t = new TimelineMax();
		if (intro) {
			t.skippable();

			if (this.instructions) {
				t.add(this.newFlower(true));
				t.addCallback(this.updateButtons, null, null, this);
				t.add(this.doInstructions());
			} else {
				t.add(this.newFlower());
			}
		} else {
			t.addSound(this.speech, this.bee, 'getMore');
			t.add(this.newFlower());
		}
		t.addCallback(this.showNumbers, null, null, this);
	}
};

BeeFlightGame.prototype.modePlayerShow = function (intro, tries) {
	if (tries > 0) {
		this.showNumbers();
	} else { // if intro or first try
		var t = new TimelineMax();
		if (intro) {
			t.skippable();
			t.add(this.agent.moveTo.start());
			t.addSound(this.agent.speech, this.agent, 'beeIntro1');
			t.addLabel('agentIntro', '+=0.5');
			t.add(this.agent.wave(3, 1), 'agentIntro');
			t.addSound(this.agent.speech, this.agent, 'beeIntro2', 'agentIntro');
			t.addCallback(this.agent.eyesFollowObject, 'agentIntro', [this.bee], this.agent);
			t.addSound(this.speech, this.bee, 'gettingHelp', '+=0.2');
			t.addSound(this.agent.speech, this.agent, 'beeIntro3', '+=0.2');
			t.addSound(this.speech, this.bee, 'youHelpLater', '+=0.2');
		}
		t.add(this.newFlower());
		t.addCallback(this.showNumbers, null, null, this);
	}
};

BeeFlightGame.prototype.modeAgentTry = function (intro, tries) {
	var t = new TimelineMax();
	if (tries > 0) {
		t.addSound(this.agent.speech, this.agent, 'tryAgain');
	} else { // if intro or first try
		if (intro) {
			t.skippable();
			t.add(this.agent.moveTo.start()); // Agent should be here already.
			t.addSound(this.agent.speech, this.agent, 'myTurn' + this.rnd.integerInRange(1, 2));
		}
		t.add(this.newFlower());
	}

	t.add(this.agentGuess(), '+=0.3');
	if (intro && this.instructionsAgent) {
		t.add(this.instructionYesNo(), '+=0.5');
	}
	t.addCallback(this.showYesnos, null, null, this);
};

BeeFlightGame.prototype.modeOutro = function () {
	this.agent.thought.visible = false;

	var t = new TimelineMax().skippable();
	t.addLabel('water1', '+=1.0');
	t.addLabel('water2', '+=2.5');
	t.addLabel('water3', '+=4');
	t.addSound(this.speech, this.bee, 'thatsAll', 0);
	t.addCallback(this.agent.setHappy, 'water1', null, this.agent);
	t.add(this.agent.fistPump(), 'water1');

	var i, number, flower, opened = [];
	for (i = 1; i <= 3; i++) {
		do {
			number = this.rnd.integerInRange(1, this.amount);
			console.log(number, opened);
		} while (opened.indexOf(number) >= 0);
		opened.push(number);
		flower = this.flowers[number - 1];
		t.addCallback(this.openFlower, 'water' + i, [number], this);
		t.add(this.addWater(flower.x, flower.y + 10), 'water' + i);
	}
	t.addLabel('letsDance');
	t.add(this.bee.moveTo.home(), 'letsDance');
	t.addSound(this.speech, this.bee, 'dancing', 'letsDance');
	t.addCallback(this.nextRound, null, null, this);
};
},{"../../global.js":8,"../../language.js":9,"../../utils.js":48,"./BeeFlightBee.js":42,"./NumberGame.js":44}],44:[function(require,module,exports){
var Subgame = require('./Subgame.js');
var GLOBAL = require('../../global.js');
var EventSystem = require('../../pubsub.js');
var util = require('../../utils.js');
var ButtonPanel = require('../../objects/buttons/ButtonPanel.js');
var GeneralButton = require('../../objects/buttons/GeneralButton.js');
var TextButton = require('../../objects/buttons/TextButton.js');
var DraggableObject = require('../../objects/DraggableObject.js');
var ObjectPanel = require('../../objects/ObjectPanel');


module.exports = NumberGame;

/**
 * A superclass for games where you need to guess the correct number.
 * This class will set the .doInstructions, .doStartFunction and .doReturnFunction.
 * They will map to the functions that you should setup (see _setupFunctions).
 * See BeeFlightGame for inspiration of how you can use this class.
 *
 *
 * SETUP THESE IN THE SUBCLASS:
 * "this" object should have a property used when setting agent start position:
 *    this.pos: { agent: { start: { x, y }, scale: z } } }.
 *
 * NEVER DO ANY LOGICAL CHANGES IN THE INSTRUCTIONS!
 * instructionCount:       Method count.
 * instructionSteps:       Method incremental-steps.
 * instructionAdd:         Method addition.
 * instructionSubtract:    Method subtraction.
 * instructionAddSubtract: Method addition subtraction.
 *
 * startStop:  When round start without automatic "guessing". Used in count and incremental-steps method.
 * startBelow: When round start by guessing lower than target. Used in addition method.
 * startAbove: When round start by guessing higher than target. Used in subtraction method.
 * startThink: When round start by guessing something. Used in add/subt method.
 *
 * runNumber:  The function to run when a number has been chosen.
 *
 * returnToStart:            When returning to the start position on incorrect answer.
 * returnNone:               When the game stays at the incorrect answer position.
 * returnToPreviousIfHigher: When returning to previous value if the incorrect answer was too high.
 * returnToPreviousIfLower:  When returning to previous value if the incorrect answer was too low.
 *
 *
 * VARIABLES THE SUBCLASS CAN USE:
 * Number amount:        this.amount
 * Representation:       this.representation
 * The method:           this.method
 * The number to answer: this.currentNumber (updates automatically)
 *
 * FUNCTIONS THE SUBCLASS CAN USE:
 * Try a number: this.tryNumber(number) - when testing a guess against this.currentNumber
 *
 *
 * Typical game flow:
 * // the first mode, this.modeIntro, will be called automatically when assets are loaded and decoded.
 * this.nextRound();    // start next round (will automatically start next mode)
 * this.disable(false); // make it possible to interact with anything
 * this.tryNumber(x);   // try a number against the current one
 * this.nextRound();    // do this regardless if right or wrong,
 *                      // it takes care of mode switching and function calls for you
 * // Repeat last two functions until game is over.
 */
NumberGame.prototype = Object.create(Subgame.prototype);
NumberGame.prototype.constructor = NumberGame;
function NumberGame () {
	Subgame.call(this); // Call parent constructor.
}

/* 
 * Phaser state function.
 * Publishes subgameStarted event.
 */
NumberGame.prototype.init = function (options) {
	Subgame.prototype.init.call(this, options);
	GeneralButton.prototype.buttonColor = this.buttonColor || GLOBAL.BUTTON_COLOR;
	DraggableObject.prototype.objectColor = this.objectColor || GLOBAL.BUTTON_COLOR;

	/* Public variables */
	//No need for different methods in MI, the methods system should be removed in the future at the moment set to one staticly
	this.method = GLOBAL.METHOD.addition;
	this.representation = options.representation;
	this.amount = 4; //Always wants 4 cookies in teh sharkGame

	/* The current number to answer */
	this.currentNumber = null;
	/* Stores the offset of the last try, can be used to judge last try */
	/* Ex: -1 means that last try was one less than currentNumber */
	this.lastTry = 0;
	/* This should be used to save the current position. */
	this.atValue = 0;
	/* This is used to add to the number of the button pushes. */
	/* This should be modified only when isRelative is set to true. */
	this.addToNumber = 0;

	// Setup gameplay differently depending on situation.
	this.isRelative = false;
	this._setupFunctions();

	/* Numbers for randomisation. */
	this._weighted = this.amount > 4 && this.method === GLOBAL.METHOD.count;
	this._numberMin = 1;
	this._numberMax = 9;
	if (this.method === GLOBAL.METHOD.addition) {
		this._numberMin++;
	}
	if (this.method === GLOBAL.METHOD.subtraction) {
		this._numberMax--;
	}

	// Agent is added to the game in the superclass, but we set it up here.
	this.agent.x = this.pos.agent.start.x;
	this.agent.y = this.pos.agent.start.y;
	this.agent.scale.set(this.pos.agent.scale);
	this.agent.visible = true;
	this.agent.addThought(this.representation[0], this.pos.agent.mirror || false);
	this.saidAgentWrong = false;

	var _this = this;
	this.agent.moveTo = {
		start: function () {
			if (_this.agent.x === _this.pos.agent.stop.x &&
				_this.agent.y === _this.pos.agent.stop.y) {
				return new TweenMax(_this.agent);
			}
			return _this.agent.move({ x: _this.pos.agent.stop.x, y: _this.pos.agent.stop.y }, 3);
		}
	};

	// Setup help button with correct instruction functions.
	this.helpButton = new TextButton(this.game, '?', {
		x: 75, y: 5, size: 56, fontSize: 30,
		color: GLOBAL.BUTTON_COLOR,
		doNotAdapt: true,
		onClick: function () {
			_this.disable(true);
			var t;
			if (_this.currentMode === GLOBAL.MODE.agentTry && !_this.saidAgentWrong) {
				t = _this.instructionYesNo();
			} else {
				t = _this.doInstructions();
			}
			t.addCallback(_this.disable, null, [false], true);
			t.skippable();
		}
	});
	this.helpButton.visible = false;
	this.hudGroup.add(this.helpButton);
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                            Private functions                              */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

/**
 * Setup start and return functions.
 * Will map to the functions the subclass should overshadow (see bottom of this class).
 * The .doStartFunction is an easy way to call the appropriate start function.
 * The .doReturnFunction is an wasy way to call the appropriate return function when answer is incorrect.
 */
NumberGame.prototype._setupFunctions = function () {
	if (this.method === GLOBAL.METHOD.count) {
		this.doInstructions = this.instructionCount;
		this.doStartFunction = this.startStop;
		this.doReturnFunction = this.returnToStart;
	} else if (this.method === GLOBAL.METHOD.incrementalSteps) {
		this.doInstructions = this.instructionSteps;
		this.doStartFunction = this.startStop;
		this.doReturnFunction = this.returnNone;
	} else if (this.method === GLOBAL.METHOD.addition) {
		this.doInstructions = this.instructionAdd;
		this.doStartFunction = this.startBelow;
		this.doReturnFunction = this.returnToPreviousIfHigher;
		this.isRelative = true;
	} else if (this.method === GLOBAL.METHOD.subtraction) {
		this.doInstructions = this.instructionSubtract;
		this.doStartFunction = this.startAbove;
		this.doReturnFunction = this.returnToPreviousIfLower;
		this.isRelative = true;
	} else {
		this.doInstructions = this.instructionAddSubtract;
		this.doStartFunction = this.startThink;
		this.doReturnFunction = this.returnNone;
		this.isRelative = true;
	}
};

/** Change this.currentNumber to a new one (resets the tries). */
// TODO: Should we allow the same number again?
NumberGame.prototype._nextNumber = function () {
	// Weighted randomisation if applicable
	if (this._weighted && this.rnd.frac() < 0.2) {
		this.currentNumber = this.rnd.integerInRange(5, this._numberMax);
	} else {
		this.currentNumber = this.rnd.integerInRange(this._numberMin, this._numberMax);
	}
};

NumberGame.prototype._getRange = function () {
	if (this.method === GLOBAL.METHOD.addition) {
		return { min: 1, max: this.amount - this.addToNumber };
	} else if (this.method === GLOBAL.METHOD.subtraction) {
		return { min: 1 - this.addToNumber, max: -1 };
	} else if (this.method === GLOBAL.METHOD.additionSubtraction) {
		return { min: 1 - this.addToNumber, max: this.amount - this.addToNumber };
	} else {
		return { min: 1, max: this.amount };
	}
};

/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                            Public functions                               */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

/**
 * Try a number against this.currentNumber.
 * The offset of the last try is stored in this.lastTry.
 * Publishes tryNumber event.
 * @param {number} The number to try.
 * @param {number} The offset to the number (example if you start at 2).
 * @return {boolean} The offset of the last try (0 is correct, -x is too low, +x is too high).
 */
NumberGame.prototype.tryNumber = function (number, offset) {
	var sum = number + (offset || 0);
	this.lastTry = sum - this.currentNumber;
	EventSystem.publish(GLOBAL.EVENT.tryNumber, [sum, this.currentNumber, number, offset]);
	DraggableObject.prototype.setTry.call(this, this.lastTry); //Send the last try offset to draggable object for the visual feedback
	this._currentTries++;
	this._totalTries++;
	if (!this.lastTry) {
		this._counter.value++; // This will trigger next mode if we loop.
		this._nextNumber();
		this._totalCorrect++;
		this._currentTries = 0;
	}
	return this.lastTry;
};

/** Have the agent guess a number. */
NumberGame.prototype.agentGuess = function () {
	var t = new TimelineMax();
	t.addCallback(function () {
		this.agent.guessNumber(this.currentNumber - (this.isRelative ? this.addToNumber : 0), this._numberMin, this._numberMax);
	}, 0, null, this);
	t.add(this.agent.think());
	return t;
};

/**
 * Setup HUD buttons.
 * @param {Object} options - The options for the buttons
 *                           Supply like this: { buttons: {...}, yesnos: {...} }.
 *                           NOTE: .method and .onClick will be set in this function.
 */
NumberGame.prototype.setupButtons = function (options) {
	var _this = this;
	if (options.buttons) {
		options.buttons.method = this.method;
		options.buttons.onClick = function (number) { _this.pushNumber(number); };
		this.buttons = new ButtonPanel(this.game, this.amount, this.representation, options.buttons);
		this.buttons.visible = false;
		this.hudGroup.add(this.buttons);
	}

	if (options.yesnos) {
		options.yesnos.onClick = function (value) { _this.pushYesNo(value); };
		this.yesnos = new ButtonPanel(this.game, 2, GLOBAL.NUMBER_REPRESENTATION.yesno, options.yesnos);
		this.yesnos.visible = false;
		this.hudGroup.add(this.yesnos);
	}
};

/**
 * Setup drag and goal objects.
 * created in the same way as the buttons
 */
NumberGame.prototype.setUpDragObject = function(options){
	var _this = this;
	if(options.dragObject){
		options.dragObject.onClick = function (number) {_this.pushNumber(number);};
		this.dragObject = new ObjectPanel(this.game,this.amount, options.dragObject);
		this.dragObject.visible = false;
		this.hudGroup.add(this.dragObject);
	}

	if(options.goalObject){
		this.goalObject = new ObjectPanel(this.game,this.amount, options.goalObject);
		this.goalObject.visible = false;
		this.hudGroup.add(this.goalObject);
	}
	if(options.finalDragObject){
		options.finalDragObject.onClick = function(){_this.moveObject();};
		this.finalDragObject = new ObjectPanel(this.game, this.amount, options.finalDragObject);
		this.finalDragObject.visible = false;
		this.hudGroup.add(this.finalDragObject);
	}
};

/* Function to trigger when a button or object in the number panel is pushed/dropped.
 * if you want to trigger nextRound call it from within run Number*/
NumberGame.prototype.pushNumber = function (number) {
	this.saidAgentWrong = false;
	return this.runNumber(number);

};

/* Function triggered when a finalDragObject is drooped on the correct position*/
NumberGame.prototype.moveObject = function(){
	this.hideWinObject();
	return this.win().addCallback(this.nextRound, null, null, this);

};

/* Function to trigger when a button in the yes-no panel is pushed. */
NumberGame.prototype.pushYesNo = function (value) {
	if (!value) {
		this.saidAgentWrong = true;
		if (this.speech) {
			this.agent.say(this.agent.speech, 'wrongShow').play('wrongShow');
		}
		this.showNumbers();
	} else {
		this.yesButton = true;
		this.pushNumber(this.agent.lastGuess);
	}
};

/*Shows the drag object on win hides the goalObject*/
NumberGame.prototype.showWinObject = function(){
	this.disable(false);

	if(this.finalDragObject) {
		util.fade(this.finalDragObject, true);
	}
	if (this.dragObject) {
		util.fade(this.dragObject, false);
	}
	if (this.goalObject) {
		util.fade(this.goalObject, false);
	}
};

// Hides the finalDragObject
NumberGame.prototype.hideWinObject = function(){
	this.disable(false);
	if(this.finalDragObject) {
		util.fade(this.finalDragObject, false);
	}
};

// Shows teh goalObject
NumberGame.prototype.showGoalObject = function(){
	if(this.goalObject){
		if(this.isRelative){
			this.updateObjects();
		}
		util.fade(this.goalObject, true).eventCallback('onComplete', this.disable, false, this);
	}
};
/* Show the number panel, hide the yes/no panel and enable input. */
NumberGame.prototype.showNumbers = function () {
	this.disable(true);
	if (this.buttons) {
		this.buttons.reset();
		if (this.isRelative) {
			this.updateButtons();
		}
		util.fade(this.buttons, true).eventCallback('onComplete', this.disable, false, this);
	}

	if(this.dragObject){
		this.dragObject.reset();
		if(this.isRelative){
			this.updateObjects();
		}
		util.fade(this.dragObject, true).eventCallback('onComplete', this.disable, false, this);
	}
	if(this.goalObject){
		if(this.isRelative){
			this.updateObjects();
		}
		util.fade(this.goalObject, true).eventCallback('onComplete', this.disable, false, this);
	}

	if (this.yesnos) {
		util.fade(this.yesnos, false);
	}

	if (this.agent.visible) {
		util.fade(this.agent.thought, false);
		this.agent.eyesFollowPointer();
	}
};

/* Show the yes/no panel, hide the number panel and enable input. */
NumberGame.prototype.showYesnos = function () {
	this.disable(true);
	if (this.buttons) {
		util.fade(this.buttons, false);
	}
	if (this.yesnos) {
		this.yesnos.reset();
		util.fade(this.yesnos, true).eventCallback('onComplete', this.disable, false, this);
	}

	if (this.agent.visible) { this.agent.eyesFollowPointer(); }
};

/* Hide the number and yes/no panel. */
NumberGame.prototype.hideButtons = function () {
	this.disable(true);
	if (this.buttons) {
		util.fade(this.buttons, false);
	}
	if (this.yesnos) {
		util.fade(this.yesnos, false);
	}
	if (this.dragObject) {
		util.fade(this.dragObject, false);
	}
	if(this.goalObject){
		util.fade(this.goalObject, false);
	}

	if (this.agent.visible) { this.agent.eyesStopFollow(); }
};

/* Update the values of the button panel. */
NumberGame.prototype.updateButtons = function () {
	if (this.buttons) {
		var range = this._getRange();
		this.buttons.setRange(range.min, range.max);
	}
};

NumberGame.prototype.updateObjects = function(){
	var range = this._getRange();
	if(this.dragObject ){
		range = this._getRange();
		this.dragObject.setRange(range.min, range.max,this.currentNumber);
	}
	if(this.goalObject){
		range = this._getRange();
		this.goalObject.setRange(range.min,range.max, this.currentNumber);
	}

};

/* Update the relative value. */
NumberGame.prototype.updateRelative = function () {
	if (this.isRelative) {
		this.addToNumber = this.atValue;
	}
};
/*set relative true*/
NumberGame.prototype.setRelative = function (correct){
	if (correct === true){
		this.isRelative = true;
	}
	else {
		this.isRelative = false;
	}
};

/*Set relative false*/
NumberGame.prototype.setRelativefalse = function (){
	this.isRelative = true;
};

/* Instructions for the yes - no panel */
NumberGame.prototype.instructionYesNo = function () {
	var t = new TimelineMax();
	t.addSound(this.agent.speech, this.agent, 'willYouHelpMe');
	t.add(util.fade(this.yesnos, true), 0);
	t.addLabel('green', '+=0.7');
	t.addSound(this.agent.speech, this.agent, 'instructionGreen', 'green');
	t.add(this.yesnos.children[0].highlight(3), 'green');
	t.addLabel('red');
	t.addSound(this.agent.speech, this.agent, 'instructionRed', 'red');
	t.add(this.yesnos.children[1].highlight(3), 'red');
	return t;
};

/* Start the game. */
NumberGame.prototype.startGame = function () {
	this._nextNumber();
	this.helpButton.visible = true;

	Subgame.prototype.startGame.call(this);

	EventSystem.publish(GLOBAL.EVENT.numbergameStarted, [this.method, this.amount, this.representation]);
};


/* The following functions should be overshadowed in the game object. */
NumberGame.prototype.pos = { agent: { start: { x: 0, y: 0 }, scale: 1 } };
NumberGame.prototype.instructionCount = function () {};
NumberGame.prototype.instructionSteps = function () {};
NumberGame.prototype.instructionAdd = function () {};
NumberGame.prototype.instructionSubtract = function () {};
NumberGame.prototype.instructionAddSubtract = function () {};
NumberGame.prototype.startStop = function () {};
NumberGame.prototype.startBelow = function () {};
NumberGame.prototype.startAbove = function () {};
NumberGame.prototype.startThink = function () {};
NumberGame.prototype.returnToStart = function () {};
NumberGame.prototype.returnNone = function () {};
NumberGame.prototype.returnToPreviousIfHigher = function () {};
NumberGame.prototype.returnToPreviousIfLower = function () {};
},{"../../global.js":8,"../../objects/DraggableObject.js":14,"../../objects/ObjectPanel":19,"../../objects/buttons/ButtonPanel.js":22,"../../objects/buttons/GeneralButton.js":23,"../../objects/buttons/TextButton.js":26,"../../pubsub.js":34,"../../utils.js":48,"./Subgame.js":47}],45:[function(require,module,exports){
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

},{"../../global.js":8,"../../language.js":9,"../../utils.js":48,"./NumberGame.js":44,"./SharkGameApe.js":46}],46:[function(require,module,exports){
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

},{"../../agent/Character.js":2}],47:[function(require,module,exports){
var SuperState = require('../SuperState.js');
var GLOBAL = require('../../global.js');
var LANG = require('../../language.js');
var EventSystem = require('../../pubsub.js');
var Counter = require('../../objects/Counter.js');
var Cover = require('../../objects/Cover.js');
var Menu = require('../../objects/Menu.js');

module.exports = Subgame;

/**
 * Superclass for all games.
 * Holds shared logic for mode and round handling. Also some graphic setups.
 * Also see subclass NumberGame.
 *
 * SETUP THESE IN THE SUBCLASS:
 * They are called with two parameters (ifFirstTime, triesSoFar).
 * modeIntro:      Introduce the game, call nextRound to start next mode.
 * modePlayerDo:   Player only
 * modePlayerShow: Player is showing the TA
 * modeAgentTry:   TA is guessing and the player is helping out
 * modeAgentDo:    TA only
 * modeOutro:      The game is finished, celebrate!
 *
 * VARIABLES THE SUBCLASS CAN USE:
 * Add game objects to:     this.gameGroup
 * Add buttons and HUD to:  this.hudGroup
 * Use agent with:          this.agent (default visibility = false)
 *
 * FUNCTIONS THE SUBCLASS CAN USE:
 * Disable/Enable input:    this.disable(true/false) - default = true = disabled (publishes disabled event)
 * Run next round:          this.nextRound() - will change mode automatically when needed
 * Add water to the can:    this.addWater(fromX, fromY) - Adds a water drop to the can
 */
Subgame.prototype = Object.create(SuperState.prototype);
Subgame.prototype.constructor = Subgame;
function Subgame () {}

/* 
 * Phaser state function.
 */
Subgame.prototype.init = function (options) {
	/* "Private" variables */
	var _this = this; // Event subscriptions does not have access to this
	this._token = options.token || Date.now();
	this._modes = options.mode || [
		GLOBAL.MODE.intro,
		GLOBAL.MODE.playerDo,
		GLOBAL.MODE.playerShow,
		GLOBAL.MODE.agentTry,
		// GLOBAL.MODE.agentDo,
		GLOBAL.MODE.outro
	];
	this._mode = null;
	this._pendingMode = null;
	this._first = true;
	/* Keep track of how many rounds that have been played */
	this._counter = new Counter(options.roundsPerMode || 3, true);
	/* When enough rounds have been played, trigger a mode change */
	this._counter.onMax = function () {
		_this._nextMode();
	};
	this._currentTries = 0;
	this._totalTries = 0;
	this._totalCorrect = 0;

	// Instruction options
	this.instructions = typeof options.instructions !== 'undefined' ? options.instructions : true;
	this.instructionsAgent = typeof options.instructionsAgent !== 'undefined' ? options.instructionsAgent : true;

	/* Public variables */
	this.currentMode = null; // The current mode running

	/* Setup game objects */
	this.gameGroup = this.add.group();
	this.agent = this.game.player.createAgent();
	this.agent.visible = false;
	this.gameGroup.add(this.agent);

	this.hudGroup = this.add.group();

	var disabler = new Cover(this.game, '#ffffff', 0);
	this.world.add(disabler);
	this.disable = function (value) {
		if (disabler.visible !== value) {
			EventSystem.publish(GLOBAL.EVENT.disabled, [value]);
		}
		disabler.visible = value;
	};

	/* Setup menu objects */
	this._menuGroup = this.add.group();
	this._menuGroup.visible = false;
	//this._waterCan = new WaterCan(this.game);
	//this._menuGroup.add(this._waterCan);
	this.menuBack = { state: GLOBAL.STATE.garden, text: LANG.TEXT.gotoGarden };
	this._menuGroup.add(new Menu(this.game));

	/* For cleanup when shutting down state */
	this._origAudio = Object.keys(this.game.cache._sounds);
	this._origImages = Object.keys(this.game.cache._images);
};

/* Phaser state function */
Subgame.prototype.shutdown = function () {
	var key;
	for (key in this.game.cache._sounds) {
		if (this._origAudio.indexOf(key) < 0) {
			this.game.cache.removeSound(key);
		}
	}

	for (key in this.game.cache._images) {
		if (this._origImages.indexOf(key) < 0) {
			this.game.cache.removeImage(key);
		}
	}

	SuperState.prototype.shutdown.call(this);
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                            Private functions                              */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

/** Change to the next mode in the queue. */
Subgame.prototype._nextMode = function () {
	var newMode = this._modes.shift();
	this._decideMode(newMode);
	this._pendingMode = newMode;
	this._first = true;
};

/**
 * Translate from integer to mode function
 * @param {number}
 */
Subgame.prototype._decideMode = function (mode) {
	if (mode === GLOBAL.MODE.intro) {
		this._mode = this.modeIntro;
	} else if (mode === GLOBAL.MODE.playerDo) {
		this._mode = this.modePlayerDo;
	} else if (mode === GLOBAL.MODE.playerShow) {
		this._mode = this.modePlayerShow;
	} else if (mode === GLOBAL.MODE.agentTry) {
		this._mode = this.modeAgentTry;
	} else if (mode === GLOBAL.MODE.agentDo) {
		this._mode = this.modeAgentDo;
	} else if (mode === GLOBAL.MODE.outro) {
		this._mode = this.modeOutro;
	} else {
		this._mode = this.endGame;
	}
};

/** Skip the current mode. */
Subgame.prototype._skipMode = function () {
	this._nextMode();
	this.nextRound();
};


/*MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*/
/*                            Public functions                               */
/*WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW*/

/**
 * Calls the current mode function. It will be called with two parameters:
 * 1) If it is the first time on this mode.
 * 2) How many tries that have been made on the current number.
 * Publishes modeChange event (first time a mode runs).
 */
Subgame.prototype.nextRound = function () {
	// Special case: intro and outro only have one round
	if ((this.currentMode === GLOBAL.MODE.intro ||
		this.currentMode === GLOBAL.MODE.outro) &&
		this.currentMode === this._pendingMode) {
		this._nextMode();
	}
	// Publish event when it it is the first time it runs
	if (this._first) {
		EventSystem.publish(GLOBAL.EVENT.modeChange, [this._pendingMode]);
	}

	// Run mode and update properties
	this.currentMode = this._pendingMode;
	this._mode(this._first, this._currentTries);
	this._first = false;
};

/**
 * Adds water to the water can.
 * Water will only be added in modes playerShow, agentTry and agentDo.
 * @param {number} The x position where the drop will begin.
 * @param {number} The y position where the drop will begin.
 * @param {boolean} Override mode restrictions and force drop to be added.
 * @return {Object} The drop animation from x, y to water can.
 */
/*Subgame.prototype.addWater = function (x, y) {
	var drop = this.add.sprite(x, y, 'objects', 'drop', this._menuGroup);
	drop.anchor.set(0.5);
	drop.scale.set(0.7, 0);

	// Show drop
	return new TimelineMax().to(drop.scale, 1.5, { y: 0.7, ease:Elastic.easeOut })
		// Move drop
		.to(drop, 1.5, { x: this._waterCan.x + 50, y: this._waterCan.y + 30, ease:Power2.easeOut })
		// Hide drop and add water
		.to(drop, 0.5, { height: 0,
			onStart: function () { this.game.player.water++; },
			onStartScope: this,
			onComplete: function () { drop.destroy(); }
		});
};
*/
/**
 * Start the game!
 * Publishes subgameStarted event.
 */
Subgame.prototype.startGame = function () {
	/* Send event that subgame is started. */
	EventSystem.publish(GLOBAL.EVENT.subgameStarted, [this.game.state.current, this._token]);

	this._menuGroup.visible = true;
	this._nextMode();
	this.nextRound();
};

/** End the game. */
Subgame.prototype.endGame = function () {
	this.state.start(GLOBAL.STATE.beach);
};


/* The following functions should be overshadowed in the game object. */
Subgame.prototype.modeIntro      = Subgame.prototype._skipMode;
Subgame.prototype.modePlayerDo   = Subgame.prototype._skipMode;
Subgame.prototype.modePlayerShow = Subgame.prototype._skipMode;
Subgame.prototype.modeAgentTry   = Subgame.prototype._skipMode;
Subgame.prototype.modeAgentDo    = Subgame.prototype._skipMode;
Subgame.prototype.modeOutro      = Subgame.prototype._skipMode;
},{"../../global.js":8,"../../language.js":9,"../../objects/Counter.js":12,"../../objects/Cover.js":13,"../../objects/Menu.js":17,"../../pubsub.js":34,"../SuperState.js":41}],48:[function(require,module,exports){
var GLOBAL = require('./global.js');
var EventSystem = require('./pubsub.js');

/**
 * Fade in or out an object.
 * NOTE: The returned tween has both an onStart and onComplete function.
 * @param {Object} what - The object to fade, needs to have an alpha property.
 * @param {boolean} typ - Fade in = true, out = false, toggle = undefined (default: toggle).
 * @param {number} duration - Fade duration in seconds (default: 0.5).
 *                            NOTE: The tween will have 0 duration if state is correct.
 * @param {number} to - The alpha to fade to (only used when fading in) (default: 1).
 *                      NOTE: You can fade to a lower alpha using fade in.
 * @return {Object} The animation TweenMax.
 */
exports.fade = function (what, typ, duration, to) {
	duration = duration || 0.5;

	return TweenMax.to(what, duration, {
		onStart: function () {
			/* If this object is fading, stop it! */
			if (what.isFading) {
				what.isFading.kill();
			}

			/* No specified type: Toggle the current one. */
			if (typeof typ === 'undefined' || typ === null) {
				typ = !what.visible || what.alpha === 0;
			}

			/* Not visible? Set alpha to 0 and make it visible if it should be. */
			if (!what.visible) {
				what.alpha = 0;
				if (typ) {
					what.visible = true;
				}
			}

			/* If we are fading in, fade to the specified alpha, otherwise 0. */
			to = typ > 0 ? (to || 1) : 0;
			if (what.alpha !== to) {
				this.updateTo({ alpha: to });
			} else {
				/* We are already at correct state, cut the duration. */
				this.duration(0);
			}

			what.isFading = this;
		},
		onComplete: function () {
			if (!typ) {
				what.visible = false;
			}
			delete what.isFading;
		}
	});
};

/**
 * Easily tween an objects tint. It tweens from the current tint value.
 * @param {Object} what - The object to fade, needs to have an alpha property.
 * @param {number} toColor - The color to fade to.
 * @param {number} duration - Tween duration in seconds (default: 1).
 * @return {Object} The animation TweenMax.
 */
exports.tweenTint = function (what, toColor, duration) {
	duration = duration || 1;
	var color = Phaser.Color.getRGB(what.tint);
	var endColor =  Phaser.Color.getRGB(toColor);

	return TweenMax.to(color, duration, {
		r: endColor.r,
		g: endColor.g,
		b: endColor.b,
		onUpdate: function () {
			what.tint = Phaser.Color.getColor(color.r, color.g, color.b);
		}
	});
};

/**
 * Easily create an audio sheet.
 * @param {string} key - The key of the audio object.
 * @param {Object} markers - The Markers of the audio object.
 * @return {Object} The audio object.
 */
exports.createAudioSheet = function (key, markers) {
	var a = GLOBAL.game.add.audio(key);
	for (var marker in markers) {
		a.addMarker(marker, markers[marker][0], markers[marker][1]);
	}
	return a;
};

/**
* Creates a new Sound object as background music
*
* @method Phaser.GameObjectFactory#music
* @param {string} key - The Game.cache key of the sound that this object will use.
* @param {number} [volume=1] - The volume at which the sound will be played.
* @param {boolean} [loop=false] - Whether or not the sound will loop.
* @param {boolean} [connect=true] - Controls if the created Sound object will connect to the master gainNode of the SoundManager when running under WebAudio.
* @return {Phaser.Sound} The newly created text object.
*/
Phaser.GameObjectFactory.prototype.music = function (key, volume, loop, connect) {
	var music = this.game.sound.add(key, volume, loop, connect);
	music.volume = music.maxVolume * this.game.sound.bgVolume;
	this.game.sound._music.push(music);
	return music;
};

/**
* @name Phaser.SoundManager#fgVolume
* @property {number} fgVolume - Gets or sets the foreground volume of the SoundManager, a value between 0 and 1.
*/
Object.defineProperty(Phaser.SoundManager.prototype, 'fgVolume', {
	get: function () {
		return this._fgVolume;
	},
	set: function (value) {
		this._fgVolume = value;
		for (var i = 0; i < this._sounds.length; i++) {
			if (this._music.indexOf(this._sounds[i]) < 0) {
				this._sounds[i].volume = this._sounds[i].maxVolume * value;
			}
		}
	}
});

/**
* @name Phaser.SoundManager#bgVolume
* @property {number} bgVolume - Gets or sets the background volume of the SoundManager, a value between 0 and 1.
*/
Object.defineProperty(Phaser.SoundManager.prototype, 'bgVolume', {
	get: function () {
		return this._bgVolume;
	},
	set: function (value) {
		this._bgVolume = value;
		for (var i = 0; i < this._sounds.length; i++) {
			if (this._music.indexOf(this._sounds[i]) >= 0) {
				this._sounds[i].volume = this._sounds[i].maxVolume * value;
			}
		}
	}
});

/**
 * Randomize array element order in-place.
 * Using Fisher-Yates shuffle algorithm.
 * @param {Array} The array to shuffle. (Use .splice(0) if you need to copy an array.)
 * @returns {Array} The input array in shuffled order.
 */
Phaser.RandomDataGenerator.prototype.shuffle = function (array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

/**
 * A function to easily add sound to a tween timeline.
 * @param {string|Object} what - The name of the sound file, or the sound object, to play.
 * @param {Object} who - If someone should say it (object must have "say" function) (optional).
 * @param {string} marker - For playing a specific marker in a sound file (optional).
 * @param {number} position - The position to put the sound (default is '+=0').
 * @return {Object} The TimelineMax object.
 */
TimelineMax.prototype.addSound = function (what, who, marker, position) {
	var a = (who && who.say) ? who.say(what, marker) :
		((typeof what === 'string') ? GLOBAL.game.add.audio(what) : what);

	if (typeof position === 'undefined' || position === null) {
		position = '+=0';
	}

	var end;
	if (marker) {
		this.addCallback(function () { a.play(marker); }, position);
		end = a.markers[marker].duration;
	} else {
		this.addCallback(function () { a.play(); }, position);
		end = GLOBAL.game.cache.getSound(a.key).data.duration;
	}

	if (isNaN(position)) {
		// The position might be a label. Try to get its position.
		var label = this.getLabelTime(position);
		if (label >= 0) {
			// Label present, add to its time.
			end = label + end;
		} else {
			// Relative position.
			var time = parseFloat(position.substr(0, 1) + position.substr(2)) + end;
			end = (time < 0 ? '-=' : '+=') + Math.abs(time);
		}
	} else {
		end += position;
	}
	this.addCallback(function () { a.stop(); }, end);

	return this;
};

/**
 * Skip a timeline.
 * Publishes skippable event.
 * NOTE: You can not skip part of a timeline.
 * NOTE: See menu object for more information about skipping.
 * @returns: 'this' TimelineMax object, enables chaining.
 */
TimelineMax.prototype.skippable = function () {
	this.addCallback(function () {
		EventSystem.publish(GLOBAL.EVENT.skippable, [this]);
		this.addCallback(function () { EventSystem.publish(GLOBAL.EVENT.skippable); });
	}, 0, null, this);
	return this;
};

/**
 * When you want a yoyo animation to go back to the beginning.
 * @param {number} total - The total duration for the animation.
 * @param {number} each - The duration of one direction (half of the loop from start back to start).
 * @return {number} The amount of times to repeat the animation
 */
TweenMax.prototype.calcYoyo = function (total, each) {
	var times = parseInt(total / each);
	return times + (times % 2 === 0 ? 1 : 0); // Odd number will make the animation return to origin.
};

/**
 * Make an animation loop from start back to the origin.
 * @param {number} total - The total duration of the animation.
 *                 NOTE: This is not exact time, depending on how well animation duration and total match.
 * @return {Object} The TweenMax object.
 */
TweenMax.prototype.backForth = function (total) {
	this.yoyo(true);
	this.repeat(this.calcYoyo(total, this.duration()));
	return this;
};

/**
 * Adds a rounded rectangle to the built-in rendering context.
 * @param {number} x - The x position
 * @param {number} y - The y position
 * @param {number} w - The width
 * @param {number} h - The height
 * @param {number} r - The radius
 * @return {Object} The CanvasRenderingContext2D object
 */
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
	if (w < 2 * r) { r = w / 2; }
	if (h < 2 * r) { r = h / 2; }
	this.beginPath();
	this.moveTo(x+r, y);
	this.arcTo(x+w, y,   x+w, y+h, r);
	this.arcTo(x+w, y+h, x,   y+h, r);
	this.arcTo(x,   y+h, x,   y,   r);
	this.arcTo(x,   y,   x+w, y,   r);
	this.closePath();
	return this;
};

/**
 * @property {number} PI2 - Math.PI * 2.
 */
Math.PI2 = Math.PI*2;
},{"./global.js":8,"./pubsub.js":34}]},{},[7])


//# sourceMappingURL=game.js.map