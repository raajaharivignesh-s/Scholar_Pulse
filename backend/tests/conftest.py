import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db import Base, get_db
from app.dependencies import get_current_user
from app.models import User, Project, Paper

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

MOCK_USER_ID = 1

def override_get_current_user():
    return User(id=MOCK_USER_ID, email="test@test.com", name="Test User", password_hash="hash")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    u1 = User(id=MOCK_USER_ID, email="test@test.com", name="Test User", password_hash="hash")
    u2 = User(id=2, email="other@test.com", name="Other User", password_hash="hash")
    db.add(u1)
    db.add(u2)
    
    p1 = Project(id=1, owner_id=u1.id, name="Test Project 1", research_question="AI benchmarks")
    p2 = Project(id=2, owner_id=u2.id, name="Project 2 (Other User)")
    db.add(p1)
    db.add(p2)

    paper1 = Paper(
        id=101,
        project_id=1,
        title="Attention Is All You Need",
        authors="Vaswani et al.",
        year=2017,
        status="PROCESSED",
        file_hash="hash101",
        file_path="/storage/101.pdf"
    )
    paper2 = Paper(
        id=102,
        project_id=1,
        title="BERT Pre-training of Deep Bidirectional Transformers",
        authors="Devlin et al.",
        year=2019,
        status="PROCESSED",
        file_hash="hash102",
        file_path="/storage/102.pdf"
    )
    db.add(paper1)
    db.add(paper2)
    db.commit()
    
    yield
    db.close()
