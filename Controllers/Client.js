import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Client from '../Models/Client.js';
import Meeting from '../Models/Meeting.js';
import Trainer from '../Models/Trainer.js';
import workoutSetSchema from '../Models/WorkoutSet.js';
import { sendMail } from './../Helper/sendMail.js';
import mongoose from 'mongoose';


export const register = async (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  try {
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if client already exists
    let client = await Client.findOne({ email });
    if (client) {
      return res.status(400).json({ message: 'Client already exists' });
    }

    // Create new client
    client = new Client({
      fullname,
      email,
      password,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    client.password = await bcrypt.hash(password, salt);

    // Save client
    await client.save();

    // Create and return JWT
    const payload = { clientId: client._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'Client registered successfully',
      success: true,
      token,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  try {
    // Check if the client exists
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT
    const payload = { clientId: client._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(200).json({
      message: 'Login successful',
      success: true,
      token,
      client: {
        id: client._id,
        fullname: client.fullname,
        email: client.email,
        profilePic: client.profilePic,
        startingWeight: client.startingWeight,
        subscription: client.subscription,
        subamount: client.subamount,
        ActivePlan: client.ActivePlan,
        ActiveNutrition: client.ActiveNutrition,
        measurements: client.measurements,
        weightGraph: client.weightGraph,
        membershipExpiresOn: client.membershipExpiresOn,
        trainer: client.trainer,
        commingMeeting: client.commingMeeting,
        weightGraph:client.weightGraph,
        weight:client.weight,
        notification:client.notification,
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

export const logout = async (req, res) => {
    res.clearCookie('token');
    res.status(200).json({
      message: 'Logout successful',
      success: true
    });
  }


export const getActivePlans = async (req, res) => {
  try {
    // Retrieve the authenticated client's ID from the request object
    const clientId = req.client._id;

    // Find the client by ID and populate the ActivePlan field with the related ProgramPlan documents
    const client = await Client.findById(clientId).populate('ActivePlan');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Send back the populated active plans
    res.json({
      success: true,
      workout: client.ActivePlan
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getActivePlansdaywise = async (req, res) => {
  try {
    const clientId = req.client._id;
    const { dayIndex } = req.query; // Assuming dayIndex is passed as a query parameter
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (dayIndex === undefined || dayIndex < 0 || dayIndex >= daysOfWeek.length) {
      return res.status(400).json({ message: 'Invalid day index' });
    }

    const client = await Client.findById(clientId).populate('ActivePlan');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const currentDay = daysOfWeek[dayIndex];
    const activePlan = client.ActivePlan.map(plan => ({
      day: currentDay,
      title: plan[currentDay]?.title || '',
      description: plan[currentDay]?.description || '',
      modules: plan[currentDay]?.modules || [],
      duration: plan[currentDay]?.duration || ''
    }));

    res.status(200).json({
      success: true,
      workout: activePlan
    });
  } catch (error) {
    console.error('Error fetching active plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const getActiveNutrition = async (req, res) => {
  try {
    const clientId = req.client._id;

    // Find the client and populate the ActiveNutrition field
    const client = await Client.findById(clientId).populate({
      path: 'ActiveNutrition',
      populate: { path: 'dietPlan' }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if ActiveNutrition exists and has entries
    if (!client.ActiveNutrition || client.ActiveNutrition.length === 0) {
      return res.status(404).json({ message: 'No active nutrition plans found' });
    }

    // Helper function to transform meal objects into arrays
    const formatMeals = (dayMeals) => {
      if (!dayMeals) return [];
      return [dayMeals.meal1, dayMeals.meal2, dayMeals.meal3].filter(meal => meal);  // Filter out any undefined meals
    };

    // Safely map over ActiveNutrition and format each day's meals
    const formattedNutrition = client.ActiveNutrition.map(plan => ({
      _id: plan._id,
      dietTitle: plan.dietTitle,
      monday: formatMeals(plan.monday),
      tuesday: formatMeals(plan.tuesday),
      wednesday: formatMeals(plan.wednesday),
      thursday: formatMeals(plan.thursday),
      friday: formatMeals(plan.friday),
      saturday: formatMeals(plan.saturday),
      sunday: formatMeals(plan.sunday)
    }));

    res.status(200).json({
      success: true,
      activeNutrition: formattedNutrition
    });

  } catch (error) {
    console.error('Error fetching active nutrition plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




  export const getActiveNutritiondaywise = async (req, res) => {
    try {
      const clientId = req.client._id;
      const { dayIndex } = req.query; // Assuming dayIndex is passed as a query parameter
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
      if (!dayIndex || dayIndex < 0 || dayIndex >= daysOfWeek.length) {
        return res.status(400).json({ message: 'Invalid day index' });
      }
  
      const client = await Client.findById(clientId)
        .populate('ActiveNutrition');
  
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
  
      const currentDay = daysOfWeek[dayIndex];
      const activeNutrition = client.ActiveNutrition.map(plan => ({
        day: currentDay,
        meal1: plan[currentDay]?.meal1 || {},
        meal2: plan[currentDay]?.meal2 || {},
        meal3: plan[currentDay]?.meal3 || {}
      }));
  
      res.status(200).json({
        success: true,
        activeNutrition
      });
    } catch (error) {
      console.error('Error fetching active nutrition:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

  const generateResetToken = () => {
    return crypto.randomBytes(20).toString('hex');
  };
  export const forgetPassword = async (req, res) => {
    const { email } = req.body;
  
    try {
      // Find the client by email
      const client = await Client.findOne({ email });
      if (!client) return res.status(404).json({ message: 'Client not found' });
  
      // Create a reset token
      const resetToken = jwt.sign({ userId: client._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Log reset token for debugging
      console.log('Reset Token:', resetToken);
  
      // Construct reset URL
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      console.log('Reset URL:', resetUrl);
  
      // Email configuration
      const subject = 'Password Reset Request';
      const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}`;
  
      // Send email
      await sendMail(email, subject, text);
  
      // Respond to the client
      res.status(200).json({ message: 'Password reset link sent',
        token:resetToken

       });
    } catch (error) {
      // Log error details for debugging
      console.error('Error processing request:', error);
      res.status(500).json({ message: 'Error processing request', error: error.message });
    }
  };
  
  export const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;
  
      // Verify the JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
  
      // Find the client using the decoded userId
      const client = await Client.findById(decoded.userId);
  
      if (!client) {
        return res.status(400).json({ message: 'Client not found' });
      }
  
      // Check if the token has expired
      if (decoded.exp < Date.now() / 1000) {
        return res.status(400).json({ message: 'Reset token has expired' });
      }
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      client.password = hashedPassword;
      await client.save();
  
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Error in reset password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };


  export const changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const clientId = req.client.id; // Assuming you have middleware that sets req.client
  
      // Find the client by ID
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
  
      // Check if the current password is correct
      const isMatch = await bcrypt.compare(currentPassword, client.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
  
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Update the client's password
      client.password = hashedPassword;
      await client.save();
  
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error in change password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  export const updateClientProfile = async (req, res) => {
    try {
        const clientId = req.client.id; // Assuming you have middleware that sets req.client

        // Find the client by ID
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Update client's profile
  
        if(req.body.fullname) client.fullname = req.body.fullname;
        if (req.body.email) client.email = req.body.email;
        if (req.body.profilePic) client.profilePic = req.body.profilePic;
        if (req.body.number) client.number = req.body.number;

        // Update weight according to date
        if (req.body.weight) {
            const { date, weight } = req.body.weight;
            const weightEntry = client.weight.find(entry => 
                new Date(entry.date).toDateString() === new Date(date).toDateString()
            );

            if (weightEntry) {
                // Update existing weight entry
                weightEntry.weight = weight;
            } else {
                // Add new weight entry
                client.weight.push({ date, weight });
            }
        }

        await client.save();

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error in update client profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createMeeting = async (req, res) => {
  try {
    const { clientId, trainerId, day, time, trainingType, isRecurring, createdby } = req.body;
    const client = await Client.findById(clientId);
    const trainer = await Trainer.findById(trainerId);

    if (!client || !trainer) {
      return res.status(404).json({ success: false, message: 'Client or trainer not found' });
    }

    const meetingexisting = await Meeting.findOne({ client: clientId, trainer: trainerId, day, time });
    if (meetingexisting) {
      return res.status(409).json({ success: false, message: 'Meeting already exists' });
    
    }

    const meeting = new Meeting({
      client: clientId,
      trainer: trainerId,
      day,
      time,
      status: 'Pending',
      trainingType,
      isRecurring,
      createdby:"client",
    });

    // Save the meeting
    const savedMeeting = await meeting.save();

    // Create meeting request object with a new _id
    const meetingRequest = {
      _id: new mongoose.Types.ObjectId(), // Generate a new ObjectId
      client: clientId,
      trainer: trainerId,
      day,
      time,
      trainingType,
      isRecurring,
      status: 'pending',
      createdby:"client",
    };

    // Add meeting request to trainer's meetingRequest array
    await Trainer.findByIdAndUpdate(trainerId, {
      $push: { meetingRequest: meetingRequest }
    });

    // Create notification message
    const notificationMessage = `New meeting request from ${client.fullname} for ${day} at ${time}`;

    // Add notification to trainer
    await Trainer.findByIdAndUpdate(trainerId, {
      $push: { notification: notificationMessage }
    });

    res.status(201).json({ success: true, message: 'Meeting request sent successfully', meetingRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error creating meeting request', error: error.message });
  }
};
export const rescheduleMeeting = async (req, res) => {
  try {
    const { meetingId, newDay, newTime } = req.body;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Get client and trainer details
    const client = await Client.findById(meeting.client);
    const trainer = await Trainer.findById(meeting.trainer);

    if (!client || !trainer) {
      return res.status(404).json({
        success: false,
        message: 'Client or Trainer not found'
      });
    }

    // Update meeting details
    meeting.day = newDay;
    meeting.time = newTime;
    await meeting.save();

    // Create notification message
    const notificationMessage = `Meeting rescheduled to ${newDay} at ${newTime} with Trainer ${trainer.Fname} and Client ${client.fullname}`;

    // Update client with notification
    await Client.findByIdAndUpdate(client._id, {
      $push: { 
        notification: notificationMessage
      }
    });

    // Update trainer with notification
    await Trainer.findByIdAndUpdate(trainer._id, {
      $push: { 
        notification: notificationMessage
      }
    });

    res.status(200).json({
      success: true,
      message: 'Meeting rescheduled successfully',
      meeting: meeting
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling meeting',
      error: error.message
    });
  }
};

export const getUpcomingMeetingsForClient = async (req, res) => {
  try {
    const clientId = req.client.id;

    // Find the client
    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    console.log('Client commingMeeting IDs:', client.commingMeeting);

    // Fetch all meetings from the Meeting collection without date filter
    const allMeetings = await Meeting.find({
      _id: { $in: client.commingMeeting }
    }).sort({ day: 1, time: 1 })
      .populate('trainer', 'Fname Lname email')
      .lean();

    console.log('Fetched all meetings:', JSON.stringify(allMeetings, null, 2));

    // Format all the meetings data
    const formattedMeetings = allMeetings.map(meeting => ({
      _id: meeting._id,
      day: meeting.day,
      time: meeting.time,
      status: meeting.status,
      trainingType: meeting.trainingType,
      isRecurring: meeting.isRecurring,
      trainer: meeting.trainer ? {
        name: `${meeting.trainer.Fname || ''} ${meeting.trainer.Lname || ''}`,
        email: meeting.trainer.email || ''
      } : null
    }));

    // Extract the meeting IDs from meetingRequest and find corresponding meetings
    const meetingIds = client.meetingRequest.map(meeting => meeting.meetingId);
    
    // Fetch all meetingRequest data and populate trainer information
    const meetingRequests = await Meeting.find({
      _id: { $in: meetingIds }
    }).populate('trainer', 'Fname Lname email _id').lean();

    // Format meeting requests with trainer details
    const requestedMeetings = meetingRequests.map(meeting => ({
      _id: meeting._id,
      day: meeting.day,
      time: meeting.time,
      status: meeting.status,
      trainingType: meeting.trainingType,
      isRecurring: meeting.isRecurring,
      trainer: meeting.trainer ? {
        name: `${meeting.trainer.Fname || ''} ${meeting.trainer.Lname || ''}`,
        email: meeting.trainer.email || '',
        _id: meeting.trainer._id
      } : null
    }));

    // Separate upcoming meetings (if needed)
    const now = new Date();
    const upcomingMeetings = formattedMeetings.filter(meeting => new Date(meeting.day) >= now);

    res.status(200).json({
      success: true,
      message: 'All meetings fetched successfully',
      allMeetings: formattedMeetings,
      upcomingMeetings: upcomingMeetings,
      meetingRequest: requestedMeetings, // Include formatted meeting requests
      totalMeetings: formattedMeetings.length,
      upcomingMeetingsCount: upcomingMeetings.length
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meetings',
      error: error.message
    });
  }
};


export const cancelMeeting = async (req, res) => {
  try {
    const { meetingId, clientId, reason } = req.body;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Ensure the client canceling the meeting is the one associated with it
    if (meeting.client.toString() !== clientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this meeting' });
    }

    // Create notification message
    const notificationMessage = `Meeting on ${meeting.day} at ${meeting.time} has been canceled. Reason: ${reason}`;

    // Update client
    await Client.findByIdAndUpdate(clientId, {
      $pull: { commingMeeting: meetingId },
      $push: { notification: notificationMessage }
    });

    // Update trainer
    await Trainer.findByIdAndUpdate(meeting.trainer, {
      $pull: { commingMeeting: meetingId },
      $push: { notification: notificationMessage }
    });

    // Delete the meeting
    await Meeting.findByIdAndDelete(meetingId);

    res.status(200).json({ success: true, message: 'Meeting canceled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error canceling meeting', error: error.message });
  }
};

export const addWorkout = async (req, res) => {
  try {
    const { clientId, workoutDate, exercises, day } = req.body;

    // Validate client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const parsedWorkoutDate = new Date(workoutDate);

    // Create a single workout object
    const workout = {
      date: parsedWorkoutDate,
      day: day,
      exercises: exercises.map(exercise => ({
        exercise: exercise.exercise,
        note: exercise.note,
        sets: exercise.sets.map((set, index) => ({
          setNumber: index + 1,  // Use index to assign setNumber
          weight: set.weight,
          reps: set.reps,
          done: set.done
        }))
      }))
    };

    // Add workout to client's workout array
    await Client.findByIdAndUpdate(clientId, {
      $push: { workout: workout }
    });

    res.status(200).json({ success: true, message: 'Workout added successfully', workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding workout', error: error.message });
  }
}; 

export const addOrUpdateExercise = async (req, res) => {
  try {
    const { clientId, workoutDate, day, exerciseName, note, newSets } = req.body;

    // Validate the request body
    if (!clientId || !workoutDate || !day || !exerciseName || !Array.isArray(newSets)) {
      return res.status(400).json({ success: false, message: 'Missing or invalid required fields' });
    }

    // Validate client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const parsedWorkoutDate = new Date(workoutDate);

    // Find the existing workout for the given date and day
    let existingWorkout = client.workout.find(
      workout => workout.date.toISOString() === parsedWorkoutDate.toISOString() && workout.day === day
    );

    if (!existingWorkout) {
      // If no workout exists for the given date and day, create a new one
      existingWorkout = {
        date: parsedWorkoutDate,
        day: day,
        exercises: []
      };
      client.workout.push(existingWorkout);
    }

    // Find the existing exercise within the workout
    let existingExercise = existingWorkout.exercises.find(exercise => exercise.exercise === exerciseName);

    if (existingExercise) {
      // Add new sets to the existing exercise
      newSets.forEach((set, index) => {
        existingExercise.sets.push({
          setNumber: existingExercise.sets.length + index + 1, // Increment set number
          weight: set.weight,
          reps: set.reps,
          done: set.done
        });
      });
    } else {
      // Add a new exercise to the workout
      existingExercise = {
        exercise: exerciseName,
        note: note,
        sets: newSets.map((set, index) => ({
          setNumber: index + 1,  // Use index to assign setNumber
          weight: set.weight,
          reps: set.reps,
          done: set.done
        }))
      };
      existingWorkout.exercises.push(existingExercise);
    }

    // Save the client with the updated workout
    await client.save();

    // Respond with the updated workout
    const updatedWorkout = client.workout.find(
      workout => workout.date.toISOString() === parsedWorkoutDate.toISOString() && workout.day === day
    );

    res.status(200).json({ success: true, message: 'Exercise added or updated successfully', workout: updatedWorkout });
  } catch (error) {
    console.error('Error:', error);  // Detailed error logging
    res.status(500).json({ success: false, message: 'Error adding or updating exercise', error: error.message });
  }
};




export const addWorkoutSet = async (req, res) => {
  try {
    const { clientId, workoutDate, day, exerciseName, newSets } = req.body;

    // Validate client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const parsedWorkoutDate = new Date(workoutDate);

    // Find the workout for the specified date and day
    const workout = client.workout.find(w => 
      w.date.toISOString() === parsedWorkoutDate.toISOString() && w.day === day
    );

    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout not found for the given date and day' });
    }

    // Find the exercise to add new sets to
    const exercise = workout.exercises.find(e => e.exercise === exerciseName);

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found in the workout' });
    }

    // Ensure new sets are appended to existing sets without overwriting
    const existingSetCount = exercise.sets.length; // Get the current number of sets

    // Add new sets to the exercise
    newSets.forEach((set, index) => {
      exercise.sets.push({
        setNumber: existingSetCount + index + 1, // Correctly use index to assign setNumber
        weight: set.weight,
        reps: set.reps,
        done: set.done
      });
    });

    // Save the updated client document with the newly added sets
    await client.save();

    res.status(200).json({ success: true, message: 'New sets added successfully', workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding new sets', error: error.message });
  }
};




export const addWeightEntry = async (req, res) => {
  try {
    const { clientId, date, weight } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const newEntry = {
      date: new Date(date),
      weight: weight
    };

    // Initialize weightGraph if it's undefined
    if (!client.weightGraph) {
      client.weightGraph = [];
    }

    // Add the new entry to the weightGraph array
    client.weightGraph.push(newEntry);
    await client.save();

    res.status(200).json({ success: true, message: 'Weight entry added successfully', entry: newEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error adding weight entry', error: error.message });
  }
};


export const getWeightEntries = async (req, res) => {
  try {
    const { id } = req.params; // Use 'id' to match the route parameter

    console.log('Received clientId:', id); // Log the clientId

    const client = await Client.findById(id);
    
    // Log the client object to see what is being retrieved
    console.log('Retrieved client:', client);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Sort weightEntries by date
    const weightEntries = client.weightGraph.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({ success: true, weightEntries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving weight entries', error: error.message });
  }
};
export const updateWeightEntry = async (req, res) => {
  try {
    const { clientId, entryId, weight } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const entry = client.weightGraph.id(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Weight entry not found' });
    }

    entry.weight = weight;
    await client.save();

    res.status(200).json({ success: true, message: 'Weight entry updated successfully', entry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating weight entry', error: error.message });
  }
};

// Delete a weight entry
export const deleteWeightEntry = async (req, res) => {
  try {
    const { clientId, entryId } = req.params;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    client.weightGraph.id(entryId).remove();
    await client.save();

    res.status(200).json({ success: true, message: 'Weight entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting weight entry', error: error.message });
  }
};


export const getAllNotifications = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10, sort = 'desc', type } = req.query;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    let notifications = client.notification;

    // Filter by type if provided
    if (type) {
      notifications = notifications.filter(notification => notification.type === type);
    }

    // Sort notifications
    notifications.sort((a, b) => sort === 'desc' ? b.date - a.date : a.date - b.date);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.status(200).json({ 
      success: true, 
      notifications: paginatedNotifications,
      totalNotifications: notifications.length,
      currentPage: page,
      totalPages: Math.ceil(notifications.length / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving notifications', error: error.message });
  }
};


export const getWorkout = async (req, res) => {
  try{
    const clientId = req.client._id;
    console.log('Received clientId:', clientId);
    const Clients = await Client.findById(clientId).populate('workout');
    if(!Clients){
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const currentDate = new Date();

    const todaysWorkout = Clients.workout.filter(workout => workout.date.toDateString() === currentDate.toDateString());

    res.status(200).json({ success: true, workout: todaysWorkout });

  }catch(error){    
    res.status(500).json({ success: false, message: 'Error retrieving workout', error: error.message });
  }
}



export const getProfile = async (req,res)=>{
  try{
    const clientId = req.client._id;
    const Clients = await Client.findById(clientId);
    if(!Clients){
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
res.status(201).json({
  success:true,
  client: {
    id: Clients._id,
    fullname: Clients.fullname,
    email: Clients.email,
    profilePic: Clients.profilePic,
    startingWeight: Clients.startingWeight,
    subscription: Clients.subscription,
    subamount: Clients.subamount,
    ActivePlan: Clients.ActivePlan,
    ActiveNutrition: Clients.ActiveNutrition,
    measurements: Clients.measurements,
    weightGraph: Clients.weightGraph,
    membershipExpiresOn: Clients.membershipExpiresOn,
    trainer: Clients.trainer,
    commingMeeting: Clients.commingMeeting,
    weightGraph:Clients.weightGraph,
    weight:Clients.weight,
    notification:Clients.notification,
  }
})
  }
catch(error){
res.status(500).json({
  success:false,
  message:error.message
})
}
  
}


export const approveMeetingRequest = async (req, res) => {
  try {
    const { clientId, meetingRequestId } = req.body;

    // Convert meetingRequestId to ObjectId using 'new'
    const meetingObjectId = new mongoose.Types.ObjectId(meetingRequestId);

    // Fetch the client by their ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Check if meetingRequest exists and is an array
    if (!client.meetingRequest || !Array.isArray(client.meetingRequest)) {
      return res.status(400).json({ success: false, message: 'Client has no meeting requests' });
    }

    console.log("Client meeting requests:", JSON.stringify(client.meetingRequest, null, 2));

    // Find the meeting request in the client's meetingRequest array
    const meetingRequestIndex = client.meetingRequest.findIndex(
      request => request.meetingId.equals(meetingObjectId)
    );

    console.log("Meeting request IDs:", client.meetingRequest.map(req => req.meetingId));
    console.log("Searched ID:", meetingObjectId);
    console.log("Found index:", meetingRequestIndex);

    if (meetingRequestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Meeting request not found' });
    }

    const meetingRequest = client.meetingRequest[meetingRequestIndex];

    // Validate the meetingRequest data
    if (!meetingRequest || !meetingRequest.day || !meetingRequest.time || !meetingRequest.trainingType) {
      return res.status(400).json({ success: false, message: 'Invalid meeting request data', meetingRequest });
    }

    // Create a new meeting with the status 'Approved'
    const newMeeting = new Meeting({
      client: clientId,
      trainer: client.trainer,
      day: meetingRequest.day,
      time: meetingRequest.time,
      date: meetingRequest.date,
      trainingType: meetingRequest.trainingType,
      isRecurring: meetingRequest.isRecurring,
      status: 'Approved'
    });

    await newMeeting.save();

    // Notify both client and trainer about the approved meeting
    const notificationMessage = `Meeting approved for ${meetingRequest.day} at ${meetingRequest.time}`;

    // Update client with new meeting and remove the meeting request
    const clientUpdate = Client.findByIdAndUpdate(clientId, {
      $push: { commingMeeting: newMeeting._id, notification: notificationMessage },
      $pull: { meetingRequest: { meetingId: meetingObjectId } }
    });

    // Update trainer with new meeting and notification
    const trainerUpdate = Trainer.findByIdAndUpdate(client.trainer, {
      $push: { commingMeeting: newMeeting._id, notification: notificationMessage }
    });

    // Execute updates in parallel
    await Promise.all([clientUpdate, trainerUpdate]);

    res.status(200).json({ success: true, message: 'Meeting request approved', meeting: newMeeting });
  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({ success: false, message: 'Error approving meeting request', error: error.message, stack: error.stack });
  }
};


export const customdiet = async (req, res) => {
  try {
    const { clientId } = req.body;
    

    // Fetch the client by their ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Check if customdiet exists and is an array
    if (!client.customdiet || !Array.isArray(client.customdiet)) {
      return res.status(400).json({ success: false, message: 'Client has no customdiet' });
    }

    res.status(200).json({ success: true, message: 'Client customdiet', customdiet: client.customdiet });
  } catch (error) {   
    res.status(500).json({ success: false, message: 'Error getting customdiet', error: error.message });
  }

};



export const createCustomDiet = async (req, res) => {
  try {
    const { clientId, title, description, category, date, day } = req.body;

    // Fetch the client by their ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Initialize customdiet array if it doesn't exist
    if (!client.customdiet || !Array.isArray(client.customdiet)) {
      client.customdiet = [];
    }

    // Find if there's already an entry for the specified day
    const dayEntry = client.customdiet.find((diet) => diet.day === day);

    if (dayEntry) {
      // If the day exists, add the new meal to the meals array
      dayEntry.meals.push({
        title,
        description,
        category,
        date,
      });
    } else {
      client.customdiet.push({
        day,
        meals: [
          {
            title,
            description,
            category,
            date,
          },
        ],
      });
    }

    // Save the updated client document
    await client.save();

    res.status(200).json({ success: true, message: 'Custom diet created successfully', customdiet: client.customdiet });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating custom diet', error: error.message });
  }
};



export const updateCustomDiet = async (req, res) => {
  try {
    const { clientId } = req.body;
    const { title, description, category, date, day } = req.body;

    // Fetch the client by their ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Check if customdiet exists and is an array
    if (!client.customdiet || !Array.isArray(client.customdiet)) {
      client.customdiet = []; // Initialize the customdiet array if it doesn't exist
    }

    // Check if a day entry exists for the specified day
    const dayEntry = client.customdiet.find((diet) => diet.day === day);

    if (dayEntry) {
      // If the day exists, add the new meal to that day's meals
      dayEntry.meals = dayEntry.meals || [];  // Ensure that 'meals' array exists
      dayEntry.meals.push({
        title,
        description,
        category,
        date,
      });
    } else {
      // If no entry for the day exists, create a new one
      client.customdiet.push({
        day,
        meals: [
          {
            title,
            description,
            category,
            date,
          },
        ],
      });
    }

    // Save the client document with the updated customdiet
    await client.save();

    res.status(200).json({ success: true, message: 'Meal added to customdiet successfully', customdiet: client.customdiet });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating customdiet', error: error.message });
  }
};



