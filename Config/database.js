import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://danyailjaffri7:E0XTUEUfV0JQKp0q@cluster0.g9u1u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);  
        process.exit(1);
    }
};
