// routes/listingRoutes.js
const express = require("express");
const router = express.Router();
const Listing = require("./listing");
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

    // Debug: Log incoming body and files
    console.log('Incoming listing body:', req.body);
    console.log('Incoming image files:', imageFiles);

    // Upload each image to Cloudinary
    for (const file of imageFiles) {
      try {
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
      } catch (imgErr) {
        console.error('Cloudinary upload error:', imgErr);
        return res.status(500).json({ message: 'Image upload failed', error: imgErr.message });
      }
    }

    // Save the listing in MongoDB
    try {
      const newListing = new Listing({
        ...req.body,
        images: imageUrls,
      });
      const savedListing = await newListing.save();
      res.status(201).json(savedListing);
    } catch (dbErr) {
      console.error('MongoDB save error:', dbErr);
      return res.status(400).json({ message: 'Listing validation or save failed', error: dbErr.message });
    }
  } catch (error) {
    console.error('General error:', error);
    res.status(500).json({ message: 'Unexpected error', error: error.message });
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

// ✅ DELETE a listing by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete the listing
    const deletedListing = await Listing.findByIdAndDelete(id);
    
    if (!deletedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    
    res.json({ 
      message: "Listing deleted successfully", 
      deletedListing: deletedListing 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: "Failed to delete listing", error: error.message });
  }
});

module.exports = router;
