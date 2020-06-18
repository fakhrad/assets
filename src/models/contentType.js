var mongoose = require("mongoose");
var field = require("./field");
var sysfld = require("./sys");
var Schema = mongoose.Schema;
var connections = require("../db/connections");

var contentType = new Schema({
  sys: { type: sysfld, required: true },
  name: { type: Object, required: true },
  title: { type: Object, required: true },
  description: { type: Object },
  versioning: { type: Boolean, default: true },
  template: { type: String, required: true },
  media: [Object],
  allowCustomFields: { type: Boolean, default: false },
  accessRight: { type: Boolean, default: false },
  categorization: { type: Boolean, default: true },
  fields: [Object],
  status: { type: Boolean, required: true, default: true }
});

module.exports = connections.contentDb.model("ContentType", contentType);
