import mongoose from 'mongoose';

const MacroSchema = new mongoose.Schema({
  name: [String],
  grams: String,
});

const MealSchema = new mongoose.Schema({
  title: String,
  protein: [MacroSchema],
  fats: [MacroSchema],
  carbs: [MacroSchema],
});

const DietPlanSchema = new mongoose.Schema({
  dietTitle: { type: String, required: true },
  meals: [MealSchema],
});
  



const MealPlan = mongoose.model('MealPlan', DietPlanSchema);

export default MealPlan; 
