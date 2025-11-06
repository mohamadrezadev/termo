# Project Title (Replace with Actual Project Title if Known)

This project consists of a Python FastAPI server and a Next.js client application, possibly bundled with Electron.

## Prerequisites

Before you begin, ensure you have the following installed:
- Python (version 3.7+ recommended)
- Node.js (version 18.x or later recommended)
- npm (usually comes with Node.js)

## Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Set up the Server:**
    - Navigate to the `server` directory:
      ```bash
      cd server
      ```
    - Create a virtual environment (recommended):
      ```bash
      python -m venv venv
      ```
    - Activate the virtual environment:
      - On Windows:
        ```bash
        .\venv\Scripts\activate
        ```
      - On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```
    - Install Python dependencies:
      ```bash
      pip install -r requirements.txt
      ```
    - Add `uvicorn` to `server/requirements.txt` if it's not already there (this will be done in a later step by the assistant, but for manual setup, ensure it's present):
      ```
      fastapi
      uvicorn[standard]
      python-multipart
      # other dependencies...
      ```
      Then run `pip install uvicorn[standard]` or `pip install -r requirements.txt` again.

3.  **Set up the Client:**
    - Navigate to the `client` directory from the project root:
      ```bash
      cd client
      ```
    - Install Node.js dependencies:
      ```bash
      npm install
      ```

## Running the Application (Development Mode)

To run the application in development mode, you'll need to start both the server and the client.

1.  **Start the Server:**
    - Ensure you are in the `server` directory and your virtual environment is activated.
    - Run the FastAPI server using Uvicorn:
      ```bash
      uvicorn main:app --reload --port 8080 
      ```
      The server will typically be available at `http://localhost:8000`.

2.  **Start the Client:**
    - Ensure you are in the `client` directory.
    - Run the Next.js development server:
      ```bash
      npm run dev
      ```
      The client application will typically be available at `http://localhost:3000`.
     
    - The application should now be running, with the client communicating with the server.
    if run buld file use this command 
        npm install -g serve
        serve -s out

## Simplified Development Run (Using `run-dev.sh`)

A `run-dev.sh` script is provided in the root directory to simplify starting both the server and client for development.

1.  **Make the script executable (if necessary, on macOS/Linux):**
    ```bash
    chmod +x run-dev.sh
    ```
2.  **Run the script from the project root directory:**
    ```bash
    ./run-dev.sh
    ```
    This will start the FastAPI server and the Next.js client development server concurrently.

## Building and Running the Packaged Desktop Application

This section describes how to build the complete desktop application, including the Python backend, into a distributable package (e.g., an `.exe` for Windows or `.dmg` for macOS) and how to run it.

### Prerequisites

Ensure you have met all prerequisites mentioned in the "Prerequisites" section (Python 3.7+, Node.js 18+, npm). Additionally, you'll need:

*   **PyInstaller**: Install it in your Python environment: `pip install pyinstaller`
*   Project dependencies installed for both server and client as described in the "Setup" section:
    *   Server: `pip install -r server/requirements.txt` (preferably in a virtual environment). Also ensure `pyinstaller` is available to this environment.
    *   Client: `npm install` in the `client` directory.

### Quick Build (Recommended)

1. **Install all dependencies:**
   ```bash
   # Install server dependencies
   cd server
   pip install -r requirements.txt
   pip install pyinstaller
   cd ..
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

2. **Build the complete desktop application:**
   ```bash
   cd client
   npm run electron:build
   ```

   This command will:
   - Build the Next.js frontend
   - Build the Python backend with PyInstaller
   - Copy the backend to the correct location
   - Package everything with Electron Builder

3. **Find your distributable:**
   The built application will be in `client/dist_electron/`

### Manual Step-by-Step Build

If you prefer to build step by step:

1. **Build the Python backend:**
   ```bash
   cd client
   npm run build:backend
   ```

2. **Build the frontend:**
   ```bash
   npm run build:static
   ```

3. **Package with Electron:**
   ```bash
   npm run electron:build
   ```

### Development Mode

To test the desktop app in development:

```bash
cd client
npm run electron:dev
```

### Install and Run the Desktop Application

1.  **Navigate to the output directory:** `client/dist_electron/`.
2.  **Install the application:**
    *   **Windows:** Run the `.exe` installer (e.g., `Thermal Analyzer Setup <version>.exe`).
    *   **macOS:** Open the `.dmg` file and drag the `Thermal Analyzer.app` to your Applications folder.
    *   **Linux:** The `.AppImage` file can often be made executable (`chmod +x Thermal-Analyzer-<version>.AppImage`) and run directly. For `.deb` or `.rpm` packages, use your system's package manager to install them.
3.  **Run the application:** Launch "Thermal Analyzer" from your applications menu or desktop shortcut. The application should start, and the Python backend will run automatically in the background.

### Troubleshooting

- **Backend build fails:** Ensure PyInstaller is installed and all Python dependencies are available
- **Frontend build fails:** Run `npm install` in the client directory
- **Desktop app doesn't start:** Check that both frontend and backend built successfully
- **Images don't load:** Verify the server is starting correctly (check console logs)

## Project Structure

-   `/client`: Contains the Next.js frontend application and Electron configuration.
-   `/server`: Contains the Python FastAPI backend application.
-   `run-dev.sh`: A utility script to start both server and client for development.
-   `README.md`: This file.
