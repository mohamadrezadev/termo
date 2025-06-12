# BMP Extractor Server

This server provides an API endpoint to extract multiple BMP images from a single uploaded .BMT file. It's built with Node.js and Express.

## Setup and Installation

1.  **Navigate to the server directory:**
    ```bash
    cd bmp-extractor-server
    ```

2.  **Install dependencies:**
    If you haven't installed dependencies from the root project directory, or if this server is run entirely independently, you'll need to install its specific dependencies:
    ```bash
    npm install
    ```
    (Note: `express` and `multer` should have been installed when this server component was created, as listed in its own `package.json`.)

## Running the Server

1.  **Start the server:**
    From within the `bmp-extractor-server` directory, run:
    ```bash
    node index.js
    ```
    By default, the server will start on `http://localhost:3001`. You can configure the port using the `PORT` environment variable.

## API Endpoint

### POST /api/extract-bmps

Uploads a `.BMT` file and extracts constituent BMP images.

*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`
*   **Form Data Parameter:** `bmtfile` (the `.BMT` file to be processed)

*   **Success Response (200 OK):**
    ```json
    {
        "success": true,
        "images": [
            {
                "path": "extracted_images/thermal.bmp",
                "originalOffset": 0,
                "size": 60,
                "url": "http://localhost:3001/images/thermal.bmp"
            },
            {
                "path": "extracted_images/normal.bmp",
                "originalOffset": 65,
                "size": 70,
                "url": "http://localhost:3001/images/normal.bmp"
            }
        ],
        "message": "Successfully extracted 2 BMP images."
    }
    ```
    The `images` array will contain details for each BMP found. The `url` can be used to view/access the extracted image if the server is running.

*   **Error Responses:**
    *   `400 Bad Request`: If no file is uploaded.
        ```json
        {
            "success": false,
            "message": "No file uploaded."
        }
        ```
    *   `500 Internal Server Error`: If there's an issue during processing.
        ```json
        {
            "success": false,
            "message": "Error message describing the issue."
        }
        ```

## How it Works

1.  The client uploads a `.BMT` file to the `/api/extract-bmps` endpoint.
2.  The server temporarily stores this file using `multer`.
3.  The `extractor.js` module reads the uploaded file.
4.  It searches for `BM` (BMP file signature) markers within the file.
5.  For each valid BMP found (based on header information like file size), it extracts the BMP data.
6.  The first valid BMP is saved as `thermal.bmp` and the second as `normal.bmp` in the `extracted_images` directory.
7.  The server responds with JSON containing the status and details of the extracted images, including URLs to access them.
8.  The original uploaded file in the `uploads` directory is then deleted.

## Conceptual Frontend Interaction (Next.js Example)

The Next.js frontend would typically interact with the `/api/extract-bmps` endpoint as follows:

1.  **File Input:**
    Use an `<input type="file" />` element in a form to allow users to select the `.BMT` file.

2.  **Form Submission (JavaScript):**
    On submission, use JavaScript to create a `FormData` object and append the file. Then, use `fetch` to send it to the server.

    ```javascript
    // Example client-side JavaScript snippet
    async function handleFileUpload(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('bmtfile', file); // 'bmtfile' is the name expected by the server

        try {
            const response = await fetch('http://localhost:3001/api/extract-bmps', { // Adjust URL if needed
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('Extraction Successful:', result.images);
                // Example: Display images
                // const thermalImage = document.getElementById('thermalImage');
                // const normalImage = document.getElementById('normalImage');
                // if (thermalImage && result.images[0]) thermalImage.src = result.images[0].url;
                // if (normalImage && result.images[1]) normalImage.src = result.images[1].url;
            } else {
                console.error('Extraction Failed:', result.message);
                // Display error to user: result.message
            }
        } catch (error) {
            console.error('Network or other error:', error);
            // Display generic error to user
        }
    }
    ```

3.  **Handling Response:**
    The server responds with JSON. If successful, the `images` array in the response will contain objects with a `url` property for each extracted image. These URLs can be used in `<img>` tags.

4.  **CORS (Cross-Origin Resource Sharing):**
    If the Next.js app and this extractor server are on different origins (e.g., `localhost:3000` and `localhost:3001`), you'll need to enable CORS on the Express server.
    Install the `cors` package:
    ```bash
    npm install cors
    ```
    And use it in `bmp-extractor-server/index.js`:
    ```javascript
    const cors = require('cors');
    // ...
    app.use(cors()); // Allows all origins
    // For specific origin: app.use(cors({ origin: 'http://your-nextjs-app-origin.com' }));
    // ...
    ```
