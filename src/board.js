var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";

    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
        species: undefined,
        chr: undefined,
        from: 0,
        to: 500
    };

    // Limit caps
    var caps = {
        left : undefined,
        right : undefined
    };
    var cap_width = 3;


    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var curr_transform;
    var zoom = d3.zoom();

    var limits = {
        min : 0,
        max : 1000,
        zoom_out : 1000,
        zoom_in  : 100
    };
    var dur = 500;
    var drag_allowed = true;
    var started = false;

    var exports = {
        ease          : d3.easeCubicInOut,
        extend_canvas : {
            left : 0,
            right : 0
        },
        show_frame : true
        // limits        : function () {throw "The limits method should be defined"}
    };

    // The returned closure / object
    var track_vis = function(div) {
    	div_id = d3.select(div).attr("id");

    	// The original div is classed with the tnt class
    	d3.select(div)
    	    .classed("tnt", true);

    	// TODO: Move the styling to the scss?
    	var browserDiv = d3.select(div)
    	    .append("div")
    	    .attr("id", "tnt_" + div_id)
    	    .style("position", "relative")
    	    .classed("tnt_framed", exports.show_frame ? true : false)
    	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px");

    	var groupDiv = browserDiv
    	    .append("div")
    	    .attr("class", "tnt_groupDiv");

    	// The SVG
    	svg = groupDiv
    	    .append("svg")
    	    .attr("class", "tnt_svg")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .attr("pointer-events", "all");

    	svg_g = svg
    	    .append("g")
                .attr("transform", "translate(0,20)")
                .append("g")
    	    .attr("class", "tnt_g");

    	// caps
    	caps.left = svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_5pcap")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");
    	caps.right = svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_3pcap")
    	    .attr("x", width-cap_width)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");

    	// The Zooming/Panning Pane
    	pane = svg_g
    	    .append("rect")
    	    .attr("class", "tnt_pane")
    	    .attr("id", "tnt_" + div_id + "_pane")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .style("fill", bgColor);
    };

    // API
    var api = apijs (track_vis)
    	.getset (exports)
    	.getset (limits)
    	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
    	var prev_val = track_vis.extend_canvas();
    	val.left = val.left || prev_val.left;
    	val.right = val.right || prev_val.right;
    	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {
        // make sure that zoom_out is within the min-max range
        if ((limits.max - limits.min) < limits.zoom_out) {
            limits.zoom_out = limits.max - limits.min;
        }

        plot();

        // Reset the tracks
        for (var i=0; i<tracks.length; i++) {
            if (tracks[i].g) {
                //    tracks[i].display().reset.call(tracks[i]);
                tracks[i].g.remove();
            }
            _init_track(tracks[i]);
        }
        _place_tracks();

        // The continuation callback
        var cont = function () {

            if ((loc.to - loc.from) < limits.zoom_in) {
                if ((loc.from + limits.zoom_in) > limits.max) {
                    loc.to = limits.max;
                } else {
                    loc.to = loc.from + limits.zoom_in;
                }
            }

            for (var i=0; i<tracks.length; i++) {
                _update_track(tracks[i], loc);
            }
        };

        cont();
        started = true;
    });

    api.method ('update', function () {
    	for (var i=0; i<tracks.length; i++) {
    	    _update_track (tracks[i]);
    	}
    });

    var _update_track = function (track, where) {
    	if (track.data()) {
    	    var track_data = track.data();
            var data_updater = track_data;

    	    data_updater.call(track, {
                'loc' : where,
                'on_success' : function () {
                    track.display().update.call(track, where);
                }
    	    });
    	}
    };

    var plot = function() {
        // Initially xScale is set to the max scale we can have
        xScale = d3.scaleLinear()
            .domain([limits.min, limits.max])
            .range([0, width]);

        zoom.extent([[0, 20], [width, 20]])
            .translateExtent([[0, 20], [width, 20]])
            .scaleExtent([1, (limits.zoom_out - 1), (loc.to - loc.from) / limits.zoom_in])
            .on("zoom", _move);


        // Then we "zoom" to the initial position ([loc.from, loc.to])
        // var k = (xScale(limits.max) - xScale(limits.min)) / (xScale(loc.to) - xScale(loc.from));
        // var tx = 0 - (k * xScale(loc.from));
        // var t = d3.zoomIdentity.translate(tx, 0).scale(k);
        //
        // svg_g.call(zoom.transform, t);
        jump([loc.from, loc.to]);

        svg_g.call(zoom.on("zoom", _move));

    };

    var _reorder = function (new_tracks) {
        // TODO: This is defining a new height, but the global height is used to define the size of several
        // parts. We should do this dynamically

        var newScale = curr_transform.rescaleX(xScale);

        var found_indexes = [];
        for (var j=0; j<new_tracks.length; j++) {
            var found = false;
            for (var i=0; i<tracks.length; i++) {
                if (tracks[i].id() === new_tracks[j].id()) {
                    found = true;
                    found_indexes[i] = true;
                    // tracks.splice(i,1);
                    break;
                }
            }
            if (!found) {
                _init_track(new_tracks[j]);
                new_tracks[j].display().scale(newScale);
                _update_track(new_tracks[j], {from : loc.from, to : loc.to});
            }
        }


        for (var x=0; x<tracks.length; x++) {
            if (!found_indexes[x]) {
                tracks[x].g.remove();
            }
        }

        tracks = new_tracks;
        _place_tracks();
    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('scroll', function (factor) {
        var amount = Math.abs(factor);
    	if (factor > 0) {
    	    _manual_move(amount, 1);
    	} else if (factor < 0){
            _manual_move(amount, -1);
        }
    });

    api.method ('zoom', function (factor) {
        _manual_move(1/factor, 0);
    });

    api.method ('find_track', function (id) {
        for (var i=0; i<tracks.length; i++) {
            if (tracks[i].id() === id) {
                return tracks[i];
            }
        }
    });

    api.method ('remove_track', function (track) {
        track.g.remove();
    });

    api.method ('add_track', function (track) {
        if (track instanceof Array) {
            for (var i=0; i<track.length; i++) {
                track_vis.add_track (track[i]);
            }
            return track_vis;
        }
        tracks.push(track);
        return track_vis;
    });

    api.method('tracks', function (ts) {
        if (!arguments.length) {
            return tracks;
        }
        _reorder(ts);
        return this;
    });

    //
    api.method ('width', function (w) {
    	// TODO: Allow suffixes like "1000px"?
    	// TODO: Test wrong formats
    	if (!arguments.length) {
    	    return width;
    	}
    	// At least min-width
    	if (w < min_width) {
    	    w = min_width;
    	}

    	// We are resizing
    	if (div_id !== undefined) {
    	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
    	    // Resize the zooming/panning pane
    	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
    	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);
            caps.right
                .attr("x", w-cap_width);

    	    // Replot
    	    width = w;
            xScale.range([0, width]);

    	    plot();

    	    for (var i=0; i<tracks.length; i++) {
        		tracks[i].g.select("rect").attr("width", w);
                //tracks[i].display().scale(xScale);
        		tracks[i].display().reset.call(tracks[i]);
                tracks[i].display().init.call(tracks[i], w);
        		tracks[i].display().update.call(tracks[i], loc);
    	    }
    	} else {
    	    width = w;
    	}
        return track_vis;
    });

    api.method('allow_drag', function(b) {
        if (!arguments.length) {
            return drag_allowed;
        }
        drag_allowed = b;
        if (drag_allowed) {
            // When this method is called on the object before starting the simulation, we don't have defined xScale
            if (xScale !== undefined) {
                svg_g.call(zoom.transform, curr_transform);
                svg_g.call(zoom.on("zoom", _move));


                // svg_g.call( zoom.x(xScale)
                //     .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
                //     .on("zoom", _move) );
            }
        } else {
            // We freeze the transform...
            // var t = d3.event.transform;
            // var newScale = t.rescaleX(xScale);

            // And disable calling the zoom callback on zoom
            svg_g.call(zoom.on("zoom", null));


            // We create a new dummy scale in x to avoid dragging the previous one
            // TODO: There may be a cheaper way of doing this?
            // zoom.x(d3.scaleLinear()).on("zoom", null);
        }
        return track_vis;
    });

    var _place_tracks = function () {
        var h = 0;
        for (var i=0; i<tracks.length; i++) {
            var track = tracks[i];
            if (track.g.attr("transform")) {
                track.g
                    .transition()
                    .duration(dur)
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h++ + ")");
            } else {
                track.g
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h++ + ")");
            }

            h += track.height();
        }

        // svg
        svg.attr("height", h + height_offset);

        // div
        d3.select("#tnt_" + div_id)
            .style("height", (h + 10 + height_offset) + "px");

        // caps
        d3.select("#tnt_" + div_id + "_5pcap")
            .attr("height", h)
            .each(function () {
                move_to_front(this);
            });

        d3.select("#tnt_" + div_id + "_3pcap")
            .attr("height", h)
            .each (function () {
                move_to_front(this);
            });

        // pane
        pane
            .attr("height", h + height_offset);

        return track_vis;
    };

    var _init_track = function (track) {
        track.g = svg.select("g").select("g")
    	    .append("g")
    	    .attr("class", "tnt_track")
    	    .attr("height", track.height());

    	// Rect for the background color
    	track.g
    	    .append("rect")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", track_vis.width())
    	    .attr("height", track.height())
    	    .style("fill", track.color())
    	    .style("pointer-events", "none");

    	if (track.display()) {
    	    track.display()
                //.scale(xScale)
                .init.call(track, width);
    	}

    	return track_vis;
    };

    function jump (range) {
        var r1 = range[0];
        var r2 = range[1];
        var k = (xScale(limits.max) - xScale(limits.min)) / (xScale(r2) - xScale(r1));

        var tx = 0 - (k * xScale(r1));
        var t = d3.zoomIdentity.translate(tx, 0).scale(k);

        // This is jumping without transition

        svg_g
            .call(zoom.transform, t);
    }

    var _manual_move = function (factor, direction) {
        var newScale = curr_transform.rescaleX(xScale);

        var minX = newScale.invert(0);
        var maxX = newScale.invert(width);
        var span = maxX - minX;
        var totalOffset = (span * factor);
        if (direction === 0 && factor > 1) {
            totalOffset = - totalOffset;
        }

        var duration = 1000;

        var i = d3.interpolateNumber(0, totalOffset);
        var timer = d3.timer (function (ellapsed) {
            if (ellapsed > duration) {
                timer.stop();
            }
            var part = i(ellapsed/duration);

            var newMinX, newMaxX;
            switch (direction) {
                case 1 :
                    newMinX = minX + part;
                    newMaxX = maxX + part;
                    if (newMinX>=limits.min && newMaxX<=limits.max) {
                        jump([newMinX, newMaxX]);
                    } else {
                        timer.stop();
                    }
                    break;
                case -1 :
                    newMinX = minX - part;
                    newMaxX = maxX - part;
                    if (newMinX>=limits.min && newMaxX<=limits.max) {
                        jump([newMinX, newMaxX]);
                    } else {
                        timer.stop();
                    }

                    break;
                case 0 :
                    newMinX = minX + part/2;
                    newMaxX = maxX - part/2;
                    if (newMinX < limits.min) {
                        newMinX = limits.min;
                    }
                    if (newMaxX > limits.max) {
                        newMaxX = limits.max;
                    }

                    jump([newMinX, newMaxX]);
            }

            _move_cbak();
        });
    };

    var _move_cbak = function () {
    	for (var i = 0; i < tracks.length; i++) {
    	    var track = tracks[i];
    	    _update_track(track, loc);
    	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function () {
        var t = d3.event.transform;
        curr_transform = t;

        var newScale = t.rescaleX(xScale);

        for (var i = 0; i < tracks.length; i++) {
            tracks[i].display().scale(newScale);
        }

        // Show the red bars at the limits
        var newMinX = newScale.invert(0);
        var newMaxX = newScale.invert(width);
        track_vis.from(newMinX);
        track_vis.to(newMaxX);

        if (newMinX <= (limits.min + 5)) {
            d3.select("#tnt_" + div_id + "_5pcap")
                .attr("width", cap_width)
                .transition()
                .duration(200)
                .attr("width", 0);
        }

        if (newMaxX >= (limits.max - 5)) {
            d3.select("#tnt_" + div_id + "_3pcap")
                .attr("width", cap_width)
                .transition()
                .duration(200)
                .attr("width", 0);
        }

    	// var domain = xScale.domain();
    	// if (domain[0] <= (limits.min + 5)) {
    	//     d3.select("#tnt_" + div_id + "_5pcap")
    	// 	.attr("width", cap_width)
    	// 	.transition()
    	// 	.duration(200)
    	// 	.attr("width", 0);
    	// }
        //
    	// if (domain[1] >= (limits.max)-5) {
    	//     d3.select("#tnt_" + div_id + "_3pcap")
    	// 	.attr("width", cap_width)
    	// 	.transition()
    	// 	.duration(200)
    	// 	.attr("width", 0);
    	// }

    	// Avoid moving past the limits
    	// if (domain[0] < limits.min) {
    	//     zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.min) + xScale.range()[0], zoomEventHandler.translate()[1]]);
    	// } else if (domain[1] > limits.max) {
    	//     zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.max) + xScale.range()[1], zoomEventHandler.translate()[1]]);
    	// }

    	_deferred();

        if (started) {
            for (var i = 0; i < tracks.length; i++) {
                var track = tracks[i];
                track.display().mover.call(track);
            }
        }

    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
        elem.parentNode.appendChild(elem);
    }

    return track_vis;
};

module.exports = exports = board;
