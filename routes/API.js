var _ = require('underscore');
const fs = require('fs-extra')
const getenv = require('getenv');
const nconf = require('nconf')
const screenshoteer = require('screenshoteer')
var glob = require("glob")
var util = require('util')
var good_arguments = ['url', 'w', 'h', 'emulate', 'fullPage', 'pdf', 'waitfor', 'waitforselector', 'auth', 'no', 'click', 'file']
var location = getenv.string('VOLUME')

const { Cluster } = require('puppeteer-cluster');
global.cluster = undefined;

async function init_cluster () {
  global.cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 5,
    puppeteerOptions: {headless: true, timeout: 60000},
    timeout: 60000,
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
    while(url.indexOf('/') !== -1) {
        url = url.replace('/', '-');
    }

    var options = {cwd: location};
    var count = 0;
    var wildcard = "*" + url + "*.*";
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

    while(url.indexOf('/') !== -1) {
        url = url.replace('/', '-');
    }

    keys = Object.keys(req.query);
    var file = location;
    for (i=0; i<keys.length;i++) {
        if (!good_arguments.includes(keys[i])) {
            console.log(keys[i]);
            delete req.query[keys[i]];
        }
        if (keys[i] === "url") {
            file += keys[i] + url;
        }
        else {
            file += keys[i] + req.query[keys[i]];
        }
    }
    if (req.query.pdf !== undefined) {
        res.setHeader('Content-Type', 'application/pdf');
        file += '.pdf';
    }
    else {
        res.setHeader('Content-Type', 'image/jpg');
        file += '.jpg';
    }

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
