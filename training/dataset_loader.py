import tensorflow as tf

# Path to training dataset
TRAIN_DIR = "training/dataset/Training"

# Path to testing dataset
TEST_DIR = "training/dataset/Testing"

# Image size
IMAGE_SIZE = (224, 224)

# Number of images processed together
BATCH_SIZE = 32


def load_datasets():
    """
    Load training and testing datasets and return them.
    """

    train_dataset = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=True
    )

    test_dataset = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False
    )

    print("Training Dataset Loaded Successfully!")
    print("Testing Dataset Loaded Successfully!")

    print("\nClass Names:")
    print(train_dataset.class_names)

    return train_dataset, test_dataset, train_dataset.class_names


if __name__ == "__main__":
    load_datasets()