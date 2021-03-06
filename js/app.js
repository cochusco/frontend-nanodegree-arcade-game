var HEARTH_IMG_PATH = 'images/Heart.png';
var SCALE_HEARTH = 0.45; // heath image escalation rate
var FINISH_POINTS = 20;
var ENEMY_SPEED = 200;
var PLAYER_LIFES = 3;
var RELOAD_MESSAGE = 'Reload your browser to continue';

/**
 * Represents a coordinate.
 * @constructor
 */
var Coordinate = function(x, y) {
	this.x = x;
	this.y = y;
};

/** Gameboard object models the board as a grid.
 * I tried to parametrize the gameboard (ie its relative easy to change size, rows, grass line..) and decoupling as much as posible
 * gameboard from artifacts.
 */
var gameboard = {
	CANVASHEIGHT: 606,
	CANVASWIDTH: 505,
	ROWS: 6,
	COLUMNS: 5,
	GRASSROWS: 2,
	WATERROWS: 1,
	STONEROWS: 3,
	PLAYER_INIT_X: 205,
	PLAYER_INIT_y: 465,
	//Coordinate of the up left corner of the playable gameboard area.
	get xyInit() {
		return new Coordinate(0, 50);
	},
	//Coordinate of the down right corner of the playable gameboard area.
	get xyEnd() {
		return new Coordinate(this.CANVASWIDTH, 545);
	},
	get rowHeight() {
		return (this.xyEnd.y - this.xyInit.y) / this.ROWS;
	},
	get rowWidth() {
		return (this.xyEnd.x - this.xyInit.x) / this.COLUMNS;
	},
	// y coordinate of the lower water limit.
	get waterlimit() {
		return this.xyEnd.y - this.rowHeight * (this.ROWS - this.WATERROWS);
	},
	// y coordinate of the upper grass limit.
	get grasslimit() {
		return this.xyEnd.y - this.rowHeight * this.GRASSROWS;
	},
	/**
	 * Get a coordinate one box up, if the new coordinate is
	 * outside the game area return the same coordinate.
	 * @param {Coordinate}
	 * @return {Coordinate}
	 */
	getUpCoord: function(coord) {
		var y = coord.y - this.rowHeight;
		if (y < this.xyInit.y) return coord;
		else return new Coordinate(coord.x, y);
	},
	/**
	 * Get a coordinate one box down, if the new coordinate is
	 * outside the game area return the same coordinate.
	 * @param {Coordinate}
	 * @return {Coordinate}
	 */
	getDownCoord: function(coord) {
		var y = coord.y + this.rowHeight;
		if (y > this.xyEnd.y) return coord;
		else return new Coordinate(coord.x, y);
	},
	/**
	 * Get a coordinate one box right, if the new coordinate is
	 * outside the game area return the same coordinate.
	 * @param {Coordinate}
	 * @return {Coordinate}
	 */
	getRightCoord: function(coord) {
		var x = coord.x + this.rowWidth;
		if (x > this.xyEnd.x) return coord;
		else return new Coordinate(x, coord.y);
	},
	/**
	 * Get a coordinate one box left, if the new coordinate is
	 * outside the game area return the same coordinate.
	 * @param {Coordinate}
	 * @return {Coordinate}
	 */
	getLeftCoord: function(coord) {
		var x = coord.x - this.rowWidth;
		if (x < this.xyInit.x) return coord;
		else return new Coordinate(x, coord.y);
	},
	/**
	 * Get a random initial position for an enemy , the position will be
	 * in the stone area and the x coodinate starts in the left side , outside the visible area.
	 * @return {Coordinate}
	 */
	getInitEnemyCoord: function() {
		var x = -(100 + this.CANVASWIDTH * Math.random());
		var y = ((Math.floor(Math.random() * this.STONEROWS)) * this.rowHeight) + this.xyInit.y + (this.WATERROWS * this.rowHeight);
		return new Coordinate(x, y);
	},
	getInitPlayerCoord: function() {
		return new Coordinate(this.PLAYER_INIT_X, this.PLAYER_INIT_y);
	},
	isGrassCoord: function(coord) {
		if (this.isWaterCoord(coord)) return false;
		return (coord.y > this.grasslimit);
	},
	isWaterCoord: function(coord) {
		return (coord.y < this.waterlimit);
	},
	isStoneCoord: function(coord) {
		return !(this.isGrassCoord(coord) || this.isWaterCoord(coord));
	},
	renderGameOver: function() {
		ctx.font = '50pt Calibri';
		ctx.fillStyle = 'yellow';
		ctx.fillText('Game Over', this.CANVASWIDTH / 2 - 150, this.CANVASHEIGHT / 2 - 30);
		ctx.font = '20pt Calibri';
		ctx.fillStyle = 'black';
		ctx.fillText(RELOAD_MESSAGE, this.CANVASWIDTH / 2 - 180, this.CANVASHEIGHT / 2);
	},
	renderPoints: function(points) {
		ctx.clearRect(0, 0, 150, 48);
		ctx.font = '18pt Calibri';
		ctx.fillStyle = 'black';
		ctx.fillText('POINTS: ' + points, 0, 25);

	},
	renderLifes: function(lifes) {
		ctx.clearRect(340, 0, this.CANVASHEIGHT, 50);
		var img = Resources.get(HEARTH_IMG_PATH);
		var horizontalOffset = 0;
		var imgWWidth = Math.round(SCALE_HEARTH * img.width);
		var imgHeighth = Math.round(SCALE_HEARTH * img.height);
		for (var i = 1; i <= lifes; i++) {
			ctx.drawImage(img, 340 + horizontalOffset, -20, imgWWidth, imgHeighth);
			horizontalOffset = +10 + imgWWidth + horizontalOffset;
		}
	}

};

/**
 * Represents an artifact , an animated or inanimated object which is placed in the gameboard.
 * @constructor
 */
var Artifact = function() {
	this.x;
	this.y;
	this.sprite;
};

Artifact.prototype.setPosition = function(coordinate) {
	this.x = coordinate.x;
	this.y = coordinate.y;
};

Artifact.prototype.getPosition = function() {
	return new Coordinate(this.x, this.y);
};

/**
 * get the contact surface of the artifact, can be diferent that the image showed
 * (ie because it has transparency) , by default is the equivalent of a box.
 */
Artifact.prototype.getSurface = function() {
	// a little bit of margin
	var offsetPixels = 5;
	var xyInit = new Coordinate(this.x + offsetPixels, this.y + offsetPixels);
	var xyEnd = new Coordinate(this.x + gameboard.rowWidth - offsetPixels, this.y + gameboard.rowHeight - offsetPixels);
	drawPoint(xyInit.x, xyInit.y);
	drawPoint(xyEnd.x, xyEnd.y);
	return [xyInit, xyEnd];
};

/**
 * Calculates whether an antifact crash with another in base of their surface.
 * @param {Artifact}
 * @return {boolean}
 */
Artifact.prototype.isCollision = function(artifact) {
	var own = this.getSurface();
	var other = artifact.getSurface();
	return !(
		((own[1].y) < (other[0].y)) ||
		(own[0].y > other[1].y) ||
		((own[1].x) < other[0].x) ||
		(own[0].x > (other[1].x))
	);
};

/**
 * Represents an Enemy.
 * @constructor
 * @extends Artifact
 */
var Enemy = function() {
	Artifact.call(this);
	this.setPosition(gameboard.getInitEnemyCoord());
	this.speed = ENEMY_SPEED * Math.random();
	this.sprite = 'images/enemy-bug.png';
};
Enemy.prototype = Object.create(Artifact.prototype);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.update = function(dt) {
	this.x = this.x + (dt * this.speed);
	//disapeared enemies enter again
	if (this.x > gameboard.CANVASWIDTH + 100) this.x = -100;
};

Enemy.prototype.render = function() {
	var image = Resources.get(this.sprite);
	ctx.drawImage(image, 0, 70, image.width, image.height - 90, this.x, this.y, image.width, gameboard.rowHeight);
};

/**
 * Represents the player.
 * @constructor
 * @extends Artifact
 */
var Player = function() {
	Artifact.call(this);
	this.init();
	this.lifes;
	this.points;
	this.sprite = 'images/char-boy.png';
	//add points each second player is in stone.
	var me = this;
	this.interval = setInterval(function() {
		me.addPointsInStone();
	}, 1000);
};

Player.prototype = Object.create(Artifact.prototype);
Enemy.prototype.constructor = Player;
Player.prototype.handleInput = function(keyPressed) {
	switch (keyPressed) {
		case 'left':
			this.setPosition(gameboard.getLeftCoord(this.getPosition()));
			break;
		case 'up':
			this.setPosition(gameboard.getUpCoord(this.getPosition()));
			break;
		case 'right':
			this.setPosition(gameboard.getRightCoord(this.getPosition()));
			break;
		case 'down':
			this.setPosition(gameboard.getDownCoord(this.getPosition()));
			break;
		default:
			console.log('not allowed key');
	}
};

Player.prototype.update = function() {
	//if reach water add points and restart position.
	if (gameboard.isWaterCoord(this.getPosition())) {
		this.points += FINISH_POINTS;
		this.setInitPosition(gameboard.getInitPlayerCoord());
	}
	//checks if there are any collisions with enemies.
	for (var i = 0; i < allEnemies.length; i++) {
		if (this.isCollision(allEnemies[i])) {
			this.killed();
			break;
		}
	}
};

Player.prototype.render = function() {
	var image = Resources.get(this.sprite);
	ctx.drawImage(image, 0, 60, image.width, image.height - 90, this.x, this.y, image.width, gameboard.rowHeight);
	gameboard.renderLifes(this.lifes);
	gameboard.renderPoints(this.points);
	if (this.lifes === 0) gameboard.renderGameOver();
};

/**
 * take a a life and restart initial position , if
 * there are not remaining lifes cancel input actions.
 */
Player.prototype.killed = function() {
	this.setInitPosition();
	this.lifes--;
	if (this.lifes === 0) this.handleInput = function() {};

};

Player.prototype.setInitPosition = function() {
	this.setPosition(gameboard.getInitPlayerCoord());
};

/**
 * Initialice player.
 */
Player.prototype.init = function() {
	this.setInitPosition();
	this.lifes = PLAYER_LIFES;
	this.points = 0;
};

/**
 * Add point if the player is in stone.
 */
Player.prototype.addPointsInStone = function() {
	if (gameboard.isStoneCoord(this.getPosition())) this.points++;
};

// Initialice enemies.
var allEnemies = [new Enemy(), new Enemy(), new Enemy(), new Enemy(), new Enemy(), new Enemy(), new Enemy()];
// Initialice player.
var player = new Player();

document.addEventListener('keyup', function(e) {
	var allowedKeys = {
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down'
	};
	player.handleInput(allowedKeys[e.keyCode]);
});

/**
 * change artifact image with the selected in the HTML.
 * @param {Event} event
 * @param {Artifact} artifact
 */
function choosePlayer(event, artifact) {
	event.stopPropagation();
	event.preventDefault();
	var path = event.target.src;
	var res = path.split('/');
	//cut the full path , only relative path is needed.
	path = res[res.length - 2] + '/' + res[res.length - 1];
	artifact.sprite = path;
}

/**
 * Helper class draws a 3px circle in x y coodinate.
 */
function drawPoint(coord) {
	ctx.beginPath();
	ctx.arc(coord.x, coord.y, 3, 0, 2 * Math.PI, true);
	ctx.fill();
}

// add player icon change event.
window.onload = addPlayerSelectorEvent;
// add click listener to the player image selector.
function addPlayerSelectorEvent() {
	document.getElementsByClassName('player-selector')[0].addEventListener('click', function(event) {
		choosePlayer(event, player);
	}, true);
}