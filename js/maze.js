var canvas = $("#maze_canvas")[0];
var g = canvas.getContext('2d');

var TILE_SIZE = 8;

//var MAZE_INDEX = 3;
var MAZE_INDEX = Math.floor((Math.random() * 19) + 1);
var MAZE_IMG_PATH = "img/maze (" + MAZE_INDEX + ").gif";
//var MAZE_IMG_PATH = "img/maze_big.gif";
var MAZE_TILES;
var MAZE_IMG = new Image();

var PLAYER_POS = {x: 0, y: 0};
var PLAYER_SPEED = {x: 0, y: 0};

var START = {x: 0, y: 0};
var END = {x: 0, y: 0};

var SIDE = {UP: 0, DOWN: 1, RIGHT: 2, LEFT: 3};

var KEY = {UP: 87, DOWN: 83, RIGHT: 68, LEFT: 65, SOLVE: 82};

MAZE_IMG.onload = function() {
    canvas.width = MAZE_IMG.width;
    canvas.height = MAZE_IMG.height;
    MAZE_TILES = MAZE_IMG.width / TILE_SIZE;
    init();
    setInterval(loop, 1);
};

MAZE_IMG.src = MAZE_IMG_PATH;

var debug_solve = false;

function loop() {
    g.drawImage(MAZE_IMG, 0, 0);
    if(pf_solved)
        pf_drawPath();
    else {
        if (debug_solve) {
            if(pf_solved) debug_solve = false;
            pf_nextStep();
            pf_drawProgress();
        }
    }
    movePlayer();
    g.fillStyle = "#F0F";
    g.fillRect(PLAYER_POS.x, PLAYER_POS.y, TILE_SIZE, TILE_SIZE);
}

function init() {
    g.drawImage(MAZE_IMG, 0, 0);
    findEntryPoints();
    PLAYER_POS.x = START.x * TILE_SIZE;
    PLAYER_POS.y = START.y * TILE_SIZE;
    pf_init();
}

function movePlayer() {
    if(pf_autopilot) {
        pf_movePlayer();
    } else {
        if(PLAYER_SPEED.x == 1) {
            if(!isPlayerCollision(SIDE.RIGHT))
                PLAYER_POS.x += 1;
        } else if(PLAYER_SPEED.x == -1) {
            if(!isPlayerCollision(SIDE.LEFT))
                PLAYER_POS.x -= 1;
        }
        if(PLAYER_SPEED.y == 1) {
            if(!isPlayerCollision(SIDE.DOWN))
                PLAYER_POS.y += 1;
        } else if(PLAYER_SPEED.y == -1) {
            if(!isPlayerCollision(SIDE.UP))
                PLAYER_POS.y -= 1;
        }
    }
}

function isWall(x, y) {
    var imgData = g.getImageData(x * TILE_SIZE, y * TILE_SIZE, 1, 1);
    return imgData.data[0] == 0 && imgData.data[1] == 0 && imgData.data[2] == 0;
}

function isPlayerCollision(side) {
    var imgData;
    if(side == SIDE.UP) {
        if(PLAYER_POS.y - 1 < 0) return true;
        imgData = g.getImageData(PLAYER_POS.x, PLAYER_POS.y - 1, TILE_SIZE, 1);
    } else if(side == SIDE.DOWN) {
        if(PLAYER_POS.y + TILE_SIZE > canvas.height) return true;
        imgData = g.getImageData(PLAYER_POS.x, PLAYER_POS.y + TILE_SIZE, TILE_SIZE, 1);
    } else if(side == SIDE.RIGHT) {
        if(PLAYER_POS.x + TILE_SIZE > canvas.width) return true;
        imgData = g.getImageData(PLAYER_POS.x + TILE_SIZE, PLAYER_POS.y, 1, TILE_SIZE);
    } else if(side == SIDE.LEFT) {
        if(PLAYER_POS.x - 1 < 0) return true;
        imgData = g.getImageData(PLAYER_POS.x - 1, PLAYER_POS.y, 1, TILE_SIZE);
    }
    for(var i = 0; i < imgData.data.length; i+=4) {
        if(imgData.data[i] == 0 && imgData.data[i+1] == 0 && imgData.data[i+2] == 0) {
            return true;
        }
    }
    return false;
}

function findEntryPoints() {
    var startSet = false;
    for(var y = 1; y < MAZE_TILES - 1; y++) {
        for(var x = 1; x < MAZE_TILES - 1; x++) {
            if(y > 1 && y != MAZE_TILES - 2) {
                if(x > 1 && x != MAZE_TILES - 2) x = MAZE_TILES - 2;
            }
            if(!isWall(x, y)) {
                if(!startSet) {
                    START = {x: x, y: y};
                    startSet = true;
                } else {
                    END = {x: x, y: y};
                    return;
                }
            }
        }
    }
}

$(document).keydown(function(e) {
    switch(e.keyCode) {
        case KEY.UP:
            PLAYER_SPEED.y = -1;
            break;
        case KEY.DOWN:
            PLAYER_SPEED.y = 1;
            break;
        case KEY.RIGHT:
            PLAYER_SPEED.x = 1;
            break;
        case KEY.LEFT:
            PLAYER_SPEED.x = -1;
    }
});

$(document).keyup(function(e) {
    switch(e.keyCode) {
        case KEY.UP:
            PLAYER_SPEED.y = 0;
            break;
        case KEY.DOWN:
            PLAYER_SPEED.y = 0;
            break;
        case KEY.RIGHT:
            PLAYER_SPEED.x = 0;
            break;
        case KEY.LEFT:
            PLAYER_SPEED.x = 0;
            break;
        case KEY.SOLVE:
            pf_solve();
    }
});

/*==============PATHFINDING (PF)=============*/
var pf_solved = false;
var pf_autopilot = false;
var pf_currentIndex = 0;
var pf_indices = [];
var pf_path_tiles = [];

function pf_init() {
    for(var i = 0; i  < MAZE_TILES; i++) {
        pf_indices[i] = [];
        for(var j = 0; j < MAZE_TILES; j++) {
            if(i == 0 || i == MAZE_TILES - 1 || j == 0 || j == MAZE_TILES - 1)
                pf_indices[i][j] = -2;
            else
                pf_indices[i][j] = -1;
        }
    }
    pf_indices[START.x][START.y] = 0;
    //console.log(pf_indices[END.x][END.y]);
}

function pf_nextStep() {
    if(pf_solved) return;
    var currentTiles = [];
    for(var x = 0; x  < MAZE_TILES; x++) {
        for(var y = 0; y < MAZE_TILES; y++) {
            if(pf_indices[x][y] == pf_currentIndex)
                currentTiles.push({x: x, y: y});
        }
    }
    pf_currentIndex++;
    //console.log("Current num of tiles: " + currentTiles.length + "; Searching for indes: " + pf_currentIndex);
    for(var i = 0; i < currentTiles.length && !pf_solved; i++) {
        var x = currentTiles[i].x;
        var y = currentTiles[i].y;
        if(END.x == x && END.y == y) {
            pf_solved = true;
            pf_indices[x][y] = pf_currentIndex;
            pf_generatePath();
            return;
        }
        if(x > 1 && pf_indices[x - 1][y] == -1 && !isWall(x - 1, y))
            pf_indices[x - 1][y] = pf_currentIndex;
        if(x < MAZE_TILES - 2 && pf_indices[x + 1][y] == -1 && !isWall(x + 1, y))
            pf_indices[x + 1][y] = pf_currentIndex;
        if(y > 1 && pf_indices[x][y - 1] == -1 && !isWall(x, y - 1))
            pf_indices[x][y - 1] = pf_currentIndex;
        if(y < MAZE_TILES - 2 && pf_indices[x][y + 1] == -1 && !isWall(x, y + 1))
            pf_indices[x][y + 1] = pf_currentIndex;
    }
}

function pf_drawProgress() {
    for(var x = 0; x < MAZE_TILES; x++) {
        for(var y = 0; y < MAZE_TILES; y++) {
            if(pf_indices[x][y] > 0) {
                g.fillStyle = "hsl(" + pf_indices[x][y] * 3 + ", 100%, 20%)";
                g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function pf_generatePath() {
    var x = END.x;
    var y = END.y;
    var index = pf_indices[x][y];
    while(index > 0) {
        pf_path_tiles.push({x: x, y: y});
        if(x < MAZE_TILES - 1 && pf_indices[x + 1][y] == index - 1 && !isWall(x + 1, y))
            x++;
        if(x > 1 && pf_indices[x - 1][y] == index - 1 && !isWall(x - 1, y))
            x--;
        if(y < MAZE_TILES - 1 && pf_indices[x][y + 1] == index - 1 && !isWall(x, y + 1))
            y++;
        if(y > 1 && pf_indices[x][y - 1] == index - 1 && !isWall(x, y - 1))
            y--;
        index--;
    }
    pf_path_tiles.push({x: x, y: y});
}

function pf_drawPath() {
    if(!pf_solved) return;
    g.fillStyle = "#F00";
    for(var i = 0; i < pf_path_tiles.length; i++) {
        g.fillRect(pf_path_tiles[i].x * TILE_SIZE, pf_path_tiles[i].y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

function pf_movePlayer() {

}

function pf_solve() {
    pf_init();
    while(!pf_solved) {
        pf_nextStep();
    }
}