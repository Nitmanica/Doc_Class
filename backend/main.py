from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ocr import extract_text
from verifier import verify_document
from PIL import Image
import io
import os

from model import predict_pil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():

    return {
        "message":
        "Document Classifier API Running"
    }


@app.post("/classify")
async def classify(
    files: list[UploadFile] = File(...)
):

    results = []

    for file in files:

        contents = await file.read()

        try:
           image = Image.open(
             io.BytesIO(contents)
            ).convert("RGB")
        except Exception:
            results.append({
                "filename": os.path.basename(file.filename),
                "prediction": "Invalid Image",
                "confidence": 0
            })
            continue

        prediction, confidence = (
            predict_pil(image)
        )
        text = extract_text(image)
        print("=" * 60)
        print("Filename:", file.filename)
        print("Prediction:", prediction)
        print("Confidence:", confidence)
        print("OCR Text:")
        print(text)

        ocr_verified = verify_document(
                       prediction,
                       text
                       )
        print("OCR Verified:", ocr_verified)
        print("=" * 60)
        results.append({

            "filename":
            os.path.basename(file.filename),

            "prediction":
            prediction,

            "confidence":
            confidence,
            
            "ocr_verified": 
            ocr_verified

        })

    return results