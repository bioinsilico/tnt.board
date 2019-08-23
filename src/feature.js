"use strict";

var feature_core = require("./feature_render/core.js");
var feature_composite = require("./feature_render/composite.js");
var feature_area = require("./feature_render/area.js");
var feature_line = require("./feature_render/line.js");
var feature_conservation = require("./feature_render/conservation.js");
var feature_vline = require("./feature_render/vline.js");
var feature_pin = require("./feature_render/pin.js");
var feature_block = require("./feature_render/block.js");
var feature_axis = require("./feature_render/axis.js");
var feature_location = require("./feature_render/location.js");
var feature_sequence = require("./feature_render/sequence.js");

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

tnt_feature.vline = function () {
    return feature_vline();
};

tnt_feature.pin = function () {
    return feature_pin();
};

tnt_feature.block = function () {
    return feature_block();
};

tnt_feature.axis = function () {
    return feature_axis();
};

tnt_feature.location = function () {
    return feature_location();
};

tnt_feature.sequence = function () {
    return feature_sequence();
};

module.exports = exports = tnt_feature;
