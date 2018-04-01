var canvas = document.getElementById("fts");
var ctx = canvas.getContext("2d");

console.clear();

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
//player controlled crew members
function CrewMember (x, y, location) {
	this.x = x;
	this.y = y;
	
	this.w = 15;
	this.h = 25;
	
	this.goal = null;
	this.xgoal = null;
	this.ygoal = null;
	
	this.target = location;
	this.xtarget = x;
	this.ytarget = y;
	
	this.location = location;
	
	this.spd = 2;
	
	this.hp = 100;
	
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
			for (r = 0; r < ship.grid.length; r++) {
				if (ship.grid[r].id == location) {
					var i = 0;
					while (target = null) {
						for (p = 0; r < ship.grid.length; p++) {
							if (ship.grid[r].connections[0].indexOf(ships.grid[p].id) >= 0 && ships.grid[p].connections[i].indexOf(goal) >=0) {
								target = ships.grid[p].connections[i][ships.grid[p].connections[i].indexOf(goal)];
								for (t = 0; t < ship.grid.length; t++) {
									if (ship.grid[t].id == target) {
										targetx = ship.grid[t].x;
										targety = ship.grid[t].y;
										break;
									}
								}
								break;
							}
						}
						i++;
					}
					break;
				}
			}
		}
		
		//updates location of the crew member
		if (this.x > this.xtarget) this.x -= this.spd;
		if (this.x < this.xtarget) this.x += this.spd;
		if (this.y > this.ytarget) this.y -= this.spd;
		if (this.y < this.ytarget) this.y += this.spd;
		
		//checks if arrived at target location
		if (this.x == this.xtarget && this.y == this.ytarget) {
			this.location = this.target;
			
		}
	}
}

//displays player controlled crew members
CrewMember.prototype.draw = function() {
	ctx.fillStyle = "#f00";
	ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
}


//SQUARE
//individual squares of the ship
function Square (x, y, id, blacklist) {
	this.id = id;

	this.x = x;
	this.y = y;
	
	this.w = 40;
	this.h = 40;
	
	this.connections = [];
	this.connections[0] = [];
	
	//used to denote walls, empty by default
	this.blacklist = blacklist || [];
}

//displays individual squares
Square.prototype.draw = function () {
	ctx.fillStyle = "#aaa";
	ctx.fillRect(this.x - this.w / 2 - 1, this.y - this.h / 2 - 1, this.w + 2, this.h + 2);
	ctx.fillStyle = "#666";
	ctx.fillRect(this.x - this.w / 2 + 1, this.y - this.h / 2 + 1, this.w - 2, this.h - 2);
}


//SHIP
//player controlled ship
function Ship (id, grid, crew) {
	this.id = id;
	this.hull = 100;
	this.grid = grid;
	this.crew = crew;
}

//displays entire ship and contents
Ship.prototype.draw = function () {
	for (r = 0; r < this.grid.length; r++) {
		this.grid[r].draw();
	}
	for (c = 0; c < this.crew.length; c++) {
		this.crew[c].draw();
	}
}

//updates ship's contents
Ship.prototype.update = function () {
	for (c = 0; c < this.crew.length; c++) {
		this.crew[c].update();
	}
}

//denotes connections between each square and how far it is from every other square
Ship.prototype.path = function () {
	for (r = 0; r < this.grid.length; r++) {
		for (p = 0; p < this.grid.length; p++) {
			if (r != p && Math.pow(Math.pow(this.grid[r].x - this.grid[p].x, 2) + Math.pow(this.grid[r].y - this.grid[p].y, 2), 0.5) < 45 && this.grid[r].blacklist.indexOf(this.grid[p].id) == -1) {
				this.grid[r].connections[0][this.grid[r].connections[0].length] = this.grid[p].id;
			}
		}
	}
	var i = 0;
	var worthwhile = true;
	while (worthwhile) {
		worthwhile = false;
		for (r = 0; r < this.grid.length; r++) {
			this.grid[r].connections[i+1] = [];
			for (p = 0; p < this.grid.length; p++) {
				if(this.grid[r].connections[i].indexOf(this.grid[p].id) >= 0) {
					this.grid[r].connections[i+1] = joinArr(this.grid[r].connections[i+1], this.grid[p].connections[i]);
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

var grid = [new Square(60, 60, "a1"), new Square(100, 60, "b1"), new Square(140, 60, "c1"), new Square(180, 60, "d1"), new Square(220, 60, "e1"), new Square(60, 100, "a2"), new Square(220, 100, "e2"), new Square(60, 140, "a3"), new Square(100, 140, "b3"), new Square(140, 140, "c3"), new Square(180, 140, "d3"), new Square(220, 140, "e3")];

var ship = new Ship("test", grid, [new CrewMember(60, 60, "a1")]);
ship.path();


//DRAW
setInterval(draw, 50);

function draw() {
	ctx.fillStyle = "#005";
	ctx.fillRect(0, 0, 1000, 600);
	ship.draw();
	ship.update();
}