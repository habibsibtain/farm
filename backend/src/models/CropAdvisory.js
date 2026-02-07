import mongoose from 'mongoose';

const cropAdvisorySchema = new mongoose.Schema({
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  soilDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SoilData',
    required: true
  },
  recommendedCrop: {
    type: String,
    required: true,
    trim: true
  },
  irrigationAdvice: {
    type: String,
    trim: true
  },
  fertilizationAdvice: {
    type: String,
    trim: true
  },
  pestRiskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  weatherAlert: {
    type: String,
    trim: true
  },
  advisoryText: {
    type: String,
    required: true,
  }
},{
  timestamps: true
})

const CropAdvisory = mongoose.model('CropAdvisory', cropAdvisorySchema);
export default CropAdvisory 