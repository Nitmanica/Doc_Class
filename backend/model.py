import torch
import torch.nn.functional as F
import json

from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available()
    else "cpu"
)

with open(
    "classes.json",
    "r"
) as f:

    classes = json.load(f)

model = efficientnet_b0()

model.classifier[1] = torch.nn.Linear(
    model.classifier[1].in_features,
    len(classes)
)

model.load_state_dict(
    torch.load(
        "best_document_classifier.pth",
        map_location=DEVICE
    )
)

model.to(DEVICE)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485,0.456,0.406],
        std=[0.229,0.224,0.225]
    )
])

def predict_pil(img):

    x = transform(img)

    x = x.unsqueeze(0)

    x = x.to(DEVICE)

    with torch.no_grad():

        output = model(x)

        probs = F.softmax(
            output,
            dim=1
        )

        confidence, pred = torch.max(
            probs,
            dim=1
        )

    confidence = (
        confidence.item() * 100
    )

    if confidence < 80:

        prediction = "unknown"

    else:

        prediction = classes[
            pred.item()
        ]

    return (
        prediction,
        round(confidence, 2)
    )
