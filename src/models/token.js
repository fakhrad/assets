/**
 * Module dependencies.
 */

var mongoose = require("mongoose");
var sysfld = require("./sys");
var ctype = require("./contentType");
var status = require("./status");
var connections = require("../db/connections");
var Schema = mongoose.Schema;
/**
 * Schema definitions.
 */

module.exports = connections.authDb.model(
  "Tokens",
  new Schema({
    accessToken: { type: String },
    accessTokenExpiresOn: { type: Date },
    clientId: { type: String },
    refreshToken: { type: String },
    refreshTokenExpiresOn: { type: Date },
    userId: { type: String },
    authenticated: { type: Boolean },
    activation_code: { type: Number },
    deviceToken: { type: String },
    os: { type: String },
    version: { type: String },
    issueDate: { type: Date, default: new Date() }
  })
);
