var Mode = require('./Mode');

function Teams() {
    Mode.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 1;
    this.name = "Teams";
    this.decayMod = 1.5;
    this.packetLB = 50;
    this.haveTeams = true;
    this.colorFuzziness = 32;

    this.colors = [
        {'r':235, 'g': 75, 'b':  0},
        {'r':225, 'g':125, 'b':255},
        {'r':180, 'g':  7, 'b': 20},
        {'r': 80, 'g':170, 'b':240},
        {'r':180, 'g': 90, 'b':135},
        {'r':195, 'g':240, 'b':  0},
        {'r':150, 'g': 18, 'b':255},
        {'r': 80, 'g':245, 'b':  0},
        {'r':165, 'g': 25, 'b':  0},
        {'r': 80, 'g':145, 'b':  0},
        {'r': 80, 'g':170, 'b':240},
        {'r': 55, 'g': 92, 'b':255},
    ];
    this.nodes = []; // Teams
    this.teamMap = {
        teamAmount: 0,
        teams :{}
    };
}

module.exports = Teams;
Teams.prototype = new Mode();

//Gamemode Specific Functions

Teams.prototype.fuzzColorComponent = function(component) {
    component += Math.random() * this.colorFuzziness >> 0;
    return component;
};

Teams.prototype.getTeamColor = function(team) {
    var color = this.colors[team];
    return color;
//    return {
 //       r: this.fuzzColorComponent(color.r),
  //      b: this.fuzzColorComponent(color.b),
   //     g: this.fuzzColorComponent(color.g)
   // };
};

// Override

Teams.prototype.onPlayerSpawn = function(gameServer,player) {
    // Random color based on team
    var name = player.getName();

    var dash = name.indexOf("-");
    
    if (dash === -1) {
        player.setName("SIN EQUIPO");
        player.color = {'r':0, 'g': 0, 'b':  0};
        player.team = null;
    } else {
        var team = name.substring(0, dash);
	var playerName = name.substring(dash + 1);
        if (!this.teamMap.teams.hasOwnProperty(team)) {
            this.teamMap.teams[team] = this.teamMap.teamAmount;
            this.nodes[this.teamMap.teamAmount++] = [];
	}
 
        player.setName(playerName)
        player.team = this.teamMap.teams[team];
        player.color = this.getTeamColor(player.team);
    }
    // Spawn player
    gameServer.spawnPlayer(player);
};

Teams.prototype.onServerInit = function(gameServer) {
};

Teams.prototype.onPlayerInit = function(player) {
};

Teams.prototype.onCellAdd = function(cell) {
    if (cell.owner.getTeam() === null) {
        return;
    }
    // Add to team list
    this.nodes[cell.owner.getTeam()].push(cell);
};

Teams.prototype.onCellRemove = function(cell) {
    if (cell.owner.getTeam() === null) {
        return;
    }
    // Remove from team list
    var index = this.nodes[cell.owner.getTeam()].indexOf(cell);
    if (index != -1) {
        this.nodes[cell.owner.getTeam()].splice(index, 1);
    }
};

Teams.prototype.onCellMove = function(x1,y1,cell) {
    var team = cell.owner.getTeam();
    var r = cell.getSize();

    // Find team
    for (var i = 0; i < cell.owner.visibleNodes.length;i++) {
        // Only collide with player cells
        var check = cell.owner.visibleNodes[i];

        if ((check.getType() != 0) || (cell.owner == check.owner)){
            continue;
        }

        // Collision with teammates
        if (check.owner.getTeam() == team) {
            // Check if in collision range
            var collisionDist = check.getSize() + r; // Minimum distance between the 2 cells
            if (!cell.simpleCollide(x1,y1,check, collisionDist)) {
                // Skip
                continue;
            }

            // First collision check passed... now more precise checking
            dist = cell.getDist(cell.position.x,cell.position.y,check.position.x,check.position.y);

            // Calculations
            if (dist < collisionDist) { // Collided
                // The moving cell pushes the colliding cell
                var newDeltaY = check.position.y - y1;
                var newDeltaX = check.position.x - x1;
                var newAngle = Math.atan2(newDeltaX,newDeltaY);

                var move = collisionDist - dist;

                check.position.x = check.position.x + ( move * Math.sin(newAngle) ) >> 0;
                check.position.y = check.position.y + ( move * Math.cos(newAngle) ) >> 0;
            }
        }
    }
};

Teams.prototype.messages = ["NOP :P", "PRIMERO METETE EN UN EQUIPO"];

Teams.prototype.pressW = function(gameServer, player) {
    if (player.getTeam() === null) {
        player.setName(this.messages[Math.floor(Math.random() * 2)]);
    }
    Mode.prototype.pressW(gameServer, player);
}

Teams.prototype.pressSpace = function(gameServer, player) {
    if (player.getTeam() === null) {
        player.setName(this.messages[Math.floor(Math.random() * 2)]);
    }
    Mode.prototype.pressSpace(gameServer, player);
}

Teams.prototype.updateLB = function(gameServer) {
    var total = 0;
    var teamMass = [];
    // Get mass
    for (var i = 0; i < this.teamMap.teamAmount; i++) {
        // Set starting mass
        teamMass[i] = 0;

        // Loop through cells
        for (var j = 0; j < this.nodes[i].length;j++) {
            var cell = this.nodes[i][j];

            if (!cell) {
                continue;
            }

            teamMass[i] += cell.mass;
            total += cell.mass;
        }
    }
    // Calc percentage
    for (var i = 0; i < this.teamMap.teamAmount; i++) {
        // No players
        if (total <= 0) {
            continue;
        }

        gameServer.leaderboard[i] = teamMass[i]/total;
    }
};

