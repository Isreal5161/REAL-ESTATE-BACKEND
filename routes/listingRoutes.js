// routes/listingRoutes.js
const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup multer for image uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ CREATE a new listing (with images)
router.post("/", upload.array("images", 10), async (req, res) => {
  try {
    const imageFiles = req.files;
    let imageUrls = [];

    // Upload each image to Cloudinary
    for (const file of imageFiles) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "real_estate_listings" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
      imageUrls.push(uploadResult.secure_url);
    }

    // Save the listing in MongoDB
    const newListing = new Listing({
      ...req.body,
      images: imageUrls,
    });

    const savedListing = await newListing.save();
    res.status(201).json(savedListing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET all listings
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
