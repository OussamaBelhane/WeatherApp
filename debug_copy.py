import os
import shutil

print("Listing current directory:")
print(os.listdir('.'))

if os.path.exists('images'):
    print("\nListing images directory:")
    print(os.listdir('images'))
    
    src = 'images/pexels-photo-2448749.jpeg'
    dst = 'assets/focus-bg.jpeg'
    
    if os.path.exists(src):
        print(f"\nFound source file: {src}")
        try:
            shutil.copy(src, dst)
            print(f"Successfully copied to {dst}")
        except Exception as e:
            print(f"Error copying: {e}")
    else:
        print(f"\nSource file not found: {src}")
        # Try to find it loosely
        for f in os.listdir('images'):
            if 'pexels' in f:
                print(f"Found similar file: {f}")
                src = os.path.join('images', f)
                try:
                    shutil.copy(src, dst)
                    print(f"Successfully copied {src} to {dst}")
                except Exception as e:
                    print(f"Error copying: {e}")
else:
    print("\nimages directory not found")
