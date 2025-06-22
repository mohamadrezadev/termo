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
      uvicorn main:app --reload --port 8000
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

*   **PyInstaller**: If not already installed in your Python environment for the server, you can install it via pip.
*   Project dependencies installed for both server and client as described in the "Setup" section:
    *   Server: `pip install -r server/requirements.txt` (preferably in a virtual environment). Also ensure `pyinstaller` is available to this environment.
    *   Client: `npm install` in the `client` directory.

### Step 1: Build the Python Backend Executable

The Python FastAPI backend needs to be compiled into an executable using PyInstaller. This executable will then be bundled with the Electron application.

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```
2.  **Activate your Python virtual environment** (if you are using one):
    *   On Windows: `.\venv\Scripts\activate`
    *   On macOS/Linux: `source venv/bin/activate`
3.  **Install PyInstaller** (if not already installed in this environment):
    ```bash
    pip install pyinstaller
    ```
4.  **Run PyInstaller to build the backend:**
    The following command bundles the FastAPI application (`main.py`) into a single directory named `thermal_api` within `server/dist/`.
    ```bash
    pyinstaller main.py \
        --name thermal_api \
        --onedir \
        --noconsole \
        --hidden-import="uvicorn.lifespan.on" \
        --hidden-import="uvicorn.lifespan.off" \
        --hidden-import="uvicorn.loops.auto" \
        --hidden-import="uvicorn.protocols.auto" \
        --hidden-import="uvicorn.protocols.http.auto" \
        --hidden-import="uvicorn.protocols.websockets.auto" \
        --hidden-import="fastapi.applications" \
        --hidden-import="fastapi.middleware" \
        --hidden-import="fastapi.routing" \
        --hidden-import="starlette.routing" \
        --hidden-import="pydantic.v1" \
        --collect-submodules uvicorn \
        --collect-submodules fastapi \
        --collect-submodules starlette
    ```
    *   `--onedir`: Creates a one-folder bundle containing the executable and its dependencies.
    *   `--noconsole`: (Primarily for Windows) Prevents the console window from appearing when the backend runs.
    *   `--hidden-import` and `--collect-submodules`: Help PyInstaller correctly bundle all necessary parts of FastAPI, Uvicorn, and Starlette.
    *   Upon successful completion, you should have a `server/dist/thermal_api` directory containing the backend executable and associated files.

### Step 2: Build the Electron Desktop Application

Once the Python backend executable is built, you can build the Electron application which will package this backend.

1.  **Navigate to the client directory:**
    ```bash
    cd client
    ```
    (If you were in the `server` directory, use `cd ../client`)

2.  **Run the Electron build script:**
    ```bash
    npm run electron:build
    ```
    This command performs several actions:
    *   Builds the static Next.js frontend assets (`npm run build:static`).
    *   Copies the Python backend executable (from `server/dist/thermal_api`) into a temporary location within the `client` directory (`client/dist_backend_temp/thermal_api`) using the `scripts/copy-backend.js` script.
    *   Runs `electron-builder` to package the Electron application. `electron-builder` is configured (in `client/package.json`) to include the copied backend executable and unpack it correctly within the final application bundle.

3.  **Locate the distributable package:**
    After the build process finishes, you will find the distributable application packages (e.g., `.exe`, `.dmg`, `.AppImage`) in the `client/dist_electron/` directory.

### Step 3: Install and Run the Desktop Application

1.  **Navigate to the output directory:** `client/dist_electron/`.
2.  **Install the application:**
    *   **Windows:** Run the `.exe` installer (e.g., `Thermal Analyzer Setup <version>.exe`).
    *   **macOS:** Open the `.dmg` file and drag the `Thermal Analyzer.app` to your Applications folder.
    *   **Linux:** The `.AppImage` file can often be made executable (`chmod +x Thermal-Analyzer-<version>.AppImage`) and run directly. For `.deb` or `.rpm` packages, use your system's package manager to install them.
3.  **Run the application:** Launch "Thermal Analyzer" from your applications menu or desktop shortcut. The application should start, and the Python backend will run automatically in the background.

## Project Structure

-   `/client`: Contains the Next.js frontend application and Electron configuration.
-   `/server`: Contains the Python FastAPI backend application.
-   `run-dev.sh`: A utility script to start both server and client for development.
-   `README.md`: This file.
