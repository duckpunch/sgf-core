function sgfToXy(sgf_coord) {
    if (sgf_coord) {
        return [sgf_coord.charCodeAt(0) - 97, sgf_coord.charCodeAt(1) - 97];
    } else {
        return [];
    }
}

function xyToSgf(xy_obj) {
    if (xy_obj) {
        return String.fromCharCode(xy_obj.x + 97) + String.fromCharCode(xy_obj.y + 97);
    } else {
        return "";
    }
}

function warn(msg) {
    if (console && console.warn) {
        console.warn(msg);
    }
}
