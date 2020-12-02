const log4js = require('log4js');
var express = require('express');
var cors = require('cors');
var loggerMorgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var methodOverride = require('method-override');
var compression = require('compression');
var app = express();



// log the cheese logger messages to a file, and the console ones as well.
log4js.configure({
  appenders: {
    scannerLogs: { type: 'file', filename: 'iprism-scanner.log' },
    console: { type: 'console' }
  },
  categories: {
    masredbackend: { appenders: ['scannerLogs'], level: 'info' },
    another: { appenders: ['console'], level: 'trace' },
    default: { appenders: ['console', 'scannerLogs'], level: 'trace' }
  }
});

var logger = log4js.getLogger();

var router = require('./routes/index');

app.listen(4000, () => console.log('scanner running'));

app.use('/static', express.static(__dirname + '/public'));

app.use(cors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 200
}));

var allowCrossDomain = function(req, res, next) {
    if ('OPTIONS' == req.method) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
        res.send(200);
    }
    else {
        next();
    }
};

app.use(allowCrossDomain);

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}));

app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));

app.use(loggerMorgan('dev'));

app.use('/', router);

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500).json({
            "msg": "error",
            "error": err.message
        });
    });
}

app.use(function (err, req, res, next) {
    res.status(err.status || 500).json({
        "msg": "error",
        "error": err.message
    });
});

module.exports = app;
