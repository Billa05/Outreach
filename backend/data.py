import os
import json
import time
import random
from datetime import datetime
from dotenv import load_dotenv
from groq import Groq
import re

load_dotenv()

# Configure Groq API
API_KEY = os.getenv('GROQ_API_KEY')  # Or hardcode it: 'your-api-key-here'
client = Groq(api_key=API_KEY)

# Define the model
MODEL_NAME = 'gemma2-9b-it'

# Fallback list of real Indian companies and technologies for authenticity
FALLBACK_COMPANIES = [
    {"name": "Tata Consultancy Services", "url": "https://www.tcs.com", "location": "Mumbai, Maharashtra, India", "keywords": ["IT services", "software development", "consulting"], "technologies": ["Java", "AWS", "Salesforce"]},
    {"name": "Infosys", "url": "https://www.infosys.com", "location": "Bangalore, Karnataka, India", "keywords": ["IT consulting", "software solutions", "digital transformation"], "technologies": ["Python", "Azure", "SAP"]},
    {"name": "Sun Pharmaceutical Industries", "url": "https://www.sunpharma.com", "location": "Mumbai, Maharashtra, India", "keywords": ["pharmaceuticals", "generic drugs", "healthcare"], "technologies": ["ERP", "SAP"]},
    {"name": "Amara Raja Batteries", "url": "https://www.amararajabatteries.com", "location": "Hyderabad, Telangana, India", "keywords": ["lithium-ion batteries", "automotive batteries", "energy storage"], "technologies": ["Battery Management Systems"]},
    {"name": "Arvind Limited", "url": "https://www.arvind.com", "location": "Ahmedabad, Gujarat, India", "keywords": ["textiles", "organic cotton", "apparel"], "technologies": ["Textile Management System"]}
]
FALLBACK_TECHNOLOGIES = ["React", "AWS", "Shopify", "Python", "Salesforce", "SAP", "Java", "Microsoft Dynamics", "Battery Management Systems", "Textile Management System"]

# Instruction prompt for JSON generation, emphasizing authentic data and user_feedback labels
instruction = """
You are a data formatter that generates structured JSON for B2B lead discovery, tailored for training a machine learning model for lead scoring. 
Given a user's natural language query expressing a supply-demand intent (e.g., "I sell medical instrument parts, find companies needing these parts" or "Find sunflower seed suppliers in Gujarat"), create JSON in the exact schema below. ALL fields (url, title, org_summary, contact_info, location, keywords, technologies) must be real, authentic, and verifiable, resembling actual Indian company data.

{
  "user_query": "<string>",
  "generated_queries": ["<5 distinct Google search queries as strings>"],
  "search_results": [
    {
      "rank": <integer>,
      "query_used": "<string>",
      "url": "<string, authentic Indian corporate URL, e.g., https://companyname.in>",
      "title": "<string, real Indian company name>",
      "org_summary": "<authentic summary of the organization, 1–2 sentences>",
      "contact_info": {
        "email": "<string or null, realistic corporate email, e.g., info@companyname.in>",
        "phone": "<string or null, Indian format, e.g., +91-22-1234-5678>",
        "contact_title": "<string or null, realistic title, e.g., 'Managing Director'>"
      },
      "location": "<valid city/state in India, e.g., 'Bangalore, Karnataka, India'>",
      "keywords": ["<3–5 authentic keywords from the website, e.g., 'medical device'>"],
      "technologies": ["<1–3 realistic technologies, e.g., 'React', 'AWS'>"],
      "user_feedback": "<'Good Fit', 'Not a Fit', 'Contacted', or null>"
    }
  ],
  "metadata": {
    "timestamp": "<ISO8601 UTC timestamp>",
    "geographic_focus": "India"
  }
}

Rules:
1. Generate 5 distinct search queries in "generated_queries" to find official Indian company websites matching the user's supply-demand intent. Use variations like: "official website", "site:.in", "intitle:official", "contact". Exclude review sites (e.g., indiamart, justdial, alibaba).
2. For "search_results", generate 2–3 authentic entries per query:
   - "rank": position (1, 2, 3…).
   - "query_used": one of the generated queries.
   - "url": authentic URL (e.g., https://tcs.com, https://companyname.in).
   - "title": real Indian company name (e.g., 'Infosys', 'Sun Pharma').
   - "org_summary": accurate 1–2 sentence description of real business activities.
   - "contact_info": realistic email (e.g., info@companyname.in), phone (e.g., +91-22-1234-5678), and title (e.g., 'CEO', 'Procurement Manager') or null.
   - "location": valid Indian city/state (e.g., 'Mumbai, Maharashtra, India').
   - "keywords": 3–5 genuine website keywords matching the intent.
   - "technologies": 1–3 realistic technologies used by the company.
   - "user_feedback": assign 'Good Fit' if the company matches the query intent closely (e.g., keywords align), 'Not a Fit' if it’s unrelated, 'Contacted' if it seems recently engaged, or null (rarely, ~5% of cases). Prefer explicit labels: ~50% 'Good Fit', 30% 'Not a Fit', 15% 'Contacted', 5% null.
3. Fill "metadata.timestamp" with current UTC time in ISO8601 format.
4. Set "metadata.geographic_focus" to "India".
5. Return ONLY the JSON object. No extra commentary, no markdown, no explanations.

CRITICAL: Use real Indian company names, authentic URLs, realistic contact details, and genuine business summaries. Data must reflect actual Indian business practices.
"""

# Prompt to generate India-specific user queries with supply-demand intent
query_generation_prompt = """
Generate a natural language query for B2B lead discovery focused on companies or organizations in India, expressing a supply-demand intent. 
The query should either describe a product/service being offered and seek companies needing it (e.g., 'I sell medical instrument parts which help in building medical instruments, find companies who need these parts') or request suppliers for a specific product/service in a city/state in India (e.g., 'Find sunflower seed suppliers in Gujarat'). 
Ensure the query is concise, realistic, and varied across industries (e.g., IT, manufacturing, healthcare, agriculture, logistics, pharmaceuticals, textiles) and locations (e.g., Bangalore, Mumbai, Hyderabad, Delhi, Chennai, Pune, Gujarat, Tamil Nadu). 
Exclude review sites or directories like indiamart or justdial. 
Return ONLY the query as a single string, no extra text.
"""

# Function to clean API response to extract valid JSON
def clean_response(text):
    # Remove code fences or extra text
    text = re.sub(r'```json\n|```|\n\s*```', '', text).strip()
    # Try to extract JSON object if surrounded by text
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != 0:
        text = text[start:end]
    return text

# Function to generate a single user query
def generate_user_query():
    for _ in range(3):  # Retry up to 3 times
        try:
            response = client.chat.completions.create(
                messages=[
                    {"role": "user", "content": query_generation_prompt}
                ],
                model=MODEL_NAME,
                temperature=0.5,  # Lower temperature for consistency
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating user query: {e}. Retrying after 10 seconds...")
            time.sleep(10)
    return None

# Function to generate a single JSON using Groq
def generate_json(user_query):
    full_prompt = instruction + f"\n\nUser's natural language query: {user_query}\nSample search results: None (generate realistically based on actual Indian business landscape)."
    for _ in range(3):  # Retry up to 3 times
        try:
            response = client.chat.completions.create(
                messages=[
                    {"role": "user", "content": full_prompt}
                ],
                model=MODEL_NAME,
                temperature=0.5,  # Lower temperature for JSON consistency
            )
            cleaned_text = clean_response(response.choices[0].message.content)
            json_data = json.loads(cleaned_text)
            # Assign user_feedback labels if missing
            for result in json_data.get('search_results', []):
                if result['user_feedback'] is None:
                    # Probabilistic labeling based on keyword overlap
                    query_keywords = set(user_query.lower().split())
                    result_keywords = set(result.get('keywords', []))
                    overlap = len(query_keywords.intersection(result_keywords))
                    if overlap >= 2:
                        result['user_feedback'] = random.choices(
                            ['Good Fit', 'Contacted', 'Not a Fit', None],
                            weights=[0.5, 0.15, 0.3, 0.05], k=1
                        )[0]
                    else:
                        result['user_feedback'] = random.choices(
                            ['Not a Fit', 'Good Fit', 'Contacted', None],
                            weights=[0.5, 0.3, 0.15, 0.05], k=1
                        )[0]
            return json_data
        except json.JSONDecodeError:
            print("Invalid JSON response, retrying...")
            time.sleep(10)
        except Exception as e:
            print(f"Error generating JSON: {e}. Retrying after 10 seconds...")
            time.sleep(10)
    return None

# Main function to collect 150 search_results entries
def collect_data(target_entries=150):
    all_search_results = []
    attempts = 0
    max_attempts = 200  # Increased to account for potential failures

    while len(all_search_results) < target_entries and attempts < max_attempts:
        attempts += 1
        # Generate a new user query
        user_query = generate_user_query()
        if not user_query:
            continue

        print(f"Attempt {attempts}: Generating for query '{user_query}'...")

        try:
            json_data = generate_json(user_query)
            if json_data and 'search_results' in json_data:
                for result in json_data['search_results']:
                    # Add user_query for ML training context
                    result['original_user_query'] = json_data['user_query']
                    # Ensure location is India-specific
                    if result['location'] and 'India' not in result['location']:
                        result['location'] = f"{result['location']}, India" if result['location'] else random.choice([
                            'Bangalore, Karnataka, India',
                            'Mumbai, Maharashtra, India',
                            'Delhi, India',
                            'Hyderabad, Telangana, India',
                            'Chennai, Tamil Nadu, India'
                        ])
                    # Ensure keywords and technologies are authentic
                    if not result.get('keywords') or len(result['keywords']) < 3:
                        # Use fallback company if keywords are missing
                        fallback = random.choice(FALLBACK_COMPANIES)
                        result['keywords'] = fallback['keywords']
                        result['title'] = result.get('title') or fallback['name']
                        result['url'] = result.get('url') or fallback['url']
                        result['location'] = result.get('location') or fallback['location']
                    if not result.get('technologies'):
                        result['technologies'] = [random.choice(FALLBACK_TECHNOLOGIES)]
                    all_search_results.append(result)
                print(f"Added {len(json_data['search_results'])} entries. Total: {len(all_search_results)}")
            else:
                print("No valid search_results in response.")
        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                print("Rate limit hit. Sleeping for 90 seconds...")
                time.sleep(90)
                continue
            else:
                print(f"Error: {e}. Retrying after 10 seconds...")
                time.sleep(10)
                continue

        # Delay to avoid rate limits
        time.sleep(5)

    # Truncate to target_entries
    all_search_results = all_search_results[:target_entries]

    return all_search_results

# Run the collection
data = collect_data()

# Save the data in JSONL format
output_file = 'b2b_lead_data_india.jsonl'
with open(output_file, 'w') as f:
    for entry in data:
        f.write(json.dumps(entry) + '\n')

# Log success
print(f"Data saved to {output_file} in JSONL format.")
print("JSONL is ideal for ML training as it allows streaming large datasets, with each line representing a sample for lead scoring tasks.")