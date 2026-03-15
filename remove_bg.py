from PIL import Image

def remove_black_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    # Tolerance for black (0-255)
    tolerance = 15
    for item in datas:
        # Change all black (also shades of black) pixels to transparent
        if item[0] < tolerance and item[1] < tolerance and item[2] < tolerance:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_black_background("c:/dev/antigravity/public/logo-footer.png", "c:/dev/antigravity/public/logo-footer-transparent.png")
