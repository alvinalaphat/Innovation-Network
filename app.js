var express = require('express');
var app = express();
var io = require('socket.io')(server);
var path = require('path');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
var mongodb = require('mongodb');
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var MongoClient = require('mongodb').MongoClient;
var server = require('http').createServer(app);
var db = mongoose.connection;
const port = 3005;
const flash = require('connect-flash');
const { ensureAuthenticated } = require('./views/config/auth');
var User = require('./lib/User.js');
var session = require('express-session');
var userData = [];

require('./views/config/passport')(passport);
urldb = 'mongodb+srv://alvinalaphat:DEP7ajrlIbPH1gZr@cluster0-1v2q4.mongodb.net/UserSystem?retryWrites=true';

// db.myusers.find({"skills":{"$in":["bevel"]}})

// connect to database
mongoose.connect(urldb, {
  useNewUrlParser: true
}).then(() => {
  console.log('Connected')
}).catch(err => {
  console.error(err);
  process.exit(1);
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// use flash
app.use(flash());

// global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
  done(err, user);
});
});

// login
app.post('/login', (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;
console.log(email);
console.log(password);

  User.getUserByUsername(email, (err, user) => {
    if(err) throw err;
    if(!user) {
      return res.json({success: false, msg: 'User not found'});
    }

    User.comparePassword(password, user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        return res.send({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        });
        req.session.loggedIn = true;
        req.session.email = user.email;
      } else {
        return res.send({success: false, msg: 'Wrong password'});
      }
    });
  });
});

// logout
app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/login');
});

app.use(passport.initialize());
app.use(passport.session());

// necessary to operate
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/views'));
app.get('/views/js',function(req,res){
    res.sendFile(path.join(__dirname + '/js'));
});


app.get('/', function(req, res) {
    res.render('pages/index');
});

// register post req
app.post('/register', function (req, res) {
    var email = req.body.email;
    console.log(email + " Just Registered!")
    var password = req.body.password;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var skills = req.body.skills;

    var newuser = new User({
      email: email,
      password: password,
      firstname: firstname,
      lastname: lastname,
      skills: JSON.parse(skills)
    });

    User.addUser(newuser,(err =>{
      if(err){
        res.json({success:false,msg:"Something went wrong"})
      }else{
        res.json({success:true,msg:"Registered"})

      }
    }))

});

// register get req
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/register.ejs'));
});

app.get('/', ensureAuthenticated, (req, res) =>
  res.render('pages/index.ejs', {
    user: req.user
})
);

app.get('/login', (req, res, next) => {
  res.render('pages/login.ejs');
});


app.post('/userSearch', (req, res) => {
  var userSearchQuery = req.body.skill;
  User.findUserBySkill(userSearchQuery, function(err, result) {
    //add code to use 'result' to render the data onto the web page
    // res.sendFile()
    var usersSearched = [];
    for(var i=0;i<result.length;i++){
      var userObject = {"firstname":result[i].firstname,"lastname":result[i].lastname,"email":result[i].email};
      usersSearched[i] = userObject;
    }

    userData = usersSearched;
    // console.log(usersSearched)
    // res.status(200).json({
    //   emails: usersSearched
    // });
    //send a new ejs file with the data rendered in
    res.redirect('/searchedUsers');
  });
})

/*
app.get('/', (req, res, next) => {
  if (req.session.loggedIn) {
    res.render('pages/home.ejs');
  } else {
    res.render('pages/index.ejs');
  }
});

app.get('/account', (req, res, next) => {
  const resOptions = {};
  if (req.session.loggedIn) {
    resOptions.email = req.session.email;
    // resOptions.firstName = req.session.firstname;
    // query db, then store info about user in resOptions

    // do whatever here to build resOptions

    res.render('pages/account.ejs', resOptions);
 } else {
   res.redirect('/login');
 }
});
*/

app.get('/searchedUsers', (req, res) => {
  // var userSearchQuery = 'drill press';
  if (!req.query.s) {
    res.send('no bueno')
  }
  var userSearchQuery = req.query.s;
  User.findUserBySkill(userSearchQuery, function(err, result) {
    //add code to use 'result' to render the data onto the web page
    // res.sendFile()
    var usersSearched = [];
    for(var i=0;i<result.length;i++){
      var userObject = {"firstname":result[i].firstname,"lastname":result[i].lastname,"email":result[i].email};
      usersSearched[i] = userObject;
    }

    userData = usersSearched;
    console.log(userData)

  res.render('pages/templatepage.ejs', {userData: userData});
})
});

app.get('/home', (req, res, next) => {
  res.render('pages/home.ejs');
});

app.get('/register', (req, res, next) => {
  res.render('pages/register.ejs');
})

app.get('/search', (req, res, next) => {
  res.render('pages/search.ejs');
})

app.get('/calendar', (req, res, next) => {
  res.render('pages/calendar.ejs');
})

app.get('/projects', (req, res, next) => {
  res.render('pages/projects.ejs');
})

app.get('/chat', (req, res, next) => {
  res.render('pages/chat.ejs');
})

//needed to run correctly
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// server listen
server.listen(port, '127.0.0.1', function() {
  console.log('Listening on ' + port)
});

module.exports = app;
