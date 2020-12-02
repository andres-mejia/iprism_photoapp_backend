global.cv = require('opencv4nodejs');

const { decodeFromBase64, encodeJpgBase64 } = require('./imgcodecs');

const {
  startAnalysis
} = require ("./boardDetection");

const { renderPreview } = require ("./renderService");

module.exports = {
  decodeFromBase64,
  encodeJpgBase64,
  startAnalysis,
  renderPreview,
};