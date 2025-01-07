import mongoose from 'mongoose';


// Define the Exercise schema
const exerciseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  exerciseName: {
    type: String,
 
  },
  numberOfSets: {
    type: Number,
    
  },
  numberOfRepetitions: {
    type: Number,
   
  },
  workingLoad: {
    type: Number,
    
  },
  coachNotes: {
    type: String,
   
  },
  dayName:{
    type: Number,
  }
});

// Define the Plan schema
const programPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  modules: {
    type: [String], // Array of strings for module names
    required: false
  },
  duration: {
    type: String, // E.g., "6 weeks"
    required: false
  },
  exercises: {
    type: [exerciseSchema], // Array of exercises
    required: true
  }
});

// Create the model
const ProgramPlan = mongoose.model('ProgramPlan', programPlanSchema);

export default ProgramPlan;

