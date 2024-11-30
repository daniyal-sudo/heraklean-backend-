import Trainer from './../Models/Trainer.js';
import Client from './../Models/Client.js';
import DietPlan from './../Models/DietPlan.js';
import ProgramPlan from './../Models/ProgramPlan.js';
import WeightEntry from './../Models/WeightGraph.js';
import Meeting from './../Models/Meeting.js';
import { sendMail } from './../Helper/sendMail.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import Subscription from '../Models/Subscription.js';
import MealPlan from '../Models/MealPlan.js';
import moment from 'moment';



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // The folder where images will be stored
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Rename the file to avoid name conflicts
  }
});

// Set up multer middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB
  fileFilter: function (req, file, cb) {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

export const register = async (req, res) => {
  upload.single('profilePic')(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ message: err });
    }

    const { Fname, lastName, email, password, location, title } = req.body;

    try {
      let trainer = await Trainer.findOne({ email });
      if (trainer) {
        return res.status(400).json({ message: 'Trainer already exists' });
      }

      // Create a new trainer object
      trainer = new Trainer({
        Fname,
        lastName,
        email,
        password,
        profilePic: req.file ? req.file.path : null, // Store the image file path
        location,
        title
      });

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      trainer.password = await bcrypt.hash(password, salt);

      // Save the trainer to the database
      await trainer.save();

      // Create and return JWT
      const payload = { trainerId: trainer.id };
      const token = jwt.sign(payload, 'your_jwt_secret', { expiresIn: '1h' });

      res.status(201).json({
        message: 'Trainer created successfully',
        success: true,
        token
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: error.message,
        success: false
      });
    }
  });
};


export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
      // Check if the trainer exists
      const trainer = await Trainer.findOne({ email });
      if (!trainer) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Check if the password matches
      const isMatch = await bcrypt.compare(password, trainer.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Create and return JWT
      const payload = { trainerId: trainer.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
  
      res.status(200).json({
        message: 'Login successful',
        success: true,
        token,
        trainer: {
          id: trainer.id,
          Fname: trainer.Fname,
          lastName: trainer.lastName,
          email: trainer.email,
          profilePic: trainer.profilePic,
          location: trainer.location,
          title: trainer.title
        }
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
};  
export const createClient = async (req, res) => {
  const { 
    startingWeight, 
    attachDietId, 
    attachProgramId, 
    fullname, 
    subamount, 
    email, 
    password // Added password field
  } = req.body;

  const trainerId = req.trainer._id; // Assuming trainer ID is available in the request
  const profilePic = req.file ? req.file.path : ''; // Get the profilePic path from the uploaded file

  try {
    // Check if client already exists
    let client = await Client.findOne({ email });

    // Fetch the selected diet and program plans
    const dietPlan = await DietPlan.findById(attachDietId);
    const programPlan = await ProgramPlan.findById(attachProgramId);
    if (!dietPlan || !programPlan) {
      console.error("Diet plan not found:", attachDietId);
      console.error("Program plan not found:", attachProgramId);
      return res.status(400).json({ message: 'Invalid diet or program plan selected' });
    }

    if (client) {
      // Update the existing client
      client.profilePic = profilePic; // Update profilePic with the new file path
      client.startingWeight = startingWeight;
      client.attachDiet.push(attachDietId);
      client.attachProgram.push(attachProgramId);
      client.fullname = fullname;
      client.subamount = subamount;
      client.trainer = trainerId;
      client.ActiveNutrition.push(dietPlan);
      client.ActivePlan.push(programPlan);

      // Update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        client.password = await bcrypt.hash(password, salt);
      }

      await client.save();

      // Associate client with the trainer
      await Trainer.findByIdAndUpdate(trainerId, {
        $addToSet: { 
          clients: client._id,
          client: {
            _id: client._id,
            fullname: client.fullname,
            email: client.email,
            profilePic: client.profilePic,
            subamount: client.subamount,
            startingWeight: client.startingWeight,
            attachDiet: client.attachDiet,
            attachProgram: client.attachProgram,
            ActiveNutrition: client.ActiveNutrition,
            ActivePlan: client.ActivePlan,
            trainer: client.trainer
          }
        },
      });

    } else {
      // Create a new client
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt); // Hash the password

      client = new Client({
        profilePic,
        startingWeight,
        attachDiet: [attachDietId],
        attachProgram: [attachProgramId],
        fullname,
        subamount,
        email,
        password: hashedPassword, // Save the hashed password
        trainer: trainerId,
        ActiveNutrition: [dietPlan],
        ActivePlan: [programPlan],
      });

      await client.save();

      // Associate the new client with the trainer
      await Trainer.findByIdAndUpdate(trainerId, {
        $push: { 
          clients: client._id,
          client: {
            _id: client._id,
            fullname: client.fullname,
            email: client.email,
            profilePic: client.profilePic,
            subamount: client.subamount,
            startingWeight: client.startingWeight,
            attachDiet: client.attachDiet,
            attachProgram: client.attachProgram,
            ActiveNutrition: client.ActiveNutrition,
            ActivePlan: client.ActivePlan,
            trainer: client.trainer
          }
        },
      });
    }

    res.status(201).json({
      message: client ? 'Client updated successfully' : 'Client created successfully',
      success: true,
      client,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};
   

   
// export const createDietPlan = async (req, res) => {
//   const { dietTitle, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;
//   const trainer = req.trainer;

//   try {
//     const dietPlan = new DietPlan({
//       dietTitle,
//       monday,
//       tuesday,
//       wednesday,
//       thursday,
//       friday,
//       saturday,
//       sunday
//     });

//     await dietPlan.save();

//     await Trainer.findByIdAndUpdate(trainer, {
//       $push: { dietPlans: dietPlan._id }
//     });

//     res.status(201).json({
//       message: 'Diet Plan created successfully',
//       success: true,
//       dietPlan
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server error');
//   }
// };


export const createDietPlan = async (req, res) => {
  const { dietTitle, meals, trainerId } = req.body;

  try {
    const dietPlan = new MealPlan({
      dietTitle,
      meals: meals.map((meal) => ({
        title: meal.title,
        protein: { name: meal.protein.name, grams: meal.protein.grams },
        fats: { name: meal.fats.name, grams: meal.fats.grams },
        carbs: { name: meal.carbs.name, grams: meal.carbs.grams },
      })),
    });

    await dietPlan.save();

    // Add the diet plan ID to the trainer's document
    await Trainer.findByIdAndUpdate(trainerId, {
      $push: { dietPlans: dietPlan._id },
    });

    res.status(201).json({
      message: 'Diet Plan created successfully',
      success: true,
      dietPlan,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// controllers/dietController.js
export const updateDietPlan = async (req, res) => {
  const { id, dietTitle, meals, trainerId } = req.body;

  try {
    const updatedDietPlan = await MealPlan.findByIdAndUpdate(
      id,
      {
        dietTitle,
        meals: meals.map((meal) => ({
          title: meal.title,
          protein: { name: meal.protein.name, grams: meal.protein.grams },
          fats: { name: meal.fats.name, grams: meal.fats.grams },
          carbs: { name: meal.carbs.name, grams: meal.carbs.grams },
        })),
      },
      { new: true, runValidators: true }
    );

    if (!updatedDietPlan) {
      return res.status(404).json({
        message: 'Diet Plan not found',
        success: false,
      });
    }

    // Update the trainer's diet plans list if not already included
    await Trainer.findByIdAndUpdate(trainerId, {
      $addToSet: { dietPlans: updatedDietPlan._id },
    });

    res.status(200).json({
      message: 'Diet Plan updated successfully',
      success: true,
      dietPlan: updatedDietPlan,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

export const getTrainerDietPlans = async (req, res) => {
  const { trainerId } = req.body;

  try {
    // Find the trainer by ID to get the list of diet plans
    const trainer = await Trainer.findById(trainerId).populate('dietPlans');
    
    if (!trainer) {
      return res.status(404).json({
        message: 'Trainer not found',
        success: false,
      });
    }

    // Respond with the list of diet plans
    res.status(200).json({
      message: 'Diet Plans retrieved successfully',
      success: true,
      dietPlans: trainer.dietPlans,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};


export const createProgramPlan = async (req, res) => {
  const { programTitle, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;
  const trainer = req.trainer; 

  try {
    // Create a new program plan with day-wise details
    const programPlan = new ProgramPlan({
      programTitle,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday
    });

    await programPlan.save();

    // Associate the program plan with the trainer
    await Trainer.findByIdAndUpdate(trainer, {
      $push: { programPlans: programPlan._id }
    });

    res.status(201).json({
      message: 'Program Plan created successfully',
      success: true,
      programPlan
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};


  // export const getTrainerDietPlans = async (req, res) => {
  //   try {
  //     const trainerId = req.trainer;
      
  //     const trainer = await Trainer.findById(trainerId).populate('dietPlans');
  //     if (!trainer) {
  //       return res.status(404).json({ message: 'Trainer not found' });
  //     }
  
  //     res.status(200).json({
  //       success: true,
  //       dietPlans: trainer.dietPlans
  //     });
  //   } catch (error) {
  //     console.error(error.message);
  //     res.status(500).send('Server error');
  //   }
  // };


  export const getTrainerProgramPlans = async (req, res) => {
    try {
      const trainerId = req.trainer;
      
      const trainer = await Trainer.findById(trainerId).populate('programPlans');
      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }
  
      res.status(200).json({
        success: true,
        programPlans: trainer.programPlans
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  };

  export const getTrainerClients = async (req, res) => {
    try {
      const trainerId = req.trainer;
      
      const trainer = await Trainer.findById(trainerId).populate({
        path: 'clients',
        select: 'fullname profilePic' // Select only the fullname and profilePic fields
      });
  
      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }
  
      res.status(200).json({
        success: true,
        clients: trainer.clients
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  };

  export const getClientOverview = async (req, res) => {
    const { id } = req.params;
    const trainerId = req.trainer; // Ensure this is set correctly in authMiddleware

    if (!trainerId) {
        return res.status(401).json({
            message: 'Unauthorized: Trainer ID not found',
            success: false,
        });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: 'Invalid client ID',
            success: false,
        });
    }

    try {
        // Find the client by ID and ensure it belongs to the authenticated trainer
        const client = await Client.findOne({ _id: id, trainer: trainerId })
            .populate('ActiveNutrition')
            .populate('ActivePlan');

        if (!client) {
            return res.status(404).json({
                message: 'Client not found or you do not have permission to view this client',
                success: false,
            });
        }

        // Get the associated trainer details
        const trainer = await Trainer.findById(trainerId);

        if (!trainer) {
            return res.status(404).json({
                message: 'Trainer not found',
                success: false,
            });
        }

        res.status(200).json({
            message: 'Client profile overview retrieved successfully',
            success: true,
            client: {
                profilePic: client.profilePic,
                status: "Bulk",  // Example: You can set or calculate the client's status based on your logic
                fullname: client.fullname,
                weightGraph: client.weightGraph,  // Dynamic weight graph data
                measurements: {
                    chestBack: client.measurements?.chestBack || "N/A",
                    rightArm: client.measurements?.rightArm || "N/A",
                    leftArm: client.measurements?.leftArm || "N/A",
                    rightLeg: client.measurements?.rightLeg || "N/A",
                    leftLeg: client.measurements?.leftLeg || "N/A",
                    waist: client.measurements?.waist || "N/A",
                },
                subscription: client.subscription,
                paymentAmount: client.subamount,
                membership: {
                    name: "Monthly Premium Plan",
                    expiresOn: client.membershipExpiresOn || "N/A",
                },
                activePlans: client.ActivePlan,
                activeMealPlans: client.ActiveNutrition,
                trainer: {
                    _id: trainer._id,
                    Fname: trainer.Fname,
                    lastName: trainer.lastName,
                    email: trainer.email,
                    profilePic: trainer.profilePic,
                    location: trainer.location,
                    title: trainer.title,
                },
            },
        });
    } catch (error) {
        console.error('Error in getClientOverview:', error);
        res.status(500).json({
            message: 'Server error',
            success: false,
            error: error.message
        });
    }
};
  
    export const addWeightEntry = async (req, res) => {
        const { weight } = req.body;
        const { id } = req.params;
        const trainerId = req.trainerId;
    
        try {
            // Ensure the client belongs to the trainer
            const client = await Client.findOne({ _id: id, trainer: trainerId });
            if (!client) {
                return res.status(404).json({
                    message: 'Client not found or you do not have permission to add weight entries for this client',
                    success: false,
                });
            }
    
            const weightEntry = new WeightEntry({
                client: id,
                weight,
            });
    
            await weightEntry.save();
    
            res.status(201).json({
                message: 'Weight entry added successfully',
                success: true,
                weightEntry,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    };
    export const getWeightGraph = async (req, res) => {
        const { id } = req.params;
        const trainerId = req.trainerId;
    
        try {
            // Ensure the client belongs to the trainer
            const client = await Client.findOne({ _id: id, trainer: trainerId });
            if (!client) {
                return res.status(404).json({
                    message: 'Client not found or you do not have permission to view weight entries for this client',
                    success: false,
                });
            }
    
            const weightEntries = await WeightEntry.find({ client: id }).sort({ date: 1 });
    
            res.status(200).json({
                message: 'Weight graph retrieved successfully',
                success: true,
                weightGraph: weightEntries,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    };
    export const updateWeightGraph = async (req, res) => {
        const { id } = req.params;
        const { weight } = req.body;
      
        try {
          const client = await Client.findById(id);
      
          if (!client) {
            return res.status(404).json({
              message: 'Client not found',
              success: false,
            });
          }
      
          // Push new weight entry to the weight graph
          client.weightGraph.push({ weight });
      
          // Save the client with the updated weight graph
          await client.save();
      
          res.status(200).json({
            message: 'Weight graph updated successfully',
            success: true,
            weightGraph: client.weightGraph,
          });
        } catch (error) {
          console.error(error.message);
          res.status(500).send('Server error');
        }
      }
      
    export const updateMembershipExpiry = async (req, res) => {
        const { id } = req.params;  // Client ID
        const trainerId = req.trainerId;  // Assuming trainerId is passed in auth middleware
        const { membershipDuration } = req.body;  // Duration in days
    
        try {
            // Ensure the client belongs to the trainer
            const client = await Client.findOne({ _id: id, trainer: trainerId });
            if (!client) {
                return res.status(404).json({
                    message: 'Client not found or you do not have permission to update this client\'s membership',
                    success: false,
                });
            }
    
            // Calculate new expiration date
            const currentDate = new Date();
            const newExpiryDate = new Date(currentDate.setDate(currentDate.getDate() + membershipDuration));
    
            client.membership.expiresOn = newExpiryDate;
            await client.save();
    
            res.status(200).json({
                message: 'Membership expiration date updated successfully',
                success: true,
                expiresOn: newExpiryDate,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    };   
    export const updateClientProfile = async (req, res) => {
        try {
            const trainerId = req.trainer;
            const { Fname, lastName, email, location, title, profilePic } = req.body;
        
            // Find the trainer by ID
            const trainer = await Trainer.findById(trainerId);
        
            if (!trainer) {
              return res.status(404).json({ message: 'Trainer not found', success: false });
            }
        
            // Update the fields
            if (Fname) trainer.Fname = Fname;
            if (lastName) trainer.lastName = lastName;
            if (email) trainer.email = email;
            if (location) trainer.location = location;
            if (title) trainer.title = title;
            if (profilePic) trainer.profilePic = profilePic;
        
            // Save the updated trainer
            await trainer.save();
        
            res.status(200).json({
              message: 'Profile updated successfully',
              success: true,
              trainer: {
                Fname: trainer.Fname,
                lastName: trainer.lastName,
                email: trainer.email,
                location: trainer.location,
                title: trainer.title,
                profilePic: trainer.profilePic
              }
            });
          } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Server error', success: false });
          }
        }

        export const getTrainer = async (req, res) => { 
            const trainerId = req.trainer;
            const trainer = await Trainer.findById(trainerId);
            if (!trainer) {
              return res.status(404).json({ message: 'Trainer not found', success: false });
            }
            res.status(200).json({
              message: 'Trainer retrieved successfully',
              success: true,
              trainer: {
                id: trainer.id,
                Fname: trainer.Fname,
                lastName: trainer.lastName,
                email: trainer.email,
                profilePic: trainer.profilePic,
                location: trainer.location,
                title: trainer.title
              }
            });
          }

          export const logout = async (req, res) => {
            res.clearCookie('token');
            res.status(200).json({
              message: 'Logout successful',
              success: true
            });
          }


          export const forgetPassword = async (req, res) => {
            const { email } = req.body;
          
            try {
              // Find the trainer by email
              const trainer = await Trainer.findOne({ email });
              if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
          
              // Create a reset token
              const resetToken = jwt.sign({ userId: trainer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
              
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
              res.status(200).json({ message: 'Password reset link sent' });
            } catch (error) {
              // Log error details for debugging
              console.error('Error processing request:', error);
              res.status(500).json({ message: 'Error processing request', error: error.message });
            }
          };
          export const resetPassword = async (req, res) => {
            const { resetToken, newPassword } = req.body;
          
            try {
              // Verify the reset token
              jwt.verify(resetToken, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) return res.status(400).json({ message: 'Invalid or expired reset token' });
          
                // Find user by ID from the token
                const trainer = await Trainer.findById(decoded.userId);
                if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
          
                // Hash the new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
          
                // Update user's password
                trainer.password = hashedPassword;
                await trainer.save();
          
                res.status(200).json({ message: 'Password successfully reset' });
              });
            } catch (error) {
              console.error('Error resetting password:', error);
              res.status(500).json({ message: 'Error processing request', error: error.message });
            }
          };

          export const approveMeetingRequest = async (req, res) => {
            try {
              const { trainerId, meetingRequestId } = req.body;
              const trainer = await Trainer.findById(trainerId);
          
              if (!trainer) {
                return res.status(404).json({ success: false, message: 'Trainer not found' });
              }
          
              // Check if meetingRequest exists and is an array
              if (!trainer.meetingRequest || !Array.isArray(trainer.meetingRequest)) {
                return res.status(400).json({ success: false, message: 'Trainer has no meeting requests' });
              }
          
              // Find the meeting request in the trainer's meetingRequest array
              const meetingRequestIndex = trainer.meetingRequest.findIndex(
                request => request._id && request._id.toString() === meetingRequestId
              );
          
              if (meetingRequestIndex === -1) {
                return res.status(404).json({ success: false, message: 'Meeting request not found' });
              }
          
              const meetingRequest = trainer.meetingRequest[meetingRequestIndex];
          
              // Create new meeting with correct status
              const newMeeting = new Meeting({
                client: meetingRequest.client,
                trainer: meetingRequest.trainer,
                day: meetingRequest.day,
                time: meetingRequest.time,
                trainingType: meetingRequest.trainingType,
                isRecurring: meetingRequest.isRecurring,
                status: 'Approved' // Correctly set the status to a valid enum value
              });
              
              await newMeeting.save();
          
              // Update client with new meeting and notification
              const notificationMessage = `Meeting approved for ${meetingRequest.day} at ${meetingRequest.time} with Trainer ${trainer.Fname}`;
          
          
              await Client.findByIdAndUpdate(meetingRequest.client, {
                $push: { commingMeeting: newMeeting._id, notification: notificationObject }
              });
          
              // Update trainer with new meeting and remove the meeting request
              await Trainer.findByIdAndUpdate(trainerId, {
                $push: { commingMeeting: newMeeting._id, notification: notificationMessage },
                $pull: { meetingRequest: { _id: meetingRequestId } }
              });
          
              res.status(200).json({ success: true, message: 'Meeting request approved', meeting: newMeeting });
            } catch (error) {
              console.error(error);
              res.status(500).json({ success: false, message: 'Error approving meeting request', error: error.message });
            }
          };


      

          export const createMeetingRequest = async (req, res) => {
            try {
              const { clientId, trainerId, time, date, trainingType, isRecurring, description } = req.body;
              const newMeetingTime = moment(`${date} ${time}`, 'YYYY-MM-DD h:mm A');
              // Validate required fields
              if (!clientId || !trainerId || !date || !time || !trainingType || !description) {
                return res.status(200).json({ success: false, message: "All fields are required" });
              }
          
              // Check if both client and trainer exist
              const client = await Client.findById(clientId);
              const trainer = await Trainer.findById(trainerId);
          
              if (!client || !trainer) {
                return res.status(200).json({ success: false, message: 'Client or Trainer not found' });
              }
          
              // Convert date and time to a moment object for validation
              const meetingDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD hh:mm A'); // Assume time is in 12-hour format
              const currentDateTime = moment();
          
              // Check if the date and time is in the future
              if (meetingDateTime.isBefore(currentDateTime)) {
                return res.status(200).json({ success: false, message: 'The meeting time must be in the future' });
              }
          
              // Check if there are any existing meetings for the same client, trainer, and date/time
               // Find existing meetings for the same trainer on the same day
    const existingMeetings = await Meeting.find({
      trainer: trainerId,
      date: date
    }).select('time'); // Select only the time field to compare

    // Check for time conflicts (1 hour window)
    for (const meeting of existingMeetings) {
      const existingMeetingTime = moment(`${date} ${meeting.time}`, 'YYYY-MM-DD h:mm A');
      
      // Check if the new meeting time is within 1 hour before or after an existing meeting
      if (newMeetingTime.isBetween(existingMeetingTime.clone().subtract(1, 'hour'), existingMeetingTime.clone().add(1, 'hour'))) {
        return res.status(400).json({ success: false, message: 'Meeting time overlaps with an existing meeting.' });
      }
    }
          
              // Create a new meeting
              const meeting = new Meeting({
                client: clientId,
                trainer: trainerId,
                time,
                date,
                status: 'Pending',
                trainingType,
                isRecurring,
                createdby: "trainer",
                description
              });
          
              // Save the meeting
              const savedMeeting = await meeting.save();
          
              // Add the meeting to both the client's and trainer's `meetingRequest` field
              client.meetingRequest.push({
                meetingId: savedMeeting._id,
                time,
                date,
                status: 'Pending',
                trainingType,
                isRecurring,
                createdby: "trainer",
                description
              });
          
              trainer.meetingRequest.push({
                meetingId: savedMeeting._id,
                time,
                date,
                status: 'Pending',
                trainingType,
                isRecurring,
                createdby: "trainer",
                description
              });
          
              const notificationMessage = `New meeting request from ${trainer.Fname} for ${date} at ${time}`;
          
              // Add notification to client
              await Client.findByIdAndUpdate(clientId, {
                $push: { notification: notificationMessage }
              });
          
              // Save both client and trainer
              await client.save();
              await trainer.save();
          
              res.status(200).json({
                success: true,
                message: 'Meeting request created successfully',
                meeting: savedMeeting
              });
            } catch (error) {
              res.status(200).json({
                success: false,
                message: 'Error creating meeting request',
                error: error.message
              });
            }
          };
          
          


          export const  home =async(req,res)=> {
            try {
                            
              const trainerId = req.trainer._id;
              console.log(trainerId)
              const trainer = await Trainer.findById(trainerId);
              const totalClients = await Trainer.countDocuments({ _id: trainerId });
              console.log(totalClients)
              console.log(trainer)
          const upcomingMeetings = await Meeting.find({ trainer: trainerId, status: "Approved" });
        
            res.status(200).json({
              message: 'Trainer details retrieved successfully',
              success: true,
              fullName: `${trainer.Fname} ${trainer.lastName}`,
              email: trainer.email,
              totalClients: totalClients,
              upcomingMeetings:upcomingMeetings
            })
    
            } catch (error) {
              console.error('Error retrieving trainer details:', error);
              throw error;
            }
          }


          
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { trainerId } = req.params;

    // Check if trainer exists
    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    // Get the current date in 'YYYY-MM-DD' format
    const currentDate = new Date();
    const formattedCurrentDate = currentDate.toISOString().split('T')[0]; // Format to 'YYYY-MM-DD'

    // Find all upcoming meetings for the trainer
    const upcomingMeetings = await Meeting.find({
      trainer: trainerId,
      day: { $gte: formattedCurrentDate }, // Only get meetings on or after the current date
      status: 'Approved' // Only get Approved meetings
    })
    .populate('client', 'fullname profilePic') // Populate client details (fullname, profilePic)
    .sort({ day: 1 }); // Sort by day in ascending order

    if (!upcomingMeetings || upcomingMeetings.length === 0) {
      return res.status(200).json({ success: true, message: 'No upcoming meetings found' });
    }

    // Prepare the response data
    const meetingData = upcomingMeetings.map(meeting => ({
      clientName: meeting.client.fullname, // Full name of the client
      clientProfilePic: meeting.client.profilePic, // Profile picture of the client
      day: meeting.day, // Use 'day' instead of 'date'
      time: meeting.time,
      trainingType: meeting.trainingType,
      isRecurring: meeting.isRecurring,
      status: meeting.status,
    }));

    res.status(200).json({ success: true, meetings: meetingData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching upcoming meetings', error: error.message });
  }
};


export const getTotalClients = async (req, res) => {
  try {
    const { trainerId } = req.params;

    // Find the trainer by ID
    const trainer = await Trainer.findById(trainerId);

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    // Count the total number of clients for the trainer
    const totalClients = trainer.clients.length;

    res.status(200).json({ 
      success: true, 
      totalClients 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving total clients', 
      error: error.message 
    });
  }
};

export const getinfo = async (req, res) => {
  const { trainerId } = req.params;

  try {
    // Find the trainer by ID
    const trainer = await Trainer.findById(trainerId);

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    // Find the profile pic, full name, and email
    const { profilePic, Fname,lastName, email } = trainer;
    res.status(200).json({ 
      success: true, 
      profilePic, 
      Fname,
      lastName, 
      email

    });
  } catch (error) {
    console.error('Error fetching trainer info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTrainerMeetings = async (req, res) => {
  try {
    const trainerId = req.trainer._id;

    // Find meetings for the trainer and populate client fields (name, profilePic)
    const meetings = await Meeting.find({ trainer: trainerId })
      .populate('client', 'fullname profilePic'); // Assuming these are the fields in the Client schema
    const trainer = await Trainer.findById(trainerId);

    const approvedmeeting = await Meeting.find({trainer: trainerId, status: "Approved"}).populate('client', 'fullname profilePic');
    const trainermeetingRequest = await Meeting.find({trainer: trainerId, status: "Pending",createdby:"trainer"}).populate('client', 'fullname profilePic');
    const clientmeetingRequest = await Meeting.find({trainer: trainerId, status: "Pending", createdby:"client"}).populate('client', 'fullname profilePic');
    if (meetings && meetings.length > 0) {
      res.status(200).json({ success: true,
        clientmeetingRequests:clientmeetingRequest,
         trainermeetingRequest: trainermeetingRequest,
         trainerAprovemeeting : approvedmeeting });
    } else {
      res.status(404).json({ success: false, message: 'No meetings found' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving trainer meetings', error: error.message });
  }
};

export const updateActivePlan = async (req, res) => {
  const { clientId } = req.params; // Get clientId from the request parameters
  const {
    programTitle,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday
  } = req.body; // Destructure the request body to get the plan details

  try {
    // Find the client by ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Update the client's ActivePlan with the new plan details
    client.ActivePlan = {
      programTitle,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday
    };
 
    // Save the updated client data
    await client.save();

    // Send a success response with the updated ActivePlan
    res.status(200).json({
      message: 'Active Plan updated successfully',
      success: true,
      activePlan: client.ActivePlan
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateActiveNutrition = async (req, res) => {
  const { clientId } = req.params;
  const {
    dietTitle,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday
  } = req.body; // Destructure the request body to get the plan details

  try {
    // Find the client by ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Update the client's ActiveNutrition object without overwriting existing values
    client.ActiveNutrition = {
      ...client.ActiveNutrition, // Keep existing nutrition data
      ...(dietTitle && { dietTitle }), // Update dietTitle only if provided
      ...(monday && { monday }), // Update monday meals only if provided
      ...(tuesday && { tuesday }), // Update tuesday meals only if provided
      ...(wednesday && { wednesday }), // Update wednesday meals only if provided
      ...(thursday && { thursday }), // Update thursday meals only if provided
      ...(friday && { friday }), // Update friday meals only if provided
      ...(saturday && { saturday }), // Update saturday meals only if provided
      ...(sunday && { sunday }) // Update sunday meals only if provided
    };

    await client.save(); // Save the updated client document

    return res.status(200).json({
      message: 'Active Nutrition updated successfully',
      success: true,
      activeNutrition: client.ActiveNutrition,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const rescheduleMeetingRequest = async (req, res) => {
  try {
    const { meetingId, trainerId, newDay, newTime, newDate } = req.body;

    // Find the meeting by its ID
    const meeting = await Meeting.findById(meetingId);

    // Check if the meeting exists
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if the reschedule request is from the trainer who created the meeting
    if (meeting.trainer.toString() !== trainerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Remove the old meeting from both the client and trainer records
    await Client.findByIdAndUpdate(meeting.client, {
      $pull: { 
        commingMeeting: meeting._id,
        meetingRequest: { meetingId: meeting._id }
      }
    });

    await Trainer.findByIdAndUpdate(trainerId, {
      $pull: { 
        commingMeeting: meeting._id,
        meetingRequest: { meetingId: meeting._id }
      }
    });

    // Delete the old meeting
    await Meeting.findByIdAndDelete(meetingId);

    // Check the status of the meeting
    if (meeting.status === 'Approved') {
      // Create a new approved meeting with the updated details
      const newMeeting = new Meeting({
        client: meeting.client,
        trainer: meeting.trainer,
        day: newDay || meeting.day,
        time: newTime || meeting.time,
        date: newDate || meeting.date,
        trainingType: meeting.trainingType,
        isRecurring: meeting.isRecurring,
        status: 'Approved' // Set status to Approved
      });

      await newMeeting.save();

      // Notify the client and update their records
      const notificationMessage = `Meeting rescheduled to ${newDay} at ${newTime} with Trainer ${meeting.trainer.Fname}`;
     
  
      await Client.findByIdAndUpdate(meeting.client, {
        $push: { commingMeeting: newMeeting._id, notification: notificationMessage }
      });

      // Update the trainer's records
      await Trainer.findByIdAndUpdate(trainerId, {
        $push: { commingMeeting: newMeeting._id, notification: notificationMessage }
      });

      return res.status(200).json({ success: true, message: 'Meeting rescheduled successfully', meeting: newMeeting });

    } else if (meeting.status === 'Pending') {
      // Create a new meeting request with the updated details
      const newMeetingRequest = new Meeting({
        client: meeting.client,
        trainer: meeting.trainer,
        day: newDay,
        time: newTime,
        date: newDate,
        trainingType: meeting.trainingType,
        isRecurring: meeting.isRecurring,
        status: 'Pending',
        createdby: 'trainer'
      });

      const savedMeetingRequest = await newMeetingRequest.save();

      // Notify the client and update their records
      const notificationMessage = `New meeting request from Trainer ${meeting.trainer.Fname} for ${newDay} at ${newTime}`;

      await Client.findByIdAndUpdate(meeting.client, {
        $push: { meetingRequest: savedMeetingRequest, notification: notificationMessage }
      });

      // Update the trainer's records
      await Trainer.findByIdAndUpdate(trainerId, {
        $push: { meetingRequest: savedMeetingRequest, notification: notificationMessage }
      });

      return res.status(200).json({ success: true, message: 'Meeting request rescheduled successfully', meeting: savedMeetingRequest });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid meeting status' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error rescheduling meeting', error: error.message });
  }
};

export const cancelMeeting = async (req, res) => {
  try {
    const { meetingId, trainerId } = req.body;  // Changed from req.query to req.body

    if (!meetingId || !trainerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Meeting ID and trainer ID are required' 
      });
    }

    // Find the meeting by its ID
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Verify trainer authorization
    if (meeting.trainer.toString() !== trainerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Remove meeting from client's and trainer's records
    await Client.findByIdAndUpdate(meeting.client, {
      $pull: {
        commingMeeting: meeting._id,
        meetingRequest: { meetingId: meeting._id },
      },
    });

    await Trainer.findByIdAndUpdate(trainerId, {
      $pull: {
        commingMeeting: meeting._id,
        meetingRequest: { meetingId: meeting._id },
      },
    });

    // Delete the meeting from the database
    await Meeting.findByIdAndDelete(meetingId);

    // Add notifications
    const notificationMessage = `Meeting scheduled on ${meeting.day} at ${meeting.time} has been canceled.`;
   

    
    await Promise.all([
      Client.findByIdAndUpdate(meeting.client, {
        $push: { notification: notificationMessage },
      }),
      Trainer.findByIdAndUpdate(trainerId, {
        $push: { notification: notificationMessage },
      })
    ]);

    return res.status(200).json({ 
      success: true, 
      message: 'Meeting canceled successfully' 
    });

  } catch (error) {
    console.error('Cancel meeting error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error canceling meeting', 
      error: error.message 
    });
  }
};

export const notification = async (req, res) => {
  try {
    const trainerId = req.trainer;  // Assuming `authMiddleware` sets the user ID
    const trainer = await Trainer.findById(trainerId);
    
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Notifications fetched successfully', 
      notifications: trainer.notification 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
  }
};


export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.body; // Assuming notificationId is the index of the notification in the array
    const trainerId = req.trainer; // Get the trainer ID from the request context

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    // Check if the notification ID is valid (index in this case)
    if (notificationId < 0 || notificationId >= trainer.notification.length) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Mark the notification as read
    trainer.notification[notificationId] = { ...trainer.notification[notificationId], read: true }; // Marking as read
    await trainer.save(); // Save the trainer document

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error marking notification as read', error: error.message });
  }
};
export const markAllNotificationsRead = async (req, res) => {
  try {
    const trainerId = req.trainer; // Get the trainer ID from the request context

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    // Mark all notifications as read
    trainer.notification = trainer.notification.map(notification => ({
      ...notification,
      read: true
    }));

    await trainer.save(); // Save the trainer document

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error marking all notifications as read', error: error.message });
  }
};


export const searchAPI = async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Case-insensitive regular expression for the query
    const regex = new RegExp(query, 'i');

    // Search across trainers, clients, dietPlans, and programPlans
    const trainers = await Trainer.find({
      $or: [
        { Fname: regex },               // Search by trainer's first name
        { lastName: regex },            // Search by trainer's last name
      ]
    })
    .populate({
      path: 'clients',
      match: { fullname: regex }        // Search for clients by their fullname
    })
    .populate({
      path: 'programPlans',
      match: { programTitle: regex }    // Search for program plans by their title
    })
    .populate({
      path: 'dietPlans',
      match: { dietTitle: regex }       // Search for diet plans by their title
    });

    // Filter out empty arrays where no clients, dietPlans, or programPlans match the search query
    const filteredTrainers = trainers.filter(trainer => 
      trainer.clients.length > 0 || 
      trainer.programPlans.length > 0 || 
      trainer.dietPlans.length > 0 ||
      regex.test(trainer.Fname) || regex.test(trainer.lastName)
    );

    // Return results
    return res.status(200).json({
      success: true,
      data: filteredTrainers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};







// daniyal work 



export const createSubscription = async (req, res) => {
  const { subscriptionId, trainerId, planName, planDuration, planAmount, planBenefits } = req.body;

  // Validate required fields
  if (!trainerId || !planName || !planDuration || !planAmount || !planBenefits) {
    return res.status(200).json({ success: false, message: "All fields are required." });
  }

  try {
    // Check if the trainer exists
    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(200).json({ success: false, message: "Trainer not found." });
    }

    if (subscriptionId) {
      // If subscriptionId exists, we are editing an existing subscription
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(200).json({ success: false, message: "Subscription not found." });
      }

      // Update the subscription with new data
      subscription.planName = planName;
      subscription.planDuration = planDuration;
      subscription.planAmount = planAmount;
      subscription.planBenefits = planBenefits;

      await subscription.save();

      res.status(200).json({
        success: true,
        message: "Subscription updated successfully.",
        subscription,
      });
    } else {
      // If subscriptionId is not provided, create a new subscription
      const newSubscription = new Subscription({
        planName,
        planDuration,
        planAmount,
        planBenefits,
        trainer: trainerId,
      });

      await newSubscription.save();

      // Add the new subscription to the trainer's subscriptions array
      trainer.subscriptions.push(newSubscription._id);
      await trainer.save();

      res.status(201).json({
        success: true,
        message: "Subscription created successfully.",
        subscription: newSubscription,
      });
    }
  } catch (error) {
    console.error("Error creating/updating subscription:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const deleteSubscription = async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    // Find the subscription by ID
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found." });
    }

    // Find the trainer linked to this subscription
    const trainer = await Trainer.findById(subscription.trainer);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found." });
    }

    // Remove the subscription ID from the trainer's subscriptions array
    trainer.subscriptions.pull(subscriptionId);
    await trainer.save();

    // Remove the subscription document using deleteOne or delete()
    await Subscription.deleteOne({ _id: subscriptionId });  // or use subscription.delete()

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export  const getSubscriptionsByTrainerId = async (req, res) => {
  const { trainerId } = req.body;

  // Validate trainerId field
  if (!trainerId) {
    return res.status(400).json({ success: false, message: "Trainer ID is required." });
  }

  try {
    // Check if the trainer exists
    const trainer = await Trainer.findById(trainerId).populate('subscriptions');
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found." });
    }

    res.status(200).json({
      success: true,
      subscriptions: trainer.subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions by trainer ID:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



