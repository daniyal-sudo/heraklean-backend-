import mongoose from 'mongoose';

const dayPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  modules: {
    type: [String], // Array of strings for module names
    required: true
  },
  duration: {
    type: String, // E.g., "6 weeks"
    required: true
  },
  
});

const programPlanSchema = new mongoose.Schema({
  programTitle: {
    type: String,
    required: true
  },
  monday: dayPlanSchema,
  tuesday: dayPlanSchema,
  wednesday: dayPlanSchema,
  thursday: dayPlanSchema,
  friday: dayPlanSchema,
  saturday: dayPlanSchema,
  sunday: dayPlanSchema
});

const ProgramPlan = mongoose.model('ProgramPlan', programPlanSchema);

export default ProgramPlan;
