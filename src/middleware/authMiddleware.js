// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error("JWT Error:", error.message);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  // Move this block outside the if to catch missing token
  res.status(401);
  throw new Error("Not authorized, no token");
});

export default protect;

