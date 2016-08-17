var tropowebapi = require('tropo-webapi')
  , express = require('express')
  , app = express()
  , bodyParser = require("body-parser")
  , request = require('request')
  , debug = process.env.DEBUG || false
  , statusIdRegex = /\d{5}/
  , port = process.env.PORT || 8000
  ;

var messages = {
  en: {
    welcome: 'You have contacted the Louisiana Rescue status system',
    status_code_prompt_text: 'Please enter your 5 digit status code',
    status_code_prompt_voice: 'Please say your 5 digit status code or enter the code into your keypad',
    repeat_back_code: 'The status code you entered is ',
    unknown_error: 'Something went wrong, please check that your code is correct and try again in a moment'
  }
}

function message(key) {
  return messages.en[key];
}

function fetchStatus(code, done) {
  request({
      json: true,
      url: 'http://www.louisianarescue.com/api/rescue/check/' + code,
      method: 'GET'
    })
    .on('response', function(response) {
      if (debug) console.log('fetch status success');
      if (debug) console.dir(response);
      done(null, response.body);
    })
    .on('error', function(err) {
      if (debug) console.log('fetch status err');
      if (debug) console.dir(err);
      done(err);
    });
}

function tropoResponse(res, tropo) {
  if (debug) console.log(tropowebapi.TropoJSON(tropo));
  return res.end(tropowebapi.TropoJSON(tropo));
}

app.use(bodyParser.json());

app.post('/api/tropo/voice', function(req, res){
  if (debug) console.dir(req.body);

  var tropo = new tropowebapi.TropoWebAPI();
  tropo.say(message('welcome'));

  // request 5 digit code
  var say = new Say(message('status_code_prompt_voice'));
  var choices = new Choices('[5 DIGITS]');

  // Action classes can be passes as parameters to TropoWebAPI class methods.
  // use the ask method https://www.tropo.com/docs/webapi/ask.htm
  tropo.ask(choices, 3, false, null, 'status-response', null, true, say, 5, null);

  // use the on method https://www.tropo.com/docs/webapi/on.htm
  tropo.on('continue', null, '/api/tropo/voice/answer', true);
  return tropoResponse(res, tropo);
});

app.post('/api/tropo/voice/answer', function(req, res){
  if (debug) console.dir(req.body);

  var tropo = new tropowebapi.TropoWebAPI();
  var result = req.body.result.actions.interpretation;

  // split up into numbers so she doesn't say "whatever thousand whatver"
  var statusCodeNumbers = result.split('').join(' ');

  tropo.say(message('repeat_back_code') + statusCodeNumbers);

  fetchStatus(result, function(err, body) {
    if (debug) console.dir(err);
    if (debug) console.dir(body);

    if (body && body.success) {
      tropo.say(body.message);
      //body.data.status;
      //body.data.rescued_on;
      //body.data.updated_on;
    } else {
      if (body && body.message) {
        tropo.say(body.message);
      } else {
        if (debug) console.log('something went wrong');
        tropo.say(message('unknown_error'));
      }
    }

    return tropoResponse(res, tropo);
  });
});


app.post('/api/tropo/text', function(req, res){
  if (debug) console.dir(req.body);

  var text = req.body.session.initialText;
  var userPhone = req.body.session.from.id;
  var statusMatch = statusIdRegex.exec(text);
  var tropo = new tropowebapi.TropoWebAPI();

  if (statusMatch) {
    var statusId = statusMatch[0];
    if (debug) console.log('status id: ' + statusId);

    fetchStatus(statusId, function(err, body) {
      if (debug) console.dir(err);
      if (debug) console.dir(body);

      if (body && body.success) {
        tropo.say(body.message);
        //body.data.status;
        //body.data.rescued_on;
        //body.data.updated_on;
      } else {
        tropo.say(message('unknown_error'));
      }

      return tropoResponse(res, tropo);
    });
  } else {
    if (debug) console.log('no match for a status id found');
    tropo.say(message('status_code_prompt_text'));

    return tropoResponse(res, tropo);
  }
});

app.listen(port);
console.log('Server running');
