"""
train.py
========

Main training entry point for the NovaDx Brain Tumor Detection model.

This script is the orchestrator of the entire training pipeline. It is
intentionally a SCAFFOLD at this stage: it wires together configuration,
data loading, preprocessing, and utilities, but the actual CNN model and
training loop are marked as TODOs to be implemented in a later step.

The intended flow of this script (once the model is added) will be:
    1. Ensure required directories exist.
    2. Set a random seed for reproducibility.
    3. Load and preprocess the train / valid datasets.
    4. Build the CNN model (TODO).
    5. Compile the model with an optimizer, loss, and metrics.
    6. Train the model using model.fit() with callbacks.
    7. Save the trained model weights to the models/ directory.
    8. Evaluate on the test set and save metrics/plots to outputs/.

NOTE: The CNN model is NOT written yet, and nothing is trained at this stage.
Run this script to verify the pipeline scaffolding is wired correctly.
"""

import argparse

# Local modules.
import config
from dataset_loader import load_dataset_tensorflow, count_samples
from utils import set_seed


def main():
    """
    Run the training pipeline.

    This is the entry point invoked when the script is executed directly or
    through `python train.py`. It currently validates the pipeline setup and
    prints the dataset configuration. The actual model training logic will be
    added in a future step.
    """
    # Parse command-line arguments (optional overrides).
    parser = argparse.ArgumentParser(
        description="Train the NovaDx brain tumor detection CNN."
    )
    parser.add_argument(
        "--epochs", type=int, default=config.EPOCHS,
        help="Number of training epochs (default: from config)."
    )
    parser.add_argument(
        "--batch_size", type=int, default=config.BATCH_SIZE,
        help="Training batch size (default: from config)."
    )
    args = parser.parse_args()

    # 1. Ensure all required directories exist.
    config.ensure_directories()
    print("Directories ensured.")

    # 2. Set seed for reproducibility.
    set_seed(42)
    print("Random seed set.")

    # 3. Report the dataset configuration.
    print("\n===== NovaDx Training Workspace =====")
    print(f"Classes    : {config.CLASS_NAMES}")
    print(f"Image size : {config.IMG_SIZE}x{config.IMG_SIZE}x{config.IMG_CHANNELS}")
    print(f"Epochs     : {args.epochs}")
    print(f"Batch size : {args.batch_size}")

    # 4. Show dataset class distribution (if data is present).
    print("\nDataset distribution:")
    for split in ["train", "valid", "test"]:
        counts = count_samples(split)
        print(f"  {split}: {counts}")

    # -------------------------------------------------------------------
    # TODO (future step): Implement the CNN model and training loop.
    # The following pseudocode outlines what will go here:
    #
    #   train_ds = load_dataset_tensorflow("train", batch_size=args.batch_size)
    #   valid_ds = load_dataset_tensorflow("valid", batch_size=args.batch_size)
    #
    #   model = build_model(num_classes=config.NUM_CLASSES)   # TODO
    #   model.compile(optimizer="adam", loss="sparse_categorical_crossentropy",
    #                 metrics=["accuracy"])
    #
    #   history = model.fit(train_ds, validation_data=valid_ds,
    #                       epochs=args.epochs, callbacks=callbacks)
    #
    #   model.save(config.MODEL_SAVE_PATH)
    # -------------------------------------------------------------------

    print("\nTraining scaffold is ready. The CNN model will be implemented "
          "in a future step.")


if __name__ == "__main__":
    main()
