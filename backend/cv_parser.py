import fitz  # PyMuPDF
import docx
import io
import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()


def parse_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX bytes."""
    doc = docx.Document(io.BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    return text.strip()


def parse_image_cv(file_bytes: bytes, filename: str) -> str:
    """Use Groq Vision (Llama) to extract CV text from an image file."""
    ext = os.path.splitext(filename.lower())[1]
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",  ".webp": "image/webp",
        ".bmp": "image/bmp",  ".gif": "image/gif",
    }
    mime = mime_map.get(ext, "image/jpeg")
    b64_image = base64.b64encode(file_bytes).decode("utf-8")

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{b64_image}"
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "This is an image of a CV / Resume. "
                            "Please extract ALL the text from it exactly as written. "
                            "Preserve the structure — include name, contact info, skills, "
                            "work experience, education, certifications, and any other sections. "
                            "Output only the extracted text, no commentary."
                        ),
                    },
                ],
            }
        ],
        max_tokens=3000,
    )
    return response.choices[0].message.content.strip()


def parse_cv(file_bytes: bytes, filename: str) -> str:
    """Parse CV from uploaded file — supports PDF, DOCX, and image files."""
    filename_lower = filename.lower()
    ext = os.path.splitext(filename_lower)[1]

    if ext == ".pdf":
        return parse_pdf(file_bytes)
    elif ext in {".docx", ".doc"}:
        return parse_docx(file_bytes)
    elif ext in IMAGE_EXTENSIONS:
        return parse_image_cv(file_bytes, filename)
    else:
        # Fallback: try plain text
        return file_bytes.decode("utf-8", errors="ignore")
