# FastAPI Project Setup (Windows, Offline Installation)

This guide explains how to **set up and run a FastAPI project offline** (without internet access) on Windows.

---

## 1️⃣ Requirements

Make sure you have **Python 3.10+** installed.

To verify, run:
```bash
python --version
```

If you get an error, download Python from:
👉 https://www.python.org/downloads/

---

## 2️⃣ Create a Virtual Environment

In your project folder, run:
```bash
python -m venv venv
```

Then activate it:
```bash
venv\Scripts\activate
```

You should now see `(venv)` in your terminal prompt.

---

## 3️⃣ Prepare for Offline Installation

### ✅ On a Computer with Internet Access

1. Go to your project folder and run:
   ```bash
   pip download -r requirements.txt -d offline_packages
   ```

   This will download all required dependencies into the `offline_packages` folder.

2. Copy the entire folder `offline_packages` and your `requirements.txt` file to the offline computer.

---

## 4️⃣ Install Packages Offline

On the **offline computer**, after activating the virtual environment:

```bash
pip install --no-index --find-links=offline_packages -r requirements.txt
```

This will install all dependencies locally from the `offline_packages` folder — **no internet required**.

---

## 5️⃣ Run the FastAPI App

If installed correctly, start the app with:
```bash
uvicorn main:app --reload
```

If Uvicorn is not recognized, use:
```bash
python -m uvicorn main:app --reload
```

---

## 6️⃣ Access the App

Open your browser and go to:
👉 http://127.0.0.1:8000

Swagger Docs:
👉 http://127.0.0.1:8000/docs

---

## ✅ Example Folder Structure

```
project/
│
├── main.py
├── requirements.txt
├── offline_packages/
│   ├── fastapi-0.115.0-py3-none-any.whl
│   ├── uvicorn-0.30.0-py3-none-any.whl
│   └── ... (other packages)
└── README.md
```

---

## 🛠 Troubleshooting

**Problem:** Some packages are missing during offline install.  
**Solution:** Re-download dependencies on the online system using:
```bash
pip download -r requirements.txt -d offline_packages
```
and replace the folder.

**Problem:** `'uvicorn' is not recognized`  
**Solution:** Use:
```bash
python -m pip download -r requirements.txt -d ./wheelhouse
python -m venv venv 
.\venv\Scripts\activate
python -m pip install --no-index --find-links /wheelhouse -r requirements.txt     
python -m uvicorn main:app --reload
uvicorn main:app --reload --port 8000
```

---
