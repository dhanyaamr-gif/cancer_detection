"""
dataset_loader.py
=================

Data loading module for the NovaDx Brain Tumor Detection training workspace.

This module is responsible for reading the MRI image dataset from disk and
turning it into a format suitable for training, validation, and testing a CNN.

It provides reusable functions to:
    - Discover the class folders present in the dataset directory.
    - Load the train / valid / test datasets using TensorFlow's
      image_dataset_from_directory (preferred for large datasets) or a
      fallback manual approach using PIL.
    - Apply preprocessing/augmentation to images.

The class distribution is expected to follow this layout under `dataset/`:
    dataset/train/Glioma/...
    dataset/train/Meningioma/...
    dataset/train/Pituitary/...
    dataset/train/NoTumor/...
    dataset/valid/...
    dataset/test/...

NOTE: The CNN model is NOT written yet. This module only provides the data
loading scaffolding, which keeps data preparation decoupled from model design.
"""

import os
from pathlib import Path

# TensorFlow is imported lazily inside functions so that this module can be
# imported even in environments where TensorFlow is not yet installed.
import numpy as np
from PIL import Image

from config import DATA_DIR, IMG_SIZE, CLASS_NAMES, BATCH_SIZE, IMG_CHANNELS


def get_class_folders(data_dir):
    """
    Discover the class subdirectories present inside a dataset directory.

    Args:
        data_dir (str or Path): Path to a dataset directory (e.g. train/).

    Returns:
        list[str]: Sorted list of class folder names found in `data_dir`.
    """
    data_dir = Path(data_dir)
    # Only keep directories (ignore files and hidden entries).
    folders = [
        p.name for p in data_dir.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    ]
    return sorted(folders)


def load_dataset_tensorflow(split, image_size=IMG_SIZE, batch_size=BATCH_SIZE):
    """
    Load a dataset split using TensorFlow's image_dataset_from_directory.

    This is the preferred method for large datasets because it streams images
    from disk lazily and handles batching, shuffling, and preprocessing
    automatically without loading everything into memory.

    Args:
        split (str): One of "train", "valid", or "test".
        image_size (int): Target image size (square).
        batch_size (int): Number of images per batch.

    Returns:
        tf.data.Dataset: A batched TensorFlow dataset object.
    """
    # Import TensorFlow here to avoid requiring it at module import time.
    import tensorflow as tf

    split_dir = DATA_DIR / split
    if not split_dir.exists():
        raise FileNotFoundError(
            f"Dataset split directory not found: {split_dir}"
        )

    # Shuffle only the training split; keep valid/test in deterministic order.
    shuffle = (split == "train")

    dataset = tf.keras.utils.image_dataset_from_directory(
        split_dir,
        labels="inferred",
        label_mode="int",
        class_names=CLASS_NAMES,
        color_mode="rgb",
        batch_size=batch_size,
        image_size=(image_size, image_size),
        shuffle=shuffle,
        seed=42,
        interpolation="bilinear",
    )

    # Normalize pixel values from [0, 255] to [0, 1].
    normalization_layer = tf.keras.layers.Rescaling(1.0 / 255.0)
    dataset = dataset.map(
        lambda x, y: (normalization_layer(x), y),
        num_parallel_calls=tf.data.AUTOTUNE,
    )

    # Prefetch improves performance by overlapping data loading with training.
    dataset = dataset.prefetch(tf.data.AUTOTUNE)

    return dataset


def load_single_image(image_path, image_size=IMG_SIZE):
    """
    Load a single image file and convert it to a preprocessed numpy array.

    Used primarily for single-image inference in predict.py.

    Args:
        image_path (str or Path): Path to the image file.
        image_size (int): Target size (square) after resizing.

    Returns:
        np.ndarray: Preprocessed image of shape (image_size, image_size, 3)
                    with pixel values normalized to [0, 1].
    """
    image = Image.open(image_path).convert("RGB")
    image = image.resize((image_size, image_size))
    array = np.asarray(image, dtype=np.float32)
    # Normalize to [0, 1].
    array = array / 255.0
    return array


def count_samples(split):
    """
    Count the number of images in each class for a given split.

    Useful for reporting class distribution and detecting class imbalance.

    Args:
        split (str): One of "train", "valid", or "test".

    Returns:
        dict[str, int]: Mapping of class name to number of images.
    """
    split_dir = Path(DATA_DIR) / split
    counts = {}
    if split_dir.exists():
        for class_name in get_class_folders(split_dir):
            class_dir = split_dir / class_name
            counts[class_name] = len(os.listdir(class_dir))
    return counts


if __name__ == "__main__":
    # Quick sanity check when run directly.
    print("Dataset class distribution:")
    for split in ["train", "valid", "test"]:
        print(f"  {split}: {count_samples(split)}")
