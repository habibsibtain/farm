import User from "../models/User.js";
import crypto from "crypto";

const OTP_TTL_MS = 5 * 60 * 1000;
const otpChallenges = new Map();

const sendOtpToPhone = async (phone, otp) => {
  // Integrate Twilio or other SMS gateway here.
  // Fallback logs for local development.
  console.log(`OTP for ${phone}: ${otp}`);
};


export const registerUser = async (req, res) => {
  try {
    const {name, phone, password, role, language} = req.body;
    if(!name || !phone || !password) {
      return res.status(400).json({message: 'Name, phone, and password are required'});
    }

    const existingUser = await User.findOne({phone});
    if(existingUser){
      return  res.status(400).json({message: 'User with this phone number already exists'});
    }

    const hashedPassword = await User.hashPassword(password);

    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      role: role || 'farmer',
      language: language || 'en'
    });

    await newUser.save();

    const token = await newUser.generateAuthToken();
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    res.status(201).json({message: 'User registered successfully', user: newUser, token});

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const loginUser = async (req, res) => {
  try {
    const {phone, password} = req.body;
    if(!phone || !password) {
      return res.status(400).json({message: 'Phone number and password are required'});
    }

    const user = await User.findOne({phone}).select('+password');
    if(!user) {
      return res.status(400).json({message: 'Phone number not registered'});
    }

    const isPasswordValid = await user.comparePassword(password);
    if(!isPasswordValid) {
      return res.status(400).json({message: 'Incorrect password'});
    }

    const token = user.generateAuthToken();
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    
    res.status(200).json({message: 'Login successful', token, user});

  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}

export const logoutUser = async (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.status(200).json({message: 'Logout successful'});
}

export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({message: 'User profile retrieved successfully', user});
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const requestLoginOtp = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone number and password are required" });
    }

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeId = crypto.randomUUID();
    otpChallenges.set(challengeId, {
      userId: user._id.toString(),
      otp,
      phone: String(phone),
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    await sendOtpToPhone(String(phone), otp);

    return res.status(200).json({
      message: "OTP sent successfully",
      challengeId,
      phone: String(phone),
    });
  } catch (error) {
    console.error("Error requesting login OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !otp) {
      return res.status(400).json({ message: "Challenge ID and OTP are required" });
    }

    const challenge = otpChallenges.get(challengeId);
    if (!challenge) {
      return res.status(400).json({ message: "Invalid or expired OTP challenge" });
    }
    if (Date.now() > challenge.expiresAt) {
      otpChallenges.delete(challengeId);
      return res.status(400).json({ message: "OTP has expired. Please login again." });
    }
    if (String(otp) !== challenge.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findById(challenge.userId);
    if (!user) {
      otpChallenges.delete(challengeId);
      return res.status(404).json({ message: "User not found" });
    }

    const token = user.generateAuthToken();
    otpChallenges.delete(challengeId);

    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.status(200).json({ message: "Login successful", token, user });
  } catch (error) {
    console.error("Error verifying login OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};