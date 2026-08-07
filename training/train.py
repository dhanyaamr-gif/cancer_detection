"""
Main training script for NovaDx Brain Tumor Detection.
"""

from dataset_loader import load_datasets
from model import build_model


# -----------------------------
# Load Dataset
# -----------------------------
train_dataset, test_dataset, class_names = load_datasets()


# -----------------------------
# Build CNN Model
# -----------------------------
model = build_model()


# -----------------------------
# Compile Model
# -----------------------------
model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

print("\nModel Compiled Successfully!\n")


# -----------------------------
# Display Model Summary
# -----------------------------
model.summary()
# -----------------------------
# Train the CNN
# -----------------------------
history = model.fit(
    train_dataset,
    validation_data=test_dataset,
    epochs=10
)
# Save the trained model
model.save("training/models/brain_tumor_model.keras")

print("\n✅ Model saved successfully!")