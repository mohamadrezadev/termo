# Thermal Analyzer Pro

Thermal Analyzer Pro is a web application for analyzing thermal images. It is built with **Next.js**, **React**, **TypeScript** and **Tailwind CSS**. The interface uses resizable windows so you can view the thermal image, RGB image, data tables and histograms at the same time.

## Features

- Upload common thermal image formats and extract temperature data
- Interactive thermal viewer with color palettes and zoom/pan tools
- RGB image viewer for comparing the visual photo with the thermal data
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

## Python Edition

For users preferring a Python-based stack, a simplified rewrite using **Streamlit**
is available under the `pyapp/` directory. It supports uploading thermal images or
`.bmt` files and visualises them with an interactive histogram.

Run the Python version with:

```bash
pip install -r pyapp/requirements.txt
streamlit run pyapp/main.py
```

## Project Structure

- `app/` – Next.js app directory
- `components/` – UI components and window modules
- `lib/` – Zustand store, utilities and translations
- `hooks/` – React hooks

## Converting BMT files

The Python edition includes built-in support for the custom `.bmt` format
containing two concatenated BMP images (thermal and RGB).

If you only need a command line tool to extract the images, you can run
`python scripts/bmt_convert.py your_file.bmt --thermal out.png --real photo.png`.

## License

This project is provided without a specific license. All rights reserved to the original author.
