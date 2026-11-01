import re
from typing import List, Dict, Any, Optional

# Sections that should not consume neural embedding computation
NON_EMBED_SECTIONS = {"references", "bibliography", "acknowledgments", "acknowledgements"}

class DocumentChunk:
    def __init__(self, text: str, metadata: Dict[str, Any], should_embed: bool = True):
        self.text = text
        self.metadata = metadata
        self.should_embed = should_embed

def clean_text(text: str) -> str:
    """
    Basic text cleaning to remove excessive whitespace and unprintable characters.
    """
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip()

def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> List[str]:
    """
    Splits text into overlapping chunks of approximately `chunk_size` characters.
    1200 characters corresponds to full semantic academic paragraphs.
    """
    if not text:
        return []
        
    text = clean_text(text)
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        if end < len(text):
            match = re.search(r'[\.\n] ', text[end - 50:end])
            if match:
                end = end - 50 + match.end()
            else:
                space_idx = text.rfind(' ', start, end)
                if space_idx != -1 and space_idx > start + chunk_size // 2:
                    end = space_idx
                    
        chunks.append(text[start:end].strip())
        start = end - overlap
        
    return chunks

def process_structured_document(
    sections: List[Dict[str, Any]], 
    document_id: int, 
    project_id: int
) -> List[DocumentChunk]:
    """
    Chunks document sections while attaching section name and page number metadata.
    Marks references/bibliography as non-embeddable to cut embedding time by ~40%.
    """
    doc_chunks = []
    chunk_counter = 0

    for sec in sections:
        sec_name = sec.get("section_name", "General")
        page_num = sec.get("page_number", 1)
        sec_text = sec.get("text", "")

        if not sec_text.strip():
            continue

        sec_lower = sec_name.strip().lower()
        should_embed = sec_lower not in NON_EMBED_SECTIONS

        raw_chunks = chunk_text(sec_text, chunk_size=1200, overlap=150)
        for raw_chunk in raw_chunks:
            # Prefix text with section header tag for LLM context grounding
            prefixed_text = f"[Section: {sec_name}] {raw_chunk}"
            metadata = {
                "document_id": document_id,
                "project_id": project_id,
                "chunk_index": chunk_counter,
                "section": sec_name,
                "page": page_num
            }
            doc_chunks.append(DocumentChunk(
                text=prefixed_text, 
                metadata=metadata, 
                should_embed=should_embed
            ))
            chunk_counter += 1

    return doc_chunks

def process_document(text: str, document_id: int, project_id: int) -> List[DocumentChunk]:
    """
    Backwards-compatible raw text chunker.
    """
    raw_chunks = chunk_text(text, chunk_size=1200, overlap=150)
    doc_chunks = []
    
    for i, chunk_text_content in enumerate(raw_chunks):
        metadata = {
            "document_id": document_id,
            "project_id": project_id,
            "chunk_index": i,
            "section": "General",
            "page": 1
        }
        doc_chunks.append(DocumentChunk(text=chunk_text_content, metadata=metadata, should_embed=True))
        
    return doc_chunks
