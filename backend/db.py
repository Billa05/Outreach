import psycopg2
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection parameters
DB_HOST = os.getenv("DB_HOST")
DB_NAME = "postgres"  
DB_USER = "postgres"  
DB_PASSWORD = "postgres" 
DB_PORT = 5432  

# SQLAlchemy setup
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# User model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Query model
class Query(Base):
    __tablename__ = "queries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")

# Response model
class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("queries.id"), nullable=False)
    base_url = Column(String, nullable=False)
    socials = Column(JSON, nullable=True)
    summary = Column(String, nullable=True)
    contacts = Column(JSON, nullable=True)
    fit_score = Column(Float, nullable=True)
    errors = Column(JSON, nullable=True)
    user_feedback = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    query = relationship("Query")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

try:
    # Establish the connection
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    print("done")

except psycopg2.Error as e:
    print(f"Error connecting to PostgreSQL: {e}")