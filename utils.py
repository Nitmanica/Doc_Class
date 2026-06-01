import easyocr
import cv2
import numpy as np
import re

reader = easyocr.Reader(['en'], gpu=False)


def detect_logo(document_path,
                logo_path,
                threshold=0.66):

    image = cv2.imread(document_path)
    template = cv2.imread(logo_path)

    if image is None or template is None:
        return False

    image_gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    template_gray = cv2.cvtColor(
        template,
        cv2.COLOR_BGR2GRAY
    )

    best_score = 0

    scales = [0.3, 0.5, 0.7, 1.0]

    for scale in scales:

        resized_template = cv2.resize(
            template_gray,
            None,
            fx=scale,
            fy=scale
        )

        h, w = resized_template.shape

        if h > image_gray.shape[0] or \
           w > image_gray.shape[1]:
            continue

        result = cv2.matchTemplate(
            image_gray,
            resized_template,
            cv2.TM_CCOEFF_NORMED
        )

        score = np.max(result)

        best_score = max(
            best_score,
            score
        )

    print(
        f"{logo_path} "
        f"match score: "
        f"{best_score:.2f}"
    )

    return best_score >= threshold


# ------------------------
# Passport Function
# ------------------------

def passport_check(extracted_text):

    score = 0

    text = extracted_text.lower()

    # ------------------------
    # Passport Keywords
    # ------------------------

    passport_keywords = [
        "passport",
        "nationality",
        "place of birth",
        "date of birth",
        "date of issue",
        "date of expiry",
        "surname",
        "given name",
        "ind"
    ]

    for keyword in passport_keywords:
        if keyword in text:
            score += 2

    # ------------------------
    # Passport Number Regex
    # ------------------------

    passport_patterns = [

        # J8369854
        r'[A-Z][0-9]{7}',

        # OCR tolerant
        r'[A-Z][0-9O]{7}'
    ]

    for pattern in passport_patterns:

        match = re.search(
            pattern,
            extracted_text.upper()
        )

        if match:
            score += 6
            break

    # ------------------------
    # MRZ Detection
    # ------------------------

    # very strong passport sign
    if "<<" in text:
        score += 4

    # machine readable zone
    mrz_pattern = re.search(
        r'[0-9<]{10,}',
        extracted_text
    )

    if mrz_pattern:
        score += 4

    # OCR corruption tolerant
    passport_noise_words = [
        "republic",
        "reeullic",
        "passport",
        "mno"
    ]

    for word in passport_noise_words:
        if word in text:
            score += 1

    return score
# ------------------------
# Driving License Function
# ------------------------

def license_check(extracted_text):

    score = 0

    text = extracted_text.lower()

    # ------------------------
    # License Keywords
    # ------------------------

    license_keywords = [
        "driving licence",
        "driving license",
        "licence no",
        "license no",
        "dl no",
        "dl.no",
        "dl no.",
        "date of issue",
        "valid till",
        "transport",
        "motor vehicle"
    ]

    for keyword in license_keywords:
        if keyword in text:
            score += 2

    # ------------------------
    # State Codes
    # ------------------------

    state_codes = [
        "tn", "ka", "mh", "dl",
        "ap", "ts", "kl", "wb",
        "gj", "up", "mp", "pb",
        "hr", "rj", "od", "br"
    ]

    for code in state_codes:
        if code in text:
            score += 1

    # ------------------------
    # Flexible DL Regex
    # ------------------------

    dl_patterns = [

        # TN0120230001234
        r'[A-Z]{2}[0-9]{2}[0-9]{11}',

        # TN01 20230001234
        r'[A-Z]{2}[0-9]{2}\s?[0-9]{11}',

        # TN-01-20230001234
        r'[A-Z]{2}-?[0-9]{2}-?[0-9]{11}',

        # OCR tolerant
        r'[A-Z]{2}\s?[0-9O]{2}\s?[0-9O]{8,12}'
    ]

    for pattern in dl_patterns:

        license_match = re.search(
            pattern,
            extracted_text.upper()
        )

        if license_match:
            score += 6
            break

    # ------------------------
    # Extra confidence
    # ------------------------

    if (
        "date of issue" in text
        and "valid till" in text
    ):
        score += 2

    return score

def aadhaar_check(
        extracted_text,
        aadhaar_logo_found
):

    score = 0

    aadhaar_keywords = [
        "uidai",
        "government of india",
        "aadhaar"
    ]

    aadhaar_keyword_score = 0

    for keyword in aadhaar_keywords:
        if keyword in extracted_text:
            aadhaar_keyword_score += 1

    score += (
        aadhaar_keyword_score
    )

    # Aadhaar number
    aadhaar_match = re.search(
        r'\d{4}\s?\d{4}\s?\d{4}',
        extracted_text
    )

    # Number alone counts
    if aadhaar_match:
        score += 5

    # Logo bonus
    if aadhaar_logo_found:
        score += 3

    # OCR tolerance
    aadhaar_noise_words = [
        "male",
        "female",
        "dob",
        "year of birth"
    ]

    for word in aadhaar_noise_words:
        if word in extracted_text:
            score += 1

    return score
def pan_check(
        extracted_text,
        emblem_found
):

    score = 0

    pan_keywords = [
        "income tax",
        "permanent account number",
        "income tax department"
    ]

    pan_keyword_score = 0

    for keyword in pan_keywords:
        if keyword in extracted_text:
            pan_keyword_score += 1

    score += (
        pan_keyword_score * 2
    )

    pan_match = re.search(
        r'[A-Z]{5}[0-9]{4}[A-Z]',
        extracted_text.upper()
    )

    if pan_match:
        score += 6

    # keep existing logic
    if emblem_found or (
        pan_match or
        pan_keyword_score > 0
    ):
        score += 1

    return score

def classify_document(image_path):

    result = reader.readtext(image_path)

    extracted_text = " ".join(
        [item[1] for item in result]
    ).lower()

    score = {
        "aadhaar": 0,
        "pan": 0,
        "passport": 0,
        "license": 0
    }

    # ------------------------
    # Logo Detection
    # ------------------------

    aadhaar_logo_found = detect_logo(
        image_path,
        "logos/aadhaar_logo.svg.png"
    )

    emblem_found = detect_logo(
        image_path,
        "logos/emblem.jpg"
    )

    # ------------------------
    # Aadhaar Score Calculation
    # ------------------------

    score["aadhaar"] = (
        aadhaar_check(
            extracted_text,
            aadhaar_logo_found
        )
    )
    # ------------------------
    # PAN Score Calculation
    # ------------------------

    score["pan"] = (
        pan_check(
            extracted_text,
            emblem_found
        )
    )
    # ------------------------
    # Passport & License
    # ------------------------

    score["passport"] = (
        passport_check(
            extracted_text
        )
    )

    score["license"] = (
        license_check(
            extracted_text
        )
    )

    # ------------------------
    # Final Classification
    # ------------------------

    max_doc = max(
        score,
        key=score.get
    )

    mapping = {
        "aadhaar":
            "Aadhaar Card",

        "pan":
            "PAN Card",

        "passport":
            "Passport",

        "license":
            "Driving License"
    }

    thresholds = {
        "aadhaar": 5,
        "pan": 5,
        "passport": 4,
        "license": 5
    }

    if score[max_doc] >= \
            thresholds[max_doc]:

        document_type = \
            mapping[max_doc]

    else:
        document_type = \
            "Unknown Document"

    return {
        "document_type":
            document_type,

        "score":
            score,

        "ocr_text":
            extracted_text,

        "aadhaar_found":
            aadhaar_logo_found,

        "emblem_found":
            emblem_found
    }