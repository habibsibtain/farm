import SoilData from "../models/SoilData.js";
import Farm from "../models/Farm.js";

// ----------------------------------------------------------------------
// Add soil data for a farm
// POST /soil/:farmId
// ----------------------------------------------------------------------
export const addSoilData = async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!farmId) {
      return res.status(400).json({ message: "Farm ID is required." });
    }

    // Verify the farm belongs to the user
    const farm = await Farm.findOne({
      _id: farmId,
      userId: req.user._id,
      isActive: true,
    });
    if (!farm) {
      return res.status(404).json({ message: "Farm not found or you don't have access." });
    }

    const { ph, nitrogen, phosphorus, potassium, moisture, temperature, source } = req.body;

    if (ph == null || nitrogen == null || phosphorus == null || potassium == null || moisture == null || !source) {
      return res.status(400).json({
        message: "Please provide all soil data: pH, nitrogen, phosphorus, potassium, moisture, and source.",
      });
    }

    const soilData = new SoilData({
      farmId,
      ph,
      nitrogen,
      phosphorus,
      potassium,
      moisture,
      temperature,
      source,
    });

    await soilData.save();

    res.status(201).json({ message: "Soil data added successfully.", soilData });
  } catch (error) {
    console.error("Error adding soil data:", error);
    res.status(500).json({ message: "Failed to save soil data." });
  }
};

// ----------------------------------------------------------------------
// Get all soil data for a farm
// GET /soil/:farmId
// ----------------------------------------------------------------------
export const getSoilDataByFarm = async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!farmId) {
      return res.status(400).json({ message: "Farm ID is required." });
    }

    // Verify the farm belongs to the user
    const farm = await Farm.findOne({
      _id: farmId,
      userId: req.user._id,
      isActive: true,
    });
    if (!farm) {
      return res.status(404).json({ message: "Farm not found or you don't have access." });
    }

    const soilData = await SoilData.find({ farmId }).sort({ collectedAt: -1 });

    res.status(200).json({ soilData });
  } catch (error) {
    console.error("Error fetching soil data:", error);
    res.status(500).json({ message: "Failed to fetch soil data." });
  }
};
