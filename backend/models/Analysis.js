const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  resumeText: { type: String, required: true },
  jobDescription: { type: String, required: true },
  atsScore: { type: Number },
  foundKeywords: { type: [String] },
  missingKeywords: { type: [String] },
  improvements: { type: [String] },
  coverLetter: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
