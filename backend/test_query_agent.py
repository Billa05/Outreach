"""
Standalone test file for the intelligent query understanding agent.
This file allows you to test the Gemini-powered query analysis independently.

Usage:
    python test_query_agent.py
"""

import os
import json
import asyncio
from typing import Dict
from dotenv import load_dotenv
import litellm
from exa_py import Exa

# Load environment variables
load_dotenv()


async def understand_user_query(user_query: str) -> Dict[str, str]:
    """
    Uses Gemini 2.5 Flash to understand the user's search intent and extract:
    - target_audience: Who the user is trying to find (e.g., "healthcare providers", "B2B SaaS companies")
    - industry: The industry/sector to focus on
    - location: Geographic preference if mentioned
    - key_requirements: Specific requirements or characteristics
    - optimized_query: A refined search query for Exa API
    """
    prompt = f"""You are an intelligent business search assistant. Our platform helps businesses connect by providing contact information of relevant companies.

Analyze the following user query and extract structured information:

User Query: "{user_query}"

Your task:
1. Identify WHO the user is trying to find (target companies/businesses)
2. Determine the INDUSTRY or sector
3. Extract any LOCATION preferences (default to India if not specified)
4. Identify KEY REQUIREMENTS or characteristics they're looking for
5. Generate an OPTIMIZED search query that will find official company websites (not aggregators, directories, or listing sites)

Respond ONLY with a JSON object in this exact format:
{{
    "target_audience": "brief description of companies being searched for",
    "industry": "industry/sector name",
    "location": "geographic location",
    "key_requirements": "specific characteristics or requirements",
    "optimized_query": "search query optimized to find official company websites, avoiding aggregator sites like Crunchbase, LinkedIn company directories, business listing sites, etc."
}}

Example:
User Query: "I need to find pharmaceutical companies in Mumbai"
Response:
{{
    "target_audience": "pharmaceutical companies",
    "industry": "pharmaceuticals",
    "location": "Mumbai, India",
    "key_requirements": "pharmaceutical manufacturing or distribution",
    "optimized_query": "pharmaceutical companies Mumbai official website -crunchbase -linkedin -justdial -indiamart -directory"
}}

Now analyze the user query and respond with JSON only."""

    try:
        print("🤖 Calling Gemini to understand the query...")
        response = await litellm.acompletion(
            model="gemini/gemini-2.0-flash",
            messages=[{"role": "user", "content": prompt}],
            api_key=os.getenv("GEMINI_API_KEY")
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        understanding = json.loads(content)
        
        return understanding
    except Exception as e:
        print(f"❌ Error understanding query with Gemini: {e}")
        # Fallback to basic query structure
        return {
            "target_audience": "businesses",
            "industry": "general",
            "location": "India",
            "key_requirements": user_query,
            "optimized_query": f"{user_query} official website -crunchbase -linkedin -directory"
        }


async def test_with_exa(user_query: str, understanding: Dict[str, str]):
    """
    Test the optimized query with Exa API to see actual results.
    """
    try:
        exa = Exa(api_key=os.getenv("EXA_API_KEY"))
        
        search_query = understanding.get("optimized_query", user_query)
        location = understanding.get("location", "India")
        location_code = "IN" if "india" in location.lower() else "IN"
        
        print(f"\n🔍 Searching Exa with optimized query...")
        print(f"   Query: {search_query}")
        print(f"   Location: {location_code}")
        
        result = exa.search_and_contents(
            search_query,
            type="auto",
            category="company",
            user_location=location_code,
            num_results=5,
            summary=True,
            livecrawl="fallback"
        )
        
        print(f"\n📊 Found {len(result.results)} results:")
        for i, item in enumerate(result.results, 1):
            print(f"\n{i}. {item.title}")
            print(f"   URL: {item.url}")
            print(f"   Summary: {item.summary[:150]}..." if item.summary else "   Summary: N/A")
        
        return result
    except Exception as e:
        print(f"❌ Error searching with Exa: {e}")
        return None


async def run_test(user_query: str, test_exa: bool = False):
    """
    Run a complete test of the query understanding agent.
    
    Args:
        user_query: The user's search query
        test_exa: Whether to also test with Exa API (requires Exa API key)
    """
    print("=" * 80)
    print("🚀 TESTING INTELLIGENT QUERY UNDERSTANDING AGENT")
    print("=" * 80)
    print(f"\n📝 Original User Query:")
    print(f"   '{user_query}'")
    print("\n" + "-" * 80)
    
    # Test the understanding function
    understanding = await understand_user_query(user_query)
    
    print("\n✅ Query Understanding Results:")
    print(json.dumps(understanding, indent=2))
    
    print("\n" + "-" * 80)
    print("\n📋 Structured Breakdown:")
    print(f"   🎯 Target Audience: {understanding.get('target_audience')}")
    print(f"   🏭 Industry: {understanding.get('industry')}")
    print(f"   📍 Location: {understanding.get('location')}")
    print(f"   ⚙️  Requirements: {understanding.get('key_requirements')}")
    print(f"   🔍 Optimized Query: {understanding.get('optimized_query')}")
    
    # Optionally test with Exa
    if test_exa:
        print("\n" + "-" * 80)
        await test_with_exa(user_query, understanding)
    
    print("\n" + "=" * 80)


async def interactive_mode():
    """
    Run the agent in interactive mode where you can test multiple queries.
    """
    print("=" * 80)
    print("🤖 INTERACTIVE QUERY UNDERSTANDING AGENT TEST")
    print("=" * 80)
    print("\nType 'quit' or 'exit' to stop")
    print("Type 'exa' after your query to also test with Exa API")
    print("=" * 80 + "\n")
    
    while True:
        try:
            user_input = input("Enter your query: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            # Check if user wants to test with Exa
            test_exa = False
            if user_input.lower().endswith(' exa'):
                test_exa = True
                user_input = user_input[:-4].strip()
            
            await run_test(user_input, test_exa)
            print("\n")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}\n")


async def run_sample_tests():
    """
    Run a set of predefined sample tests to demonstrate the agent's capabilities.
    """
    sample_queries = [
        "I need to find pharmaceutical companies in Mumbai",
        "Looking for B2B SaaS startups in Bangalore that do AI",
        "Find healthcare providers offering telemedicine services",
        "I want to connect with textile manufacturers in Surat",
        "Search for fintech companies in India",
        "I need suppliers of organic food products",
        "Find IT consulting firms in Delhi NCR",
    ]
    
    print("=" * 80)
    print("📝 RUNNING SAMPLE TESTS")
    print("=" * 80)
    
    for i, query in enumerate(sample_queries, 1):
        print(f"\n\nTest {i}/{len(sample_queries)}:")
        await run_test(query, test_exa=False)
        
        if i < len(sample_queries):
            input("\nPress Enter to continue to next test...")


async def main():
    """
    Main entry point for the test script.
    """
    # Check if required environment variables are set
    if not os.getenv("GEMINI_API_KEY"):
        print("❌ ERROR: GEMINI_API_KEY not found in environment variables!")
        print("Please set it in your .env file or environment.")
        return
    
    print("\nSelect test mode:")
    print("1. Interactive mode (test your own queries)")
    print("2. Run sample tests")
    print("3. Single query test")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        await interactive_mode()
    elif choice == "2":
        await run_sample_tests()
    elif choice == "3":
        query = input("\nEnter your query: ").strip()
        test_exa_choice = input("Test with Exa API? (y/n): ").strip().lower()
        test_exa = test_exa_choice in ['y', 'yes']
        
        if test_exa and not os.getenv("EXA_API_KEY"):
            print("⚠️  Warning: EXA_API_KEY not found. Skipping Exa test.")
            test_exa = False
        
        await run_test(query, test_exa)
    else:
        print("Invalid choice. Exiting.")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
