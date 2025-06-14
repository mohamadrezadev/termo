const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // For directory creation if needed
const { extractBmps } = require('./extractor');
const bmp = require('bmp-js');

const app = express();
const port = process.env.PORT || 3001; // Configurable port

// Configure Multer for file storage
// We'll save uploaded files to an 'uploads/' directory
const EXTRACTED_DIR = path.join(__dirname, 'extracted_images');

// Ensure directories exist
(async () => {
    try {
        await fs.mkdir(EXTRACTED_DIR, { recursive: true });
        console.log(`Extracted images directory ensured at: ${EXTRACTED_DIR}`);
    } catch (err) {
        console.error("Error creating directories:", err);
        process.exit(1); // Exit if we can't create essential directories
    }
})();

const storage = multer.memoryStorage();
const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }
});

// Middleware to serve extracted images statically (optional, but useful for direct access)
app.use('/images', express.static(EXTRACTED_DIR));

// API endpoint for uploading and extracting BMPs
app.post('/api/extract-bmps', (req, res) => {
    upload.single('bmtfile')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ success: false, message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
            }
            // Handle other multer errors
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            // Handle other non-multer errors that might occur before file processing
            console.error('Unknown error during upload:', err);
            return res.status(500).json({ success: false, message: `Unknown error during upload: ${err.message}` });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        console.log(`File uploaded: ${req.file.originalname} (in memory)`);

        try {
            const extractionResult = await extractBmps(req.file.buffer, EXTRACTED_DIR);

            if (extractionResult.success) {
                const imageUrls = extractionResult.images.map(img => {
                    const filename = path.basename(img.path);
                    return `${req.protocol}://${req.get('host')}/images/${filename}`;
                });

                // Build thermal data from the first extracted image
                let thermalData = null;
                const thermalInfo = extractionResult.images.find(img => img.type === 'thermal');
                if (thermalInfo) {
                    try {
                        const buffer = await fs.readFile(thermalInfo.path);
                        const decoded = bmp.decode(buffer);
                        const { width, height, data } = decoded;

                        const temperatureMatrix = [];
                        let minTemp = Infinity;
                        let maxTemp = -Infinity;
                        for (let y = 0; y < height; y++) {
                            const row = [];
                            for (let x = 0; x < width; x++) {
                                const idx = (y * width + x) * 4;
                                const temp = data[idx]; // red channel
                                row.push(temp);
                                if (temp < minTemp) minTemp = temp;
                                if (temp > maxTemp) maxTemp = temp;
                            }
                            temperatureMatrix.push(row);
                        }

                        thermalData = {
                            width,
                            height,
                            temperatureMatrix,
                            minTemp,
                            maxTemp,
                        };
                    } catch (parseErr) {
                        console.error('Failed to parse thermal BMP', parseErr);
                    }
                }

                res.status(200).json({
                    success: true,
                    message: extractionResult.message,
                    images: extractionResult.images.map((img, index) => ({
                        ...img,
                        url: imageUrls[index]
                    })),
                    thermalData,
                });
            } else {
                // If extraction itself failed but was handled by extractBmps
                res.status(500).json(extractionResult);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            res.status(500).json({ success: false, message: `Server error: ${error.message}` });
        }
    });
});

app.get('/', (req, res) => {
    res.send('BMP Extractor Server is running. Use POST /api/extract-bmps to upload a BMT file.');
});

app.listen(port, () => {
    console.log(`BMP Extractor server listening at http://localhost:${port}`);
});
