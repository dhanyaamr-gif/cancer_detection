"""
Grad-CAM heatmap generator for NovaDx AI Service.

This is a PLACEHOLDER implementation that generates simulated
heatmap overlays. Replace with actual Grad-CAM implementation
when using your trained CNN model.
"""

import os
import uuid
import numpy as np
import cv2


class GradCAMGenerator:
    """
    Grad-CAM heatmap generator.

    PLACEHOLDER: Generates a simulated heatmap overlay.
    Replace with actual Grad-CAM when using your trained model.

    For real implementation with TensorFlow:
        @tf.function
        def grad_cam(model, image, class_index):
            with tf.GradientTape() as tape:
                last_conv_layer = model.get_layer('last_conv_layer')
                ...

    For real implementation with PyTorch:
        def grad_cam(model, image, class_index):
            model.eval()
            features = []
            def hook_fn(module, input, output):
                features.append(output)
            ...
    """

    def __init__(self):
        print("[GradCAM] Initialized (Placeholder)")

    def generate(self, image: np.ndarray, prediction: dict) -> np.ndarray:
        """
        Generate a Grad-CAM heatmap overlay.

        PLACEHOLDER: Creates a simulated heatmap based on
        the predicted tumor location.

        Args:
            image: Original RGB image (H, W, 3)
            prediction: Prediction result dict with tumor info

        Returns:
            Heatmap overlay image (H, W, 3) as uint8
        """
        h, w = image.shape[:2]

        # Create base heatmap (black)
        heatmap = np.zeros((h, w), dtype=np.float32)

        # If cancer detected and tumor location available, create hotspot
        if prediction.get("cancerDetected") and prediction.get("tumor"):
            tumor = prediction["tumor"]
            tx, ty = tumor.get("x", w // 2), tumor.get("y", h // 2)
            tw, th = tumor.get("width", 100), tumor.get("height", 80)

            # Scale tumor coordinates to image dimensions
            tx = int(tx * w / 512)
            ty = int(ty * h / 512)
            tw = int(tw * w / 512)
            th = int(th * h / 512)

            # Create Gaussian hotspot at tumor location
            center_x, center_y = tx + tw // 2, ty + th // 2
            sigma = max(tw, th) // 2

            # Generate 2D Gaussian
            y_grid, x_grid = np.ogrid[:h, :w]
            gaussian = np.exp(
                -((x_grid - center_x) ** 2 + (y_grid - center_y) ** 2)
                / (2 * sigma ** 2)
            )
            heatmap = gaussian
        else:
            # For healthy/benign scans, create diffuse low-intensity heatmap
            heatmap = np.random.randn(h, w) * 0.1 + 0.05
            heatmap = np.clip(heatmap, 0, 0.3)

        # Normalize heatmap to 0-1
        heatmap = cv2.normalize(heatmap, None, 0, 1, cv2.NORM_MINMAX)

        # Apply colormap (JET)
        heatmap_colored = cv2.applyColorMap(
            np.uint8(255 * heatmap), cv2.COLORMAP_JET
        )
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Overlay on original image
        overlay = cv2.addWeighted(
            image.astype(np.uint8), 0.6,
            heatmap_colored.astype(np.uint8), 0.4,
            0
        )

        return overlay

    def save_heatmap(self, heatmap: np.ndarray, output_dir: str) -> str:
        """
        Save heatmap image to disk.

        Args:
            heatmap: Heatmap numpy array
            output_dir: Directory to save the heatmap

        Returns:
            Relative path to the saved heatmap file
        """
        os.makedirs(output_dir, exist_ok=True)
        filename = f"heatmap_{uuid.uuid4().hex}.png"
        filepath = os.path.join(output_dir, filename)

        # Convert RGB to BGR for OpenCV
        save_img = cv2.cvtColor(heatmap, cv2.COLOR_RGB2BGR)
        cv2.imwrite(filepath, save_img)

        return os.path.relpath(filepath)


# Singleton instance
_generator = None


def get_generator():
    """Get or create the Grad-CAM generator instance."""
    global _generator
    if _generator is None:
        _generator = GradCAMGenerator()
    return _generator


def generate_heatmap(image: np.ndarray, prediction: dict, output_dir: str) -> str:
    """
    Generate and save a Grad-CAM heatmap.

    Args:
        image: Original RGB image
        prediction: Prediction result dict
        output_dir: Directory to save heatmap

    Returns:
        Relative path to saved heatmap
    """
    generator = get_generator()
    heatmap = generator.generate(image, prediction)
    return generator.save_heatmap(heatmap, output_dir)

