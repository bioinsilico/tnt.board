"use conservation";

var feature_area = require("./area.js");

var feature_conservation = function () {
        var feature = feature_area();

        var area_create = feature.create(); // We 'save' area creation
        feature.create  (function (points) {
        	var track = this;
            var xScale = feature.scale();
        	area_create.call(track, d3.select(points[0][0]), xScale);
        });

    return feature;
};

module.exports = exports = feature_conservation;
