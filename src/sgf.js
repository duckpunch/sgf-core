function SGF() {
    this.size = 19;
    this.root_move = null;
    this.white_player = "White";
    this.black_player = "Black";
}
function Move() {
    this.previous_move = null;
    this.next_moves = [];
}
Move.prototype.addNextMove = function(next_mv) {
    this.next_moves.push(next_mv);
}

function warn(msg) {
    if (console && console.warn) {
        console.warn(msg);
    }
}

// Brute force tokenize SGFs
// Matches: "(", ")", ";", "\w", "[.*]"
// For "[.*]", "]" can be escaped by "\]"
function tokenizeSgfData(sgf_data) {
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

function parseMethodValue(token) {
    var valid_token = /^(\w)+\[(.*)\]$/,
        mv_match = token.match(valid_token);
    if (mv_match && mv_match.length == 3) {
        return mv_match.slice(1);
    } else {
        throw "Broken token \"" + token + "\"!";
    }
}

function parseSgfData(sgf_data) {
    var sgf_tokens = tokenizeSgfData(sgf_data),
        variation_stack = [],
        sgf = new SGF(),
        token, last_mv, cur_mv, root_mv,
        method, value;
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
            cur_mv = new Move();
            if (typeof root_mv === "undefined") {
                root_mv = cur_mv;
            }
            if (last_mv) {
                last_mv.addNextMove(cur_mv);
                cur_mv.previous_move = last_mv;
            }
        } else {
            method = method_value[0];
            value = method_value[1];
            if (method === "B") {
            } else if (method === "W") {
            } else if (method === "C") {
            } else if (method === "AB") {
                // add black
            } else if (method === "AW") {
                // add white
            } else if (method === "TR") {
                // triangle
            } else if (method === "SQ") {
                // square
            } else if (method === "CR") {
                // circle
            } else if (method === "MA") {
                // "X" mark
            } else if (method === "LB") {
                // label
            } else if (method === "SZ") {
                sgf.size = parseInt(value);
            } else if (method === "FF") {
                if (value !== "4") {
                    warn("File format 4 explicitly supported - YMMV with other formats.");
                }
            } else if (method === "GM") {
                if (value !== "1") {
                    throw "SGF type is not Go!";
                }
            } else if (method === "RU") {
                // ruleset
            } else if (method === "PW") {
                sgf.white_player = value;
            } else if (method === "PB") {
                sgf.black_player = value;
            } else if (method === "HA") {
                // handicap
            } else if (method === "KM") {
                // komi
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
                warn("Warning: Unrecognized method \"" + method + "\"!");
            }
        }
    }
}
