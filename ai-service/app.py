"""
NovaDx AI Inference Service

FastAPI service for medical image analysis.
Provides:
1. Image analysis with cancer detection
2. Grad-CAM heatmap generation
3. DICOM support

Run: uvicorn app:app --reload --port 5001
"""

import os
import json
import shutil
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from utils import (
    allowed_file,
    generate_unique_filename,
    save_prediction_json,
    load_image,
)
from inference import predict
from gradcam import generate_heatmap

# ---- App Configuration ----

app = FastAPI(
    title="NovaDx AI Service",
    description="AI-Powered Medical Image Analysis Service",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "images")
HEATMAP_DIR = os.path.join(BASE_DIR, "uploads", "heatmaps")
PREDICTION_DIR = os.path.join(BASE_DIR, "uploads", "predictions")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(HEATMAP_DIR, exist_ok=True)
os.makedirs(PREDICTION_DIR, exist_ok=True)

# Serve static uploads
app.mount("/uploads", StaticFiles(directory=os.path.join(BASE_DIR, "uploads")), name="uploads")


# ---- API Endpoints ----

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "NovaDx AI Service",
        "version": "1.0.0",
        "status": "running",
        "model": "Placeholder (replace with trained model)",
        "endpoints": {
            "analyze": "/api/analyze",
            "health": "/api/health",
        },
    }


@app.get("/api/health")
async def health_check():
    """Health check with model status."""
    return {
        "success": True,
        "service": "NovaDx AI Service",
        "model_loaded": True,
        "model_version": "NovaDx CNN v4.2 (Placeholder)",
        "timestamp": str(__import__("datetime").datetime.now()),
    }


@app.post("/api/analyze")
async def analyze_scan(
    image: UploadFile = File(...),
    patientInfo: Optional[str] = Form("{}"),
):
    """
    Analyze a medical scan image.

    Accepts: PNG, JPG, JPEG, DICOM (.dcm)
    Returns: Prediction with heatmap

    Replace the placeholder model with your trained CNN by updating:
    - inference.py (predict function)
    - gradcam.py (Grad-CAM generation)
    """
    # Validate file
    if not image.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not allowed_file(image.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported: {image.filename}. "
                   f"Supported: PNG, JPG, JPEG, DICOM (.dcm)",
        )

    # Parse patient info
    try:
        patient_data = json.loads(patientInfo) if patientInfo else {}
    except json.JSONDecodeError:
        patient_data = {}

    # Save uploaded file
    unique_filename = generate_unique_filename(image.filename)
    filepath = os.path.join(UPLOAD_DIR, unique_filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(image.file, f)

    print(f"[Upload] Saved: {filepath}")

    # Load image for processing
    try:
        img_array = load_image(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading image: {str(e)}")

    # Run inference
    body_part = patient_data.get("bodyPart", "Brain")
    prediction = predict(img_array, body_part)

    # Generate heatmap
    heatmap_rel_path = ""
    try:
        heatmap_rel_path = generate_heatmap(img_array, prediction, HEATMAP_DIR)
        heatmap_url = f"/uploads/heatmaps/{os.path.basename(heatmap_rel_path)}"
        prediction["heatmapUrl"] = heatmap_url
    except Exception as e:
        print(f"[Warning] Heatmap generation failed: {e}")
        prediction["heatmapUrl"] = None

    # Save prediction JSON
    prediction_data = {
        "filename": unique_filename,
        "originalName": image.filename,
        "patientInfo": patient_data,
        "result": prediction,
        "heatmapPath": heatmap_rel_path,
    }
    prediction_json_path = save_prediction_json(prediction_data, PREDICTION_DIR)

    return {
        "success": True,
        **prediction,
    }


# ---- Main ----

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n[AI] NovaDx AI Service")
    print(f"   Port: {port}")
    print(f"   Model: Placeholder (ready for your trained CNN)")
    print(f"   Docs: http://localhost:{port}/docs")
    print("")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)

