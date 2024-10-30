import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  title: String,
  description: String,
  protein: Number,
  calories: Number,
  carb: Number,
  fat: Number
});

const dailyMealsSchema = new mongoose.Schema({
  meal1: mealSchema,
  meal2: mealSchema,
  meal3: mealSchema,
});

const dietPlanSchema = new mongoose.Schema({
  dietTitle: {
    type: String,
    required: true
  },
  monday: dailyMealsSchema,
  tuesday: dailyMealsSchema,
  wednesday: dailyMealsSchema,
  thursday: dailyMealsSchema,
  friday: dailyMealsSchema,
  saturday: dailyMealsSchema,
  sunday: dailyMealsSchema
});

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

export default DietPlan;
