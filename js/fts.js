var canvas = document.getElementById("fts");
var ctx = canvas.getContext("2d");

var kestrelImg = new Image();
kestrelImg.src = "images/kestrel.png";

console.clear();

var mouseX = null, mouseY = null;

var mode = "normal";
var selected = null;

var paused = false;

//amends two arrays into one array with the items of both arrays
function joinArr (a, b) {
	var c =[]
	if (a.length > 0) {
		for (i = 0; i < a.length; i++) {
			c[c.length] = a[i];
		}
	}
	if (b.length > 0) {
		for (j = 0; j < b.length; j++) {
			c[c.length] = b[j];
		}
	}
	return c;
}


//CREW MEMBER
var names = ["Bob", "Joe", "Frank", "Anne", "Jill", "Carol"];

//player controlled crew members
function CrewMember (x, y, location, color, name) {
	this.x = x;
	this.y = y;
	
	this.w = 15;
	this.h = 15;
	
	this.color = color || "red";
	
	this.goal = null;
	this.xgoal = null;
	this.ygoal = null;
	
	this.auto = false;
	
	this.target = location;
	this.xtarget = x;
	this.ytarget = y;
	
	this.location = location;
	
	this.station = location;
	
	this.xspd = 5;
	this.yspd = 5;
	
	this.name = name || names.splice(Math.floor(Math.random() * names.length), 1);
	this.hp = 100;
	this.hpMax = 100;
	
	this.air = 100;
	this.airMax = 100;
	
	this.pilot = 0;
	this.engine = 0;
	this.weapon = 0;
	this.repair = 0;
	this.sonar = 0;
}

//updates pathfinding and location of player controlled crew members
CrewMember.prototype.update = function() {	
	var spdMod = 1;
	for (s = 0; s < ship.grid.length; s++) {
		if (ship.grid[s].id == this.location) {
			if (ship.grid[s].water > 6) {
				spdMod = 1 / 4;
				if (this.air > 0) this.air--;
			}
			else if (ship.grid[s].water > 3) {
				spdMod = 1 / 2;
				if (this.air < this.airMax) this.air++;
			} else if (this.air < this.airMax) {
				this.air++;
			}
			break;
		}
	}
	if (this.air == 0 && this.hp > 0) {
		this.hp--;
	}
	if (this.goal != null) {
		//identifies goal location
		if (this.xgoal == null) {
			for (r = 0; r < ship.grid.length; r++) {
				if (ship.grid[r] == this.goal) {
					this.xgoal = ship.grid[r].x;
					this.ygoal = ship.grid[r].y;
					break;
				}
			}
		}
		
		//sets next target square
		if (this.location == this.target) {
			this.target = null;
			for (s = 0; s < ship.grid.length; s++) {
				if (ship.grid[s].id == this.location) {
					for (p = 0; p < ship.grid.length; p++) {
						if (p != s && ship.grid[s].connections[0].indexOf(ship.grid[p].id) >= 0 && ship.grid[p].id == this.goal) {
							this.target = ship.grid[p].id;
							this.xtarget = ship.grid[p].x;
							this.ytarget = ship.grid[p].y;
							break;
						}
					}
					var i = 0
					while (this.target == null) {
						for (p = 0; p < ship.grid.length; p++) {
							if (p != s && ship.grid[s].connections[0].indexOf(ship.grid[p].id) >= 0 && (ship.grid[p].connections[i].indexOf(this.goal) >= 0) && ship.grid[s].blacklist.indexOf(ship.grid[p].id) < 0) {
								this.target = ship.grid[p].id;
								this.xtarget = ship.grid[p].x;
								this.ytarget = ship.grid[p].y;
								break;
							}
						}
						i++;
					}
				}
			}
		}
		
		if (this.x != this.xtarget && this.y != this.ytarget) {
			spdMod *= Math.pow(2, 0.5) / 2;
		}
		
		//updates location of the crew member
		if (this.x > this.xtarget) this.x -= this.xspd * spdMod;
		if (this.x < this.xtarget) this.x += this.xspd * spdMod;
		if (this.y > this.ytarget) this.y -= this.yspd * spdMod;
		if (this.y < this.ytarget) this.y += this.yspd * spdMod;
		
		if (Math.pow(Math.pow(this.x - this.xtarget, 2) + Math.pow(this.y - this.ytarget, 2), 0.5) < 3) {
			this.x = this.xtarget;
			this.y = this.ytarget;
		}
		
		//checks if arrived at target location
		if (this.x == this.xtarget && this.y == this.ytarget) this.location = this.target;
		
		if (this.location == this.goal) {
			this.goal = null;
			this.xgoal = null;
			this.ygoal = null;
		}
	}
}

//displays player controlled crew members
CrewMember.prototype.draw = function() {
	ctx.fillStyle = this.color;
	ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
}


//SQUARE
//individual squares of the ship
function Square (x, y, id, room) {
	this.id = id;
	
	this.room = room;

	this.x = x;
	this.y = y;
	
	this.w = 40;
	this.h = 40;
	
	this.connections = [];
	this.connections[0] = [];
	
	this.blacklist = [];
	
	//indicates flood level of square
	this.water = 0;
}

//displays individual squares
Square.prototype.draw = function () {
	ctx.fillStyle = "#aaa";
	ctx.fillRect(this.x - this.w / 2 - 1, this.y - this.h / 2 - 1, this.w + 2, this.h + 2);
	ctx.fillStyle = "#888";
	ctx.fillRect(this.x - this.w / 2 + 1, this.y - this.h / 2 + 1, this.w - 2, this.h - 2);
	for (c = 0; c < ship.crew.length; c++) {
		if (ship.crew[c].goal == this.id && !ship.crew[c].auto) {
			ctx.fillStyle = "rgba(0,255,0,0.125)";
			ctx.fillRect(this.x - this.w / 2 - 1, this.y - this.h / 2 - 1, this.w + 2, this.h + 2);
			break;
		}
	}
	ctx.fillStyle = "rgba(0, 0, 150,"+ this.water / 20 +")";
	ctx.fillRect(this.x - this.w / 2 - 1, this.y - this.h / 2 - 1, this.w + 2, this.h + 2);
}

function canFlow (a, b) {
	for (r = 0; r < ship.rooms.length; r++) {
		if (ship.rooms[r].squares.indexOf(a) >= 0 && ship.rooms[r].squares.indexOf(b) >= 0) return true;
	}
	for (d = 0; d < ship.doors.length; d++) {
		if (ship.doors[d].connections.indexOf(a) >= 0 && ship.doors[d].connections.indexOf(b) >= 0 && ship.doors[d].open) return true;
	}
	return false;
}

function flow() {
	var sum = [];
	for (s = 0; s < ship.grid.length; s++) {	
		sum[s] = [];
		sum[s][0] = ship.grid[s].water;	
		sum[s][1] = 1;
		for (f = 0; f < ship.grid.length; f++) {
			if (ship.grid[s].connections[0].indexOf(ship.grid[f].id) >= 0 && canFlow(ship.grid[s].id, ship.grid[f].id)) {
				sum[s][0] += ship.grid[f].water;
				sum[s][1] ++;
			}
		}
	}
	for (s = 0; s < ship.grid.length; s++) {
		ship.grid[s].water = sum[s][0] / sum[s][1];
	}
	var fillSquare = [1,0];
	for (d = 0; d < ship.doors.length; d++) {
		if (ship.doors[d].connections.indexOf(null) >= 0 && ship.doors[d].open) {
			for (s = 0; s < ship.grid.length; s++) {
				if (ship.grid[s].id == ship.doors[d].connections[fillSquare[ship.doors[d].connections.indexOf(null)]]) {
					if(ship.grid[s].water < 10) ship.grid[s].water++;
					if(ship.grid[s].water > 10) ship.grid[s].water = 10;
					break;
				}
			}
		}
	}
}


//ROOM
//rooms of the ship
function Room (x, y, w, h, id, squares, system) {
	this.x = x;
	this.y = y;
	
	this.w = w;
	this.h = h;
	
	this.id = id;
	
	this.squares = squares || [];
	
	this.system = system || null;
	
	this.hp = 100;
	this.hpMax = 100;
	
	this.power = 1;
	this.powerMax = 1;
	
	this.manned = false;
}

Room.prototype.update = function () {
	this.manned = false;
	for (c = 0; c < ship.crew.length; c++) {
		if (ship.crew[c].location == this.squares[0] && ship.crew[c].target == this.squares[0]) {
			this.manned = true;
			break;
		}
	}
	if (this.system == "drain") {
		for (s = 0; s < ship.grid.length; s++) {
			if (ship.grid[s].water > 0) ship.grid[s].water -= 0.02;
			if (ship.grid[s].water < 0) ship.grid[s].water = 0;
		}
	}	
}

Room.prototype.draw = function () {
	ctx.fillStyle = "white";
	ctx.strokeStyle = "white";
	ctx.fillRect(this.x - this.w / 2 - 2, this.y - this.h / 2 - 2, this.w + 4, 4);
	ctx.fillRect(this.x - this.w / 2 - 2, this.y + this.h / 2 - 2, this.w + 4, 4);
	ctx.fillRect(this.x - this.w / 2 - 2, this.y - this.h / 2 - 2, 4, this.h + 4);
	ctx.fillRect(this.x + this.w / 2 - 2, this.y - this.h / 2 - 2, 4, this.h + 4);
	if (this.manned) {
		ctx.fillStyle = "#afa";
		ctx.strokeStyle = "#afa";
	}
	if (this.system == "pilot") {
		ctx.lineWidth = 2;
		ctx.beginPath();
    	ctx.arc(this.x, this.y, 7, 0, 2 * Math.PI, false);
    	ctx.stroke();
    	for (p = 0; p < 4; p++) {
			ctx.beginPath();
			ctx.moveTo(this.x + Math.cos(Math.PI * p / 4) * 10, this.y + Math.sin(Math.PI * p / 4) * 10);
			ctx.lineTo(this.x - Math.cos(Math.PI * p / 4) * 10, this.y - Math.sin(Math.PI * p / 4) * 10)
			ctx.stroke();
    		
    	}
	}
	else if (this.system == "sonar") {
		ctx.lineWidth = 1;
		ctx.beginPath();
    	ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI, false);
    	ctx.stroke();
		ctx.beginPath();
    	ctx.arc(this.x, this.y, 6, 0, 2 * Math.PI, false);
    	ctx.stroke();
		ctx.beginPath();
    	ctx.arc(this.x, this.y, 9, 0, 2 * Math.PI, false);
    	ctx.stroke();
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x + Math.cos(Math.PI / 4) * 9, this.y - Math.sin(Math.PI / 4) * 9);
		ctx.stroke();
	}
	else if (this.system == "medbay") {
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.moveTo(this.x - 8, this.y);
		ctx.lineTo(this.x + 8, this.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(this.x, this.y - 8);
		ctx.lineTo(this.x, this.y + 8);
		ctx.stroke();
	
	}
	else if (this.system == "doors") {
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.moveTo(this.x - 4, this.y - 8);
		ctx.lineTo(this.x - 4, this.y + 8);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(this.x + 4, this.y - 8);
		ctx.lineTo(this.x + 4, this.y + 8);
		ctx.stroke();
	
	}
	else if (this.system == "weapons") {
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(this.x - 8, this.y - 5);
		ctx.lineTo(this.x, this.y - 5);
		ctx.stroke();
		ctx.beginPath();
    	ctx.ellipse(this.x, this.y - 5, 2, 10, Math.PI / 2, -Math.PI, false);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(this.x - 7, this.y - 9);
		ctx.lineTo(this.x - 7, this.y - 1);
		ctx.lineTo(this.x - 1, this.y - 5);
		ctx.fill();
		
		
		ctx.beginPath();
		ctx.moveTo(this.x - 8, this.y + 5);
		ctx.lineTo(this.x, this.y + 5);
		ctx.stroke();
		ctx.beginPath();
    	ctx.ellipse(this.x, this.y + 5, 2, 10, Math.PI / 2, -Math.PI, false);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(this.x - 7, this.y + 9);
		ctx.lineTo(this.x - 7, this.y + 1);
		ctx.lineTo(this.x - 1, this.y + 5);
		ctx.fill();
	
	}
	else if (this.system == "drain") {
		ctx.lineWidth = 2;
		ctx.beginPath();
    	ctx.arc(this.x, this.y, 8, 0, 2 * Math.PI, false);
    	ctx.stroke();
    	for (p = -1; p < 2; p++) {
			ctx.beginPath();
			ctx.moveTo(this.x + Math.cos(Math.PI * p / 6) * 8, this.y + Math.sin(Math.PI * p / 6) * 8);
			ctx.lineTo(this.x - Math.cos(Math.PI * p / 6) * 8, this.y + Math.sin(Math.PI * p / 6) * 8);
			ctx.stroke();
    		
    	}
	}
	else if (this.system == "engine") {
		ctx.lineWidth = 2;
		for (p = 0; p < 5; p ++) {
			ctx.beginPath();
    		ctx.arc(this.x + Math.cos(Math.PI * p / 2.5) * 4, this.y + Math.sin(Math.PI * p / 2.5) * 4, 4, Math.PI * p / 2.5, Math.PI * p / 2.5 + Math.PI, false);
    		ctx.stroke();	
		}
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 9, 0, 2 * Math.PI, false);
		ctx.stroke();
	}
	else if (this.system == "drones") {
		ctx.fillRect(this.x - 7, this.y, 14, 10);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x, this.y - 7);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.x, this.y - 7, 2, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(this.x, this.y - 7, 4, -Math.PI / 4, Math.PI / 4, false);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.x, this.y - 7, 4, Math.PI * 3 / 4, Math.PI * 5 / 4, false);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.x, this.y - 7, 6, -Math.PI / 4, Math.PI / 4, false);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.x, this.y - 7, 6, Math.PI * 3 / 4, Math.PI * 5 / 4, false);
		ctx.stroke();
	}
	else if (this.system == "cloak") {
		ctx.beginPath();
		ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.x, this.y + 9, 15, Math.PI * 19 / 16, Math.PI * 29 / 16, false);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.x, this.y - 9, 15, -Math.PI * 29 / 16, -Math.PI * 19 / 16, false);
		ctx.stroke();
		ctx.beginPath();
	}
	else if (this.system == "teleport") {
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(this.x, this.y + 3);
		ctx.lineTo(this.x, this.y - 8);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(this.x + 1, this.y + 4);
		ctx.lineTo(this.x - 5, this.y - 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(this.x - 1, this.y + 4);
		ctx.lineTo(this.x + 5, this.y - 2);
		ctx.stroke();
		ctx.lineWidth = 2;
		ctx.beginPath();
    	ctx.ellipse(this.x, this.y + 5, 10, 3, 0, - Math.PI / 4, Math.PI * 5 / 4, false);
		ctx.stroke();
		
	}
}


//DOOR
//doors between rooms
function Door (x, y, orientation, connections) {
	this.x = x;
	this.y = y;
	this.orientation = orientation;
	this.connections = connections;
	this.w = 0;
	this.h = 0;
	if (this.orientation == "h") {
		this.w = 36;
		this.h = 6;
	} else {
		this.w = 6;
		this.h = 36;
	}
	this.open = false;
	this.held = false;
	this.gap = 0;
}

//updates whether door should be open or close and alters gap accordingly 
Door.prototype.update = function() {
	this.open = this.held;
	if (!this.open) {
		for (c = 0; c < ship.crew.length; c++) {
			if (Math.pow(Math.pow(ship.crew[c].x - this.x, 2) + Math.pow(ship.crew[c].y - this.y, 2), 0.5) < 20) {
				this.open = true;
				break;
			}
		}
	}
	
	if (this.open) {
		if (this.gap < 28) this.gap += 4;
	} else {
		if (this.gap > 0) this.gap -= 4;
	}
}

//displays door
Door.prototype.draw = function() {
	ctx.fillStyle = "#333";
	if (this.orientation == "h") {
		ctx.fillRect(this.x - 18, this.y - 3, 18 - this.gap / 2, 6);
		ctx.fillRect(this.x + this.gap / 2, this.y - 3, 18 - this.gap / 2, 6);
	} else {
		ctx.fillRect(this.x - 3, this.y - 18, 6, 18 - this.gap / 2);
		ctx.fillRect(this.x - 3, this.y + this.gap / 2, 6, 18 - this.gap / 2);
	}
}

function areConnected (a, b) {
	if (a.room == b.room) return true;
	for (d = 0; d < ship.doors.length; d++) {
		if (ship.doors[d].connections.indexOf(a.id) >= 0 && ship.doors[d].connections.indexOf(b.id) >= 0) return true;
	}
	return false;
}


//SHIP
//player controlled ship
function Ship (id, grid, rooms, crew, doors) {
	this.id = id;
	
	this.hull = 40;	
	this.hullMax = 40;
	
	this.grid = grid;
	this.rooms = rooms;
	
	this.crew = crew;
	
	this.doors = doors;
	
	this.evasion = 0;
	this.pilot = 0;
	this.engine = 0;
}

//updates ship's contents
Ship.prototype.update = function () {
	for (d = 0; d < this.doors.length; d++) {
		this.doors[d].update();
	}
	if (!paused) {
		for (c = 0; c < this.crew.length; c++) {
			this.crew[c].update();
			if (this.crew[c].hp == 0) {
				this.crew.splice(c, 1);
				c--;
			}
		}
		for (r = 0; r < this.rooms.length; r++) {
			this.rooms[r].update();
		}
		flow();
	}
	this.evasion = 0;
	this.pilot = 0;
	this.engine = 0;
	for (r = 0; r < ship.rooms.length; r++) {
		if (this.rooms[r].system == "engine") {
			var bonus = 0;
			for (c = 0; c < this.crew.length; c++) {
				if (this.crew[c].location == ship.rooms[r].squares[0]) {
					bonus = this.crew[c].engine * 10;
				}
			}
			if (ship.rooms[r].hp > 50) this.engine = this.rooms[r].power * 10 + bonus;
			else if (ship.rooms[r].hp > 0) this.engine = this.rooms[r].power * 5 + bonus / 2;
		} else if (this.rooms[r].system == "pilot") {
			for (c = 0; c < this.crew.length; c++) {
				if (this.crew[c].location == this.rooms[r].squares[0]) {
					if (this.rooms[r].hp > this.rooms[r].hpMax / 2) this.pilot = 10 + ship.crew[c].pilot * 10;
					else if (this.rooms[r].hp > 0) this.pilot = 5 + this.crew[c].pilot * 5;
					break;
				}
			}
		}
	}
	if (this.pilot > 0 && this.engine > 0) this.evasion = this.pilot + this.engine;
}

//displays entire ship and contents
Ship.prototype.draw = function () {
	for (s = 0; s < this.grid.length; s++) {
		this.grid[s].draw();
	}
	for (r = 0; r < this.rooms.length; r++) {
		this.rooms[r].draw();
	}
	for (c = 0; c < this.crew.length; c++) {
		this.crew[c].draw();
	}
	for (d = 0; d < this.doors.length; d++) {
		this.doors[d].draw();
	}
	
	var flood = 0;
	for (s = 0; s < ship.grid.length; s++) {
		flood += ship.grid[s].water;
	}
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(0, 0, 150, 25);
	ctx.fillRect(150, 0, 150, 27);
	ctx.fillRect(300, 0, 150, 29);
	ctx.fillRect(450, 0, 153, 31);
	ctx.fillRect(5, 25, 88, 35);
	ctx.font="24px Aldrich";
	ctx.fillStyle = "white";
	ctx.fillText("HULL", 16, 50);
	
	for (i = 0; i < this.hullMax; i++) {
		if (i < this.hull) ctx.fillStyle = "white";
		else ctx.fillStyle = "black";
		var h;
		if(i < 10) h = 22;
		else if(i < 20) h = 24;
		else if(i < 30) h = 26;
		else h = 28;
		ctx.fillRect(3 + 15 * i, 0, 12, h);
	}
	
	ctx.fillStyle = "white";
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(5, 65, 88, 50);
	ctx.fillStyle = "white";
	ctx.font="10px Aldrich";
	
	ctx.fillText("Evasion  : "+this.evasion+"%", 11, 83);
	
	ctx.strokeStyle = "#faa";
	if (this.pilot == 0) {
		ctx.lineWidth = 2;
		ctx.beginPath();
    	ctx.arc(110, 79, 7, 0, 2 * Math.PI, false);
    	ctx.stroke();
    	for (p = 0; p < 4; p++) {
			ctx.beginPath();
			ctx.moveTo(110 + Math.cos(Math.PI * p / 4) * 10, 79 + Math.sin(Math.PI * p / 4) * 10);
			ctx.lineTo(110 - Math.cos(Math.PI * p / 4) * 10, 79 - Math.sin(Math.PI * p / 4) * 10)
			ctx.stroke();	
    	}
    	if (this.engine == 0) {
			for (p = 0; p < 5; p ++) {
				ctx.beginPath();
				ctx.arc(135 + Math.cos(Math.PI * p / 2.5) * 4, 79 + Math.sin(Math.PI * p / 2.5) * 4, 4, Math.PI * p / 2.5, Math.PI * p / 2.5 + Math.PI, false);
				ctx.stroke();	
			}
			ctx.beginPath();
			ctx.arc(135, 79, 9, 0, 2 * Math.PI, false);
			ctx.stroke();
    	}
	}
	else if (this.engine == 0) {
		ctx.lineWidth = 2;
		for (p = 0; p < 5; p ++) {
			ctx.beginPath();
    		ctx.arc(110 + Math.cos(Math.PI * p / 2.5) * 4, 79 + Math.sin(Math.PI * p / 2.5) * 4, 4, Math.PI * p / 2.5, Math.PI * p / 2.5 + Math.PI, false);
    		ctx.stroke();	
		}
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(110, 79, 9, 0, 2 * Math.PI, false);
		ctx.stroke();
	}
	
	ctx.fillText("Flooding : "+Math.floor(100*flood/(10*ship.grid.length))+"%", 11, 103);
	if (Math.floor(100*flood/(10*ship.grid.length)) >= 50) {
		ctx.fillStyle = "red";
		ctx.strokeStyle = "red";
		ctx.beginPath();
		ctx.moveTo(86, 108);
		ctx.lineTo(103, 125);
		ctx.lineTo(225, 125);
		ctx.stroke();
		ctx.fillText("Warning: High Flooding", 105, 120);
	}
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(5, 120, 88, 35 + this.crew.length*30);
	ctx.fillStyle = "white";
	ctx.font="24px Aldrich";
	ctx.fillText("CREW", 12, 147);
	
	for (c = 0; c < this.crew.length; c++) {
		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.fillRect(7, 155 + 30*c, 84, 28);
		if (mode == "move" && c == selected) {
			ctx.fillStyle = "rgba(0,255,0,0.25)";
			ctx.fillRect(5, 153 + 30*c, 88, 32);
		}
		ctx.fillStyle = "white";
		ctx.font="12px Aldrich";
		ctx.fillText(this.crew[c].name, 27, 170 + 30*c);
		ctx.fillStyle = this.crew[c].color;
		ctx.fillRect(15, 162 + 30*c, this.crew[c].w / 2, this.crew[c].h / 2)
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(27, 174 + 30*c, 60, 3);
		ctx.fillRect(27, 178 + 30*c, 60, 3);
		if (ship.crew[c].hp < ship.crew[c].hpMax / 2) ctx.fillStyle = "red";
		else if (ship.crew[c].hp < ship.crew[c].hpMax) ctx.fillStyle = "yellow";
		else ctx.fillStyle = "green";
		ctx.fillRect(27, 174 + 30*c, 60 * ship.crew[c].hp / ship.crew[c].hpMax, 3);
		ctx.fillStyle = "cyan";
		ctx.fillRect(27, 178 + 30*c, 60 * ship.crew[c].air / ship.crew[c].airMax, 3);
	}
	
	var startY = 160 + this.crew.length*30;
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(5, startY, 41, 41);
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.moveTo(10, startY + 5);
	ctx.lineTo(15, startY + 5);
	ctx.lineTo(15, startY + 15);
	ctx.lineTo(31, startY + 15);
	ctx.lineTo(31, startY + 5);
	ctx.lineTo(36, startY + 5);
	ctx.lineTo(41, startY + 10);
	ctx.lineTo(41, startY + 20);
	ctx.lineTo(10, startY + 20);
	ctx.fill();
	ctx.beginPath;
	ctx.moveTo(10, startY + 20);
	ctx.lineTo(15, startY + 20);
	ctx.lineTo(15, startY + 31);
	ctx.lineTo(36, startY + 31);
	ctx.lineTo(36, startY + 20);
	ctx.lineTo(41, startY + 20);
	ctx.lineTo(41, startY + 36);
	ctx.lineTo(10, startY + 36);
	ctx.fill();
	ctx.strokeStyle = "white";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(18, startY + 23);
	ctx.lineTo(33, startY + 23);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(18, startY + 26);
	ctx.lineTo(33, startY + 26);
	ctx.stroke();
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(52, startY, 41, 41);
	
	ctx.strokeStyle = "white";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(56, startY + 20);
	ctx.lineTo(89, startY + 20);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(55, startY + 19);
	ctx.lineTo(61, startY + 25);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(55, startY + 21);
	ctx.lineTo(61, startY + 15);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(90, startY + 19);
	ctx.lineTo(84, startY + 25);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(90, startY + 21);
	ctx.lineTo(84, startY + 15);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(72, startY + 4);
	ctx.lineTo(72, startY + 37);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(73, startY + 3);
	ctx.lineTo(66, startY + 9);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(71, startY + 3);
	ctx.lineTo(78, startY + 9);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(73, startY + 38);
	ctx.lineTo(66, startY + 32);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(71, startY + 38);
	ctx.lineTo(78, startY + 32);
	ctx.stroke();
}

//denotes connections between each square and how far it is from every other square
Ship.prototype.path = function () {
	//sets up all initial connections to adjacent squares
	for (s = 0; s < this.grid.length; s++) {
		for (p = 0; p < this.grid.length; p++) {
			if (s != p && Math.pow(Math.pow(this.grid[s].x - this.grid[p].x, 2) + Math.pow(this.grid[s].y - this.grid[p].y, 2), 0.5) < 57 && areConnected(this.grid[s], this.grid[p])) {
				this.grid[s].connections[0][this.grid[s].connections[0].length] = this.grid[p].id;
			}
		}
	}
	//sets up secondary and on connections
	var i = 0;
	var worthwhile = true;
	while (worthwhile) {
		worthwhile = false;
		for (r = 0; r < this.grid.length; r++) {
			this.grid[r].connections[i+1] = [];
			for (p = 0; p < this.grid.length; p++) {
				if(this.grid[r].connections[i].indexOf(this.grid[p].id) >= 0) {
					this.grid[r].connections[i+1] = joinArr(this.grid[r].connections[i+1], this.grid[p].connections[0]);
				}
			}
			for (n = this.grid[r].connections[i+1].length - 1; n >= 0; n--) {
				if(this.grid[r].connections[i+1][n] == this.grid[r].id) {
					this.grid[r].connections[i+1].splice(n, 1);
				}
				else {
					for(j = 0; j <= i; j++) {
						if (this.grid[r].connections[j].indexOf(this.grid[r].connections[i+1][n]) >= 0) this.grid[r].connections[i+1].splice(n, 1);
					}
				}
			}
			if (this.grid[r].connections[i+1].length > 0) worthwhile = true;
		}
		i++;
	}
}

/*Design of the kestrel from FTL
0  A  B  C  D  E  F  G  H  I  J  K  L  M  N  O
1                   [J][J]
2    [C][C][E][E]   [H][H][L][L]
3 [A][B][B]   [G][G][H][H][L][L][N][N][P][P][Q]
4 [A][B][B]   [G][G][I][I][M][M][O][O][P][P][Q]
5    [D][D][F][F]   [I][I][M][M]
6                   [K][K]
*/

var grid = [
	new Square(160, 280, "a3", "A"), new Square(160, 320, "a4", "A"),
	new Square(200, 240, "b2", "C"), new Square(200, 280, "b3", "B"), new Square(200, 320, "b4", "B"), new Square(200, 360, "b5", "D"),
	new Square(240, 240, "c2", "C"), new Square(240, 280, "c3", "B"), new Square(240, 320, "c4", "B"), new Square(240, 360, "c5", "D"),
	new Square(280, 240, "d2", "E"), new Square(280, 360, "d5", "F"),
	new Square(320, 240, "e2", "E"), new Square(320, 280, "e3", "G"), new Square(320, 320, "e4", "G"), new Square(320, 360, "e5", "F"),
	new Square(360, 280, "f3", "G"), new Square(360, 320, "f4", "G"),
	new Square(400, 200, "g1", "J"), new Square(400, 240, "g2", "H"), new Square(400, 280, "g3", "H"), new Square(400, 320, "g4", "I"), new Square(400, 360, "g5", "I"), new Square(400, 400, "g6", "K"),
	new Square(440, 200, "h1", "J"), new Square(440, 240, "h2", "H"), new Square(440, 280, "h3", "H"), new Square(440, 320, "h4", "I"), new Square(440, 360, "h5", "I"), new Square(440, 400, "h6", "K"),
	new Square(480, 240, "i2", "L"), new Square(480, 280, "i3", "L"), new Square(480, 320, "i4", "M"), new Square(480, 360, "i5", "M"),
	new Square(520, 240, "j2", "L"), new Square(520, 280, "j3", "L"), new Square(520, 320, "j4", "M"), new Square(520, 360, "j5", "M"),
	new Square(560, 280, "k3", "N"), new Square(560, 320, "k4", "O"),
	new Square(600, 280, "l3", "N"), new Square(600, 320, "l4", "O"),
	new Square(640, 280, "m3", "P"), new Square(640, 320, "m4", "P"),
	new Square(680, 280, "n3", "P"), new Square(680, 320, "n4", "P"),
	new Square(720, 280, "o3", "Q"), new Square(720, 320, "o4", "Q")
];

var rooms = [
	new Room(160, 300, 40, 80, "A", ["a3", "a4"]),
	new Room(220, 300, 80, 80, "B", ["b3", "b4", "c3", "c4"], "engine"),
	new Room(220, 240, 80, 40, "C", ["b2", "c2"], "drain"),
	new Room(220, 360, 80, 40, "D", ["b5", "c5"], "teleport"),
	new Room(300, 240, 80, 40, "E", ["d2", "e2"]),
	new Room(300, 360, 80, 40, "F", ["d5", "e5"]),
	new Room(340, 300, 80, 80, "G", ["e3", "e4", "f3", "f4"], "weapons"),
	new Room(420, 260, 80, 80, "H", ["g2", "g3", "h2", "h3"]),
	new Room(420, 340, 80, 80, "I", ["g4", "g5", "h4", "h5"], "cloak"),
	new Room(420, 200, 80, 40, "J", ["g1", "h1"]),
	new Room(420, 400, 80, 40, "K", ["g6", "h6"]),
	new Room(500, 260, 80, 80, "L", ["i2", "i3", "j2", "j3"], "medbay"),
	new Room(500, 340, 80, 80, "M", ["i4", "i5", "j4", "j5"]),
	new Room(580, 280, 80, 40, "N", ["k3", "l3"], "doors"),
	new Room(580, 320, 80, 40, "O", ["k4", "l4"], "sonar"),
	new Room(660, 300, 80, 80, "P", ["m3", "m4", "n3", "n4"], "drones"),
	new Room(720, 300, 40, 80, "Q", ["o3", "o4"], "pilot")
];

var doors = [
	new Door(180, 280, "v", ["a3", "b3"]), new Door(180, 320, "v", ["a4", "b4"]),
	new Door(240, 260, "h", ["c2", "c3"]), new Door(240, 340, "h", ["c4", "c5"]),
	new Door(260, 240, "v", ["c2", "d2"]), new Door(260, 360, "v", ["c5", "d5"]),
	new Door(320, 260, "h", ["e2", "e3"]), new Door(320, 340, "h", ["e4", "e5"]),
	new Door(380, 280, "v", ["f3", "g3"]), new Door(380, 320, "v", ["f4", "g4"]),
	new Door(440, 220, "h", ["h1", "h2"]), new Door(440, 380, "h", ["h5", "h6"]),
	new Door(460, 240, "v", ["h2", "i2"]), new Door(460, 360, "v", ["h5", "i5"]),
	new Door(480, 300, "h", ["i3", "i4"]),
	new Door(540, 280, "v", ["j3", "k3"]), new Door(540, 320, "v", ["j4", "k4"]),
	new Door(620, 280, "v", ["l3", "m3"]), new Door(620, 320, "v", ["l4", "m4"]),
	new Door(700, 320, "v", ["n4", "o4"]),
	new Door(140, 280, "v", ["a3", null]), new Door(140, 320, "v", ["a4", null]),
	new Door(400, 180, "h", ["g1", null]), new Door(440, 180, "h", ["h1", null]),
	new Door(400, 420, "h", ["g6", null]), new Door(440, 420, "h", ["h6", null])
];

var ship = new Ship("test", grid, rooms, [new CrewMember(720, 280, "o3", "cyan"), new CrewMember(320, 280, "e3"), new CrewMember(200, 280, "b3", "yellow"), new CrewMember(560, 320, "k4", "magenta", "Matt")], doors);
ship.path();


//BUBBLES
//bubbles for aesthetics
function Bubble () {
	this.x = Math.floor(Math.random() * 1200);
	this.y = Math.floor(Math.random() * 600);
	
	this.vx = Math.cos(Math.atan2(300 - this.y, 600 - this.x)) * 2 + 1;
	this.vy = Math.sin(Math.atan2(300 - this.y, 600 - this.x)) * 2;
	
	this.z = Math.floor(Math.random() * 40);
	this.r = Math.round(Math.pow(Math.random(), 2)) + 3;
}

Bubble.prototype.update = function () {
	this.x -= this.vx;
	this.y -= this.vy;
	
	this.z++;
	if (this.z > 40) {
		this.x = Math.floor(Math.random() * 1200);
		this.y = Math.floor(Math.random() * 600);
		this.vx = Math.cos(Math.atan2(300 - this.y, 600 - this.x)) * 2 + 1;
		this.vy = Math.sin(Math.atan2(300 - this.y, 600 - this.x)) * 2;
		this.z = 0;
		this.r = Math.floor(Math.random() * 3) + 3;
	}
}

Bubble.prototype.draw = function () {
	ctx.fillStyle = "rgba(255, 255, 255, "+(Math.sin(this.z * Math.PI / 40) / 4)+")";
	ctx.beginPath();
	ctx.arc(this.x, this.y, Math.max(this.r - (Math.cos(this.z * Math.PI / 80) * 2),0), 0, Math.PI * 2, false);
	ctx.fill();
}

var bubbles = [];

for (b = 0; b < 100; b++) {
	bubbles[b] = new Bubble();
}


//DRAW
setInterval(draw, 10);
frame = 0;
function draw() {
	ctx.fillStyle = "#005";
	ctx.fillRect(0, 0, 1200, 600);
	
	ctx.fillStyle = "rgba(0,0,0,0.01)";
	for (i = 0; i < 100; i+=1.5) {
		ctx.beginPath();
		ctx.ellipse(600, 300, i*6, i*3, 0, 0, Math.PI*2);
		ctx.fill();
	}
		
	for (b = 0; b < bubbles.length; b++) {
		if (frame % 5 == 0 && !paused) bubbles[b].update();
		bubbles[b].draw();
	}
	
	ctx.fillStyle = "#555";
	ctx.beginPath();
	ctx.moveTo(138, 255);
	ctx.lineTo(175, 215);
	ctx.lineTo(128, 215);
	ctx.lineTo(108, 195);
	ctx.lineTo(108, 155);
	ctx.lineTo(128, 135);
	ctx.lineTo(355, 135);
	ctx.lineTo(375, 155);
	ctx.lineTo(375, 178);
	ctx.lineTo(465, 178);
	ctx.lineTo(545, 215);
	ctx.lineTo(742, 255);
	ctx.lineTo(742, 345);
	ctx.lineTo(545, 385);
	ctx.lineTo(465, 422);
	ctx.lineTo(375, 422);
	ctx.lineTo(375, 445);
	ctx.lineTo(355, 465);
	ctx.lineTo(128, 465);
	ctx.lineTo(108, 445);
	ctx.lineTo(108, 405);
	ctx.lineTo(128, 385);
	ctx.lineTo(175, 385);
	ctx.lineTo(138, 345);
	ctx.lineTo(138, 255);
	ctx.fill();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(175, 215);
	ctx.lineTo(355, 215);
	ctx.lineTo(375, 195);
	ctx.lineTo(375, 178);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(175, 385);
	ctx.lineTo(355, 385);
	ctx.lineTo(375, 405);
	ctx.lineTo(375, 445);
	ctx.stroke();
	
	if (frame % 5 == 0) ship.update();
	ship.draw();
	
	ctx.fillStyle = "rgba(255,100,100,0.5)";
	ctx.beginPath();
	ctx.moveTo(780, 560);
	ctx.lineTo(780, 130);
	ctx.lineTo(840, 70);
	ctx.lineTo(1160, 70);
	ctx.lineTo(1160, 500);
	ctx.lineTo(1100, 560);
	ctx.lineTo(780, 560);
	ctx.fill();
	ctx.strokeStyle = "red";
	ctx.lineWidth = 2;
	ctx.stroke();
	
	/*ctx.globalAlpha = 0.1;
    ctx.drawImage(kestrelImg, 13, 25, kestrelImg.width * 1.15, kestrelImg.height * 1.15);
	ctx.globalAlpha = 1;*/
	
	if (paused) {
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(0, 0, 1200, 250);
		ctx.fillRect(0, 250, 565, 100);
		ctx.fillRect(590, 250, 20, 100);
		ctx.fillRect(635, 250, 565, 100);
		ctx.fillRect(0, 350, 1200, 250);
		ctx.fillStyle = "rgba(255,255,255,0.4)";
		ctx.fillRect(565, 250, 25, 100);
		ctx.fillRect(610, 250, 25, 100);
	}
	
	if (mode == "normal") {
		ctx.fillStyle = "#000";
		ctx.fillRect(mouseX - 3, mouseY - 7, 6, 14);
		ctx.fillRect(mouseX - 7, mouseY - 3, 14, 6);
		ctx.fillStyle = "#fff";
		ctx.fillRect(mouseX - 1, mouseY - 5, 2, 10);
		ctx.fillRect(mouseX - 5, mouseY - 1, 10, 2);
	}
	else if (mode == "move") { 
		ctx.fillStyle = "#000";
		ctx.fillRect(mouseX - 3, mouseY - 7, 6, 14);
		ctx.fillRect(mouseX - 7, mouseY - 3, 14, 6);
		ctx.fillStyle = "#0a0";
		ctx.fillRect(mouseX - 1, mouseY - 5, 2, 10);
		ctx.fillRect(mouseX - 5, mouseY - 1, 10, 2);
	}
	else if (mode == "water") {
		var fill;
		for (s = 0; s < ship.grid.length; s++) {
			if (mouseX > ship.grid[s].x - ship.grid[s].w / 2 - 1 && mouseX < ship.grid[s].x + ship.grid[s].w / 2 + 1 && mouseY > ship.grid[s].y - ship.grid[s].h / 2 - 1 && mouseY < ship.grid[s].y + ship.grid[s].h / 2 + 1) {
				fill = ship.grid[s].water;
				break;
			}
			if (s == ship.grid.length - 1) fill = 10;
		}
		ctx.fillStyle = "black";
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(mouseX, mouseY, 3, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX + 10, mouseY);
		ctx.stroke();
		ctx.fillRect(mouseX + 10, mouseY - 30, 8, 60);
		
		ctx.fillStyle = "blue";
		ctx.fillRect(mouseX + 10, mouseY + 30 - fill * 6, 8, fill * 6);
		
		ctx.strokeStyle = "white";
		ctx.beginPath();
		ctx.moveTo(mouseX + 14, mouseY + 15);
		ctx.lineTo(mouseX + 18, mouseY + 15);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(mouseX + 14, mouseY);
		ctx.lineTo(mouseX + 18, mouseY);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(mouseX + 14, mouseY - 15);
		ctx.lineTo(mouseX + 18, mouseY - 15);
		ctx.stroke();
	}
	
	frame++;
}


//IO
document.onmousemove = function(e) {
    e = window.event || e;
	
	//track location of mouse within canvas
	rect = canvas.getBoundingClientRect();
	mouseX = Math.round((e.clientX - rect.left));
	mouseY = Math.round((e.clientY - rect.top));
}

document.onmousedown = function(e) {
    e = window.event || e;
    e.preventDefault();
	
	//used to make sure one click only activates one action
	var handled = false;
	
	if (mode == "normal") {
		for (c = 0; c < ship.crew.length; c++) {
			//																																													ctx.fillRect(7, 155 + 30*c, 84, 28);
			if ((mouseX > ship.crew[c].x - ship.crew[c].w / 2 && mouseX < ship.crew[c].x + ship.crew[c].w / 2 && mouseY > ship.crew[c].y - ship.crew[c].h / 2 && mouseY < ship.crew[c].y + ship.crew[c].h / 2) || (mouseX > 7 && mouseX < 91 && mouseY > 155 + 30*c && mouseY < 183 + 30*c)) {
				mode = "move";
				selected = c;
				ship.crew[c].auto = false;
				handled = true;
			}
		}
		
		for (d = 0; d < ship.doors.length; d++) {
			if (mouseX > ship.doors[d].x - ship.doors[d].w / 2 && mouseX < ship.doors[d].x + ship.doors[d].w / 2 && mouseY > ship.doors[d].y - ship.doors[d].h / 2 && mouseY < ship.doors[d].y + ship.doors[d].h / 2) {
				ship.doors[d].open = !ship.doors[d].held;
				ship.doors[d].held = !ship.doors[d].held;
				handled = true;
			}
			
		}
	}
	
	if (mode == "move" && !handled) {
		for (r = 0; r < ship.rooms.length; r++) {
			if (mouseX > ship.rooms[r].x - ship.rooms[r].w / 2 && mouseX < ship.rooms[r].x + ship.rooms[r].w / 2 && mouseY > ship.rooms[r].y - ship.rooms[r].h / 2 && mouseY < ship.rooms[r].y + ship.rooms[r].h / 2) {
				if (ship.rooms[r].squares.indexOf(ship.crew[selected].location) < 0) {
					for (s = 0; s < ship.rooms[r].squares.length; s++) {
						var occupied = false;
						for (c = 0; c < ship.crew.length; c++) {
							if ((ship.crew[c].location == ship.rooms[r].squares[s] && ship.crew[c].target == ship.rooms[r].squares[s]) || ship.crew[c].goal == ship.rooms[r].squares[s]) {
								occupied = true;
								break;
							}
						}
						if (!occupied) {
							ship.crew[selected].goal = ship.rooms[r].squares[s];
							for (m = 0; m < ship.rooms.length; m++) {
								if (ship.rooms[m].squares[0] == ship.crew[selected].location) {
									if (ship.rooms[m].system != null) {
										for (p = 1; p < ship.rooms[m].squares.length; p++) {
											var assigned = false;
											for (c = 0; c < ship.crew.length; c++) {
												if (ship.rooms[m].squares[p] == ship.crew[c].location && ship.rooms[m].squares[p] == ship.crew[c].target && ship.crew[c].goal == null) {
													ship.crew[c].goal = ship.rooms[m].squares[0];
													ship.crew[c].auto = true;
													assigned = true;
													break;
												}
											}
											if (assigned) break;
											else {
												for (c = 0; c < ship.crew.length; c++) {
													if (ship.rooms[m].squares[p] == ship.crew[c].goal) {
														ship.crew[c].goal = ship.rooms[m].squares[0];
														assigned = true;
														break;
													}
												}
											}
											if (assigned) break;
										}
									}
									break;
								}
							}
							break;
						}
					}
				}
				mode = "normal";
				handled = true;
				break;
			}
		}
	}
	
	
	//ctx.fillRect(5, startY, 41, 41);
	//var startY = 160 + this.crew.length*30;
	
	if (mode == "normal" && mouseX > 5 && mouseX < 46 && mouseY > 160 + ship.crew.length*30 && mouseY < 201 + ship.crew.length*30) {
		for (c = 0; c < ship.crew.length; c++) {
			if (ship.crew[c].location == ship.crew[c].target) ship.crew[c].station = ship.crew[c].location;
			else ship.crew[c].station = ship.crew[c].goal;
		}
	}
	
	if (mode == "normal" && mouseX > 52 && mouseX < 93 && mouseY > 160 + ship.crew.length*30 && mouseY < 201 + ship.crew.length*30) {
		for (c = 0; c < ship.crew.length; c++) {
			if (!(ship.crew[c].location == ship.crew[c].station && ship.crew[c].target == ship.crew[c].station)) ship.crew[c].goal = ship.crew[c].station;
		}
	}
}

document.onkeydown = function(e) {
    e = window.event || e;
    var key = e.keyCode;
    e.preventDefault();
    
    if (key === 32) paused = !paused;
    else if (key ===16) mode = "water";
    else if (key === 188) {
    	for (d = 0; d < ship.doors.length; d++) {
    		ship.doors[d].open = true;
    		ship.doors[d].held = true;
    	}
    }
    else if (key === 190) {
    	for (d = 0; d < ship.doors.length; d++) {
    		ship.doors[d].open = false;
    		ship.doors[d].held = false;
    	}
    }
}

document.onkeyup = function(e) {
    e = window.event || e;
    var key = e.keyCode;
    e.preventDefault();
    
    if (key ===16) mode = "normal";
}