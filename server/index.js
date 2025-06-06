// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const Document = require('./models/Document'); // Mongoose model

const app = express();

// Allow requests from the React frontend (CORS policy)
app.use(cors({
    origin: 'http://localhost:3000', // React app origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/docs', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Create HTTP server and attach Socket.io to it
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: 'http://localhost:3000' },
});

// === WebSocket Events ===
io.on('connection', (socket) => {
    // When a client requests a document by ID
    socket.on('get-document', async (docId) => {
        let document = await Document.findById(docId);
        
        // If document doesn't exist, create it
        if (!document) {
            document = await Document.create({ _id: docId, data: {} });
        }

        // Join the user to a room based on document ID
        socket.join(docId);

        // Send document content to the connected client
        socket.emit('load-document', document.data);

        // Broadcast text changes to all other users in the same document room
        socket.on('send-changes', delta => {
            socket.broadcast.to(docId).emit('receive-changes', delta);
        });

        // Save document content in MongoDB
        socket.on('save-document', async data => {
            await Document.findByIdAndUpdate(docId, { data });
        });
    });
});

// === HTTP API Routes ===

// Basic home route
app.get('/', (req, res) => {
    res.send("Collaborative Editor Backend Running");
});

// Get all saved documents
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await Document.find({});
        res.json(docs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Save or update a document with version history
app.post('/api/save', async (req, res) => {
    const { _id, title, data } = req.body;

    // Validation
    if (!_id || !title || !data) {
        return res.status(400).json({ error: 'Missing required fields (_id, title, data)' });
    }

    try {
        const doc = await Document.findById(_id);

        if (doc) {
            // Save current version to history before updating
            doc.versionHistory.push({ content: doc.data });
            doc.title = title;
            doc.data = data;
            await doc.save();
            res.json(doc);
        } else {
            // Create new document
            const newDoc = await Document.create({
                _id,
                title,
                data,
                versionHistory: [],
            });
            res.json(newDoc);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save document' });
    }
});

// Test API route
app.get('/api/test', (req, res) => res.json({ msg: 'API working' }));

// Delete a document by its ID
app.delete('/api/documents/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await Document.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json({ message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Failed to delete document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// Start the server on port 5000
server.listen(5000, () => console.log("🚀 Server running on port 5000"));
