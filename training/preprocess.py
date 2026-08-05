"""
preprocess.py
=============

Image preprocessing module for the NovaDx Brain Tumor Detection training workspace.

This module centralizes all image preprocessing and augmentation logic. Keeping
preprocessing separate from the model and the data loader makes the pipeline
modular, testable, and reusable across training and inference.

Responsibilities include:
    - Resizing images to a consistent input size.
    - Converting color spaces (e.g., to RGB).
    - Normalizing pixel values to [0, 1] or standardizing.
    - Applying data augmentation (rotation, zoom, flip) to improve
      generalization and reduce overfitting.
    - Providing a preprocessing pipeline that can be reused at inference time
      so that training and prediction use identical transforms.

NOTE: The CNN model is NOT written yet. This module only sets up the
preprocessing scaffolding. Augmentation is implemented with TensorFlow/Keras
layers which are added programmatically when the model is built.
"""

import cv2
import numpy as np

# Import configuration values.
from config import IMG_SIZE, IMG_CHANNELS, ROTATION_RANGE, ZOOM_RANGE, HORIZONTAL_FLIP


def load_and_resize(image_path, target_size=(IMG_SIZE, IMG_SIZE)):
    """
    Load an image from disk and resize it to the target size.

    Uses OpenCV for fast, reliable image loading. The image is converted to
    RGB so that it is compatible with standard CNN input conventions.

    Args:
        image_path (str or Path): Path to the image file.
        target_size (tuple): Desired (width, height) after resizing.

    Returns:
        np.ndarray: Resized RGB image array.
    """
    # Read image. cv2.IMREAD_COLOR loads as BGR with 3 channels.
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Unable to load image at path: {image_path}")

    # Convert from BGR (OpenCV default) to RGB.
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Resize to the target input size expected by the model.
    image = cv2.resize(image, target_size, interpolation=cv2.INTER_LINEAR)

    return image


def normalize_image(image, dtype=np.float32):
    """
    Normalize pixel values from the [0, 255] range to [0, 1].

    Scaling inputs to [0, 1] helps the optimizer converge faster and is a
    standard preprocessing step for CNN architectures.

    Args:
        image (np.ndarray): Input image array (H, W, C).
        dtype (np.dtype): Target data type for the normalized image.

    Returns:
        np.ndarray: Normalized image array.
    """
    return (image.astype(dtype) / 255.0)


def standardize_image(image, mean=0.5, std=0.5):
    """
    Standardize pixel values so they have zero mean and unit variance approx.

    Some pretrained models expect inputs normalized with ImageNet statistics.
    This placeholder provides a simple alternative standardization using
    configurable mean/std.

    Args:
        image (np.ndarray): Input image array.
        mean (float): Mean to subtract.
        std (float): Standard deviation to divide by.

    Returns:
        np.ndarray: Standardized image array.
    """
    return (image - mean) / std


def build_augmentation_pipeline():
    """
    Build a TensorFlow/Keras data augmentation pipeline.

    Data augmentation generates slightly altered versions of training images
    (rotations, zooms, flips) which helps the model generalize to unseen
    variations and reduces overfitting on small datasets.

    Returns:
        tf.keras.Sequential: A sequential model of augmentation layers.
    """
    # Import TensorFlow lazily to avoid a hard dependency at module import.
    import tensorflow as tf

    augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomRotation(ROTATION_RANGE / 360.0),
        tf.keras.layers.RandomZoom(ZOOM_RANGE),
    ])

    # Horizontal flip is applied conditionally based on config.
    if HORIZONTAL_FLIP:
        augmentation.add(tf.keras.layers.RandomFlip("horizontal"))

    return augmentation


def preprocess_for_inference(image_path):
    """
    Full preprocessing pipeline for a single image at inference time.

    This function produces an input tensor ready to pass to the model's
    predict() method. It is important that inference preprocessing matches the
    transforms used during training (resize + normalize) for consistent results.

    Args:
        image_path (str or Path): Path to the MRI image.

    Returns:
        np.ndarray: Preprocessed image with shape (IMG_SIZE, IMG_SIZE, 3).
    """
    image = load_and_resize(image_path)
    image = normalize_image(image)
    return image


if __name__ == "__main__":
    # Quick sanity check when run directly (no image provided -> guidance only).
    print("Preprocessing module loaded.")
    print(f"Configured target size: {IMG_SIZE} x {IMG_SIZE} x {IMG_CHANNELS}")
    print("Use preprocess_for_inference(image_path) to preprocess a single image.")
