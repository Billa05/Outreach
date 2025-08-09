# Use the official Python image as a base
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy your application's requirements file
COPY requirements.txt .

# Install all features of crawl4ai and other dependencies
# Using the [all] option ensures all necessary backends are available
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application code into the container
COPY . .

# Set up the Playwright browsers required by crawl4ai
RUN crawl4ai-setup

# Expose the port your FastAPI app will run on
EXPOSE 8000

# Command to run your FastAPI application using uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]