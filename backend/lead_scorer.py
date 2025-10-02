import joblib
import numpy as np
import nltk
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from nltk.corpus import stopwords

# Download stopwords if not already
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))

# Load saved model and scaler
model = joblib.load('xgboost_lead_scorer_optimized.pkl')
scaler = joblib.load('feature_scaler_optimized.pkl')

# Load embedding model
embedder = SentenceTransformer('all-MiniLM-L6-v2')

class LeadRequest(BaseModel):
    query: str
    org_summary: str
    contact_info: dict

# Utility: safe cosine similarity
def safe_cosine_sim(q, c):
    norm_q = np.linalg.norm(q)
    norm_c = np.linalg.norm(c)
    if norm_q == 0 or norm_c == 0:
        return 0.0
    return np.dot(q, c) / (norm_q * norm_c)

# Utility: keyword overlap
def keyword_overlap(query, summary):
    query_words = set(query.lower().split()) - stop_words
    summary_words = set(summary.lower().split()) - stop_words
    if not query_words:
        return 0.0
    return len(query_words.intersection(summary_words)) / len(query_words)

def predict_fit_score(new_query, new_company_data):
    # Extract text
    new_company_text = new_company_data['org_summary']
    
    # Contact features
    contact_info = new_company_data.get('contact_info', {})
    new_has_contact_title = 1 if isinstance(contact_info, dict) and contact_info.get('contact_title') else 0
    new_has_phone = 1 if isinstance(contact_info, dict) and contact_info.get('phone') else 0
    new_has_email = 1 if isinstance(contact_info, dict) and contact_info.get('email') else 0

    # Embeddings
    new_query_emb = embedder.encode([new_query])[0]
    new_company_emb = embedder.encode([new_company_text])[0]

    # Similarity + overlap
    new_cosine_sim = safe_cosine_sim(new_query_emb, new_company_emb)
    new_overlap = keyword_overlap(new_query, new_company_text)

    # Combine features
    new_X_emb = np.concatenate((new_query_emb, new_company_emb))  # embeddings
    new_X_emb = np.expand_dims(new_X_emb, axis=0)
    new_X_additional = np.array([[new_has_contact_title, new_has_phone, new_has_email]])
    new_X_sim = np.array([[new_cosine_sim]])
    new_X_overlap = np.array([[new_overlap]])

    new_X = np.hstack((new_X_emb, new_X_additional, new_X_sim, new_X_overlap))
    new_X = scaler.transform(new_X)

    # Predict fit score
    fit_score = model.predict_proba(new_X)[0][1] * 100
    return round(fit_score, 2)
