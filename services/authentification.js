const fs = require('fs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/user');

const getUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email: email });
    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Internal Server Error');
  }
};
const Authentification = async (req, res) => {
  try {
    console.log('************************************************');
    const { email, password, tokens } = req.body;
    const user = await User.findOne({ email }).populate('entreprise');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.Hpassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if TwoFactorAuthentication is enabled for the user
    if (user.TwoFactorAuthentication) {
      // Verify the user's token
      const verified = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'base32',
        token: tokens,
        window: 1,
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const token = jwt.sign({ userId: user._id }, 'your-secret-key', {
      expiresIn: '1h',
    });
    CheckProgress(user);
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

const CheckProgress = async (user) => {
  let progress = 0;
  if (user.firstname && user.firstname) {
    progress = progress + 10;
  }
  if (user.phoneNumber) {
    progress += 5;
  }
  if (user.isVerify) {
    progress += 10;
  }
  if (user.aboutme) {
    progress += 10;
  }
  if (user.TwoFactorAuthentication) {
    progress += 30;
  }
  if (user.skills.length > 0) {
    progress += 10;
  }
  if (user.hasEducation) {
    progress += 20;
  }
  if (user.hasExperience) {
    progress += 20;
  }
  user.profileProgress = progress;
  await user.save();
};

const AuthentificationAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const role = 'Admin';
    // Find the user by username
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if the provided password matches the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.Hpassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', {
      expiresIn: '1h',
    });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
};
const secretKey = 'qsdsqdqdssqds';
const ForgetPassword = async (req, res) => {
  try {
    console.log('Received request to reset password:', req.body.email);
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }
    sendMailtoResetPassword(email, `${user.firstname} ${user.lastname}`);
    res.status(200).send('Password reset email sent successfully');
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).send('Internal Server Error');
  }
};
async function sendMailtoResetPassword(email, fullname) {
  const token = jwt.sign({ email }, secretKey, { expiresIn: '1d' });

  // create reusable transporter object using the default SMTP transport
  const htmlTemplate = fs.readFileSync(
    'services/templateemails/resetpassword.html',
    'utf8',
  );
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'contact.fithealth23@gmail.com', // ethereal user
      pass: 'ebrh bilu ygsn zrkw', // ethereal password
    },
  });

  const msg = {
    from: {
      name: 'ConnectCareer Esprit',
      address: 'contact.fithealth23@gmail.com',
    },
    to: `${email}`,
    subject: 'CONNECTCAREER Account Confirmation',
    html: htmlTemplate
      .replace('{{username}}', fullname)
      .replace('{{token}}', token),
  };

  const sendMail = async (transporter, msg) => {
    try {
      await transporter.sendMail(msg);
      console.log('Email has been sent !');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
  sendMail(transporter, msg);
};



const ReceiveToken = async (req, res) => {
  const { token } = req.params;

  jwt.verify(token, secretKey, async (err, decoded) => {
    if (err) {
      console.error(err);
      return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
    const userEmail = decoded.email;
    try {
      const { newPassword } = req.body;
      const Hpassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await User.findOneAndUpdate(
        { email: userEmail },
        { password: newPassword, Hpassword },
        { new: true },
      );
      if (!updatedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      console.log('Password reset successful for user:', userEmail);
      res
        .status(200)
        .json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({
          message: 'Erreur lors de la réinitialisation du mot de passe',
        });
    }
  });
};


const UpdatePassword = async (req, res) => {
  const { email } = req.params;
  try {
    const { newPassword } = req.body;
    const Hpassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { password: newPassword, Hpassword },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    console.log('Password reset successful for user:', email);
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};
async function sendMailSecretCode2Fa(email, secret) {
  const htmlTemplate = fs.readFileSync(
    'services/templateemails/secretCode2fa.html',
    'utf8',
  );
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'contact.fithealth23@gmail.com', // ethereal user
      pass: 'ebrh bilu ygsn zrkw', // ethereal password
    },
  });

  const msg = {
    from: {
      name: 'ConnectCareer Esprit',
      address: 'contact.fithealth23@gmail.com',
    },
    to: `${email}`,
    subject: 'CONNECTCAREER Account Confirmation',
    html: htmlTemplate
      .replace('{{secret}}', secret),
  };

  const sendMail = async (transporter, msg) => {
    try {
      await transporter.sendMail(msg);
      console.log('Email has been sent !');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
  sendMail(transporter, msg);
};
const Ajouter2FA = async (req, res) => {
  const { email } = req.params;
  let qrCodeUrl; // Define qrCodeUrl outside the try block

  try {
    const secret = speakeasy.generateSecret({ length: 20 });
    try {
      qrCodeUrl = await new Promise((resolve, reject) => {
        QRCode.toDataURL(secret.otpauth_url, (err, image_data) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(image_data);
          }
        });
      });
      console.log('qrcode', qrCodeUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      return res.status(500).send('Internal Server Error');
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        TwoFactorAuthentication: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
      },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    console.log('2FA reset successful for user:',email);
    sendMailSecretCode2Fa(email,secret.base32);
    res.status(200).json({ message: '2FA réinitialisé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du 2FA' });
  }
};
module.exports = {
  CheckProgress,
  Ajouter2FA,
  getUserByEmail,
  Authentification,
  AuthentificationAdmin,
  ForgetPassword,
  UpdatePassword,
  ReceiveToken,
};
