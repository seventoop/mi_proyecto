import sys
import subprocess

def run():
    # Attempt to install rembg
    try:
        import rembg
    except ImportError:
        print("Installing rembg...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rembg", "onnxruntime"])
        import rembg

    from rembg import remove
    from PIL import Image
    import numpy as np

    print("Opening image...")
    img = Image.open("c:/dev/antigravity/public/logo-footer.png").convert("RGBA")
    data = np.array(img)

    h, w = data.shape[:2]
    # Erase the gemini star in the bottom right corner
    print("Erasing watermark...")
    data[h-100:h, w-100:w] = [0, 0, 0, 255]
    
    cleaned_img = Image.fromarray(data)

    print("Removing background using rembg...")
    out = remove(cleaned_img)
    
    print("Saving...")
    out.save("c:/dev/antigravity/public/logo-footer-transparent.png")
    print("Done!")

if __name__ == "__main__":
    run()
