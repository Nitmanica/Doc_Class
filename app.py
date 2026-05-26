import streamlit as st
from PIL import Image
from utils import classify_document
import os

st.set_page_config(
    page_title="OCR Hybrid Classifier",
    layout="wide"
)

st.title(
    "OCR + Logo Hybrid Document Classifier"
)

uploaded_files = st.file_uploader(
    "Upload Multiple Documents",
    type=["png", "jpg", "jpeg"],
    accept_multiple_files=True
)

if uploaded_files:

    st.subheader(
        "Document Classification Results"
    )

    for index, uploaded_file in enumerate(
        uploaded_files
    ):

        st.markdown("---")

        col1, col2 = st.columns(
            [1, 2]
        )

        with col1:

            image = Image.open(
                uploaded_file
            )

            st.image(
                image,
                caption=
                    uploaded_file.name,
                width=250
            )

        temp_path = (
            f"temp_{index}.png"
        )

        with open(
            temp_path,
            "wb"
        ) as f:

            f.write(
                uploaded_file.getbuffer()
            )

        result = classify_document(
            temp_path
        )

        with col2:

            st.success(
                f"Detected: "
                f"{result['document_type']}"
            )

            st.subheader(
                "Confidence Scores"
            )

            st.json(
                result["score"]
            )

            st.subheader(
                "Logo Detection"
            )

            st.write(
                f"Aadhaar Logo: "
                f"{result['aadhaar_found']}"
            )

            st.write(
                f"Government Emblem: "
                f"{result['emblem_found']}"
            )

            with st.expander(
                f"View OCR Text - "
                f"{uploaded_file.name}"
            ):

                st.write(
                    result["ocr_text"]
                )

        # cleanup temp file
        if os.path.exists(
            temp_path
        ):
            os.remove(
                temp_path
            )