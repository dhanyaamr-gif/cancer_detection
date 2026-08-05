"""
config.py
=========

Central configuration module for the NovaDx Brain Tumor Detection training workspace.

This file holds ALL configuration values used across the training pipeline.
By keeping configuration in one place, we avoid hardcoding values scattered
throughout the codebase and make it easy to tune hyperparameters, change
dataset paths, or switch models.

In a professional ML project, a single config module (or config file) is
considered a best practice because it:
    - Improves reproducibility of experiments.
    - Centralizes paths and hyperparameters for easy tuning.
    - Allows the same training code to be reused across different datasets.

NOTE: The CNN model is intentionally NOT written yet. This module only sets up
the configuration scaffolding so that model development can be plugged in later.
Utilize the placeholder values below as a starting point and modify them as you
develop your model.
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Base path definitions
# ---------------------------------------------------------------------------
# BASE_DIR points to this "training" directory. All other paths are derived
# from it so that the project remains portable (can be moved to any location).
BASE_DIR = Path(__file__).resolve().parent

# Directory where the raw MRI image dataset is stored.
# Expected structure inside DATA_DIR:
#   train/<class_name>/...
#   valid/<class_name>/...
#   test/<class_name>/...
DATA_DIR = BASE_DIR / "dataset"

# Directory where trained model weights, checkpoints, and saved artifacts
# will be stored after training.
MODEL_DIR = BASE_DIR / "models"

# Directory where output artifacts such as training plots, confusion matrices,
# and evaluation reports will be saved.
OUTPUT_DIR = BASE_DIR / "outputs"

# Directory where exploratory Jupyter notebooks are kept.
NOTEBOOK_DIR = BASE_DIR / "notebooks"

# ---------------------------------------------------------------------------
# Dataset / class configuration
# ---------------------------------------------------------------------------
# The four classes that the brain tumor detection model will classify.
# Order matters: the integer index of each class in this list will be used as
# the label during training (0, 1, 2, 3).
CLASS_NAMES = ["Glioma", "Meningioma", "Pituitary", "NoTumor"]

# Number of classes. This is derived from CLASS_NAMES so it stays in sync.
NUM_CLASSES = len(CLASS_NAMES)

# ---------------------------------------------------------------------------
# Image configuration
# ---------------------------------------------------------------------------
# Most CNN architectures expect a fixed square input size. 224x224 is a common
# default (used by many transfer-learning backbones such as ResNet50,
# VGG16, and EfficientNet). Adjust based on your chosen architecture.
IMG_SIZE = 224

# Number of image channels. MRI scans are typically converted to 3-channel
# RGB so they can be fed into standard pretrained models.
IMG_CHANNELS = 3

# Data type used for image arrays. We primarily use float32 for training.
IMG_DTYPE = "float32"

# ---------------------------------------------------------------------------
# Training hyperparameters (placeholders - tune later)
# ---------------------------------------------------------------------------
# Batch size controls how many samples are processed before the model weights
# are updated. Larger batches use more memory but can stabilize training.
BATCH_SIZE = 32

# Number of epochs (full passes over the training data).
EPOCHS = 50

# Learning rate for the optimizer.
LEARNING_RATE = 0.001

# Train/validation/test split when a single dataset is used. These ratios are
# placeholders; the task structure already provides separate train/valid/test
# folders, so a manual split may not be required.
TRAIN_SPLIT = 0.8
VALID_SPLIT = 0.1
TEST_SPLIT = 0.1

# ---------------------------------------------------------------------------
# Model / checkpoint configuration
# ---------------------------------------------------------------------------
# Base name for saved model files.
MODEL_NAME = "brain_tumor_cnn"

# File extension for saved models (TensorFlow SavedModel format).
MODEL_EXTENSION = ".h5"

# Endpoint for the fully qualified saved model path.
MODEL_SAVE_PATH = MODEL_DIR / f"{MODEL_NAME}{MODEL_EXTENSION}"

# ---------------------------------------------------------------------------
# Augmentation / preprocessing placeholders
# ---------------------------------------------------------------------------
# Whether to apply data augmentation during training. Data augmentation helps
# reduce overfitting by generating varied versions of the training images.
APPLY_AUGMENTATION = True

# Rotation range (degrees) applied during augmentation.
ROTATION_RANGE = 20

# Zoom range applied during augmentation.
ZOOM_RANGE = 0.15

# Horizontal flip flag for augmentation.
HORIZONTAL_FLIP = True

# ---------------------------------------------------------------------------
# Utility helper functions
# ---------------------------------------------------------------------------
def ensure_directories():
    """
    Create all required directories if they do not already exist.

    This is called at startup (e.g., from train.py) to guarantee that the
    directory structure is present before any operation attempts to write
    files into it.

    Returns:
        None
    """
    directories = [
        DATA_DIR,
        MODEL_DIR,
        OUTPUT_DIR,
        NOTEBOOK_DIR,
    ]
    for d in directories:
        os.makedirs(d, exist_ok=True)


if __name__ == "__main__":
    # Quick sanity check when the module is run directly.
    print("Configuration Summary:")
    print(f"  BASE_DIR   : {BASE_DIR}")
    print(f"  DATA_DIR   : {DATA_DIR}")
    print(f"  MODEL_DIR  : {MODEL_DIR}")
    print(f"  OUTPUT_DIR : {OUTPUT_DIR}")
    print(f"  CLASSES    : {CLASS_NAMES}")
    print(f"  IMG_SIZE   : {IMG_SIZE}")
    print(f"  BATCH_SIZE : {BATCH_SIZE}")
    print(f"  EPOCHS     : {EPOCHS}")
