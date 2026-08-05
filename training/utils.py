"""
utils.py
========

Utility helpers for the NovaDx Brain Tumor Detection training workspace.

This module contains small, reusable helper functions that do not belong to a
single pipeline stage. They support reproducibility, visualization, and
evaluation of the training process.

Included utilities:
    - set_seed(): Fix random seeds for reproducibility across runs.
    - plot_training_history(): Visualize loss/accuracy curves.
    - plot_confusion_matrix(): Evaluate classification results.
    - make_tar_gz(): (Optional placeholder) archive artifacts for sharing.

NOTE: The CNN model is NOT written yet. These helpers are ready to be used
once training and evaluation are implemented.
"""

import os
import random
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, classification_report


def set_seed(seed=42):
    """
    Set random seeds for reproducibility.

    Deep learning frameworks use randomness for weight initialization, data
    shuffling, and augmentation. Fixing the seed ensures that repeated runs
    of the same experiment produce identical results.

    Args:
        seed (int): The seed value to use.

    Returns:
        None
    """
    random.seed(seed)
    np.random.seed(seed)

    try:
        import tensorflow as tf
        tf.random.set_seed(seed)
    except ImportError:
        # TensorFlow is optional; seed is still set for numpy/random.
        pass

    # Set Python hash seed for additional determinism (if not already set).
    os.environ["PYTHONHASHSEED"] = str(seed)


def plot_training_history(history, save_path=None):
    """
    Plot the training and validation loss/accuracy curves.

    Args:
        history: A Keras History object (returned by model.fit()).
        save_path (str or None): If provided, saves the plot to this path.

    Returns:
        matplotlib.figure.Figure: The generated figure (also shown).
    """
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Loss curve.
    axes[0].plot(history.history["loss"], label="Training Loss")
    axes[0].plot(history.history["val_loss"], label="Validation Loss")
    axes[0].set_title("Loss Curves")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].legend()
    axes[0].grid(True)

    # Accuracy curve (guard against 'accuracy' key variants).
    acc_key = "accuracy" if "accuracy" in history.history else "acc"
    val_acc_key = "val_accuracy" if "val_accuracy" in history.history else "val_acc"
    axes[1].plot(history.history[acc_key], label="Training Accuracy")
    axes[1].plot(history.history[val_acc_key], label="Validation Accuracy")
    axes[1].set_title("Accuracy Curves")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].legend()
    axes[1].grid(True)

    plt.tight_layout()

    if save_path:
        # Ensure the output directory exists before saving.
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
        print(f"Training history plot saved to: {save_path}")

    return fig


def evaluate_model(y_true, y_pred, class_names, save_path=None):
    """
    Compute and print evaluation metrics for a classification model.

    Args:
        y_true (array-like): Ground-truth integer labels.
        y_pred (array-like): Predicted integer labels.
        class_names (list): List of class names (for readable output).
        save_path (str or None): Optional path to save the confusion matrix plot.

    Returns:
        dict: Contains confusion matrix, and classification report text.
    """
    cm = confusion_matrix(y_true, y_pred)
    report = classification_report(y_true, y_pred, target_names=class_names)

    print("Classification Report:")
    print(report)

    # Plot the confusion matrix.
    fig, ax = plt.subplots(figsize=(8, 8))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(len(class_names)),
        yticks=np.arange(len(class_names)),
        xticklabels=class_names,
        yticklabels=class_names,
        xlabel="Predicted Label",
        ylabel="True Label",
        title="Confusion Matrix",
    )
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    # Annotate each cell with its count.
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], "d"),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")

    plt.tight_layout()

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, dpi=150)
        print(f"Confusion matrix saved to: {save_path}")

    return {"confusion_matrix": cm, "report": report}
