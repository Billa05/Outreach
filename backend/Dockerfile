# Dockerfile

# Use the official crawl4ai image as the base.
# It includes Python, crawl4ai, and all browser dependencies.
FROM unclecode/crawl4ai:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install your specific dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application script into the container
COPY main.py .

# Expose the port your FastAPI application runs on
EXPOSE 8000

# The command to run your application using uvicorn
# The host 0.0.0.0 is crucial for making the server accessible from outside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]