const express = require('express');
const app = express();
const screenshoteer = require('screenshoteer')
var routes = require('./routes');

// app.use(function forceSSL(req, res, next) {
//   if (req.hostname !== 'localhost' && req.get('X-Forwarded-Proto') === 'http') {
//     res.redirect(`https://${req.hostname}${req.url}`);
//   }
//   next();
// });

app.get('/API/v1/create_image', routes.API.create_image);
app.get('/API/v1/invalidate_cache_for_url', routes.API.invalidate_cache_for_url);
app.get('/API/v1/retrieve_image_for_url', routes.API.retrieve_image_for_url);
app.get('/API/v1/recreate_cluster', routes.API.recreate_cluster);

const PORT = process.env.PORT || 3000;
if (process.env.ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log('Application listening on port 3000');
    try{
      if (global.cluster === undefined) {
          await routes.API.initialize_cluster();
      }
    }
    catch(err){
      console.log(err);
      throw(err);
      server.close();
    }
  });
}
