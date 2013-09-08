/*! sgf-core - v0.1.0 - 2013-09-08
* Copyright (c) 2013 ; Licensed  */
var go = {};

// Adapted from http://osteele.com/sources/javascript/functional/
// Also http://ejohn.org/blog/partial-functions-in-javascript/
go.partial = function(fn, default_args, _this) {
    return function() {
        var arg = 0, args = default_args.slice(0);
        for (var i = 0; i < args.length && arg < arguments.length; i++)
            if (args[i] === undefined)
                args[i] = arguments[arg++];
        return fn.apply(_this || this, args);
    };
}

go.sgfToXy = function(sgf_coord) {
    if (sgf_coord) {
        return [sgf_coord.charCodeAt(0) - 97, sgf_coord.charCodeAt(1) - 97];
    } else {
        return [];
    }
}

go.xyToSgf = function(xy_obj) {
    if (xy_obj) {
        return String.fromCharCode(xy_obj.x + 97) + String.fromCharCode(xy_obj.y + 97);
    } else {
        return "";
    }
}

go.warn = function(msg) {
    if (console && console.warn) {
        console.warn(msg);
    }
}

go.Board = function(size) {
    this.size = parseInt(size) || 19;
    this.stones = null;
    this.annotations = null;
    this._events = {};

    this.clearBoard();
    this.clearAnnotations();
}

go.Board.prototype.addEventListener = function(event_name, callback) {
    var callbacks = this._events[event_name] = this._events[event_name] || [];
    callbacks.push(callback);
}

go.Board.prototype.dispatchEvent = function(event_name, args) {
    if (this._events.hasOwnProperty(event_name)) {
        var callbacks = this._events[event_name], i;
        for (i = 0; i < callbacks.length; i++) {
            callbacks[i].apply(this, args);
        }
    }
}

go.Board.prototype.clearAnnotations = function() {
    this.annotations = new Array(this.size);
    for (var i = 0; i < this.stones.length; i++) {
        this.annotations[i] = new Array(this.size);
    }
}

go.Board.prototype.clearBoard = function() {
    this.stones = new Array(this.size);

    for (var i = 0; i < this.stones.length; i++) {
        this.stones[i] = new Array(this.size);
    }
}

go.Board.prototype.changed = function() {
    this.dispatchEvent("change");
}

go.Board.prototype.stoneAt = function(x, y) {
    return this.stones[x][y];
}

go.Board.prototype.stoneAtSgf = function(sgf_coord) {
    var xy = go.sgfToXy(sgf_coord);
    return this.stoneAt(xy[0], xy[1]);
}

go.Board.prototype.addStone = function(x, y, color, suppress_change_event) {
    if (x < this.stones.length && y < this.stones.length && !this.stones[x][y]) {
        var stone = new go.Stone(x, y, this, color);
        this.stones[x][y] = stone;
        stone.mergeGroup();
        stone.killNeighbors();
    }
    if (!suppress_change_event) {
        this.changed();
    }
}

go.Board.prototype.addStoneBySgf = function(sgf_coord, color, suppress_change_event) {
    var xy = go.sgfToXy(sgf_coord);
    this.addStone(xy[0], xy[1], color, suppress_change_event);
}

go.Board.prototype.removeStone = function(x, y, suppress_change_event) {
    var stone = this.stones[x][y];
    if (stone) {
        stone.removeFromBoard();
    }
    if (!suppress_change_event) {
        this.changed();
    }
}

go.Board.prototype.removeStoneBySgf = function (sgf_coord, suppress_change_event) {
    var xy = go.sgfToXy(sgf_coord);
    this.removeStone(xy[0], xy[1], suppress_change_event);
}

go.Board.prototype.serialize = function() {
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

go.Board.prototype.deserialize = function(raw) {
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
    this.changed();
}

go.Stone = function(x, y, board, color) {
    this.x = x;
    this.y = y;
    this.board = board;
    this.color = color;
    this.group = null;
}

go.Stone.prototype.neighbors = function(action, array_fn) {
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

go.Stone.prototype.rediscoverGroup = function(new_group) {
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

go.Stone.prototype.mergeGroup = function() {
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
                neighbor.group = this.group = new go.Group([this, neighbor]);
            }
        }
    };
    this.neighbors(merge_neighbor);
}

go.Stone.prototype.killNeighbors = function() {
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

go.Stone.prototype.hasLiberty = function() {
    var is_neighbor_undefined = function(neighbor) {
        return !neighbor;
    }
    return this.neighbors(is_neighbor_undefined, "some");
}

go.Stone.prototype.die = function() {
    // FIXME - weird signature - this is because of an overloading
    // perhaps an inheritance structure is in order?
    this.removeFromBoard();
    return [[this]];
}

go.Stone.prototype.removeFromBoard = function() {
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

go.Group = function(stones) {
    if (!stones) {
        stones = []
    }
    this.stones = stones;
    var i;
    for (i = 0; i < stones.length; i++) {
        stones[i].group = this;
    }
}

go.Group.prototype.setNewGroup = function(group) {
    var i;
    if (this != group) {
        for (i = 0; i < this.stones.length; i++) {
            this.stones[i].group = group;
        }
        group.stones = group.stones.concat(this.stones);
    }
}

go.Group.prototype.hasLiberty = function() {
    return this.stones.some(function(stone) {
        return stone.hasLiberty();
    });
}

go.Group.prototype.die = function() {
    this.stones.forEach(function(stone) {
        stone.group = null;
        stone.removeFromBoard();
    });
    return [this.stones];
}

// depends on util.js, board.js
go.SGF = function() {
    this.size = 19;
    this.root_move = null;
    this.white_player = "White";
    this.black_player = "Black";
    this.handicap = 0;
    this.ruleset = "Japanese";
    this.komi = 0;
}

go.SGF.prototype.getBlankBoard = function() {
    return new go.Board(this.size);
}

go.Move = function() {
    this.sgf = null;
    this.position = null;
    this.color = null;
    this.previous_move = null;
    this.comment = "";
    this.labels = [];
    this.triangles = [];
    this.circles = [];
    this.squares = [];
    this.x_marks = [];
    this._next_moves = [];
    this._static_white = [];
    this._static_black = [];
    this._static_empty = [];
    this._cached_serialized_board = null;
}

go.Move.prototype.addNextMove = function(next_mv) {
    this._next_moves.push(next_mv);
    next_mv.previous_move = this;
}

go.Move.prototype.getBoard = function() {
    var board;
    if (this._cached_serialized_board) {
        board = this.sgf.getBlankBoard();
        board.deserialize(this._cached_serialized_board);
        return board;
    } else {
        if (this.previous_move) {
            board = this.previous_move.getBoard();
        } else {
            board = this.sgf.getBlankBoard();
        }

        this.applyToBoard(board)
        this._cached_serialized_board = board.serialize();
        return board;
    }
}

go.Move.prototype.applyToBoard = function(board) {
    var quiet_remove = go.partial(board.removeStoneBySgf, [undefined, true], board),
        quiet_add_black = go.partial(board.addStoneBySgf, [undefined, 'b', true], board),
        quiet_add_white = go.partial(board.addStoneBySgf, [undefined, 'w', true], board);
    this._static_empty.forEach(quiet_remove);
    this._static_black.forEach(quiet_add_black);
    this._static_white.forEach(quiet_add_white);
    if (this.position) {
        board.addStoneBySgf(this.position, this.color, true);
    }
    board.changed();
}

// Brute force tokenize SGFs
// Matches: "(", ")", ";", "\w", "[.*]"
// For "[.*]", "]" can be escaped by "\]"
go.tokenizeSgfData = function(sgf_data) {
    var current_token = "",
        tokens = [],
        in_value = false,
        escaping = false,
        tree_token = /[\(\);]/,
        open_paren = 0,
        close_paren = 0,
        current_char;
    for (var i = 0; i < sgf_data.length; i++) {
        current_char = sgf_data.charAt(i);
        if (in_value) {
            if (!escaping && current_char === "\\") {
                escaping = true;
            } else {
                current_token += current_char;
                if (!escaping && current_char === "]") {
                    in_value = false;
                    tokens.push(current_token);
                    current_token = "";
                }
                escaping = false;
            }
        } else {
            if (current_char.match(tree_token) || current_char.match(/\s/)) {
                if (current_token) {
                    tokens.push(current_token);
                    current_token = "";
                }
                if (current_char === ")") {
                    close_paren += 1;
                }
                if (current_char === "(") {
                    open_paren += 1;
                }
                if (close_paren > open_paren) {
                    throw "Unmatched \")\"!";
                }
                if (current_char.trim()) {
                    tokens.push(current_char);
                }
            } else if (current_char.match(/\w/)){
                current_token += current_char;
            } else if (current_char === "[") {
                current_token += current_char;
                in_value = true;
            }
        }
    }
    if (in_value || current_token || open_paren - close_paren !== 0) {
        throw "Invalid SGF data!";
    }
    return tokens;
}

go.parseMethodValue = function(token) {
    var valid_token = /^(\w*)\[(.*)\]$/,
        mv_match = token.match(valid_token);
    if (mv_match && mv_match.length == 3) {
        return mv_match.slice(1);
    } else {
        throw "Broken token \"" + token + "\"!";
    }
}

go.parseSgfData = function(sgf_data) {
    var sgf_tokens = go.tokenizeSgfData(sgf_data),
        variation_stack = [],
        sgf = new go.SGF(),
        token, last_mv, cur_mv,
        method, value, method_value;
    for (var i = 0; i < sgf_tokens.length; i++) {
        token = sgf_tokens[i];
        if (token === "(") {
            if (last_mv) {
                variation_stack.push(cur_mv);
            }
        } else if (token === ")") {
            if (variation_stack.length > 0) {
                cur_mv = variation_stack.pop();
            }
        } else if (token === ";") {
            last_mv = cur_mv;
            cur_mv = new go.Move();
            cur_mv.sgf = sgf;
            if (sgf.root_move === null) {
                sgf.root_move = cur_mv;
            }
            if (last_mv) {
                last_mv.addNextMove(cur_mv);
            }
        } else {
            method_value = go.parseMethodValue(token);
            method = method_value[0] || method;
            value = method_value[1];

            // full spec at http://www.red-bean.com/sgf/properties.html
            if (method === "B" || method === "W") {
                cur_mv.color = method.toLowerCase();
                cur_mv.position = value;
            } else if (method === "C") {
                cur_mv.comment = value;
            } else if (method === "AB") {
                cur_mv._static_black.push(value);
            } else if (method === "AW") {
                cur_mv._static_white.push(value);
            } else if (method === "AE") {
                cur_mv._static_empty.push(value);
            } else if (method === "TR") {
                cur_mv.triangles.push(value);
            } else if (method === "SQ") {
                cur_mv.squares.push(value);
            } else if (method === "CR") {
                cur_mv.circles.push(value);
            } else if (method === "MA") {
                cur_mv.x_marks.push(value);
            } else if (method === "LB") {
                cur_mv.labels.push(value);
            } else if (method === "SZ") {
                sgf.size = parseInt(value);
            } else if (method === "FF") {
                if (value !== "4") {
                    go.warn("File format 4 explicitly supported - YMMV with other formats.");
                }
            } else if (method === "GM") {
                if (value !== "1") {
                    throw "SGF type is not Go!";
                }
            } else if (method === "ST") {
                // variation mode, not supported
                // TODO support this maybe
            } else if (method === "CA") {
                // charset
            } else if (method === "RU") {
                sgf.ruleset = value
            } else if (method === "PW") {
                sgf.white_player = value;
            } else if (method === "PB") {
                sgf.black_player = value;
            } else if (method === "HA") {
                sgf.handicap = value
            } else if (method === "KM") {
                sgf.komi = value
            } else if (method === "TM") {
                // time limit
            } else if (method === "OT") {
                // overtime system
            } else if (method === "RE") {
                //results
            } else if (method === "GN") {
                // game name
            } else if (method === "BT") {
                // black team
            } else if (method === "WT") {
                // white team
            } else if (method === "BR") {
                // black rank
            } else if (method === "WR") {
                // white rank
            } else if (method === "AN") {
                // person annotating
            } else if (method === "AP") {
                // application
            } else if (method === "CP") {
                // copyright
            } else if (method === "EV") {
                // event
            } else if (method === "DT") {
                // date
            } else {
                go.warn("Warning: Unrecognized method \"" + method + "\"!");
            }
        }
    }
    return sgf;
}
