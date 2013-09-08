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
