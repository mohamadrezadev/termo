const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // For directory creation if needed
const { extractBmps } = require('./extractor');

const app = express();
const port = process.env.PORT || 3001; // Configurable port

// Configure Multer for file storage
// We'll save uploaded files to an 'uploads/' directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const EXTRACTED_DIR = path.join(__dirname, 'extracted_images');

// Ensure directories exist
(async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        await fs.mkdir(EXTRACTED_DIR, { recursive: true });
        console.log(`Uploads directory ensured at: ${UPLOADS_DIR}`);
        console.log(`Extracted images directory ensured at: ${EXTRACTED_DIR}`);
    } catch (err) {
        console.error("Error creating directories:", err);
        process.exit(1); // Exit if we can't create essential directories
    }
})();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Use a timestamp or unique ID to avoid filename conflicts
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware to serve extracted images statically (optional, but useful for direct access)
app.use('/images', express.static(EXTRACTED_DIR));

// API endpoint for uploading and extracting BMPs
app.post('/api/extract-bmps', upload.single('bmtfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    console.log(`File uploaded: ${req.file.path}`);

    try {
        const extractionResult = await extractBmps(req.file.path, EXTRACTED_DIR);

        if (extractionResult.success) {
            // Optionally, clean up the uploaded file after extraction
            // await fs.unlink(req.file.path);
            // console.log(`Cleaned up uploaded file: ${req.file.path}`);

            // Construct URLs for the client to access the images
            const imageUrls = extractionResult.images.map(img => {
                const filename = path.basename(img.path);
                return `${req.protocol}://${req.get('host')}/images/${filename}`;
            });

            res.status(200).json({
                ...extractionResult,
                images: extractionResult.images.map((img, index) => ({
                    ...img,
                    url: imageUrls[index] // Add URL to each image object
                }))
            });
        } else {
            // If extraction itself failed but was handled by extractBmps
            res.status(500).json(extractionResult);
        }
    } catch (error) {
        console.error('Error processing file:', error);
        // Also clean up uploaded file in case of an unhandled error during processing
        // await fs.unlink(req.file.path).catch(err => console.error("Error cleaning up file on failure:", err));
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    } finally {
        // Clean up the uploaded file in all cases (success or handled error)
        // We might want to keep it for debugging in some cases, so this is optional
        try {
            if (req.file && req.file.path) {
                await fs.unlink(req.file.path);
                console.log(`Cleaned up uploaded file: ${req.file.path}`);
            }
        } catch (cleanupError) {
            console.error('Error during post-processing cleanup of uploaded file:', cleanupError);
        }
    }
});

app.get('/', (req, res) => {
    res.send('BMP Extractor Server is running. Use POST /api/extract-bmps to upload a BMT file.');
});

app.listen(port, () => {
    console.log(`BMP Extractor server listening at http://localhost:${port}`);
});
