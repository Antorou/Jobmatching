
const { verifyToken } = require('@clerk/backend');

if (!process.env.CLERK_SECRET_KEY) {
    console.error('CLERK_SECRET_KEY environment variable is not set. Authentication will fail.');
    process.exit(1);
}

const authenticateClerk = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required: No token provided or malformed.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const sessionClaims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY, 
    });

    req.auth = {
      userId: sessionClaims.sub,
    };
    next();
  } catch (error) {
    console.error('Clerk authentication error:', error);

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(401).json({ message: 'Authentication failed: Invalid token.' });
  }
};

module.exports = authenticateClerk;