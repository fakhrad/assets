var multer = require('multer')
var disk = require('../storages/diskStorage');
var config = require('../config');
var multerS3 = require('multer-s3')
var aws = require('aws-sdk');
var path = require('path');
var db = require('../storages/dbstorage');
var mongodb = require('mongodb');
const fs = require('fs');
var assetController = require('./assetController');
var storage = undefined;
exports.upload = (req, res, next) => {

  switch (config.storageType) {
    case "disk":
      storage = disk;
      break;
    case "database":
      storage = db;
      break;
    case "aws":
      switch (req.account_type) {
        default:
        case "free":
          storage = getFreeUserStorage(req);
          break;
        case "advanced":
          storage = getAdvancedUserStorage(req);
          break;
        case "premium":
          storage = getPremiumUserStorage(req);
          break;
      }
      break;
  }
  var upload = multer({
    storage: storage
  });
  const singleUpload = upload.single('file');
  singleUpload(req, res, function (err, some) {
    console.log(err);
    if (err) {
      return res.status(422).send({
        errors: [{
          title: 'File Upload Error',
          detail: err.message
        }]
      });
    }
    next();
  });
}

exports.download = (req, res, next) => {
  var storage = undefined;
  switch (config.storageType) {
    case "disk":
      storage = disk;
      break;
    case "database":
      storage = db;
      const bucket = new mongodb.GridFSBucket(db.db, {
        chunkSizeBytes: 1024
      });
      bucket.find({
        filename: req.params.filename
      }).toArray(function (err, files) {
        if (err)
          res.status(400).send(err);
        else {
          console.log(files);
          if (files.length == 0) {
            res.status(404).send("not_found");
            return;
          }
          res.setHeader("Content-Type", files[0]["contentType"]);
          bucket.openDownloadStreamByName(req.params.filename).
          pipe(res).
          on('error', function (error) {
            assert.ifError(error);
          }).
          on('finish', function () {
            console.log('done!');
          });
        }
      });

      break;
    case "aws":
      switch (req.account_type) {
        default:
        case "free":
          storage = getFreeUserStorage(req);
          break;
        case "advanced":
          storage = getAdvancedUserStorage(req);
          break;
        case "premium":
          storage = getPremiumUserStorage(req);
          break;
      }
      break;
  }
}

function getFreeUserStorage(req, file) {
  aws.config.update({
    secretAccessKey: process.env.AWS_FREE_SECRETKEY || "oh/oiBncgeI4qryeteNY//dA2sz+y7GW3+fECz2O",
    accessKeyId: process.env.AWS_FREE_ACCESSKEY || "AKIAWBLIRXLIXH27T66T",
    region: process.env.AWS_FREE_REGION || "us-east-1"
  });
  var s3 = new aws.S3({
    /* ... */ })
  var storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKETNAME || "caas",
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname
      });
    },
    key: function (req, file, cb) {
      var p = path.extname(file.originalname.toString());
      cb(null, req.spaceid + "/" + file.fieldname + '-' + Date.now().toString() + p)
    }
  });
  return storage;
}

function getAdvancedUserStorage(req, file) {
  aws.config.update({
    secretAccessKey: process.env.AWS_FREE_SECRETKEY || "c42eMoVdnweCUDqvEWQ4+byTn1+5v5CbD5dRNAKg",
    accessKeyId: process.env.AWS_FREE_ACCESSKEY || "AKIAJAL6VKDOXKAMEWFA",
    region: process.env.AWS_FREE_REGION || "us-east-1"
  });
  var s3 = new aws.S3({
    /* ... */ })
  var storage = multerS3({
    s3: s3,
    bucket: "reqter",
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname
      });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  });
  return storage;
}

function getPremiumUserStorage(req, file) {
  aws.config.update({
    secretAccessKey: process.env.AWS_FREE_SECRETKEY || "c42eMoVdnweCUDqvEWQ4+byTn1+5v5CbD5dRNAKg",
    accessKeyId: process.env.AWS_FREE_ACCESSKEY || "AKIAJAL6VKDOXKAMEWFA",
    region: process.env.AWS_FREE_REGION || "us-east-1"
  });
  var s3 = new aws.S3({
    /* ... */ })
  var storage = multerS3({
    s3: s3,
    bucket: "reqter",
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname
      });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  });
  return storage;
}