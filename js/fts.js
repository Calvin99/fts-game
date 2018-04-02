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
function CrewMember (x, y, location, color) {
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
	
	this.xspd = 4;
	this.yspd = 4;
	
	this.name = names.splice(Math.floor(Math.random() * names.length), 1);
	this.hp = 100;
	this.hpMax = 100;
	
	this.pilot = 0;
	this.gun = 0;
	this.sonar = 0;
	this.engine = 0;
	this.repair = 0;
}

//updates pathfinding and location of player controlled crew members
CrewMember.prototype.update = function() {
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
					var i = 0
					while (this.target == null) {
						for (p = 0; p < ship.grid.length; p++) {
							if (p != s && ship.grid[s].connections[0].indexOf(ship.grid[p].id) >= 0 && (ship.grid[p].connections[i].indexOf(this.goal) >= 0 || ship.grid[p].id == this.goal) && ship.grid[s].blacklist.indexOf(ship.grid[p].id) < 0) {
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
		
		var spdMod = 1;
		for (s = 0; s < ship.grid.length; s++) {
			if (ship.grid[s].id == this.location) {
				if (ship.grid[s].water > 5) spdMod = 1 / 2;
				if (ship.grid[s].water > 8) spdMod = 1 / 4;
				break;
			}
		}
		
		//updates location of the crew member
		if (this.x > this.xtarget) this.x -= this.xspd * spdMod;
		if (this.x < this.xtarget) this.x += this.xspd * spdMod;
		if (this.y > this.ytarget) this.y -= this.yspd * spdMod;
		if (this.y < this.ytarget) this.y += this.yspd * spdMod;
		
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
	
	this.hp = 100;
	
	this.power = 0;
	this.powerMax = 0;
	
	this.manned = false;
	
	this.squares = squares || [];
	
	this.system = system || null;
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
			if (ship.grid[s].water > 0) ship.grid[s].water -= 0.01;
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
		ctx.lineWidth = 3;
		for (p = 0; p < 5; p += 2) {
			ctx.beginPath();
    		ctx.arc(this.x + Math.cos(Math.PI * p / 3) * 4, this.y + Math.sin(Math.PI * p / 3) * 4, 4, Math.PI * p / 3, Math.PI * p / 3 + Math.PI, true);
    		ctx.stroke();	
		}
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 9, 0, 2 * Math.PI, false);
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
	this.hull = 100;
	this.grid = grid;
	this.rooms = rooms;
	this.crew = crew;
	this.doors = doors;
}

//updates ship's contents
Ship.prototype.update = function () {
	for (d = 0; d < this.doors.length; d++) {
		this.doors[d].update();
	}
	if (!paused) {
		for (c = 0; c < this.crew.length; c++) {
			this.crew[c].update();
		}
		for (r = 0; r < this.rooms.length; r++) {
			this.rooms[r].update();
		}
		flow();
	}
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
	ctx.fillRect(5, 45, 88, 50);
	ctx.fillStyle = "white";
	ctx.font="10px Aldrich";
	ctx.fillText("Flooding: "+Math.floor(100*flood/(10*ship.grid.length))+"%", 12, 60);
	
	ctx.fillStyle = "rgba(50,50,50,0.75)";
	ctx.fillRect(5, 100, 88, 35 + this.crew.length*30);
	ctx.fillStyle = "white";
	ctx.font="24px Aldrich";
	ctx.fillText("CREW", 12, 127);
	
	for (c = 0; c < this.crew.length; c++) {
		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.fillRect(7, 135 + 30*c, 84, 28);
		if (mode == "move" && c == selected) {
			ctx.fillStyle = "rgba(0,255,0,0.25)";
			ctx.fillRect(5, 133 + 30*c, 88, 32);
		}
		ctx.fillStyle = "white";
		ctx.font="12px Aldrich";
		ctx.fillText(this.crew[c].name, 27, 150 + 30*c);
		ctx.fillStyle = this.crew[c].color;
		ctx.fillRect(15, 142 + 30*c, this.crew[c].w / 2, this.crew[c].h / 2)
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(27, 154 + 30*c, 60, 5);
		ctx.fillStyle = "green";
		ctx.fillRect(27, 154 + 30*c, 60 * ship.crew[c].hp / ship.crew[c].hpMax, 5);
	}
}

//denotes connections between each square and how far it is from every other square
Ship.prototype.path = function () {
	//sets up all initial connections to adjacent squares
	for (s = 0; s < this.grid.length; s++) {
		for (p = 0; p < this.grid.length; p++) {
			if (s != p && Math.pow(Math.pow(this.grid[s].x - this.grid[p].x, 2) + Math.pow(this.grid[s].y - this.grid[p].y, 2), 0.5) < 45 && areConnected(this.grid[s], this.grid[p])) {
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

//   A  B  C  D  E  F  G  H  I  J  K  L  M  N  O
//1                   [J][J]
//2    [C][C][E][E]   [H][H][L][L]
//3 [A][B][B]   [G][G][H][H][L][L][N][N][P][P][Q]
//4 [A][B][B]   [G][G][I][I][M][M][O][O][P][P][Q]
//5    [D][D][F][F]   [I][I][M][M]
//6                   [K][K]

//design of the kestrel from FTL
var grid = [
	new Square(210, 140, "a3", "A"), new Square(210, 180, "a4", "A"),
	new Square(250, 100, "b2", "C"), new Square(250, 140, "b3", "B"), new Square(250, 180, "b4", "B"), new Square(250, 220, "b5", "D"),
	new Square(290, 100, "c2", "C"), new Square(290, 140, "c3", "B"), new Square(290, 180, "c4", "B"), new Square(290, 220, "c5", "D"),
	new Square(330, 100, "d2", "E"), new Square(330, 220, "d5", "F"),
	new Square(370, 100, "e2", "E"), new Square(370, 140, "e3", "G"), new Square(370, 180, "e4", "G"), new Square(370, 220, "e5", "F"),
	new Square(410, 140, "f3", "G"), new Square(410, 180, "f4", "G"),
	new Square(450,  60, "g1", "J"), new Square(450, 100, "g2", "H"), new Square(450, 140, "g3", "H"), new Square(450, 180, "g4", "I"), new Square(450, 220, "g5", "I"), new Square(450, 260, "g6", "K"),
	new Square(490,  60, "h1", "J"), new Square(490, 100, "h2", "H"), new Square(490, 140, "h3", "H"), new Square(490, 180, "h4", "I"), new Square(490, 220, "h5", "I"), new Square(490, 260, "h6", "K"),
	new Square(530, 100, "i2", "L"), new Square(530, 140, "i3", "L"), new Square(530, 180, "i4", "M"), new Square(530, 220, "i5", "M"),
	new Square(570, 100, "j2", "L"), new Square(570, 140, "j3", "L"), new Square(570, 180, "j4", "M"), new Square(570, 220, "j5", "M"),
	new Square(610, 140, "k3", "N"), new Square(610, 180, "k4", "O"),
	new Square(650, 140, "l3", "N"), new Square(650, 180, "l4", "O"),
	new Square(690, 140, "m3", "P"), new Square(690, 180, "m4", "P"),
	new Square(730, 140, "n3", "P"), new Square(730, 180, "n4", "P"),
	new Square(770, 140, "o3", "Q"), new Square(770, 180, "o4", "Q")
];

var rooms = [
	new Room(210, 160, 40, 80, "A", ["a3", "a4"]),
	new Room(270, 160, 80, 80, "B", ["b3", "b4", "c3", "c4"], "engine"),
	new Room(270, 100, 80, 40, "C", ["b2", "c2"], "drain"),
	new Room(270, 220, 80, 40, "D", ["b5", "c5"]),
	new Room(350, 100, 80, 40, "E", ["d2", "e2"]),
	new Room(350, 220, 80, 40, "F", ["d5", "e5"]),
	new Room(390, 160, 80, 80, "G", ["e3", "e4", "f3", "f4"], "weapons"),
	new Room(470, 120, 80, 80, "H", ["g2", "g3", "h2", "h3"]),
	new Room(470, 200, 80, 80, "I", ["g4", "g5", "h4", "h5"]),
	new Room(470,  60, 80, 40, "J", ["g1", "h1"]),
	new Room(470, 260, 80, 40, "K", ["g6", "h6"]),
	new Room(550, 120, 80, 80, "L", ["i2", "i3", "j2", "j3"], "medbay"),
	new Room(550, 200, 80, 80, "M", ["i4", "i5", "j4", "j5"]),
	new Room(630, 140, 80, 40, "N", ["k3", "l3"], "doors"),
	new Room(630, 180, 80, 40, "O", ["k4", "l4"], "sonar"),
	new Room(710, 160, 80, 80, "P", ["m3", "m4", "n3", "n4"]),
	new Room(770, 160, 40, 80, "Q", ["o3", "o4"], "pilot")
];

var doors = [
	new Door(230, 140, "v", ["a3", "b3"]), new Door(230, 180, "v", ["a4", "b4"]),
	new Door(290, 120, "h", ["c2", "c3"]), new Door(290, 200, "h", ["c4", "c5"]),
	new Door(310, 100, "v", ["c2", "d2"]), new Door(310, 220, "v", ["c5", "d5"]),
	new Door(370, 120, "h", ["e2", "e3"]), new Door(370, 200, "h", ["e4", "e5"]),
	new Door(430, 140, "v", ["f3", "g3"]), new Door(430, 180, "v", ["f4", "g4"]),
	new Door(490,  80, "h", ["h1", "h2"]), new Door(490, 240, "h", ["h5", "h6"]),
	new Door(510, 100, "v", ["h2", "i2"]), new Door(510, 220, "v", ["h5", "i5"]),
	new Door(530, 160, "h", ["i3", "i4"]),
	new Door(590, 140, "v", ["j3", "k3"]), new Door(590, 180, "v", ["j4", "k4"]),
	new Door(670, 140, "v", ["l3", "m3"]), new Door(670, 180, "v", ["l4", "m4"]),
	new Door(750, 180, "v", ["n4", "o4"]),
	new Door(190, 140, "v", ["a3", null]), new Door(190, 180, "v", ["a4", null]),
	new Door(450,  40, "h", ["g1", null]), new Door(490,  40, "h", ["h1", null]),
	new Door(450, 280, "h", ["g6", null]), new Door(490, 280, "h", ["h6", null])
];

var ship = new Ship("test", grid, rooms, [new CrewMember(210, 140, "a3", "cyan"), new CrewMember(250, 140, "b3"), new CrewMember(290, 140, "c3", "yellow")], doors);
ship.path();


//DRAW
setInterval(draw, 10);
frame = 0;
function draw() {
	ctx.fillStyle = "#005";
	ctx.fillRect(0, 0, 1000, 600);
	
	ship.draw();
	if (frame % 5 == 0) ship.update();
	
	/*ctx.globalAlpha = 0.25;
    ctx.drawImage(kestrelImg, 63, -115, kestrelImg.width * 1.15, kestrelImg.height * 1.15);
	ctx.globalAlpha = 1;*/
	
	if (paused) {
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(0, 0, 1000, 250);
		ctx.fillRect(0, 250, 465, 100);
		ctx.fillRect(490, 250, 20, 100);
		ctx.fillRect(535, 250, 465, 100);
		ctx.fillRect(0, 350, 1000, 250);
		ctx.fillStyle = "rgba(255,255,255,0.4)";
		ctx.fillRect(465, 250, 25, 100);
		ctx.fillRect(510, 250, 25, 100);
	}
	
	ctx.fillStyle = "#000";
	ctx.fillRect(mouseX - 3, mouseY - 7, 6, 14);
	ctx.fillRect(mouseX - 7, mouseY - 3, 14, 6);
	if (mode == "normal") ctx.fillStyle = "#fff";
	if (mode == "move") ctx.fillStyle = "#0a0";
	ctx.fillRect(mouseX - 1, mouseY - 5, 2, 10);
	ctx.fillRect(mouseX - 5, mouseY - 1, 10, 2);
	
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
			//																																													ctx.fillRect(7, 135 + 30*c, 84, 28);
			if ((mouseX > ship.crew[c].x - ship.crew[c].w / 2 && mouseX < ship.crew[c].x + ship.crew[c].w / 2 && mouseY > ship.crew[c].y - ship.crew[c].h / 2 && mouseY < ship.crew[c].y + ship.crew[c].h / 2) || (mouseX > 7 && mouseX < 91 && mouseY > 135 + 30*c && mouseY < 163 + 30*c)) {
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
				for (s = 0; s < ship.rooms[r].squares.length; s++) {
					var occupied = false;
					for (c = 0; c < ship.crew.length; c++) {
						if (c != selected && ((ship.crew[c].location == ship.rooms[r].squares[s] && ship.crew[c].target == ship.rooms[r].squares[s]) || ship.crew[c].goal == ship.rooms[r].squares[s])) {
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
											if (ship.rooms[m].squares[p] == ship.crew[c].location && ship.rooms[m].squares[p] == ship.crew[c].target) {
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
				mode = "normal";
				handled = true;
				break;
			}
		}
	}
}

document.onkeydown = function(e) {
    e = window.event || e;
    var key = e.keyCode;
    e.preventDefault();
    
    if (key === 32) paused = !paused;
}