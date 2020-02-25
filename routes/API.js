var _ = require('underscore');
const fs = require('fs-extra')
const getenv = require('getenv');
const nconf = require('nconf')
const screenshoteer = require('screenshoteer')
var good_arguments = ['url', 'w', 'h', 'emulate', 'fullpage', 'pdf', 'waitfor', 'waitforselector', 'auth', 'no', 'click', 'file']
var location = getenv.string('VOLUME')

exports.create_image = async function(req, res){
    query = req.query;
    keys = Object.keys(query);
    for (i=0; i<keys.length;i++) {
        if (!good_arguments.includes(keys[i])) {
            console.log(keys[i]);
            delete req.query[keys[i]];
        }
    }
    try {
        await screenshoteer(req.query);
    }
    catch(err) {
        throw(err);
    }
    return;
}

exports.invalidate_cache_for_url = function(req, res){
    console.log("Test INVALIDATE CACHE FOR URL API");
    debugger;
}

exports.retrieve_image_for_url = async function(req, res){
    if (req.query.url === undefined) {
        res.status(404).send('No url specified');
        return;
    }
    url = req.query.url.split('://')[1];
    file = location + url + '.jpg';
    req.query.file = file;

    try {
        var file_exists = fs.pathExistsSync(file);
        if (file_exists) {
            res.setHeader('Content-Type', 'image/jpg');
            fs.createReadStream(file).pipe(res);
        }
        else {
            await exports.create_image(req, res);
            res.setHeader('Content-Type', 'image/jpg');
            fs.createReadStream(file).pipe(res);
        }
    }
    catch(err) {
        console.log(err);
        res.status(400).send(err.toString());
    }
    return;
}
