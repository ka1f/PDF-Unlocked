# pyrefly: ignore [missing-import]
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pikepdf
import io
import os

app = FastAPI(title="PDF Unlocker API")

# Add CORS middleware if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files for the frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.post("/api/unlock")
async def unlock_pdf(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")

    try:
        content = await file.read()
        pdf_stream = io.BytesIO(content)

        # Attempt to open and decrypt the PDF
        try:
            pdf = pikepdf.open(pdf_stream, password=password)
            out_stream = io.BytesIO()
            pdf.save(out_stream)
            pdf.close()
        except pikepdf.PasswordError:
            raise HTTPException(status_code=401, detail="Incorrect password.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

        # Return the decrypted file
        headers = {
            "Content-Disposition": f'attachment; filename="unlocked_{file.filename}"'
        }
        return Response(
            content=out_stream.getvalue(),
            media_type="application/pdf",
            headers=headers
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
