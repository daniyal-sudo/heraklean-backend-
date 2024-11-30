import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    required: true
  },
 
  time: {
    type: String,
    required: true
  },
  date:{
    type: String,
    // default: Date.now
  },
  description:{
    type: String,
    // default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Declined', 'Cancelled'],
    default: 'Pending'
  },
  trainingType: {
    type: String,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  createdby: {
    type: String
  }
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;