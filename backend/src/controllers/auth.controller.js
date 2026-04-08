import User from "../models/User.js";
import 'dotenv/config';

// ----------------------------------------------------------------------
// Register user (password-based)
// ----------------------------------------------------------------------
export const registerUser = async (req, res) => {
  try {
    const { name, phone, password, role, language } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone, and password are required' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
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

    // Remove password from response
    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ message: 'User registered successfully', user: userObj, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ----------------------------------------------------------------------
// Login user (phone only — simplified, kept for backward compat)
// ----------------------------------------------------------------------
export const loginUser = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'Phone number not registered' });
    }

    const token = user.generateAuthToken();
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 

// ----------------------------------------------------------------------
// Login user with password (phone + password based) — primary login flow
// ----------------------------------------------------------------------
export const loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and password are required' });
    }

    // Find the user by phone - include the password field explicitly
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'This phone number is not registered. Please sign up.' });
    }

    // Compare passwords 
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = user.generateAuthToken();
    res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ message: 'Login successful', token, user: userObj });
  } catch (error) {
    console.error('Error logging in user with password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ----------------------------------------------------------------------
// Logout
// ----------------------------------------------------------------------
export const logoutUser = async (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.status(200).json({ message: 'Logout successful' });
};

// ----------------------------------------------------------------------
// Get user profile
// ----------------------------------------------------------------------
export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({ message: 'User profile retrieved successfully', user });
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};