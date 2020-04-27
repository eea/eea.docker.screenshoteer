var _ = require('underscore');
const fs = require('fs-extra')
const getenv = require('getenv');
const nconf = require('nconf');
const screenshoteer = require('screenshoteer');
var glob = require("glob");
var util = require('util');
var crypto = require('crypto');
var good_arguments = ['url', 'w', 'h', 'emulate', 'fullPage', 'pdf', 'waitfor', 'waitforselector', 'auth', 'no', 'click', 'file'];
var location = getenv.string('VOLUME');

const { Cluster } = require('puppeteer-cluster');
global.cluster = undefined;

async function init_cluster () {
  global.cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 5,
    puppeteerOptions: {headless: true, timeout: 60000},
    timeout: 60000,
    monitor: false,
  });
  await global.cluster.task(async ({ page, data:req }) => {
      await screenshoteer(page, req.query);
  });

  // Event handler to be called in case of problems
  global.cluster.on('taskerror', (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });
};
exports.initialize_cluster = init_cluster;

exports.recreate_cluster = async function(req, res) {
    if (req.query.force) {
        await global.cluster.idle();
        await global.cluster.close();
        await init_cluster();
        res.status(200).send("Finished recreating cluster");
        return;
    }
    if (req.query.interval) {
        var interval = Number(req.query.interval);
    }
    else {
        var interval = 300000;
    }
    if (global.cluster.jobQueue.list.length === 0) {
        await global.cluster.idle();
        await global.cluster.close();
        await init_cluster();
        res.status(200).send("Finished recreating cluster");
    }
    else {
        const retry = (fn, ms) => new Promise(resolve => {
          fn()
          .then(resolve)
          .catch(() => {
            setTimeout(() => {
              console.log('retrying recreate_cluster...');
              retry(fn, ms).then(resolve);
            }, ms);
          })
        });
        retry(() => exports.recreate_cluster(req, res), interval);
    }
    return;
}

exports.create_image = async function(req, res){
    try {
        await global.cluster.execute(req);
    }
    catch(err) {
        throw(err);
    }
    return;
}

exports.invalidate_cache_for_url = async function(req, res){
    if (req.query.url === undefined) {
        res.status(404).send('No url specified');
        return;
    }
    if (req.query.url.endsWith('/')) {
        req.query.url = req.query.url.slice(0, -1);
    }
    if (req.query.url.startsWith('http')) {
        url = req.query.url.split("://")[1];
    }
    else {
        url = req.query.url;
    }
    var url_to_hash = url.split('/')[0];
    while(url.indexOf('/') !== -1) {
        url = url.replace('/', '-');
    }
    // hash md5 url + hash md5 params
    var hashed_url = crypto.createHash('md5').update(url_to_hash).digest("hex");

    var options = {cwd: location};
    var count = 0;
    var wildcard = "*" + hashed_url + "*.*";
    try {
        glob(wildcard, options, function (er, files) {
            if (files.length === 0) {
                res.status(400).send("The url didn't match any file.");
                return;
            }
            for (i=0; i<files.length; i++) {
                fs.remove(location + files[i])
                .then(() => {
                    console.log('Removed file.');
                })
                .catch(err => {
                    res.status(400).send(err.toString());
                    console.error(err);
                })
                count++;
            }
            res.status(200).send(util.format("Finished removing %d files.", count));
        })
    }
    catch(err) {
        console.log(err);
        res.status(400).send(err.toString());
    }
    return;
}

exports.retrieve_image_for_url = async function(req, res){
    if (global.cluster === undefined) {
        await init_cluster();
    }
    if (req.query.url === undefined) {
        res.status(404).send('No url specified');
        return;
    }
    if (req.query.url.endsWith('/')) {
        req.query.url = req.query.url.slice(0, -1);
    }
    if (req.query.url.startsWith('http')) {
        url = req.query.url.split("://")[1];
    }
    else {
        url = req.query.url;
        req.query.url = "http://" + req.query.url;
    }

    var url_to_hash = url.split('/')[0];
    while(url.indexOf('/') !== -1) {
        url = url.replace('/', '-');
    }

    keys = Object.keys(req.query);
    var file = location;
    var params_to_hash = '';
    for (i=0; i<keys.length;i++) {
        if (keys[i] === "fullpage") {
            keys[i] = "fullPage";
        }
        if (!good_arguments.includes(keys[i])) {
            console.log(keys[i]);
            delete req.query[keys[i]];
        }
        if (keys[i] === "url") {
            params_to_hash += keys[i] + url.replace(url_to_hash, '');
        }
        else {
            params_to_hash += keys[i] + req.query[keys[i]];
        }
    }

    // hash md5 url + hash md5 params
    var hashed_url = crypto.createHash('md5').update(url_to_hash).digest("hex");
    var hashed_params = crypto.createHash('md5').update(params_to_hash).digest("hex");
    var hashed_filename = hashed_url + hashed_params;

    if (req.query.pdf !== undefined) {
        res.setHeader('Content-Type', 'application/pdf');
        hashed_filename += '.pdf';
    }
    else {
        res.setHeader('Content-Type', 'image/jpg');
        hashed_filename += '.jpg';
    }

    file += hashed_filename;
    req.query.file = file;
    try {
        var file_exists = fs.pathExistsSync(file);
        if (file_exists) {
            fs.createReadStream(file).pipe(res);
        }
        else {
            await exports.create_image(req, res);
            fs.createReadStream(file).pipe(res);
        }
    }
    catch(err) {
        console.log(err);
        res.status(400).send(err.toString());
    }
    return;
}

exports.healthcheck = function(req, res){
    try {
        var file = location + 'testfile.txt';
        fs.closeSync(fs.openSync(file, 'w'));
        res.status(200).send('OK');
    }
    catch(err) {
        console.log(err);
        res.status(500).send(err.toString());
    }
    return;
}
