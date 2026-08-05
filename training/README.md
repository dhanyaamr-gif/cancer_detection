# 🧠 NovaDx — Brain Tumor Detection Training Workspace

This is the **training workspace** for NovaDx's AI-powered brain tumor detection model. It contains everything needed to prepare, load, preprocess, train, and evaluate a Convolutional Neural Network (CNN) that classifies brain MRI scans into four categories.

> **Current Status:** ✅ Project structure prepared. The CNN model is intentionally **not written yet**, and nothing is trained at this stage. This is step one of the ML lifecycle — prepare the workspace.

---

## 🎯 Model Goal

Classify brain MRI images into one of four classes:

| Class | Description |
|-------|-------------|
| `Glioma` | A tumor that arises from glial cells |
| `Meningioma` | A tumor arising from the meninges |
| `Pituitary` | A tumor of the pituitary gland |
| `NoTumor` | Healthy brain scan (no tumor) |

---

## 📁 Folder Structure & Purpose

```text
training/
│
├── dataset/                     # Raw MRI image dataset (organized by class)
│   ├── train/                   # Training images
│   │   ├── Glioma/              #    Glioma training images
│   │   ├── Meningioma/          #    Meningioma training images
│   │   ├── Pituitary/           #    Pituitary training images
│   │   └── NoTumor/             #    Healthy (no tumor) training images
│   │
│   ├── valid/                   # Validation images (used during training)
│   │   ├── Glioma/
│   │   ├── Meningioma/
│   │   ├── Pituitary/
│   │   └── NoTumor/
│   │
│   └── test/                    # Held-out test images (final evaluation only)
│       ├── Glioma/
│       ├── Meningioma/
│       ├── Pituitary/
│       └── NoTumor/
│
├── models/                      # Where trained model weights are saved
├── notebooks/                   # Jupyter notebooks for EDA & experiments
├── outputs/                     # Training plots, metrics, and reports
│
├── config.py                    # Centralized configuration (paths & hyperparameters)
├── dataset_loader.py            # Loads images from disk into datasets
├── preprocess.py                # Image preprocessing & augmentation utilities
├── utils.py                     # Reproducibility, plotting, and evaluation helpers
├── train.py                     # Main training entry point (scaffold)
├── predict.py                   # Single-image inference entry point (scaffold)
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

---

## 📄 File-by-File Explanation

### `config.py`
The **single source of truth** for all configuration values.

- Defines absolute/relative paths (`BASE_DIR`, `DATA_DIR`, `MODEL_DIR`, `OUTPUT_DIR`, `NOTEBOOK_DIR`).
- Defines the class names and number of classes.
- Defines image settings (`IMG_SIZE`, `IMG_CHANNELS`).
- Defines training hyperparameters (`BATCH_SIZE`, `EPOCHS`, `LEARNING_RATE`).
- Configures data augmentation flags.
- Provides `ensure_directories()` which creates all required folders.

### `dataset_loader.py`
Handles **loading MRI images from disk**.

- `get_class_folders()` — discovers class subdirectories.
- `load_dataset_tensorflow()` — builds a batched, shuffled, normalized `tf.data.Dataset` using `tf.keras.utils.image_dataset_from_directory` (ideal for large datasets).
- `load_single_image()` — loads and preprocesses a single image (used by inference).
- `count_samples()` — reports the class distribution for train/valid/test.

### `preprocess.py`
Handles **image preprocessing and augmentation**.

- `load_and_resize()` — loads an image with OpenCV and resizes it to model input size.
- `normalize_image()` — scales pixel values to `[0, 1]`.
- `standardize_image()` — zero-mean/unit-variance standardization.
- `build_augmentation_pipeline()` — builds Keras layers for rotation/zoom/flip augmentation (helps reduce overfitting).
- `preprocess_for_inference()` — end-to-end preprocessing for a single inference image.

### `utils.py`
Contains **small reusable helpers**.

- `set_seed()` — fixes random seeds for reproducibility.
- `plot_training_history()` — plots loss/accuracy curves after training.
- `evaluate_model()` — computes a confusion matrix and classification report, and saves a plot.

### `train.py`
The **training entry point** (`python train.py`).

- Parses command-line overrides (`--epochs`, `--batch_size`).
- Ensures directories exist and sets the random seed.
- Reports the dataset distribution.
- Contains **TODO markers** where the CNN architecture and `model.fit()` training loop will be added in the next step.

### `predict.py`
The **inference entry point** (`python predict.py --image <path>`).

- `load_model()` — placeholder for loading the trained model (raises an informative error until a model exists).
- `predict_image()` — preprocesses an image, runs inference, and maps output to a class label.
- `main()` — CLI wrapper for single-image prediction.

### `requirements.txt`
Pins all **Python dependencies** needed for the workspace:

| Package | Purpose |
|---------|---------|
| `tensorflow` | Core deep-learning framework for building/training the CNN |
| `opencv-python` | Fast image loading, resizing, and processing |
| `Pillow` | Basic image handling and format support |
| `numpy` | Array operations and numeric computation |
| `pandas` | Tabular data handling (metadata, CSVs) |
| `matplotlib` | Plotting curves, confusion matrices, and images |
| `scikit-learn` | Evaluation metrics and preprocessing utilities |
| `tqdm` | Progress bars for long-running tasks |
| `jupyter` / `ipykernel` | Notebook-based exploration in `notebooks/` |
| `tensorboard` | Training visualization |
| `pydicom` | Optional DICOM (medical image) support |
| `pydot` | Optional model architecture visualization |

---

## 🚀 Getting Started

### 1. Create a virtual environment (recommended)

```bash
python -m venv venv
```

Activate it:

- **Windows**: `venv\Scripts\activate`
- **macOS/Linux**: `source venv/bin/activate`

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Place your dataset

Place the MRI images into the `dataset/` folders following the expected layout:

```text
dataset/
├── train/Glioma/      ├── valid/Glioma/      ├── test/Glioma/
├── train/Meningioma/  ├── valid/Meningioma/  ├── test/Meningioma/
├── train/Pituitary/   ├── valid/Pituitary/   ├── test/Pituitary/
└── train/NoTumor/     └── valid/NoTumor/     └── test/NoTumor/
```

### 4. Verify the workspace scaffolding

```bash
python prepare_structure.py   # (or just run the modules directly)
python train.py               # Prints dataset config; no training yet
python predict.py --image path/to/scan.jpg   # Informative "model not ready" message
```

---

## 🔜 Next Steps (Planned)

1. **Download/populate the dataset** — e.g., the public Kaggle "Brain Tumor MRI" dataset.
2. **Implement the CNN model** — in a future step (`train.py` / a `model.py` module).
3. **Train & validate** — with augmentation, callbacks (early stopping, checkpoints), and TensorBoard.
4. **Evaluate** — confusion matrix, per-class metrics, and save reports to `outputs/`.
5. **Export the model** — save to `models/` for integration with the NovaDx AI service.

---

## 📌 Notes

- The CNN architecture is intentionally **not implemented yet**.
- **Nothing is trained** in this step — this is purely project preparation.
- All empty folders contain a `.gitkeep` file so they stay tracked in version control.

