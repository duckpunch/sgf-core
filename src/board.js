function Board(size) {
    this.size = parseInt(size) || 19;
    this.stones = null;
    this.annotations = null;
    this._events = {};

    this.clearBoard();
    this.clearAnnotations();
}

Board.prototype.addEventListener = function(event_name, callback) {
    var callbacks = this._events[event_name] = this._events[event_name] || [];
    callbacks.push(callback);
}

Board.prototype.dispatchEvent = function(event_name, args) {
    if (this._events.hasOwnProperty(event_name)) {
        var callbacks = this._events[event_name], i;
        for (i = 0; i < callbacks.length; i++) {
            callbacks[i].apply(this, args);
        }
    }
}

Board.prototype.clearAnnotations = function() {
    this.annotations = new Array(this.size);
    for (var i = 0; i < this.stones.length; i++) {
        this.annotations[i] = new Array(this.size);
    }
}

Board.prototype.clearBoard = function() {
    this.stones = new Array(this.size);

    for (var i = 0; i < this.stones.length; i++) {
        this.stones[i] = new Array(this.size);
    }
}

Board.prototype.addStone = function(x, y, color, suppress_change_event) {
    if (x < this.stones.length && y < this.stones.length && !this.stones[x][y]) {
        var stone = new Stone(x, y, this, color);
        this.stones[x][y] = stone;
        stone.mergeGroup();
        stone.killNeighbors();
    }
    if (!suppress_change_event) {
        this.dispatchEvent("change");
    }
}

Board.prototype.serialize = function() {
    var raw_board = {w: [], b: [], size: this.size}, stone, i, j;
    for (i = 0; i < this.stones.length; i++) {
        for (j = 0; j < this.stones.length; j++) {
            stone = this.stones[i][j];
            if (stone) {
                raw_board[stone.color].push({x: i, y: j});
            }
        }
    }
    return JSON.stringify(raw_board);
}

Board.prototype.deserialize = function(raw) {
    if (typeof raw === "string") {
        raw = JSON.parse(raw);
    }

    var board = this;
    board.size = raw.hasOwnProperty("size")? raw.size : 19;
    board.clearBoard();

    if (raw.hasOwnProperty("w")) {
        raw.w.forEach(function(coord) {
            board.addStone(coord.x, coord.y, "w", true);
        });
    }
    if (raw.hasOwnProperty("b")) {
        raw.b.forEach(function(coord) {
            board.addStone(coord.x, coord.y, "b", true);
        });
    }
    this.dispatchEvent("change");
}

function Stone(x, y, board, color) {
    this.x = x;
    this.y = y;
    this.board = board;
    this.color = color;
    this.group = null;
}

Stone.prototype.neighbors = function(action, array_fn) {
    array_fn = array_fn || "map";
    var neighbor_coords = [
        {x: this.x - 1, y: this.y},
        {x: this.x + 1, y: this.y},
        {x: this.x, y: this.y - 1},
        {x: this.x, y: this.y + 1}
    ], board = this.board, stone = this;
    return neighbor_coords.filter(function(coord) {
            return coord.x >= 0 && coord.y >= 0 && coord.x < board.stones.length && coord.y < board.stones.length;
        })[array_fn](function(coord) {
            return action.call(stone, board.stones[coord.x][coord.y]);
        });
}

Stone.prototype.rediscoverGroup = function(new_group) {
    if (!new_group) {
        new_group = new Group();
    }

    if (this.group) {
        this.group.stones = this.group.stones.filter(function(stone) {
            return stone != this;
        });
    }
    this.group = new_group;
    this.group.stones.push(this);

    var reassignNeighbors = function(neighbor) {
        if (neighbor && this.color == neighbor.color && this.group != neighbor.group) {
            neighbor.rediscoverGroup(new_group);
        }
    };
    this.neighbors(reassignNeighbors);
}

Stone.prototype.mergeGroup = function() {
    var merge_neighbor = function(neighbor) {
        if (neighbor && neighbor.color == this.color) {
            var neighbor_group = neighbor.group;
            if (this.group && neighbor_group) {
                neighbor_group.setNewGroup(this.group);
            } else if (neighbor_group) {
                this.group = neighbor_group;
                neighbor_group.stones.push(this);
            } else if (this.group) {
                neighbor.group = this.group;
                this.group.stones.push(neighbor);
            } else {
                neighbor.group = this.group = new Group([this, neighbor]);
            }
        }
    };
    this.neighbors(merge_neighbor);
}

Stone.prototype.killNeighbors = function() {
    var kill_neighbor = function(neighbor) {
        if (neighbor && neighbor.color != this.color) {
            var group = neighbor.group || neighbor;
            if (!group.hasLiberty()) {
                this.board.dispatchEvent("stones_killed", group.die());
            }
        }
    }
    this.neighbors(kill_neighbor);
}

Stone.prototype.hasLiberty = function() {
    var is_neighbor_undefined = function(neighbor) {
        return !neighbor;
    }
    return this.neighbors(is_neighbor_undefined, "some");
}

Stone.prototype.die = function() {
    // FIXME
    this.removeFromBoard();
    return [[this]];
}

Stone.prototype.removeFromBoard = function() {
    this.board.stones[this.x][this.y] = null;
    if (this.group) {
        this.group = null;
        this.neighbors(function(neighbor) {
            if (neighbor && this.color == neighbor.color) {
                neighbor.rediscoverGroup();
            }
        });
    }
}

function Group(stones) {
    if (!stones) {
        stones = []
    }
    this.stones = stones;
    var i;
    for (i = 0; i < stones.length; i++) {
        stones[i].group = this;
    }
}

Group.prototype.setNewGroup = function(group) {
    var i;
    if (this != group) {
        for (i = 0; i < this.stones.length; i++) {
            this.stones[i].group = group;
        }
        group.stones = group.stones.concat(this.stones);
    }
}

Group.prototype.hasLiberty = function() {
    return this.stones.some(function(stone) {
        return stone.hasLiberty();
    });
}

Group.prototype.die = function() {
    this.stones.forEach(function(stone) {
        stone.group = null;
        stone.removeFromBoard();
    });
    return [this.stones];
}
