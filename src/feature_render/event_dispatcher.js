"use strict";

var d3 = require("d3");
var event_dispatcher = function(){
    var dispatch = d3.dispatch ("click", "dblclick", "mouseover", "mouseout");

    dispatch.click = function (d,i, track) {
       if(typeof(d.start)==="number" && typeof(d.end)==="number") {
           track.board().select_region(d.start-0.5, d.end+0.5);
       }else if(typeof(d.pos)==="number"){
           track.board().select_region(d.pos-0.5, d.pos+0.5);
       }
    };

    return dispatch;
};

module.exports = exports = event_dispatcher;
