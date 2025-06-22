# Use the official Python image
FROM python:3.10

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY requirements.txt .
 
Run pip install --upgrade pip
Run pip install  -r requirements.txt
# Copy the rest of the application files
COPY . .

# Set environment variables to use the virtual environment
ENV PATH="/app/venv/bin:$PATH"

# Expose the FastAPI default port
EXPOSE 8000

# Command to run FastAPI with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000","--reload"],