from pypdf import PdfReader
import logging

logger = logging.getLogger(__name__)

def extract_pages(file_path):
    pages_text = []
    try:
        reader = PdfReader(file_path)
        
        # If encrypted with blank password, decrypt
        if getattr(reader, "is_encrypted", False):
            try:
                reader.decrypt("")
            except Exception:
                logger.warning("PDF is password-protected and could not be decrypted.")
                return pages_text

        # Extract text from pages (up to first 50 pages to stay fast and avoid timeouts)
        total_pages = len(reader.pages)
        max_pages = min(total_pages, 50)

        for page_number in range(max_pages):
            try:
                page = reader.pages[page_number]
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append({
                        "page": page_number + 1,
                        "text": text.strip()
                    })
            except Exception as e:
                logger.warning(f"Error extracting page {page_number + 1}: {e}")
                continue

    except Exception as e:
        logger.error(f"Error reading PDF file {file_path}: {e}")
        raise ValueError(f"Could not read PDF: {str(e)}")

    return pages_text