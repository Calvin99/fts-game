var canvas = document.getElementById("fts");
var ctx = canvas.getContext("2d");

console.clear();

var mouseX = null, mouseY = null;

var mode = "normal";
var selected = null;

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
function CrewMember (x, y, location, color) {
	this.x = x;
	this.y = y;
	
	this.w = 15;
	this.h = 25;
	
	this.color = color || "red";
	
	this.goal = null;
	this.xgoal = null;
	this.ygoal = null;
	
	this.target = location;
	this.xtarget = x;
	this.ytarget = y;
	
	this.location = location;
	
	this.xspd = 4;
	this.yspd = 2;
	
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
			/*for (r = 0; r < ship.grid.length; r++) {
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
			}*/
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
		
		//updates location of the crew member
		if (this.x > this.xtarget) this.x -= this.xspd;
		if (this.x < this.xtarget) this.x += this.xspd;
		if (this.y > this.ytarget) this.y -= this.yspd;
		if (this.y < this.ytarget) this.y += this.yspd;
		
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
	for (c = 0; c < ship.crew.length; c++) {
		if (ship.crew[c].goal == this.id) {
			ctx.fillStyle = "rgba(0,255,0,0.125)";
			ctx.fillRect(this.x - this.w / 2 - 1, this.y - this.h / 2 - 1, this.w + 2, this.h + 2);
		}
	}
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
	//sets up all initial connections to adjacent squares
	for (s = 0; s < this.grid.length; s++) {
		for (p = 0; p < this.grid.length; p++) {
			if (s != p && Math.pow(Math.pow(this.grid[s].x - this.grid[p].x, 2) + Math.pow(this.grid[s].y - this.grid[p].y, 2), 0.5) < 45 && this.grid[s].blacklist.indexOf(this.grid[p].id) == -1) {
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

var labels = ["a", "b", "c", "d", "e", "f", "g", "h"];

var grid = [];//[new Square(60, 60, "a1"), new Square(100, 60, "b1"), new Square(140, 60, "c1"), new Square(180, 60, "d1"), new Square(220, 60, "e1"), new Square(60, 100, "a2"), new Square(220, 100, "e2"), new Square(60, 140, "a3"), new Square(100, 140, "b3"), new Square(140, 140, "c3"), new Square(180, 140, "d3"), new Square(220, 140, "e3")];

for (i = 0; i < 7; i++) {
	for (j = 0 + (i%2)*2; j < 8; j += 1 + (i%2)*2) {
		grid[grid.length] = new Square(60 + 40 * j, 60 + 40 * i, labels[j]+(i+1));
	}	
}

var ship = new Ship("test", grid, [new CrewMember(60, 60, "a1", "cyan"), new CrewMember(100, 60, "b1")]);
ship.path();


//DRAW
setInterval(draw, 50);

function draw() {
	ctx.fillStyle = "#005";
	ctx.fillRect(0, 0, 1000, 600);
	
	ship.draw();
	ship.update();
	
	if (mode == "normal") ctx.fillStyle = "#000";
	if (mode == "move") ctx.fillStyle = "#f0f";
	ctx.fillRect(mouseX - 2, mouseY - 6, 4, 12);
	ctx.fillRect(mouseX - 6, mouseY - 2, 12, 4);
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
	
	//used to make sure one click only activates one action
	var handled = false;
	
	if (mode == "normal") {
		for (c = 0; c < ship.crew.length; c++) {
			if (mouseX > ship.crew[c].x - ship.crew[c].w / 2 && mouseX < ship.crew[c].x + ship.crew[c].w / 2 && mouseY > ship.crew[c].y - ship.crew[c].h / 2 && mouseY < ship.crew[c].y + ship.crew[c].h / 2) {
				mode = "move";
				selected = c;
				handled = true;
			}
		}
	}
	
	if (mode == "move" && !handled) {
		for (s = 0; s < ship.grid.length; s++) {
			if (mouseX > ship.grid[s].x - ship.grid[s].w / 2 && mouseX < ship.grid[s].x + ship.grid[s].w / 2 && mouseY > ship.grid[s].y - ship.grid[s].h / 2 && mouseY < ship.grid[s].y + ship.grid[s].h / 2) {
				var occupied = false;
				for (c = 0; c < ship.crew.length; c++) {
					if (c != selected && (ship.crew[c].location == ship.grid[s].id || ship.crew[c].goal == ship.grid[s].id)) {
						occupied = true;
						break;
					}
				}
				if (!occupied) {
					ship.crew[selected].goal = ship.grid[s].id;
				}
				mode = "normal";
				handled = true;
				break;
			}
		}
	}
}