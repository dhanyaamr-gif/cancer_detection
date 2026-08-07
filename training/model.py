"""
CNN model for NovaDx Brain Tumor Detection.

This module defines the Convolutional Neural Network (CNN)
used to classify MRI brain scans into four classes:

1. Glioma
2. Meningioma
3. No Tumor
4. Pituitary

The model is intentionally simple so beginners can understand
how CNNs work before moving to transfer learning.
"""

import tensorflow as tf
from tensorflow.keras import layers, models

from config import IMG_SIZE, IMG_CHANNELS, NUM_CLASSES


def build_model():

    model = models.Sequential([

        # Input Layer
        layers.Input(shape=(IMG_SIZE, IMG_SIZE, IMG_CHANNELS)),

        # Convolution Block 1
        layers.Conv2D(32, (3,3), activation="relu"),
        layers.MaxPooling2D((2,2)),

        # Convolution Block 2
        layers.Conv2D(64, (3,3), activation="relu"),
        layers.MaxPooling2D((2,2)),

        # Convolution Block 3
        layers.Conv2D(128, (3,3), activation="relu"),
        layers.MaxPooling2D((2,2)),

        # Convert feature maps into a vector
        layers.Flatten(),

        # Fully Connected Layer
        layers.Dense(128, activation="relu"),

        # Prevent Overfitting
        layers.Dropout(0.5),

        # Output Layer
        layers.Dense(NUM_CLASSES, activation="softmax")

    ])

    return model


if __name__ == "__main__":

    cnn = build_model()

    cnn.summary()