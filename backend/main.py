from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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
        "message": "Document Classifier API Running"
    }

@app.post("/classify")
async def classify(
    files: list[UploadFile] = File(...)
):

    return {
        "total_files": len(files),
        "filenames": [
            file.filename
            for file in files
        ]
    }