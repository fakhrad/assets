var jwt = require('jsonwebtoken');
const config = require('../config');
var Spaces = require('../models/space');

function verifyToken(req, res, next) {
  var token = req.headers['x-access-token'];
  if (token == null || !token) {
    token = req.headers['authorization'];
    if (token == null || !token) {
      req.spaceId = req.headers.spaceid;
      next();
    } else
      token = token.replace("Bearer ", "");
  }
  // if (!token || token == null)
  //   return res.status(403).send({ auth: false, message: 'No token provided.' });
  if (token && token != null && token.length > 0) {
    jwt.verify(token, config.secret, function (err, decoded) {
      if (err)
        return res.status(401).send({
          auth: false,
          message: 'Failed to authenticate token.'
        });
      // if everything good, save to request for use in other routes
      req.userId = decoded.id;
      req.spaceId = req.headers.spaceid;
      req.account_type = decoded.account_type;
      if (req.spaceId) {
        Spaces.findById(req.spaceId).exec((err, space) => {
          if (space) {
            console.log("Space storage type is : ", space.storage)
            req.storageType = space.storage || "database";
          } else {
            console.log("Space storage is null")
            req.storageType = "database"
          }
        });
      } else {
        console.log("Default storage")
        req.storageType = "database"
      }
      console.log("auth : " + JSON.stringify(decoded));
      next();
    });
  } else {
    req.spaceId = req.headers.spaceid;
    next();
  }
}

function extractHeaders(req, res, next) {
  console.log("Extracting headers : " + req.headers.spaceid)
  req.spaceId = req.headers.spaceid;
  if (req.headers.spaceid) {
    Spaces.findById(req.headers.spaceid, (err, space) => {
      if (space) {
        console.log("Space storage type is : ", space.storage)
        req.storageType = space.storage || "database";
      } else {
        console.log("Space storage is null")
        req.storageType = "database"
      }
    });
  } else {
    console.log("Default storage")
    req.storageType = "database"
  }
  next();
}
exports.verifyToken = verifyToken;
exports.extractHeaders = extractHeaders;