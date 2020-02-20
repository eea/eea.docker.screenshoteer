// var commands = require('../builtinCommands');
var _ = require('underscore');

exports.create_image = function(req, res){
    console.log("Test CREATE IMAGE API");
    // var options = {}
    // options = _.extend(options, global.API_settings.indexing);
    // options.API_callback = function(rsp){
    //     res.send(rsp);
    // }
    // commands.create_index(options)
}

exports.invalidate_cache_for_url = function(req, res){
    console.log("Test INVALIDATE CACHE FOR URL API");
    // var options = {}
    // options.API_callback = function(rsp){
    //     response.send(rsp);
    // }
    // commands.api_switch(options)
}

exports.retrieve_image_for_url = function(req, res){
    console.log("Test RETRIEVE IMAGE FOR URL API");
    // if (req.query.url !== undefined){
    //     var options = {update_from_url:req.query.url}
    //     options = _.extend(options, global.API_settings.indexing);
    //     options.API_callback = function(rsp){
    //         res.send(rsp);
    //     }
    //     commands.create_index(options)
    // }
    // else {
    //     res.send({error:"No url specified"});
    // }
}
