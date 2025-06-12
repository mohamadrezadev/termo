import struct
from io import BytesIO
from typing import Tuple
from PIL import Image


def extract_images_from_bmt(path: str) -> Tuple[Image.Image, Image.Image, int, int]:
    """Extract thermal and real images from a BMT file.

    The BMT format in this project contains two concatenated BMP files. The first
    BMP is a grayscale thermal image, the second is the corresponding RGB photo.
    Returns the pseudocolored thermal image, the real image and their dimensions.
    """
    with open(path, 'rb') as f:
        data = f.read()

    offsets = []
    for i in range(len(data) - 1):
        if data[i] == 0x42 and data[i + 1] == 0x4D:  # 'BM'
            offsets.append(i)

    if not offsets:
        raise ValueError('No BMP headers found')

    images = []
    for off in offsets:
        if off + 6 > len(data):
            continue
        file_size = struct.unpack_from('<I', data, off + 2)[0]
        if file_size <= 0 or off + file_size > len(data):
            continue
        slice_data = data[off:off + file_size]
        try:
            img = Image.open(BytesIO(slice_data))
            images.append(img)
        except Exception:
            continue

    if len(images) < 2:
        raise ValueError('Expected 2 BMP images in BMT file')

    width, height = images[0].size
    thermal_img = generate_thermal_from_bmp(images[0])
    real_img = images[1]
    return thermal_img, real_img, width, height


def generate_thermal_from_bmp(img: Image.Image) -> Image.Image:
    """Convert a grayscale BMP image to a pseudocolor thermal image."""
    gray = img.convert('L')
    width, height = gray.size
    out = Image.new('RGB', (width, height))
    gray_pixels = gray.load()
    out_pixels = out.load()

    for y in range(height):
        for x in range(width):
            v = gray_pixels[x, y] / 255.0
            if v < 0.2:
                r, g, b = 0, 0, int(v * 5 * 255)
            elif v < 0.4:
                r, g, b = int((v - 0.2) * 5 * 255), 0, 255
            elif v < 0.6:
                r, g, b = 255, 0, int(255 - (v - 0.4) * 5 * 255)
            elif v < 0.8:
                r, g, b = 255, int((v - 0.6) * 5 * 255), 0
            else:
                r, g, b = 255, 255, int((v - 0.8) * 5 * 255)
            out_pixels[x, y] = (r, g, b)

    return out


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Extract thermal and real images from BMT file')
    parser.add_argument('file', help='Path to BMT file')
    parser.add_argument('--thermal', default='thermal.png', help='Output path for thermal image')
    parser.add_argument('--real', default='real.png', help='Output path for real image')
    args = parser.parse_args()

    thermal, real, w, h = extract_images_from_bmt(args.file)
    thermal.save(args.thermal)
    real.save(args.real)
    print(f'Saved images ({w}x{h}) to {args.thermal} and {args.real}')
