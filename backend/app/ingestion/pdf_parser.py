import os
import re
from typing import List, Dict, Any, Optional

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

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
    Fast extraction of pages, academic sections, and metadata (DOI, Year, Title).
    Uses PyMuPDF (C engine) for ~20x faster extraction with pypdf fallback.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    pages_data = []
    full_text_parts = []

    try:
        if fitz is not None:
            # High-performance PyMuPDF extraction
            doc = fitz.open(file_path)
            for idx, page in enumerate(doc, start=1):
                extracted = page.get_text() or ""
                pages_data.append({"page_number": idx, "text": extracted})
                if extracted.strip():
                    full_text_parts.append(extracted)
            doc.close()
        elif PdfReader is not None:
            # Fallback to pypdf
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages, start=1):
                extracted = page.extract_text() or ""
                pages_data.append({"page_number": idx, "text": extracted})
                if extracted.strip():
                    full_text_parts.append(extracted)
        else:
            raise ImportError("Neither pymupdf nor pypdf is installed.")

        full_text = "\n\n".join(full_text_parts)
        first_page_text = pages_data[0]["text"] if pages_data else ""

        # Auto-extract metadata
        doi = extract_doi(full_text[:4000]) or extract_doi(full_text)
        year = extract_year(first_page_text[:1500])

        # Infer title and authors by ignoring journal headers/banners/copyright
        HEADER_PATTERNS = re.compile(
            r'(?:ISSN|ISBN|DOI|https?://|www\.|\barXiv\b|Volume|Issue|\bVol\b|\bNo\b|Â©|Copyright|International Journal|Journal of|Proceedings of|Conference|Page|pp\.|Unpublished working draft|Published as|Provided proper attribution|reproduce the tables)',
            re.IGNORECASE
        )
        first_lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]
        inferred_title = ""
        inferred_authors = ""
        idx = 0
        while idx < min(len(first_lines), 15):
            line = first_lines[idx]
            if len(line) < 4 or HEADER_PATTERNS.search(line):
                idx += 1
                continue
            # Found first valid title line
            title_parts = [line]
            idx += 1
            # Check for title continuation
            while idx < min(len(first_lines), 15) and len(title_parts) < 3:
                next_line = first_lines[idx]
                if HEADER_PATTERNS.search(next_line) or re.search(r'\b(?:University|College|Institute|Department|Prof|Dr\.|Student|Email|@|Faculty|Author|Engineer)\b', next_line, re.IGNORECASE):
                    break
                if len(title_parts[-1]) < 90 and not title_parts[-1].endswith(('.', ':', '?')):
                    title_parts.append(next_line)
                    idx += 1
                else:
                    break
            inferred_title = " ".join(title_parts)[:300]
            if idx < len(first_lines):
                inferred_authors = first_lines[idx][:250]
            break

        # Fast section blocks detection
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
                
                # Performance optimization: section headers are short (< 80 chars)
                if 0 < len(sline) < 80:
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
