import mongoose from 'mongoose';

const workoutSetSchema = new mongoose.Schema({
    exercise: {
        type: String,
        required: true
    },
    weight: {
        type: Number
    },
    reps: {
        type: Number
    },
    sets: {
        type: Number
    },
    done: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    day: {
        type: String
    }
});


export default workoutSetSchema
