# Thermal Analyzer Pro

Thermal Analyzer Pro is a web application for analyzing thermal images. It is built with **Next.js**, **React**, **TypeScript** and **Tailwind CSS**. The interface uses resizable windows so you can view the thermal image, real image, data tables and histograms at the same time.

## Features

- Upload common thermal image formats and extract temperature data
- Interactive thermal viewer with color palettes and zoom/pan tools
- Real image viewer for comparing the visual image with the thermal data
- Draw points, lines and regions to measure temperatures
- Data table and histogram of selected markers or regions
- Adjustable measurement parameters such as emissivity and ambient temperature
- Time‑series timeline for analyzing multiple images
- Generate reports in PDF, DOCX or HTML format
- English and Persian translations with RTL layout support

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

3. **Create a production build**

   ```bash
   npm run build
   npm start
   ```

The project has an ESLint configuration. You can run `npm run lint` to check the code.

## Project Structure

- `app/` – Next.js app directory
- `components/` – UI components and window modules
- `lib/` – Zustand store, utilities and translations
- `hooks/` – React hooks

## License

This project is provided without a specific license. All rights reserved to the original author.

---
## BMP Extractor Server

This project includes a separate Node.js/Express server located in the \`bmp-extractor-server\` directory. This server is responsible for processing uploaded \`.BMT\` files, which are expected to contain two concatenated BMP images (thermal and normal).

**Functionality:**
-   Accepts \`.BMT\` file uploads.
-   Extracts the two BMP images.
-   Saves them as \`thermal.bmp\` and \`normal.bmp\`.
-   Provides an API endpoint that can be integrated with the Next.js frontend.

For instructions on how to run and use this server, please see the \`README.md\` file located within the \`bmp-extractor-server\` directory.

**Frontend Integration:** The \`bmp-extractor-server/README.md\` includes a conceptual guide on how a Next.js frontend can interact with the server's API, including example JavaScript for file upload and notes on CORS.
