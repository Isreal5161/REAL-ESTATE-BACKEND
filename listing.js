const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    propertyType: { type: String, required: true },
    listingType: { type: String, required: true },
    bedrooms: { type: Number, required: true },
    beds: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    rooms: { type: Number, required: true },
    guests: { type: Number, required: false },
    size: { type: Number, required: true },
    unitMeasure: { type: String, required: true },
    price: { type: Number, required: true },
    address: { type: String, required: true },
    images: [{ type: String }], // Cloudinary URLs
    affiliateLink: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);
