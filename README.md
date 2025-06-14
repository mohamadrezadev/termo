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

## Running the Electron Application (Optional)

The client application can also be run as an Electron desktop application.

1.  **Build the static Next.js assets:**
    - Navigate to the `client` directory.
    - Run:
      ```bash
      npm run build:static
      ```
2.  **Run the Electron app in development mode:**
    - Still in the `client` directory:
      ```bash
      npm run electron:dev
      ```
3.  **Build the Electron distributable (optional):**
    - Still in the `client` directory:
      ```bash
      npm run electron:build
      ```
    This will create a distributable package in the `client/dist_electron` directory.

## Project Structure

-   `/client`: Contains the Next.js frontend application and Electron configuration.
-   `/server`: Contains the Python FastAPI backend application.
-   `run-dev.sh`: A utility script to start both server and client for development.
-   `README.md`: This file.
