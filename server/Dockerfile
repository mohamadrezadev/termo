# Use the official Python slim image for a smaller size
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Expose the FastAPI default port
EXPOSE 8000

# Command to run FastAPI with Uvicorn
# Removed --reload for production, it's typically used for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]