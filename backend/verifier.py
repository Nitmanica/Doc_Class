import re


def verify_document(prediction, text):

    text = text.upper()

    keyword_map = {

        "aadhaar": [
            "AADHAAR",
            "GOVERNMENT OF INDIA",
            "UNIQUE IDENTIFICATION",
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "UIDAI",
            "DOB",
            "MALE",
            "FEMALE"
        ],

        "pan": [
            "PERMANENT ACCOUNT NUMBER",
            "INCOME TAX",
            "INCOME TAX DEPARTMENT",
            "GOVERNMENT OF INDIA",
            "PAN"
        ],

        "passport": [
            "PASSPORT",
            "REPUBLIC OF INDIA",
            "PASSPORT NO",
            "PASSPORT NUMBER",
            "NATIONALITY",
            "PLACE OF BIRTH",
            "DATE OF ISSUE",
            "DATE OF EXPIRY"
        ],

        "driving_license": [
            "DRIVING LICENCE",
            "DRIVING LICENSE",
            "INDIAN UNION",
            "GOVERNMENT OF INDIA",
            "TRANSPORT DEPARTMENT",
            "LICENCE",
            "LICENSE",
            "DL NO",
            "DLNO",
            "VALID FROM",
            "VALID UPTO"
        ],

        "voterId": [
            "ELECTION COMMISSION",
            "ELECTION COMMISSION OF INDIA",
            "ELECTOR",
            "ELECTOR'S NAME",
            "PHOTO IDENTITY CARD",
            "IDENTITY CARD",
            "EPIC",
            "ELECTOR PHOTO IDENTITY CARD",
            "ELECTORAL REGISTRATION OFFICER",
            "ASSEMBLY CONSTITUENCY",
            "PART NO",
            "PLEASE CHECK YOUR NAME",
            "CURRENT ELECTORAL ROLLS",
            "THIS CARD MAY BE USED AS AN IDENTITY CARD",
            "ADDRESS",
            "DATE"
        ]
    }

    patterns = {

        # Aadhaar
        "aadhaar":
            r"\b(?!0000)\d{4}\s?\d{4}\s?\d{4}\b",

        # PAN
        "pan":
            r"\b[A-Z]{5}\d{4}[A-Z]\b",

        # Passport Number
        "passport":
            r"\b[A-Z]\s?\d{7}\b",

        # Driving Licence
        "driving_license":
            r"\b[A-Z]{2}\s?\d{2}\s?[A-Z]?\s?\d{4,13}\b",

        # EPIC Number
        "voterId":
            r"\b[A-Z]{3}\s?\d{7}\b"
    }

    if prediction not in keyword_map:
        return False

    # ---------------------------------
    # Regex Verification
    # ---------------------------------

    if prediction in patterns:

        match = re.search(
            patterns[prediction],
            text
        )

        if match:

            print(
                f"{prediction}: Pattern matched -> {match.group()}"
            )

            # Strong identifiers
            if prediction in [
                "aadhaar",
                "pan",
                "driving_license",
                "voterId"
            ]:
                return True

    # ---------------------------------
    # Keyword Verification
    # ---------------------------------

    matches = 0

    for keyword in keyword_map[prediction]:

        if keyword in text:
            matches += 1

    print(
        f"{prediction}: {matches} keyword(s) matched"
    )

    # ---------------------------------
    # Thresholds
    # ---------------------------------

    thresholds = {

        "aadhaar": 2,
        "pan": 2,
        "passport": 2,
        "driving_license": 2,
        "voterId": 2

    }

    return matches >= thresholds[prediction]