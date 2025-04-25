import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ msg: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];

        // Verify JWT Token
        const verification = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: verification.id,
            companyCode: verification.companyCode,
            role: verification.role || "user"  // Default role if not provided
        };

        req.token = token;
        next();
    } catch (error) {
        return res.status(403).json({ msg: "Token is not valid" });
    }
};

export { authenticateToken };
