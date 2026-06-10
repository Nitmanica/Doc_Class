from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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

        image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")

        prediction, confidence = (
            predict_pil(image)
        )

        results.append({

            "filename":
            os.path.basename(file.filename),

            "prediction":
            prediction,

            "confidence":
            confidence

        })

    return results