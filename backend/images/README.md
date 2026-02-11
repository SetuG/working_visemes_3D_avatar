# Avatar Image Setup

This folder is where you should place your avatar source image for the SadTalker video generation.

## Requirements

1. **Place your image here** named `person_image.jpg`
2. The image should be:
   - A clear, front-facing portrait
   - Good lighting, neutral background preferred
   - JPG, PNG, or WEBP format
   - Recommended size: 512x512 or larger
   - Face should be clearly visible and centered

## Example
```
backend/images/
├── person_image.jpg    <-- Your avatar source image
└── README.md
```

## Tips for Best Results

1. **Face Quality**: Use a high-quality image with good resolution
2. **Expression**: A neutral expression works best as the base
3. **Lighting**: Even lighting without harsh shadows
4. **Background**: Simple background, not too distracting
5. **Orientation**: Face should be looking directly at the camera

## Troubleshooting

If you see "Avatar image not found" in the UI:
1. Make sure the file is named exactly `person_image.jpg`
2. Make sure it's in this folder (`backend/images/`)
3. Restart the backend server after adding the image

The SadTalker model will animate this image to match the generated speech!
