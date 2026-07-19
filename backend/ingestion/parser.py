import PyPDF2
import docx
import io

class DocumentParser:
    def parse_pdf(self, file_bytes: bytes) -> str:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text

    def parse_docx(self, file_bytes: bytes) -> str:
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])

    def parse_txt(self, file_bytes: bytes) -> str:
        return file_bytes.decode("utf-8")

    def parse(self, filename: str, file_bytes: bytes) -> str:
        if filename.endswith(".pdf"):
            return self.parse_pdf(file_bytes)
        elif filename.endswith(".docx"):
            return self.parse_docx(file_bytes)
        elif filename.endswith(".txt"):
            return self.parse_txt(file_bytes)
        else:
            raise ValueError("Unsupported file format")

parser = DocumentParser()
