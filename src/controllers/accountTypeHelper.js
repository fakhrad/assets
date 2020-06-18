var multer = require('multer')
var disk = require('../storages/diskStorage');
var config = require('../config');
var multerS3 = require('multer-s3')
var aws = require('aws-sdk');
var path = require('path');
var db = require('../storages/dbstorage');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var GridStore = mongodb.GridStore;
var ObjectID = require('mongodb').ObjectID;
const fs = require('fs');
var assetController = require('./assetController');
var storage = undefined;

function StreamGridFile(req, res, GridFile) {
  if (req.headers['range']) {
    // Range request, partialle stream the file
    console.log('Range Reuqest');
    var parts = req.headers['range'].replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];


    var start = parseInt(partialstart, 10);

    var end = partialend ? parseInt(partialend, 10) : GridFile.length - 1;
    var chunksize = (end - start) + 1;
    console.log('Range Reuqest : ' + start + "-" + end + "  chunksize : " + chunksize);

    res.writeHead(206, {
      'Content-disposition': 'filename=xyz',
      'Accept-Ranges': 'bytes',
      'Content-Type': GridFile.contentType,
      'Content-Range': 'bytes ' + start + '-' + end + '/' + GridFile.length,
      'Content-Length': chunksize
    });

    // Set filepointer
    GridFile.seek(start, function () {
      // get GridFile stream
      var stream = GridFile.stream(true);

      // write to response
      stream.on('data', function (buff) {
        // count data to abort streaming if range-end is reached
        // perhaps theres a better way?
        if (start >= end) {
          // enough data send, abort
          GridFile.close();
          res.end();
        } else {
          res.write(buff);
        }
      });
    });

  } else {

    // stream back whole file
    console.log('No Range Request');
    res.header('Content-Type', GridFile.contentType);
    res.header('Content-Length', GridFile.length);
    var stream = GridFile.stream(true);
    stream.pipe(res);
  }
}


exports.upload = (req, res, next) => {

  var stype = req.storageType || config.storageType
  switch (stype) {
    case "disk":
      storage = disk;
      break;
    case "database":
      storage = db;
      break;
    case "s3":
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
  var stype = req.storageType || config.storageType
  console.log("starting download... : " + stype)
  switch (stype) {
    case "disk":
      storage = disk;
      break;
    case "database":
      storage = db;
      console.log("GridStore reading");
      new GridStore(db.db, req.params.filename, 'r').open(function (err, GridFile) {
        if (!GridFile) {
          console.log("Grid file not found");
          res.send(404, 'Not Found');
          return;
        }
        if (err) {
          console.log(err)
          res.send(400, err);
          return;
        } else
          StreamGridFile(req, res, GridFile);
      });
      // const bucket = new mongodb.GridFSBucket(db.db, {
      //   chunkSizeBytes: 1024
      // });
      // bucket.find({
      //   filename: req.params.filename
      // }).toArray(function (err, files) {
      //   if (err)
      //     res.status(400).send(err);
      //   else {
      //     console.log(files);
      //     if (files.length == 0) {
      //       res.status(404).send("not_found");
      //       return;
      //     }
      //     res.setHeader("Content-Type", files[0]["contentType"]);
      //     bucket.openDownloadStreamByName(req.params.filename).
      //     pipe(res).
      //     on('error', function (error) {
      //       console.log(error);
      //     }).
      //     on('finish', function () {
      //       console.log('done!');
      //     });
      //   }
      // });

      break;
    case "s3":
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

exports.hlsstream = (req, res, next) => {
  var storage = undefined;
  var stype = req.storageType || config.storageType
  console.log("start streaming... : " + stype)
  switch (stype) {
    case "disk":
      storage = disk;
      break;
    case "database":
      storage = db;
      console.log("GridStore reading");
      new GridStore(db.db, req.params.filename, 'r').open(function (err, GridFile) {
        if (!GridFile) {
          console.log("Grid file not found");
          res.send(404, 'Not Found');
          return;
        }
        if (err) {
          console.log(err)
          res.send(400, err);
          return;
        } else
          StreamGridFile(req, res, GridFile);
      });
      break;
    case "s3":
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
    /* ... */
  })
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
    /* ... */
  })
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
    /* ... */
  })
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