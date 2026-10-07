import pytest
from app.ingestion.pdf_parser import (
    extract_doi,
    extract_year,
    SECTION_PATTERNS
)
from app.ingestion.chunker import (
    chunk_text,
    process_structured_document,
    process_document
)

def test_extract_doi():
    text = "For more details see https://doi.org/10.1016/j.cell.2021.01.001."
    doi = extract_doi(text)
    assert doi == "10.1016/j.cell.2021.01.001"

def test_extract_doi_none():
    text = "No DOI present in this text."
    assert extract_doi(text) is None

def test_extract_year():
    text = "Published in IEEE Transactions on AI, 2023. Accepted 2022."
    year = extract_year(text)
    assert year == 2023

def test_section_patterns():
    test_cases = [
        ("1. INTRODUCTION", "Introduction"),
        ("ABSTRACT", "Abstract"),
        ("III. METHODOLOGY", "Methodology"),
        ("4. EXPERIMENTAL RESULTS", "Results"),
        ("DISCUSSIONS", "Discussion"),
        ("REFERENCES", "References"),
    ]
    for header, expected_name in test_cases:
        matched = False
        for pattern, name in SECTION_PATTERNS:
            if pattern.match(header):
                assert name == expected_name
                matched = True
                break
        assert matched, f"Header '{header}' failed to match expected section '{expected_name}'"

def test_process_structured_document():
    sections = [
        {
            "section_name": "Abstract",
            "page_number": 1,
            "text": "This paper presents a novel RAG pipeline using BGE-M3."
        },
        {
            "section_name": "Methodology",
            "page_number": 3,
            "text": "We evaluate Reciprocal Rank Fusion over Qdrant vector collections."
        }
    ]
    chunks = process_structured_document(sections, document_id=42, project_id=10)
    assert len(chunks) == 2
    assert chunks[0].metadata["section"] == "Abstract"
    assert chunks[0].metadata["page"] == 1
    assert chunks[0].metadata["document_id"] == 42
    assert "[Section: Abstract]" in chunks[0].text
    assert chunks[1].metadata["section"] == "Methodology"
    assert chunks[1].metadata["page"] == 3
    assert "[Section: Methodology]" in chunks[1].text
