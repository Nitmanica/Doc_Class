import zipfile
import os
import shutil
import random
'''
ZIP_FILE = "AADHAR-FRONT-BACK-PAN.yolov8.zip"

# -------------------------
# Extract ZIP
# -------------------------

if os.path.exists("temp_dataset"):
    shutil.rmtree("temp_dataset")

with zipfile.ZipFile(
    ZIP_FILE,
    "r"
) as zip_ref:

    zip_ref.extractall(
        "temp_dataset"
    )

print("ZIP extracted")

# -------------------------
# Locate images folder
# -------------------------

image_folder = os.path.join(
    "temp_dataset",
    "train",
    "images"
)

if not os.path.exists(
        image_folder):
    raise Exception(
        f"Images folder not found: "
        f"{image_folder}"
    )

print(
    "Images folder:",
    image_folder
)

# -------------------------
# Create raw dataset
# -------------------------

os.makedirs(
    "raw_dataset/aadhaar",
    exist_ok=True
)

os.makedirs(
    "raw_dataset/pan",
    exist_ok=True
)
# -------------------------
# Segregate Images
# -------------------------

aadhaar_count = 0
pan_count = 0

for file in os.listdir(
        image_folder
):

    lower = file.lower()

    src = os.path.join(
        image_folder,
        file
    )

    if (
        "aadharfront" in lower
        or "aadharback" in lower
        or "aadhaarfront" in lower
        or "aadhaarback" in lower
    ):

        shutil.copy(
            src,
            os.path.join(
                "raw_dataset",
                "aadhaar",
                file
            )
        )

        aadhaar_count += 1

    elif "pan" in lower:

        shutil.copy(
            src,
            os.path.join(
                "raw_dataset",
                "pan",
                file
            )
        )

        pan_count += 1

print(
    f"Aadhaar Images: "
    f"{aadhaar_count}"
)

print(
    f"PAN Images: "
    f"{pan_count}"
)

print(
    "Images segregated"
)
'''


SOURCE = "raw_dataset"
DEST = "dataset"

TRAIN_RATIO = 0.8
SEED = 42

random.seed(SEED)

# Delete old split
if os.path.exists(DEST):
    shutil.rmtree(DEST)

# Detect classes automatically
classes = [
    folder
    for folder in os.listdir(SOURCE)
    if os.path.isdir(os.path.join(SOURCE, folder))
]

print("Classes Found:")
print(classes)

for cls in classes:

    class_path = os.path.join(
        SOURCE,
        cls
    )

    files = [
        f for f in os.listdir(class_path)
        if os.path.isfile(
            os.path.join(class_path, f)
        )
    ]

    random.shuffle(files)

    split_idx = int(
        len(files) * TRAIN_RATIO
    )

    train_files = files[:split_idx]
    val_files = files[split_idx:]

    train_dir = os.path.join(
        DEST,
        "train",
        cls
    )

    val_dir = os.path.join(
        DEST,
        "val",
        cls
    )

    os.makedirs(
        train_dir,
        exist_ok=True
    )

    os.makedirs(
        val_dir,
        exist_ok=True
    )

    for file in train_files:

        shutil.copy2(
            os.path.join(
                class_path,
                file
            ),
            os.path.join(
                train_dir,
                file
            )
        )

    for file in val_files:

        shutil.copy2(
            os.path.join(
                class_path,
                file
            ),
            os.path.join(
                val_dir,
                file
            )
        )

    print(
        f"{cls:<20}"
        f" Total={len(files):<5}"
        f" Train={len(train_files):<5}"
        f" Val={len(val_files):<5}"
    )

print("\nDataset split complete.")