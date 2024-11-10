// models/Subscription.js
import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  planDuration: { type: Number, required: true },
  planAmount: { type: Number, required: true },
  planBenefits: { type: [String], required: true },
  startDate: { type: Date, default: Date.now },
  // isActive: { type: Boolean, default: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer" } // Reference to the Trainer
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

export default Subscription; 


// Subscription.cjs (using CommonJS syntax)
 // Using require for CommonJS


