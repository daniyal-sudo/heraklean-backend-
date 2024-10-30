import mongoose from 'mongoose';

const weightEntrySchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    weight: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const WeightEntry = mongoose.model('WeightEntry', weightEntrySchema);
export default WeightEntry;
