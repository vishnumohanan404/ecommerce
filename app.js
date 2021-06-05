// imports  
const createError                  = require('http-errors');
const express                      = require('express');
const path                         = require('path');
const cookieParser                 = require('cookie-parser');
const logger                       = require('morgan');
const fileUpload                   = require('express-fileupload');
var hbs                            = require('express-handlebars');
const session                      = require('express-session')
const db                           = require('./config/connection')
const adminRouter                  = require('./routes/admin');
const usersRouter                  = require('./routes/users');
const vendorRouter                 = require('./routes/vendor')
const app                          = express();
var bodyParser                     = require('body-parser');
var fs                             = require('fs');
var helmet                         = require('helmet');
const passport                     = require('passport')
require('./config/passport-setup.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layouts/',
            partialsDir:__dirname+'/views/partials/'}))

var expressHbs = hbs.create({});
    // register new helper function
expressHbs.handlebars.registerHelper('multiply', function(price,quantity) {
      num = (price* quantity)
      return Math.round((num+Number.EPSILON)*100)/100 ;
})
expressHbs.handlebars.registerHelper('subtract', function(option1,option2) {
  let num =(option1- option2)
  return Math.round((num+Number.EPSILON)*100)/100;
})
expressHbs.handlebars.registerHelper("inc", function(value, options)
{
    return parseInt(value) + 1;
})
expressHbs.handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});
expressHbs.handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});
// General Middlewares

app.use(helmet({contentSecurityPolicy:false}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(function(req, res, next) {
                                   res.set('Cache-Control', 
                                   'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                                   next();
                                 });
app.use(session({secret:"Key",cookie:{maxAge:600000000}}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(passport.initialize());
app.use(passport.session());

// database connection call
db.connect((err)=>{
  if(err) console.log('Db connection failed'+ err);
  else console.log('Database connected')
});


// router connecting middlewares
app.use('/admin', adminRouter);
app.use('/', usersRouter);
app.use('/vendor', vendorRouter);

// --Exception handling--



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
