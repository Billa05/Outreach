from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class URLRequest(BaseModel):
    urls: List[str] = Field(..., example=["https://crawl4ai.com", "https://python.org"])


class ContactInfo(BaseModel):
    name: Optional[str] = Field(None, description="The full name of the contact person.")
    designation: Optional[str] = Field(None, description="The job title or designation.")
    email: Optional[str] = Field(None, description="The contact's email address.")
    phone: Optional[str] = Field(None, description="The contact's phone number.")


class PerSourceResult(BaseModel):
    socials: List[str]
    summary: str = Field(default="", description="Website summary for this source")
    contacts: List[ContactInfo]


class ContactExtractionResponse(BaseModel):
    contacts_found: Dict[str, PerSourceResult]
    errors: Dict[str, str]


class QueryRequest(BaseModel):
    query: str = Field(..., example="best CRM tools for startups")


class SearchQueriesResponse(BaseModel):
    queries: List[str]


