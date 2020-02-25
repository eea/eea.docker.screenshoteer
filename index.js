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

app.get('/API/create_image', routes.API.create_image);
app.get('/API/invalidate_cache_for_url', routes.API.invalidate_cache_for_url);
app.get('/API/retrieve_image_for_url', routes.API.retrieve_image_for_url);

const PORT = process.env.PORT || 3000;
if (process.env.ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log('Application listening on port 3000');
    try{
      // await screenshoteer({'url': 'https://www.eea.europa.eu/', 'file': '/tmpScreens/test-screen-test.jpg', 'w': 1920, 'h': 1080, 'fullpage': true})
      // debugger;
    }
    catch(err){
      console.log(err);
      server.close();
    }
  });
}
