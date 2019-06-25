"use strict";

var feature_core = require("./core.js");
var feature_composite = require("./composite.js");
var feature_area = require("./area.js");
var feature_line = require("./line.js");
var feature_conservation = require("./conservation.js");
var feature_ensembl = require("./ensembl.js");
var feature_vline = require("./vline.js");
var feature_pin = require("./pin.js");
var feature_block = require("./block.js");

var tnt_feature = function () {
    return feature_core();
};

tnt_feature.composite = function () {
    return feature_composite();
};

tnt_feature.area = function () {
    return feature_area();
};

tnt_feature.line = function () {
    return feature_line();
};

tnt_feature.conservation = function () {
    return feature_conservation();
};

tnt_feature.ensembl = function () {
    return feature_ensembl();
};

tnt_feature.vline = function () {
    return feature_vline();

};

tnt_feature.pin = function () {
    return feature_pin;
};

tnt_feature.block = function () {
    return feature_block;
};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";
    var xScale;

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
    	xAxis = undefined;
    	var track = this;
    	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.mover = function () {
    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.init = function () {
        xAxis = undefined;
    };

    feature.update = function () {
    	// Create Axis if it doesn't exist
        if (xAxis === undefined) {
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient(orientation);
        }

    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
    	if (!arguments.length) {
    	    return orientation;
    	}
    	orientation = pos;
    	return this;
    };

    feature.scale = function (s) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = s;
        return this;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;
    var xScale;

    var feature = {};
    feature.reset = function () {
        row = undefined;
    };
    feature.plot = function () {};
    feature.init = function () {
        row = undefined;
        var track = this;
        track.g.select("text").remove();
    };
    feature.mover = function() {
    	var domain = xScale.domain();
    	row.select("text")
    	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.scale = function (sc) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = sc;
        return this;
    };

    feature.update = function (loc) {
    	var track = this;
    	var svg_g = track.g;
    	var domain = xScale.domain();
    	if (row === undefined) {
    	    row = svg_g;
    	    row
        		.append("text")
        		.text("Location: " + Math.round(domain[0]) + "-" + Math.round(domain[1]));
    	}
    };

    return feature;
};

module.exports = exports = tnt_feature;
