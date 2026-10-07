import os
import re
from typing import List, Dict, Any, Optional

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

# Section header regex patterns
SECTION_PATTERNS = [
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?ABSTRACT\b', re.IGNORECASE), "Abstract"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?INTRODUCTION\b', re.IGNORECASE), "Introduction"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:RELATED WORK|LITERATURE REVIEW)\b', re.IGNORECASE), "Related Work"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:METHODOLOGY|METHODS|PROPOSED METHOD|EXPERIMENTAL SETUP)\b', re.IGNORECASE), "Methodology"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:RESULTS|FINDINGS|EXPERIMENTAL RESULTS)\b', re.IGNORECASE), "Results"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:DISCUSSION|DISCUSSIONS)\b', re.IGNORECASE), "Discussion"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:CONCLUSION|CONCLUSIONS)\b', re.IGNORECASE), "Conclusion"),
    (re.compile(r'^(?:[0-9IVX]+\.?\s*)?(?:REFERENCES|BIBLIOGRAPHY)\b', re.IGNORECASE), "References"),
]

def extract_doi(text: str) -> Optional[str]:
    """Extracts DOI string using standard prefix pattern."""
    match = re.search(r'10\.\d{4,9}/[-._;()/:A-Za-z0-9]+', text)
    if match:
        # Clean trailing punctuation
        doi = match.group(0).rstrip('.,;)')
        return doi
    return None

def extract_year(text: str) -> Optional[int]:
    """Extracts plausible publication year between 1900 and 2026."""
    matches = re.findall(r'\b(19\d{2}|20[0-2]\d)\b', text)
    if matches:
        # Return the most recent valid year candidate from header/first page
        years = [int(y) for y in matches if 1900 <= int(y) <= 2026]
        if years:
            return max(years)
    return None

def extract_text_from_pdf(file_path: str) -> Optional[str]:
    """
    Backwards-compatible raw text extractor.
    Returns concatenated string text from PDF pages.
    """
    structured = extract_structured_pdf(file_path)
    return structured.get("text") if structured else None

def extract_structured_pdf(file_path: str) -> Dict[str, Any]:
    """
    Extracts pages, detects academic sections, and auto-detects paper metadata (DOI, Year, Title).
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")
        
    if PdfReader is None:
        raise ImportError("pypdf is not installed. Please install it using 'pip install pypdf'")

    pages_data = []
    full_text_parts = []
    
    try:
        reader = PdfReader(file_path)
        for idx, page in enumerate(reader.pages, start=1):
            extracted = page.extract_text() or ""
            pages_data.append({"page_number": idx, "text": extracted})
            if extracted.strip():
                full_text_parts.append(extracted)

        full_text = "\n\n".join(full_text_parts)
        first_page_text = pages_data[0]["text"] if pages_data else ""

        # Auto-extract metadata
        doi = extract_doi(full_text)
        year = extract_year(first_page_text[:1000])

        # Infer title from first page lines if available
        first_lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]
        inferred_title = first_lines[0][:250] if first_lines else ""
        inferred_authors = first_lines[1][:250] if len(first_lines) > 1 else ""

        # Parse section blocks
        sections = []
        current_section_name = "General"
        current_section_lines = []
        current_section_page = 1

        for page in pages_data:
            page_num = page["page_number"]
            lines = page["text"].split("\n")
            
            for line in lines:
                sline = line.strip()
                detected_section = None
                
                for pattern, name in SECTION_PATTERNS:
                    if pattern.match(sline):
                        detected_section = name
                        break

                if detected_section:
                    if current_section_lines:
                        sections.append({
                            "section_name": current_section_name,
                            "page_number": current_section_page,
                            "text": "\n".join(current_section_lines).strip()
                        })
                    current_section_name = detected_section
                    current_section_lines = [sline]
                    current_section_page = page_num
                else:
                    current_section_lines.append(sline)

        # Append final section
        if current_section_lines:
            sections.append({
                "section_name": current_section_name,
                "page_number": current_section_page,
                "text": "\n".join(current_section_lines).strip()
            })

        return {
            "text": full_text,
            "metadata": {
                "title": inferred_title,
                "authors": inferred_authors,
                "year": year,
                "doi": doi
            },
            "pages": pages_data,
            "sections": sections
        }

    except Exception as e:
        print(f"Error extracting structured PDF from {file_path}: {e}")
        return {
            "text": None,
            "metadata": {},
            "pages": [],
            "sections": []
        }
