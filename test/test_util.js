function buildMoveTree(nested_array, parent_node) {
    var last_index = nested_array.length - 1,
        first_node = null,
        last_node = parent_node,
        node,
        variations;

    // length > 2
    if (last_index > 0) {
        for (var i = 0; i < last_index; i++) {
            node = nested_array[i];
            first_node = first_node || node;
            if (last_node) {
                last_node.addNextMove(node);
            }
            last_node = node;
        }

        if (Object.prototype.toString.call(nested_array[last_index]) === '[object Array]') {
            variations = nested_array[last_index];
            for (var i = 0; i < variations.length; i++) {
                buildMoveTree(variations[i], last_node);
            }
        } else {
            last_node.addNextMove(nested_array[last_index]);
        }
    } else {
        if (last_index === 0) {
            first_node = nested_array[0];
            if (parent_node) {
                parent_node.addNextMove(first_node);
            }
        } 
    }

    return first_node;
}

function treeStructureMatches(root_1, root_2) {
    if (root_1.position === root_2.position && root_1._next_moves.length === root_2._next_moves.length) {
        for (var i = 0; i < root_1._next_moves.length; i++) {
            if (!treeStructureMatches(root_1._next_moves[i], root_2._next_moves[i])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

function mv(position) {
    var move = new go.Move();
    move.position = position || null;
    return move;
}

function test_print_board(board) {
    for (var i = 0; i < board.stones.length; i++) {
        var row = '';
        for (var j = 0; j < board.stones[i].length; j++) {
            var stone = board.stones[i][j];
            if (!stone) {
                row += '+ ';
            } else {
                row += stone.color == 'b'?'o ':'x ';
            }
        }
        console.log(row);
    }
}

function get_last_node(sgf) {
    var move = sgf.root_move;
    while (move._next_moves.length > 0) {
        move = move._next_moves[0];
    }
    return move;
}
