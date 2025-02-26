const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required' 
      });
    }
    
    // Check if user already exists
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      return res.status(500).json({ 
        message: 'Error checking existing user', 
        error: searchError.message 
      });
    }
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user in Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        { 
          name, 
          email, 
          phone: phone || null,
          // We'll store hashed password in auth_provider table for simplicity
          // In a production app, you might use Supabase Auth or a more robust auth system
        }
      ])
      .select();
    
    if (createError) {
      return res.status(500).json({ 
        message: 'Error creating user', 
        error: createError.message 
      });
    }
    
    // Store auth info separately
    const { error: authError } = await supabase
      .from('user_auth')
      .insert([
        {
          user_id: newUser[0].id,
          password_hash: hashedPassword,
          provider: 'email'
        }
      ]);
    
    if (authError) {
      // If auth fails, clean up the user
      await supabase.from('users').delete().eq('id', newUser[0].id);
      return res.status(500).json({ 
        message: 'Error creating authentication', 
        error: authError.message 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: newUser[0].id, email: newUser[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get auth info
    const { data: authInfo, error: authError } = await supabase
      .from('user_auth')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (authError || !authInfo) {
      return res.status(404).json({ message: 'Authentication information not found' });
    }
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, authInfo.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: error.message 
    });
  }
};

// Generate share link for memory contributors
exports.generateShareLink = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    // Create a token specifically for sharing
    const shareToken = jwt.sign(
      { userId, purpose: 'memory-share' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // Longer expiry for share links
    );
    
    // The frontend will construct the full URL
    res.status(200).json({
      message: 'Share link generated successfully',
      token: shareToken
    });
  } catch (error) {
    console.error('Share link generation error:', error);
    res.status(500).json({ 
      message: 'Server error generating share link', 
      error: error.message 
    });
  }
};

// Verify share token
exports.verifyShareToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is a share token
    if (decoded.purpose !== 'memory-share') {
      return res.status(401).json({ message: 'Invalid token purpose' });
    }
    
    // Get user details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', decoded.userId)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      message: 'Token verified successfully',
      user
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ 
      message: 'Server error verifying token', 
      error: error.message 
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('id', userId)
      .single();
    
    if (error) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Server error fetching user', 
      error: error.message 
    });
  }
};