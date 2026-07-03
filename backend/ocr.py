import easyocr
import numpy as np
import torch

print("Loading EasyOCR...")

reader = easyocr.Reader(
    ['en'],
    gpu=True
)

print("EasyOCR Loaded")
print("CUDA Available:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0))
print("Reader Device:", reader.device)


def extract_text(image):

    # Reduce image size for faster OCR
    image.thumbnail((1000, 1000))

    image = np.array(image)

    result = reader.readtext(
        image,
        paragraph=False,   # Faster than True
        detail=0           # Returns only text
    )

    return " ".join(result).upper()