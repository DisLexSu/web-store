var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var Book = require("../models/book");

/* GET home page. */
router.get('/', function (req, res, next) {
  res.send('Express RESTful API');
});

router.post('/signup', function (req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({ success: false, msg: 'Please pass username and password.' });
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function (err) {
      if (err) {
        return res.json({ success: false, msg: 'Username already exists.' });
      }
      res.json({ success: true, msg: 'Successful created new user.' });
    });
  }
});

router.post('/signin', function (req, res) {
  User.findOne({
    username: req.body.username
  }, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user.toJSON(), config.secret);
          // return the information including token as JSON
          res.json({ success: true, token: 'JWT ' + token });
        } else {
          res.status(401).send({ success: false, msg: 'Authentication failed. Wrong password.' });
        }
      });
    }
  });
});

router.post('/book', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    var newBook = new Book({
      description: req.body.description,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      publisher: req.user.username
    });

    newBook.save(function (err) {
      if (err) {
        return res.json({ success: false, msg: 'Save book failed.' });
      }
      res.json({ success: true, msg: 'Successful created new book.' });
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

router.put("/book", passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);

  if (token) {
    Book.findOneAndUpdate({ _id: req.body.id }, {
      description: req.body.description,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      publisher: req.user.username
    })
      .then(book => res.json(book))
      .catch(err => console.log(err));
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

router.get('/book', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    Book.find({ publisher: req.user.username }, function (err, books) {
      if (err) return next(err);
      res.json(books);
    });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

router.delete('/book/:bookId', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    Book.findOneAndRemove({ _id: req.params.bookId })
      .then(book => res.json(book))
      .catch(err => console.log(err));
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;