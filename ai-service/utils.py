"""
Utility functions for the NovaDx AI Service.
"""

import os
import json
import uuid
from datetime import datetime


def allowed_file(filename):
    """Check if file extension is allowed."""
    allowed_extensions = {'png', 'jpg', 'jpeg', 'dcm'}
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in allowed_extensions


def generate_unique_filename(original_filename):
    """Generate a unique filename preserving extension."""
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'png'
    return f"{uuid.uuid4().hex}.{ext}"


def save_prediction_json(data, output_dir):
    """Save prediction data as JSON file."""
    filename = f"prediction_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.json"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    return filepath


def load_dicom_image(filepath):
    """
    Load a DICOM file and convert to numpy array.
    Returns None if pydicom is not available or file is invalid.
    """
    try:
        import pydicom
        ds = pydicom.dcmread(filepath)
        if hasattr(ds, 'pixel_array'):
            return ds.pixel_array
        return None
    except ImportError:
        print("Warning: pydicom not installed. Cannot process DICOM files.")
        return None
    except Exception as e:
        print(f"Error loading DICOM: {e}")
        return None


def load_image(filepath):
    """
    Load an image file (PNG, JPG, JPEG, DICOM) as a numpy array.
    """
    import cv2
    import numpy as np

    ext = filepath.rsplit('.', 1)[1].lower() if '.' in filepath else ''

    if ext == 'dcm':
        # Load DICOM
        dicom_array = load_dicom_image(filepath)
        if dicom_array is not None:
            # Normalize to 0-255 and convert to 3-channel
            dicom_norm = cv2.normalize(dicom_array, None, 0, 255, cv2.NORM_MINMAX)
            img = np.uint8(dicom_norm)
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            return img
        # Fallback: create blank image
        return np.zeros((512, 512, 3), dtype=np.uint8)

    # Load standard image formats
    img = cv2.imread(filepath)
    if img is None:
        raise ValueError(f"Could not load image: {filepath}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img

