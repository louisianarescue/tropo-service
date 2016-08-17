var mongoose = require('mongoose')
  , uristring = process.env.MONGODB_URI || 'mongodb://localhost/rescue'
  ;

var Call = mongoose.model('Call', {
  type: String,
  phone: String,
  state: Number,
  session: String,
  createdAt: { type: Date, expires: 120, default: Date.now }
});

module.exports.Call = Call;

module.exports.createCall = function(data, done) {
  var call = new Call(data);
  call.save(done);
}

module.exports.findCall = function(phone, done) {
  var query = Call.findOne({phone: phone});
  query.select('phone state type session createdAt');
  query.exec(done);
}

module.exports.findCallBySession = function(session, done) {
  var query = Call.findOne({session: session});
  query.select('phone state type session createdAt');
  query.exec(done);
}

module.exports.nextStep = function(call, done) {
  Call.update({_id: call.id }}, {$inc: {state:1}}, done);
}

module.exports.createDb = function(done) {
}

module.exports.connect = function(done) {
  // start everything up
  mongoose.connect(uristring, function (err, res) {
    if (err) {
      console.log ('ERROR connecting to: ' + uristring + '. ' + err);
      done(err);
    } else {
      done(null, res);
    }
  });
}
