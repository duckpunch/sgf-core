test("Tokenizing", function() {
    throws(function() {go.tokenizeSgfData("hello")}, "Simple string throws bad sgf exception");
    deepEqual(go.tokenizeSgfData("(;)"), ["(", ";", ")"], "Simple SGF tokenizes");
    deepEqual(go.tokenizeSgfData("()"), ["(", ")"], "Simple SGF tokenizes");
    deepEqual(
        go.tokenizeSgfData("(;B[ji]C[now with escaped \\]!])"),
        ["(", ";", "B[ji]", "C[now with escaped ]!]", ")"],
        "Square bracket escapes"
    );
    deepEqual(
        go.tokenizeSgfData("(;B[ji]C[now with escaped \\]!\\\\])"),
        ["(", ";", "B[ji]", "C[now with escaped ]!\\]", ")"],
        "Escaped escape"
    );
    throws(function() {go.tokenizeSgfData(")")}, "Single unmatched parenthesis throws bad sgf exception");
    throws(function() {go.tokenizeSgfData(")(")}, "Weird parenthesis throws bad sgf exception");
    throws(function() {go.tokenizeSgfData("(()")}, "Unmatched parenthesis throws bad sgf exception");
    throws(function() {go.tokenizeSgfData("())(()")}, "Weird parenthesis throws bad sgf exception");
});
test("Parsing", function() {
    throws(function() {go.parseMethodValue("failtoken")}, "Throws on no value");
    throws(function() {go.parseMethodValue("fail token[hello]")}, "Throws on space in method");
    deepEqual(
        go.parseMethodValue("C[something something]"),
        ["C", "something something"],
        "Parses normal comment"
    );
    deepEqual(
        go.parseMethodValue("[ij]"),
        ["", "ij"],
        "Parses methodless token"
    );
});
test("Node Creation", function() {
    ok(
        treeStructureMatches(
            go.parseSgfData("(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[0.00];B[dd];W[pp];B[dp])").root_move,
            buildMoveTree([mv(), mv("dd"), mv("pp"), mv("dp")])
        ),
        "Basic sequence parses"
    );
    ok(
        treeStructureMatches(
            go.parseSgfData("(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[0.00];B[dd];W[pp](;B[dp])(;B[pd]))").root_move,
            buildMoveTree([
                mv(), mv("dd"), mv("pp"),
                [
                    [ mv("dp") ],
                    [ mv("pd") ]
                ]
            ])
        ),
        "Simple variation"
    );

    var static_root_sgf = go.parseSgfData("(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[0.00]AW[jj]AB[ij][kj][jk];B[ji])");
    deepEqual(
        static_root_sgf.root_move._static_black,
        ["ij", "kj", "jk"],
        "Static black moves are collected"
    );
    deepEqual(
        static_root_sgf.root_move._static_white,
        ["jj"],
        "Static white moves are collected"
    );
    ok(
        get_last_node(static_root_sgf).position === "ji",
        "Simple move recorded"
    );
});
test("Board rules", function() {
    var static_capture_sgf = go.parseSgfData("(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[0.00]AW[jj]AB[ij][kj][jk];B[ji])");
    ok(
        static_capture_sgf.root_move.getBoard(),
        "Able to get board"
    );

    ok(
        get_last_node(static_capture_sgf).getBoard(),
        "Able to recursively get board"
    );

    ok(
        !get_last_node(static_capture_sgf).getBoard().stoneAtSgf("jj"),
        "Static stone was captured"
    );

    var static_capture_3_sgf = go.parseSgfData("(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[0.00]AW[cp][dp][ep][bq][eq][cr][er]AB[cq][dq][dr];B[aq];W[ds])");
    var last_board = get_last_node(static_capture_3_sgf).getBoard();
    ok(
        !last_board.stoneAtSgf("cq") && !last_board.stoneAtSgf("dq") && !last_board.stoneAtSgf("dr"),
        "3 static stones captured"
    );
});
