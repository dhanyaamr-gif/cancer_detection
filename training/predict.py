"""
predict.py
==========

Inference / prediction entry point for the NovaDx Brain Tumor Detection model.

This script loads a trained model and runs predictions on new MRI images.
It is intentionally a SCAFFOLD at this stage: none of the loaded-model logic
is wired yet because the CNN model has not been trained.

The intended flow of this script (once a trained model exists) will be:
    1. Load the trained model weights from config.MODEL_SAVE_PATH.
    2. Preprocess the input image with the same transforms used in training.
    3. Run model.predict() to obtain class probabilities.
    4. Map the predicted class index to a human-readable class name.
    5. Print or return the result (class name + confidence).

The output format is designed to be compatible with the NovaDx AI service
API contract used across the project (e.g., prediction, probability,
cancerDetected).
"""

import argparse
import numpy as np

# Local modules.
import config
from preprocess import preprocess_for_inference
from dataset_loader import load_single_image


def load_model():
    """
    Load the trained model from disk.

    This function is a placeholder. Once the CNN model is trained and saved,
    the model will be loaded here using TensorFlow's
    `tf.keras.models.load_model(config.MODEL_SAVE_PATH)`.

    Returns:
        The loaded Keras model object.

    Raises:
        FileNotFoundError: If the saved model file does not exist yet.
    """
    if not config.MODEL_SAVE_PATH.exists():
        raise FileNotFoundError(
            f"No trained model found at: {config.MODEL_SAVE_PATH}. "
            "Train the model first by running train.py."
        )

    # TODO: Uncomment once the model is trained.
    # import tensorflow as tf
    # model = tf.keras.models.load_model(config.MODEL_SAVE_PATH)
    # return model

    # Placeholder: indicate that real model loading is not yet implemented.
    raise NotImplementedError(
        "Model loading is not implemented yet. "
        "Train the CNN model first, then implement load_model()."
    )


def predict_image(image_path):
    """
    Run a prediction on a single MRI image.

    Args:
        image_path (str): Path to the MRI image file.

    Returns:
        dict: A dictionary containing:
            - predicted_class (str): Human-readable class name.
            - class_index (int): Integer label of the predicted class.
            - confidence (float): Probability of the predicted class.

    Raises:
        NotImplementedError: If the model is not yet implemented.
    """
    # Preprocess the image to match training-time transforms.
    # Either preprocess_for_inference or load_single_image can be used.
    image_array = load_single_image(image_path, image_size=config.IMG_SIZE)

    # Add a batch dimension so the array shape is (1, H, W, C) for predict().
    image_batch = np.expand_dims(image_array, axis=0)

    # Load the trained model.
    model = load_model()

    # Run inference to get class probabilities.
    # probabilities = model.predict(image_batch)[0]
    # class_index = int(np.argmax(probabilities))
    # confidence = float(np.max(probabilities))
    # predicted_class = config.CLASS_NAMES[class_index]

    # TODO: Uncomment the above lines once the model is implemented.

    # Placeholder return to keep the function callable during scaffolding.
    raise NotImplementedError(
        "Prediction logic requires a trained model. "
        "Implement load_model() and the prediction steps first."
    )


def main():
    """
    Command-line entry point for running a single prediction.

    Example usage:
        python predict.py --image path/to/image.jpg
    """
    parser = argparse.ArgumentParser(
        description="Run brain tumor classification on a single image."
    )
    parser.add_argument(
        "--image", required=True, help="Path to the MRI image to classify."
    )
    args = parser.parse_args()

    try:
        result = predict_image(args.image)
        print("\n===== Prediction Result =====")
        print(f"Predicted class : {result['predicted_class']}")
        print(f"Class index     : {result['class_index']}")
        print(f"Confidence      : {result['confidence']:.2%}")
    except NotImplementedError as e:
        print(f"[predict] {e}")
    except FileNotFoundError as e:
        print(f"[predict] {e}")


if __name__ == "__main__":
    main()
