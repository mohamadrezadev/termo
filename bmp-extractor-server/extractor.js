const fs = require('fs').promises;
const path = require('path');

async function extractBmps(inputPath, outputDir = '.') {
    console.log(`Starting BMP extraction from: ${inputPath}`);
    try {
        const data = await fs.readFile(inputPath);
        console.log(`Successfully read ${data.length} bytes from ${inputPath}`);

        const bmSignature = Buffer.from('BM'); // 42 4D in hex
        const foundImages = [];
        let currentIndex = 0;

        while (currentIndex < data.length && foundImages.length < 2) {
            const bmIndex = data.indexOf(bmSignature, currentIndex);

            if (bmIndex === -1) {
                console.log('No more BM signatures found.');
                break;
            }
            console.log(`Found BM signature at offset ${bmIndex}`);

            // BMP header is at least 14 bytes for the main header part,
            // plus DIB header (min 40 bytes for BITMAPINFOHEADER).
            // We need at least 6 bytes from BM to read the size: BM (2) + Size (4)
            if (bmIndex + 6 > data.length) {
                console.log(`BM signature at ${bmIndex} is too close to EOF to read size. Skipping.`);
                currentIndex = bmIndex + bmSignature.length; // Move past this BM
                continue;
            }

            // The size of the BMP file in bytes (4 bytes, little-endian)
            // is located at offset 2 from the 'BM' signature.
            const fileSize = data.readUInt32LE(bmIndex + 2);
            console.log(`Potential BMP at ${bmIndex}, reported size: ${fileSize} bytes.`);

            // Basic validation for file size
            // Smallest BMP is around 54 bytes (14 byte header + 40 byte DIB header for BITMAPINFOHEADER)
            // It should also not exceed the bounds of the read data from its starting offset
            if (fileSize < 54) {
                console.log(`Reported BMP size ${fileSize} is too small. Skipping.`);
                currentIndex = bmIndex + bmSignature.length;
                continue;
            }

            if (bmIndex + fileSize > data.length) {
                console.log(`Reported BMP size ${fileSize} from offset ${bmIndex} exceeds data length (${data.length}). Trying to find next BM.`);
                // This could be a false positive, so we search for the next BM signature
                // instead of trusting this size.
                currentIndex = bmIndex + bmSignature.length;
                continue;
            }

            // Extract the BMP data
            const bmpData = data.slice(bmIndex, bmIndex + fileSize);
            console.log(`Extracted potential BMP: ${bmpData.length} bytes from offset ${bmIndex}.`);

            // Further validation (optional but good): Check DIB header size or bits per pixel if known
            // For now, we assume if size is plausible, it's a BMP.

            const imageType = foundImages.length === 0 ? 'thermal' : 'real';
            const outputFileName = foundImages.length === 0 ? 'extracted_thermal.bmp' : 'extracted_real.bmp';
            const outputPath = path.join(outputDir, outputFileName);

            try {
                await fs.writeFile(outputPath, bmpData);
                console.log(`Saved ${outputFileName} to ${outputPath}`);
                foundImages.push({ path: outputPath, originalOffset: bmIndex, size: fileSize, type: imageType });
            } catch (writeError) {
                console.error(`Error writing BMP file ${outputFileName}:`, writeError);
                // Continue to try and find the next one even if write fails for one
            }

            // Move current index past this found BMP to look for the next one
            currentIndex = bmIndex + fileSize;

        } // End of while loop

        if (foundImages.length < 2) {
            console.warn(`Warning: Expected 2 images but found ${foundImages.length}.`);
        }

        return {
            success: true,
            images: foundImages,
            message: foundImages.length >= 2 ? 'Successfully extracted 2 BMP images.' : `Found ${foundImages.length} BMP images.`
        };

    } catch (error) {
        console.error('Error during BMP extraction process:', error);
        return {
            success: false,
            images: [],
            message: `Error extracting BMPs: ${error.message}`
        };
    }
}

module.exports = { extractBmps };

// Example usage (for testing - will be removed or commented out later)
/*
(async () => {
    // Create a dummy BMT file for testing
    // BMP1: BM + size(4) + data... (total 60 bytes)
    // BMP2: BM + size(4) + data... (total 70 bytes)
    // Junk data in between
    const header1 = Buffer.from('BM');
    const size1 = Buffer.alloc(4); size1.writeUInt32LE(60, 0);
    const data1 = Buffer.alloc(60 - 6, 'A'); // 54 bytes of 'A'

    const header2 = Buffer.from('BM');
    const size2 = Buffer.alloc(4); size2.writeUInt32LE(70, 0);
    const data2 = Buffer.alloc(70 - 6, 'B'); // 64 bytes of 'B'

    const junk1 = Buffer.from('12345');

    const testBmtData = Buffer.concat([
        header1, size1, data1, // BMP 1
        junk1,                // Junk
        header2, size2, data2  // BMP 2
    ]);

    const testFilePath = 'test_input.BMT';
    const testOutputDir = 'test_output';

    try {
        await fs.mkdir(testOutputDir, { recursive: true });
        await fs.writeFile(testFilePath, testBmtData);
        console.log(\`Created dummy file: \${testFilePath} with \${testBmtData.length} bytes\`);

        const result = await extractBmps(testFilePath, testOutputDir);
        console.log('Extraction result:', result);

        if (result.success && result.images.length > 0) {
            result.images.forEach(img => console.log(\`Found image: \${img.path}\`));
        }
        // Clean up test files
        // await fs.unlink(testFilePath);
        // for (const img of result.images) {
        //     await fs.unlink(img.path);
        // }
        // await fs.rmdir(testOutputDir);

    } catch (testError) {
        console.error('Error in test setup or execution:', testError);
    }
})();
*/
