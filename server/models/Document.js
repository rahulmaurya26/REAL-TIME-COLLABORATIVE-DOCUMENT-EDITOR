// Import mongoose for MongoDB object modeling
const mongoose = require('mongoose');

// Define a sub-schema for each version of a document
const VersionSchema = new mongoose.Schema({
  content: Object, // The content of the document at a specific version
  savedAt: {       // Timestamp when this version was saved
    type: Date,
    default: Date.now, // Automatically set to current time if not provided
  },
});

// Define the main document schema
const DocumentSchema = new mongoose.Schema({
  _id: String,       // Custom ID for the document (e.g., UUID)
  title: String,     // Title of the document
  data: Object,      // Current content of the document
  versionHistory: [VersionSchema], // Array of previous versions (for version tracking)
}, {
  timestamps: true,  // Automatically add createdAt and updatedAt fields
});

// Export the model so it can be used in routes/controllers
module.exports = mongoose.model('Document', DocumentSchema);
