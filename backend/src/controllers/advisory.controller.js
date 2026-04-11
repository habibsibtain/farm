import CropAdvisory from "../models/CropAdvisory.js";
import Farm from "../models/Farm.js";
import SoilData from "../models/SoilData.js";


export const generateAdvisory = async (req, res) => {
  try {
    const { farmId } = req.params;
    if (!farmId) {
      return res.status(400).json({ message: "Please select a farm to get advise." });
    }

    const farm = await Farm.findOne({
      _id: farmId,
      userId: req.user._id,
      isActive: true
    })
    if (!farm) {
      return res.status(404).json({ message: "Farm not found." });
    }

    const soilData = await SoilData.findOne({ farmId: farmId });

    const weatherData = await weatherService.getCurrentWeather(farm.location); // To be implemented

    const mlInput = {
      crop: farm.cropsgrown,
      soilType: farm.soiltype,
      irrigationType: farm.irrigationtype,
      landSize: farm.landsize,
      weather: weatherData,
      soil: soilData
    }

    const mlResult = await mlService.getAdvisory(mlInput); // To be implemented

    const advisory = new CropAdvisory({
      farmId: farmId,
      soilDataId: soilData._id,
      recommendedCrop: mlResult.recommendedCrop,
      irrigationAdvice: mlResult.irrigationAdvice,
      fertilizationAdvice: mlResult.fertilizationAdvice,
      pestRiskLevel: mlResult.pestRiskLevel,
      weatherAlert: mlResult.weatherAlert,
      advisoryText: mlResult.advisoryText,
    })
    await advisory.save();
    res.status(201).json({ message: "Advisory generated successfully.", advisory });
  } catch (error) {
    console.error("Error generating advisory:", error);
    res.status(500).json({ message: "Failed to generate advisory." });
  }
}

export const getAdvisoryHistory = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const farm = await Farm.findOne({
      _id: farmerId,
      userId: req.user._id,
      isActive: true
    })
    if (!farm) {
      return res.status(404).json({ message: "Farm not found." });
    }

    const advisories = await CropAdvisory.find({ farmId: farm._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalAdvisories = await CropAdvisory.countDocuments({ farmId: farm._id, userId: req.user._id });
    const totalPages = Math.ceil(totalAdvisories / limit);

    res.status(200).json({
      advisories,
      pagination: {
        totalAdvisories,
        totalPages,
        currentPage: page,
        pageSize: limit
      }
    });
  } catch (error) {
    console.error("Error fetching advisory history:", error);
    res.status(500).json({ message: "Failed to fetch advisory history." });
  }
}